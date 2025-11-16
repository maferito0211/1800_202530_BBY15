import { onAuthReady } from "./authentication.js";
import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  increment,
  getDoc,
  serverTimestamp,
  getCountFromServer,
} from "firebase/firestore";

//Used to grab the user's id for the profile picture, Thor you can probably use this for
// you way to check if user is signed in to post comments! - Tens (tyson)
import { getAuth, onAuthStateChanged } from "firebase/auth";

const auth = getAuth();
let currentUid = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUid = user.uid; // <- current user's id
  } else {
    currentUid = null;
  }
});

// wait for initial auth state so currentUser is available before interacting
await new Promise((resolve) => onAuthStateChanged(auth, resolve));

//Display the header
const pageTitle = "💬FORUMS";

document.getElementById("pageTitleSection").innerHTML = pageTitle;
//Display header end

const querySnapshot = await getDocs(collection(db, "threads"));
const coll = collection(db, "threads");
const getCount = await getCountFromServer(coll);
const counterRef = await doc(db, "idCounter", "IdCounterDoc");
const getCountForID = await getDoc(doc(db, "idCounter", "IdCounterDoc"));

//You know what they say: all posters post posts
document.getElementById("post").addEventListener("click", async function () {
  var title = document.querySelector("#threadtitle");
  var content = document.querySelector("#content");

  // read the live signed-in user
  const user =
    auth.currentUser || (await new Promise((r) => onAuthStateChanged(auth, r)));
  const uid = user ? user.uid : null;

  const userName =
    user?.displayName || localStorage.getItem("fullName") || "Anonymous";

  var newID = getCountForID.data().counter + 1;
  const ThreadRef = collection(db, "threads");
  var tags = -1;
  var ele = document.getElementsByName("filters");
  for (var i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      tags = i;
    }
  }

  if (userName != "Anonymous") {
    // Everytime a new thread is created, increment the counter by 1
    updateDoc(counterRef, { counter: increment(1) });

    await setDoc(doc(db, "threads", newID.toString()), {
      id: newID,
      user: userName,
      userID: uid, // <- stores UID reliably
      title: title.value,
      date: Date.now(),
      content: content.value,
      tags: tags,
    });

    setTimeout(() => {
      window.location.href = `./forumpost.html?id=${newID}`;
    }, 3000);
  } else {
    alert("Please sign in before posting!");
  }
});
