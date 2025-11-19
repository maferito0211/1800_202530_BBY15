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
  deleteDoc, // <-- added
} from "firebase/firestore";

const pageTitle = "💬FORUMS";

document.getElementById("pageTitleSection").innerHTML = pageTitle;

const querySnapshot = await getDocs(collection(db, "threads"));
const getCount = await getCountFromServer(collection(db, "threads"));

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
    const html = `<li data-doc-id="${doc.id}" data-thread-id="${
      data.id
    }" data-user-id="${data.userID || ""}">
      <div class="forum-post-top-container">
        <a href="./forumpost.html?id=${data.id}" class="title-link">
          <h4 class="title">${data.title} <span> - ${data.user}</span></h4>
        </a>
        <div class="options-button" role="button" aria-label="Thread options"
             data-doc-id="${doc.id}" data-user-id="${
      data.userID || ""
    }" data-thread-id="${data.id}">⋯</div>
      </div>
      <div class="forum-post-image-in-main-container">
        <img class="forum-post-image-in-main" src="data:image/jpeg;base64,${
          data.image || ""
        }" alt="Thread Image" />
      </div>
      <div class="subtitle">
        <a href="./forumpost.html?id=${data.id}" class="subtitle-link">
          <p class="timestamp">${new Date(data.date)
            .toLocaleString()
            .replace(/(.*)\D\d+/, "$1")}</p>
          <p class="commentcount">${data.comment_count} comments</p>
        </a>
      </div>
    </li>`;
    container.insertAdjacentHTML("beforeend", html);

    // attach a click handler on the li so clicking the row opens the thread
    const li = container.querySelector(":scope > li:last-child");
    if (li) {
      li.addEventListener("click", (e) => {
        // if options-button was clicked, we expect a capture handler to stop propagation
        const tid = li.dataset.threadId;
        if (tid) window.location.href = `./forumpost.html?id=${tid}`;
      });
    }
  });
}

//On every forum there is a button to open the options menu
document.querySelectorAll(".options-button").forEach((button) => {
  button.addEventListener("click", () => {});
});

//Checks all the threads titles for whats in the search bar
document
  .getElementById("searchButton")
  .addEventListener("click", async function () {
    container.innerHTML = "";
    const searchText = document.getElementById("searchValue").value;
    threadsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.title.toLowerCase().includes(searchText.toLowerCase())) {
        var html = `<li>
            <a href="./forumpost.html?id=${data.id}">
              <h4 class="title"> ${data.title} <span> - ${
          data.user
        }</span> </h4>
        <div class="forum-post-image-in-main-container">
            <img class="forum-post-image-in-main" src="data:image/jpeg;base64,${
              data.image || ""
            }" alt="Thread Image" />
        </div>
              <div class="subtitle">
                <p class="timestamp"> ${new Date(data.date)
                  .toLocaleString()
                  .replace(/(.*)\D\d+/, "$1")} </p>
                <p class="commentcount"> ${data.comment_count} comments </p>
              </div>
            </a>
          </li>`;
        container.insertAdjacentHTML("beforeend", html);
      }
    });
  });

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

// delegated click handler for options menu (capture phase so it can intercept before li click)
container.addEventListener(
  "click",
  async (ev) => {
    const btn = ev.target.closest(".options-button");
    if (!btn) return;

    // prevent the li click handler from firing
    ev.stopPropagation();

    // close any existing menus
    document.querySelectorAll(".options-menu").forEach((m) => m.remove());

    // determine permission
    const threadDocId = btn.getAttribute("data-doc-id");
    const ownerId = btn.getAttribute("data-user-id") || "";
    const currentUid = auth.currentUser ? auth.currentUser.uid : null;

    // build menu element
    const menu = document.createElement("div");
    menu.className = "options-menu";
    menu.setAttribute("role", "menu");

    // common menu items
    const viewItem = document.createElement("div");
    viewItem.className = "options-menu-item";
    viewItem.textContent = "View thread";
    viewItem.addEventListener("click", (e) => {
      e.stopPropagation();
      window.location.href = `./forumpost.html?id=${
        btn.dataset.threadId || btn.closest("li")?.dataset.threadId
      }`;
    });
    menu.appendChild(viewItem);

    // only show delete if current user matches ownerId
    if (currentUid && ownerId && currentUid === ownerId) {
      const delItem = document.createElement("div");
      delItem.className = "options-menu-item options-menu-delete";
      delItem.textContent = "Delete thread";
      delItem.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("Delete this thread? This cannot be undone.")) return;
        try {
          await deleteDoc(doc(db, "threads", threadDocId));
          const li = btn.closest("li");
          if (li) li.remove();
        } catch (err) {
          console.error("Failed to delete thread", err);
          alert("Failed to delete thread. See console.");
        }
      });
      menu.appendChild(delItem);
    }

    // attach menu to the li (li must be position:relative in CSS)
    const li = btn.closest("li");
    if (li) {
      li.appendChild(menu);
      const rect = btn.getBoundingClientRect();
      const parentRect = li.getBoundingClientRect();
      menu.style.position = "absolute";
      menu.style.top = `${rect.top - parentRect.top + btn.offsetHeight + 6}px`;
      menu.style.right = `1rem`;
    }

    // close menu when clicking outside
    const onDocClick = (e) => {
      if (
        !e.target.closest(".options-menu") &&
        !e.target.closest(".options-button")
      ) {
        document.querySelectorAll(".options-menu").forEach((m) => m.remove());
        document.removeEventListener("click", onDocClick);
      }
    };
    setTimeout(() => document.addEventListener("click", onDocClick), 0);
  },
  true // useCapture so we can stop propagation before li handler
);
