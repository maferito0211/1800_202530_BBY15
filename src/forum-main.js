import { onAuthReady } from "./authentication.js";
import { db, auth } from "./firebaseConfig.js";
import { doc, onSnapshot } from "firebase/firestore";
import {
  collection,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
  getCountFromServer,
  query,
  where,
  orderBy,
} from "firebase/firestore";

const querySnapshot = await getDocs(collection(db, "threads"));
const getCount = await getCountFromServer(collection(db, "threads"));

var container = document.querySelector("ul");
var threadID = getCount.data().count;

const currentThread = query(
  collection(db, "threads"),
  where("id", "==", threadID)
);

// Get all threads ordered newest (highest id) first, luckily there is a method for it ╰(*°▽°*)╯
const threadsSnap = await getDocs(
  query(collection(db, "threads"), orderBy("id", "desc"))
);

threadsSnap.forEach((doc) => {
  const data = doc.data();
  var html = `<li>
            <a href="./forumpost.html?id=${data.id}">
              <h4 class="title"> ${data.title} <span> - ${
    data.user
  }</span> </h4>
              <div class="subtitle">
                <p class="timestamp"> ${new Date(
                  data.date
                ).toLocaleString()} </p>
                <p class="commentcount"> ${data.comment_count} comments </p>
              </div>
            </a>
          </li>`;
  container.insertAdjacentHTML("beforeend", html);
});
