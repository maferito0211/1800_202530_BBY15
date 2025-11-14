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

const pageTitle = "💬FORUMS";

document.getElementById("pageTitleSection").innerHTML = pageTitle;

const querySnapshot = await getDocs(collection(db, "threads"));
const coll = collection(db, "threads");
const getCount = await getCountFromServer(coll);
const counterRef = await doc(db, "idCounter", "IdCounterDoc");
const getCountForID = await getDoc(doc(db, "idCounter", "IdCounterDoc"));

//You know what they say: all posters post posts
document.getElementById("post").addEventListener("click", function () {
  var title = document.querySelector("#threadtitle");
  var content = document.querySelector("#content");
  var newID = getCountForID.data().counter + 1;
  const ThreadRef = collection(db, "threads");
  var tags = -1;
  var ele = document.getElementsByName("filters");
  for (var i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      tags = i;
    }
  }

  // Everytime a nwew thread is created, increment the counter by 1
  updateDoc(counterRef, { counter: increment(1) });

  setDoc(doc(db, "threads", newID.toString()), {
    id: newID,
    user: localStorage.getItem("fullName") || "Anonymous",
    title: title.value,
    date: Date.now(),
    content: content.value,
    tags: tags,
  });

  // addDoc(ThreadRef, {
  //   id: newID,
  //   user: localStorage.getItem("displayName"),
  //   title: title.value,
  //   date: Date.now(),
  //   content: content.value,
  //   comments: [],
  // });
  window.open(`./forumpost.html?id=${newID}`);
});
