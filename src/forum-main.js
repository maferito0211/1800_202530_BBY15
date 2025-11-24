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
import { onAuthStateChanged } from "firebase/auth";

const pageTitle = "💬FORUMS";

const urlParams = new URLSearchParams(window.location.search);
const locationIdFilter = urlParams.get("locationId");

const locationContextDiv = document.getElementById("locationContext");

// Si venimos con ?locationId, mostramos mensaje y botón para crear post
if (locationIdFilter && locationContextDiv) {
  try {
    const locationDoc = await getDoc(doc(db, "locations", locationIdFilter));
    if (locationDoc.exists()) {
      const locationData = locationDoc.data();
      const locName = locationData.name;
      const locCategory = locationData.category || "";
    } else {
      locationContextDiv.textContent = "This location could not be found.";
    }
  } catch (err) {
    console.error("Failed to load location", err);
  }
}

document.getElementById("pageTitleSection").innerHTML = pageTitle;

// --- NEW: disable "New Post" when not signed in --------------------
const newPostBtn = document.getElementById("newpost");

if (newPostBtn) {
  onAuthStateChanged(auth, (user) => {
    // If NOT logged in
    if (!user) {
      newPostBtn.classList.add("disabled");
      newPostBtn.setAttribute("aria-disabled", "true");
      newPostBtn.title = "Please sign in to create a new post.";
      return;
    }

    // If logged in
    newPostBtn.classList.remove("disabled");
    newPostBtn.removeAttribute("aria-disabled");

    newPostBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const urlParams = new URLSearchParams(window.location.search);
      const locationId = urlParams.get("locationId");

      if (locationId) {
        // If accessing from a location
        window.location.href = `./forumnew.html?locationId=${locationId}`;
      } else {
        // Normal new post
        window.location.href = "./forumnew.html";
      }
    });
  });
}

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
  const urlParams = new URLSearchParams(window.location.search);
  const locationIdFilter = urlParams.get("locationId");

  snapshot.forEach((doc) => {
    const data = doc.data();

    if (locationIdFilter && data.locationId !== locationIdFilter) {
      return;
    }

    var html = `<li data-doc-id="${doc.id}" data-thread-id="${
      data.id
    }" data-user-id="${data.userID || ""}">
      <div class="forum-post-top-container" href="./forumpost.html?id=${
        data.id
      }">
        <a href="./forumpost.html?id=${data.id}" class="title-link">
          <div class="title-row">
            <h4 class="title">${data.title} <span> - ${data.user}</span></h4>
          </div>
          <img class="forum-post-image-in-main" src="data:image/jpeg;base64,${
            data.image || ""
          }" alt="Thread Image" />
        </a>
        <div class="options-button" role="button" aria-label="Thread options"
             data-doc-id="${doc.id}" data-user-id="${
      data.userID || ""
    }" data-thread-id="${data.id}">⋯</div>
      </div>
      <div class="subtitle" href="./forumpost.html?id=${data.id}">
        <a href="./forumpost.html?id=${data.id}" class="subtitle-link">
          <p class="timestamp">${new Date(data.date)
            .toLocaleString()
            .replace(/(.*)\D\d+/, "$1")}</p>
          <p class="commentcount">${data.comment_count} comments</p>
        </a>
      </div>
    </li>`;

    container.insertAdjacentHTML("beforeend", html);
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
    const urlParams = new URLSearchParams(window.location.search);
    const locationIdFilter = urlParams.get("locationId");

    threadsSnap.forEach((doc) => {
      const data = doc.data();

      if (locationIdFilter && data.locationId !== locationIdFilter) {
        return;
      }

      if (data.title.toLowerCase().includes(searchText.toLowerCase())) {
        var html = `<li data-doc-id="${doc.id}" data-thread-id="${
          data.id
        }" data-user-id="${data.userID || ""}">
      <div class="forum-post-top-container" href="./forumpost.html?id=${
        data.id
      }">
        <a href="./forumpost.html?id=${data.id}" class="title-link">
          <div class="title-row">
            <h4 class="title">${data.title} <span> - ${data.user}</span></h4>
          </div>
          <img class="forum-post-image-in-main" src="data:image/jpeg;base64,${
            data.image || ""
          }" alt="Thread Image" />
        </a>
        <div class="options-button" role="button" aria-label="Thread options"
             data-doc-id="${doc.id}" data-user-id="${
          data.userID || ""
        }" data-thread-id="${data.id}">⋯</div>
      </div>
      <div class="subtitle" href="./forumpost.html?id=${data.id}">
        <a href="./forumpost.html?id=${data.id}" class="subtitle-link">
          <p class="timestamp">${new Date(data.date)
            .toLocaleString()
            .replace(/(.*)\D\d+/, "$1")}</p>
          <p class="commentcount">${data.comment_count} comments</p>
        </a>
      </div>
    </li>`;
        container.insertAdjacentHTML("beforeend", html);
      }
    });
  });

var radValue;

function filterResultsWithRadioButtons() {
  var ele = document.getElementsByName("filters");
  radValue = undefined; // reset
  for (var i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      radValue = i;
      break;
    }
  }
  // if no radio is checked, show all threads
  if (radValue === undefined) {
    container.innerHTML = "";
    addThreads(threadsSnap);
  } else {
    filterThreads();
  }
}

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

// ------------------------- Filter Button -----------------------------

document.getElementById("filterToggle").addEventListener("click", () => {
  const filterContainer = document.getElementById("filter-container");
  const toggleBtn = document.getElementById("filterToggle");
  if (filterContainer.style.display === "flex") {
    filterContainer.style.display = "none";
    toggleBtn.classList.add("open");
  } else {
    filterContainer.style.display = "flex";
    toggleBtn.classList.remove("open");
  }
});

Array.from(
  document.getElementById("filter-container").getElementsByTagName("input")
).forEach((input) => {
  input.addEventListener("change", filterResultsWithRadioButtons);
});

// Clear filter button, unselects all radio buttons and shows all threads
document.getElementById("filterButtonClear").addEventListener("click", () => {
  const inputs = document
    .getElementById("filter-container")
    .getElementsByTagName("input");
  Array.from(inputs).forEach((input) => {
    input.checked = false;
  });
  filterResultsWithRadioButtons();
});
// ------------------------- End Filter Button -------------------------
