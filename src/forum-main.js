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
import { searchThreads } from "./search.js";

const querySnapshot = await getDocs(collection(db, "threads"));
const getCount = await getCountFromServer(collection(db, "threads"));

const pageTitle = "💬FORUMS";

document.getElementById("pageTitleSection").innerHTML = pageTitle;

var container = document.querySelector("#results"); // changed to target the results list by id
var threadID = getCount.data().count;
var container = document.querySelector("ul");
const threadID = getCount.data().count;

const currentThread = query(
  collection(db, "threads"),
  where("id", "==", threadID)
);

// Get all threads ordered newest (highest id) first, luckily there is a method for it ╰(*°▽°*)╯
var threadsSnap = await getDocs(
  query(collection(db, "threads"), orderBy("id", "desc"))
);

addThreads(threadsSnap);

function addThreads(snapshot) {
  snapshot.forEach((doc) => {
    const data = doc.data();
    var html = `<li>
            <a href="./forumpost.html?id=${data.id}">
              <h4 class="title"> ${data.title} <span> - ${
      data.user
    }</span> </h4>
              <div class="subtitle">
                <p class="timestamp"> ${formatDate(data.date)} </p>
                <p class="commentcount"> ${data.comment_count} comments </p>
              </div>
            </a>
          </li>`;
    container.insertAdjacentHTML("beforeend", html);
  });
}

var radValue;
document.getElementById("filterButton").addEventListener("click", function () {
  var ele = document.getElementsByName("filters");
  for (var i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      radValue = i;
    }
  }
  filterThreads();
});

async function filterThreads() {
  container.innerHTML = "";
  const filteredSnap = await getDocs(
    query(
      collection(db, "threads"),
      where("tags", "==", radValue),
      orderBy("id", "desc")
    )
  );
  addThreads(filteredSnap);
}

//       [
//         document.getElementById("banking").checked.toLocaleString(),
//         document.getElementById("government").checked.toLocaleString(),
//         document.getElementById("medical").checked.toLocaleString(),
//         document.getElementById("restaurants").checked.toLocaleString(),
//         document.getElementById("shopping").checked.toLocaleString(),
//         document.getElementById("transit").checked.toLocaleString(),
//       ]
