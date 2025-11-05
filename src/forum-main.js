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
} from "firebase/firestore";

const querySnapshot = await getDocs(collection(db, "threads"));
const getCount = await getCountFromServer(collection(db, "threads"));

var container = document.querySelector("ul");

for (let i = querySnapshot.size - 1; i >= 0; i--) {
  const doc = querySnapshot.docs[i];

  var html = `<li>
            <a href="./forumpost.html?id=${doc.data().id}">
              <h4 class="title"> ${doc.data().title} <span> - ${
    doc.data().user
  }</span> </h4>
              <div class="subtitle">
                <p class="timestamp"> ${new Date(
                  doc.data().date
                ).toLocaleString()} </p>
                <p class="commentcount"> ${
                  doc.data().comment_count
                } comments </p>
              </div>
            </a>
          </li>`;
  container.insertAdjacentHTML("beforeend", html);
}
