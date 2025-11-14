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

const currentThread = query(
  collection(db, "threads"),
  where("id", "==", threadID)
);

// Get all threads ordered newest (highest id) first, luckily there is a method for it ╰(*°▽°*)╯
const threadsSnap = await getDocs(
  query(collection(db, "threads"), orderBy("id", "desc"))
);

// Cache all threads for rendering and client-side fallback searching
const allThreads = [];
threadsSnap.forEach((docSnap) => {
  const data = docSnap.data();
  allThreads.push(data);
});

// Helper to format Firestore timestamp or plain date
function formatDate(d) {
  if (!d) return "";
  if (typeof d.toDate === "function") return d.toDate().toLocaleString();
  return new Date(d).toLocaleString();
}

// Render function: clears list and inserts items
function renderThreads(list) {
  if (!container) return;
  container.innerHTML = ""; // clear previous results
  if (!list || list.length === 0) {
    container.insertAdjacentHTML(
      "beforeend",
      `<li class="no-results">No threads found.</li>`
    );
    return;
  }
  for (const data of list) {
    const html = `<li>
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
  }
}

// Initial render: show all threads when page loads
renderThreads(allThreads);

// Search wiring
const input = document.querySelector(".search-input");
const button = document.querySelector(".search-button");

async function handleSearch() {
  const q = input ? input.value.trim() : "";
  if (!q) {
    renderThreads(allThreads);
    return;
  }

  // Try server-side indexed search first
  let results = [];
  try {
    const snaps = await searchThreads(q);
    // searchThreads returns array of thread objects; ensure consistent shape
    results = snaps.map((r) => {
      // If the search returned firestore document-like objects with date fields, normalize as needed
      return { ...r };
    });
  } catch (e) {
    console.error("searchThreads failed:", e);
  }

  // Fallback to client-side filter if server-side search returned nothing
  if (!results || results.length === 0) {
    const qLower = q.toLowerCase();
    results = allThreads.filter((t) => {
      const titleMatch = t.title && t.title.toLowerCase().includes(qLower);
      const contentMatch =
        t.content && t.content.toLowerCase().includes(qLower);
      return titleMatch || contentMatch;
    });
  }

  renderThreads(results);
}

if (button) {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    handleSearch();
  });
}
if (input) {
  // Enter key triggers search
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  });
  // optional: live search as user types (uncomment if desired)
  // input.addEventListener("input", () => handleSearch());
}
