import { db } from "./firebaseConfig.js";
import { doc, documentId } from "firebase/firestore";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  getCountFromServer,
  query,
  where,
  setDoc,
  deleteDoc, // <-- added
} from "firebase/firestore";

//Used to grab the user's id for the profile picture, Thor you can probably use this for
// you way to check if user is signed in to post comments! - Tens (tyson)
import { getAuth, onAuthStateChanged } from "firebase/auth";

const auth = getAuth();
let currentUid = null;
let currentUserPhotoURL = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUid = user.uid; // <- current user's id
    // read user document
    const userDoc = await getDoc(doc(db, "users", currentUid));
    currentUserPhotoURL = userDoc.exists() ? userDoc.data().photoURL : null;
  } else {
    currentUid = null;
    currentUserPhotoURL = null;
  }
});

//End of grabbing user's data

//Replacing The header's hamburger button with a back button

const headerLeftSection = document.getElementById("header-left-section");

headerLeftSection.innerHTML = `
            <div>
              <button id="return-button">←</button>
            </div>
            <a  href="./secret.html" id="logoContainer">
              <img id="logo" src="./images/logoImg.png" alt="Site Logo" />
            </a>
          </div>
`;

document.getElementById("return-button").addEventListener("click", function () {
  window.location.href = "./forum-main.html";
});

//End of replacing header

const pageTitle = "💬FORUMS";

document.getElementById("pageTitleSection").innerHTML = pageTitle;

// simple increment (recommended for concurrent writers)

var id = window.location.search.slice(4);

//Gets the current read by ID from URL
const currentThread = query(
  collection(db, "threads"),
  where("id", "==", Number(id))
);

//Load this threads details
const threadSnap = await getDocs(currentThread);

//Change the title of the document to the thread title
const firstThreadDoc = threadSnap.docs[0];
if (!firstThreadDoc) {
  console.warn("No thread found for id =", id, "threadSnap:", threadSnap);
  document.title = pageTitle; // fallback
} else {
  const threadTitle = firstThreadDoc.data()?.title || pageTitle;
  document.title = threadTitle;
}

//Displays the OP's message and stuff
for (const threadDoc of threadSnap.docs) {
  const header = document.querySelector(".header");
  // await the user document snapshot; use a different name so it doesn't shadow the imported doc()
  const userSnapshot = await getDoc(doc(db, "users", threadDoc.data().userID));
  const opProfilePictureURL =
    userSnapshot && userSnapshot.exists() ? userSnapshot.data().photoURL : null;

  const headerHtml = ` 
    <div class ="op-forum-top-container"> 
    <img class="forum-profile-image" src="${opProfilePictureURL || ""}"></img>
    <h2 class="title"> ${threadDoc.data().title}</h2>
    </div>
    <p> ${threadDoc.data().content} </p>
    <div class="subtitle">
      <p class="timestamp"> ${new Date(threadDoc.data().date)
        .toLocaleString()
        .replace(/(.*)\D\d+/, "$1")}</p>
      <p class="commentcount"> ${threadDoc.data().comment_count} comments</p>
    </div>
  `;
  header.insertAdjacentHTML("beforeend", headerHtml);
}

// Display comments on page load
const commentDocRef = await getDocs(
  collection(db, "threads", id.toString(), "comments")
);

//For each loop through all comments in the collection
for (const docSnap of commentDocRef.docs) {
  const data = docSnap.data();
  const html = renderCommentHTML(
    {
      author: data.user,
      content: data.content,
      date: data.date,
    },
    docSnap.id,
    data.photoURL || data.currentUserPhotoURL || "",
    docSnap.ref.path
  );

  // Insert as a fragment and then find the newly appended direct child
  const frag = document.createRange().createContextualFragment(html);
  if (comments) comments.appendChild(frag);

  // reliably get the comment we just inserted (direct child of comments)
  const commentEl = comments
    ? comments.querySelector(`:scope > .comment:last-child`)
    : null;
  const replyContainer = commentEl && commentEl.querySelector(".reply");

  // NOTE: call loadReplies with the full document path (docSnap.ref.path)
  if (replyContainer) await loadReplies(id, docSnap.ref.path, replyContainer);
}

// --- Dynamic vertical spine height ---------------------------------
function updateSpine(container) {
  if (!container) return;
  // direct child comments only
  const directComments = container.querySelectorAll(":scope > .comment");
  if (!directComments.length) {
    container.style.setProperty("--spine-height", "0px");
    return;
  }
  const last = directComments[directComments.length - 1];
  const content = last.querySelector(".comment-content");
  if (!content) return;

  const replyRect = container.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();

  const centerY = contentRect.top - replyRect.top + contentRect.height / 2; // px from top of container
  const rootFont =
    parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const topOffsetPx = 0;
  const heightPx = Math.max(0, centerY - topOffsetPx);

  container.style.setProperty("--spine-height", `${heightPx + 20}px`);
}

function updateAllSpines(scope = document) {
  scope.querySelectorAll(".reply").forEach(updateSpine);
}
// ------------------------------------------------------------------

// post button logic — detect visible selection (.comment-content) but use parent .comment for ids
document
  .getElementById("postCommentButton")
  .addEventListener("click", function () {
    const commentContent = document.getElementById("comment-input").value;
    if (commentContent.length > 1) {
      const selectedContent = document.querySelector(
        ".comment-content.selected-comment"
      );
      const selectedComment = selectedContent
        ? selectedContent.closest(".comment")
        : null;

      // decide to post a new comment or a reply based on selection, if there is none post a comment (●'◡'●)
      if (selectedComment) {
        postReply(selectedComment);
        console.log("reply posted");
      } else {
        postComment();
        console.log("comment posted");
      }
    } else {
      console.log("Empty comment/reply");
      //TO-DO: Make an popup alert appear here.
    }
  });

//Takes User details and adds them to comment, then calls addComment(comment)
async function postComment() {
  const auth = getAuth();
  let currentUid = null;

  const user =
    auth.currentUser || (await new Promise((r) => onAuthStateChanged(auth, r)));

  var author =
    user?.displayName || localStorage.getItem("fullName") || "Anonymous";

  if (author === "Anonymous" || author === "anonymous") {
    alert("Please sign in before commenting!");
  } else {
    var txt = document.querySelector("textarea");

    const coll = collection(db, "threads", id.toString(), "comments");

    const getCount = await getCountFromServer(coll);

    var content = document.querySelector("textarea");
    var newID = getCount.data().count;

    // get signed-in user id safely (use currentUid if already set, otherwise fall back to auth.currentUser)
    const uid = currentUid || (auth.currentUser && auth.currentUser.uid);
    if (uid) {
      const userDoc = await getDoc(doc(db, "users", uid));
      currentUserPhotoURL = userDoc.exists() ? userDoc.data().photoURL : null;
    } else {
      // not signed in — clear photoURL and optionally handle anonymous posting
      currentUserPhotoURL =
        "http://localhost:5173/images/defaultProfilePicture.png";
    }

    await setDoc(
      doc(db, "threads", id.toString(), "comments", newID.toString()),
      {
        id: newID,
        user: author,
        userID: uid || null, // <-- store author UID
        photoURL: currentUserPhotoURL,
        date: Date.now(),
        content: content.value,
      }
    );

    var comment = {
      content: txt.value,
      date: Date.now(),
      author: author,
    };

    // compute the new document path and pass it to the renderer so replies will be stored under it
    const newDocPath = `threads/${id.toString()}/comments/${newID.toString()}`;
    addComments(
      comment,
      newID.toString(),
      currentUserPhotoURL,
      newDocPath,
      uid
    ); // <-- pass uid
    txt.value = "";
  }
}

//Adds the comment to the screen
function addComments(
  comment,
  commentId,
  authorProfilePictureURL,
  docPath,
  authorUid
) {
  const commentHtml = renderCommentHTML(
    comment,
    commentId || "",
    authorProfilePictureURL || "",
    docPath || "",
    authorUid || ""
  );
  updateAllSpines();
  if (comments) comments.insertAdjacentHTML("beforeend", commentHtml);
}

// helper function for EVERY HTML block, like replies and comments and stuff, just everything
function renderCommentHTML(
  comment,
  commentId,
  authorProfilePictureURL,
  docPath,
  authorUserId
) {
  return `
    <div class="comment" data-comment-id="${commentId || ""}" data-doc-path="${
    docPath || ""
  }" data-user-id="${authorUserId || ""}">
      <div class="comment-container">
        <div class="comment-top">
          <p class="user"> <strong>${comment.author}</strong></p>
          <p class="timestamp">${new Date(comment.date)
            .toLocaleString()
            .replace(/(.*)\D\d+/, "$1")}</p>

          <!-- options button for this comment/reply -->
          <button class="options-button" aria-label="Options" title="Options" type="button">⋯</button>
        </div>
        <div class="comment-content">
          <img class="forum-profile-image" src="${
            authorProfilePictureURL || ""
          }"></img>
          ${comment.content}
        </div>
      </div>
      <div class="reply"></div>
    </div>
  `;
}

// recursive loader: loads replies for a given parent comment document path and appends to container
async function loadReplies(threadId, parentDocPath, container) {
  try {
    const parentSegments = parentDocPath.split("/");
    const repliesSnap = await getDocs(
      collection(db, ...parentSegments, "replies")
    );

    for (const rDoc of repliesSnap.docs) {
      const r = rDoc.data();
      const authorPhoto = r.photoURL || r.currentUserPhotoURL || "";
      const authorUid = r.userID || r.userId || r.uid || "";
      const html = renderCommentHTML(
        r,
        rDoc.id,
        authorPhoto,
        rDoc.ref.path,
        authorUid
      );

      // Insert as a fragment and get the newly appended direct child reliably
      const frag = document.createRange().createContextualFragment(html);
      container.appendChild(frag);

      // the newly appended comment is the last direct .comment child of this container
      const newCommentEl = container.querySelector(
        ":scope > .comment:last-child"
      );
      const replyContainer =
        newCommentEl && newCommentEl.querySelector(".reply");

      // load nested replies recursively and update spine for that reply container
      if (replyContainer) {
        await loadReplies(threadId, rDoc.ref.path, replyContainer);
        updateSpine(replyContainer);
      }
    }

    // update the spine for THIS container (pass container explicitly)
    updateSpine(container);
    updateAllSpines();
  } catch (err) {
    console.error("Failed to load replies for", parentDocPath, err);
  }
}

window.addEventListener("resize", () => {
  // Optional: debounce to avoid too many calls
  clearTimeout(window.resizeTimeout);
  window.resizeTimeout = setTimeout(updateAllSpines, 100);
});

//takes user details and adds them to reply, then calls addReply(reply)
async function postReply(selectedComment) {
  var txt = document.querySelector("textarea");
  const content = txt.value.trim();
  if (!content) return;

  const user =
    auth.currentUser || (await new Promise((r) => onAuthStateChanged(auth, r)));

  var author =
    user?.displayName || localStorage.getItem("fullName") || "Anonymous";

  if (
    author === "Anonymous" ||
    author === "anonymous" ||
    auth.currentUser == null
  ) {
    alert("Sign in before replying!");
    return;
  }

  const parentDocPath = (function () {
    if (!selectedComment) return null;
    let path = selectedComment.getAttribute("data-doc-path");
    if (path) return path;
    const ancestor = selectedComment.closest("[data-doc-path]");
    return ancestor ? ancestor.getAttribute("data-doc-path") : null;
  })();
  if (!parentDocPath) {
    console.warn("No doc path found for reply target");
    return;
  }

  try {
    // ensure we have the author's photoURL right before writing
    const uid = user?.uid || currentUid || null;
    let photoURL = "./images/defaultProfilePicture.png";
    if (uid) {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc && userDoc.exists() && userDoc.data().photoURL) {
        photoURL = userDoc.data().photoURL;
      }
    }

    // build collection path segments and reserve a numeric id for the reply
    const parentSegments = parentDocPath.split("/"); // e.g. ["threads","1","comments","5"]
    const repliesColl = collection(db, ...parentSegments, "replies");

    // get a numeric id (keeps numbering consistent with comments)
    const getCount = await getCountFromServer(repliesColl);
    const newID = getCount.data().count;

    // write reply using canonical field name 'photoURL'
    const replyDocRef = doc(db, ...parentSegments, "replies", newID.toString());
    await setDoc(replyDocRef, {
      id: newID,
      author,
      userID: uid || null, // <-- store author UID for replies
      photoURL, // <-- use freshly-resolved photoURL
      content,
      date: Date.now(),
    });

    // include photoURL when rendering locally
    const reply = {
      id: newID,
      author,
      content,
      date: Date.now(),
      photoURL,
      userID: uid || null,
    };
    addReply(reply, selectedComment, newID.toString(), replyDocRef.path);
    txt.value = "";
  } catch (err) {
    console.error("Failed to post reply:", err);
    alert("Failed to post reply. Check console for details.");
  }
}

// addReply inserts a nested .comment and leaves its .reply container ready for more replies
function addReply(reply, selectedComment, replyId, docPath) {
  const replyHtml = renderCommentHTML(
    reply,
    replyId || "",
    reply.photoURL || "./images/icons/defaultProfilePicture.png",
    docPath || "",
    reply.userID || "" // <-- include user id on render
  );
  const target = selectedComment && selectedComment.querySelector(".reply");
  if (target) {
    target.insertAdjacentHTML("beforeend", replyHtml);
    updateSpine(target); // adjust height after adding a reply
  }
  updateAllSpines();
}

//Make comments clickable to reply - made by the one and only TENSILLIONNNNN

/*
 * The goal of this code is to add an event listener to each comment element
 * so that when a comment is clicked, it gets a cool border, How I plan to do that
 * is by adding a CSS class to the clicked comment, and removing that class from any other comments
 * This way, only one comment can have the border at a time
 * The CSS class will be defined in forum-clickable.css
 */

document.addEventListener("click", (e) => {
  const headerEl = document.querySelector(".header");
  const content = e.target.closest(".comment-content");
  if (!content) return;

  // toggle selection: deselect if already selected, otherwise select this and clear others
  if (content.classList.contains("selected-comment")) {
    content.classList.remove("selected-comment");
    content.parentNode.classList.remove("glow");
    headerEl.classList.add("glow");
  } else {
    document
      .querySelectorAll(".comment-content.selected-comment")
      .forEach((c) => {
        c.classList.remove("selected-comment");
        c.parentNode.classList.remove("glow");
      });
    content.classList.add("selected-comment");
    content.parentNode.classList.add("glow");
    headerEl.classList.remove("glow");
  }
});

// delegated options menu for comments & replies (document-level)
document.addEventListener("click", async (ev) => {
  const btn = ev.target.closest(".options-button");
  if (!btn) return;

  ev.stopPropagation();

  // close any existing menus
  document.querySelectorAll(".options-menu").forEach((m) => m.remove());

  const commentEl = btn.closest(".comment");
  if (!commentEl) return;

  const docPath = commentEl.getAttribute("data-doc-path") || "";
  const ownerId = commentEl.getAttribute("data-user-id") || "";
  const currentUidLocal = auth.currentUser ? auth.currentUser.uid : currentUid;

  // build menu element
  const menu = document.createElement("div");
  menu.className = "options-menu";
  menu.setAttribute("role", "menu");

  // reply/view item
  const replyItem = document.createElement("div");
  replyItem.className = "options-menu-item";
  replyItem.textContent = "Reply";
  replyItem.addEventListener("click", (e) => {
    e.stopPropagation();
    // simulate selecting the comment to reply to
    const content = commentEl.querySelector(".comment-content");
    if (content) {
      // clear others
      document
        .querySelectorAll(".comment-content.selected-comment")
        .forEach((c) => {
          c.classList.remove("selected-comment");
          c.parentNode.classList.remove("glow");
        });
      content.classList.add("selected-comment");
      content.parentNode.classList.add("glow");
      document.querySelector(".header")?.classList.remove("glow");
    }
    // remove menu
    menu.remove();
  });
  menu.appendChild(replyItem);

  // only show delete if current user matches ownerId
  if (currentUidLocal && ownerId && currentUidLocal === ownerId) {
    const delItem = document.createElement("div");
    delItem.className = "options-menu-item options-menu-delete";
    delItem.textContent = "Delete";
    delItem.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this item? This cannot be undone.")) return;
      try {
        if (!docPath) throw new Error("no document path");
        const segments = docPath.split("/");
        await deleteDoc(doc(db, ...segments));
        commentEl.remove();
        updateAllSpines();
      } catch (err) {
        console.error("Failed to delete comment/reply", err);
        alert("Failed to delete. See console.");
      }
    });
    menu.appendChild(delItem);
  }

  // attach menu to the comment (comment must be position:relative)
  commentEl.appendChild(menu);
  menu.style.position = "absolute";
  menu.style.top = `${btn.offsetTop + btn.offsetHeight + 6}px`;
  menu.style.right = `8px`;

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
});
