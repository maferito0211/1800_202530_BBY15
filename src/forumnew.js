import { onAuthReady } from "./authentication.js";
import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  getCountFromServer,
} from "firebase/firestore";

const querySnapshot = await getDocs(collection(db, "threads"));
const coll = collection(db, "threads");
const getCount = await getCountFromServer(coll);

//You know what they say: all posters post posts
document.getElementById("post").addEventListener("click", function () {
  var title = document.querySelector("#threadtitle");
  var content = document.querySelector("#content");
  var newID = getCount.data().count;
  const ThreadRef = collection(db, "threads");

  setDoc(doc(db, "threads", newID.toString()), {
    id: newID,
    user: localStorage.getItem("displayName"),
    title: title.value,
    date: Date.now(),
    content: content.value,
    comments: [],
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
