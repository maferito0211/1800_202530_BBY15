import { db } from "./firebaseConfig.js";
import { doc, documentId } from "firebase/firestore";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  collectionGroup,
  query,
  where,
  setDoc,
  arrayUnion,
  arrayRemove,
  increment,
  deleteDoc, // <-- added
} from "firebase/firestore";

//Used to grab the user's id for the profile picture, Thor you can probably use this for
// you way to check if user is signed in to post comments! - Tens (tyson)
import { getAuth, onAuthStateChanged } from "firebase/auth";

const auth = getAuth();
let currentUid = null;
let currentUserPhotoURL = null;

const user =
  auth.currentUser || (await new Promise((r) => onAuthStateChanged(auth, r)));

// --- disable "New Comment" when not signed in, and grey out button --------------------
const newCommentBtn = document.getElementById("postCommentButton");

if (!user) {
  newCommentBtn.classList.add("disabled");
  newCommentBtn.setAttribute("aria-disabled", "true");
}

// ------------------------------------------------------------------

let author = "Anonymous";
if (user) {
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    author = userDoc.exists()
      ? userDoc.data().username
      : localStorage.getItem("displayName") || "Anonymous";
  } catch (e) {
    console.error("Error fetching username:", e);
    author = localStorage.getItem("displayName") || "Anonymous";
  }
} else {
  author = localStorage.getItem("displayName") || "Anonymous";
}

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
            <a id="logoContainer" href="./index.html">
              <img id="logo" src="./images/logoImg.png" alt="Site Logo" />
            </a>
          </div>
`;

document.getElementById("return-button").addEventListener("click", function () {
  window.location.href = "./forumMain.html";
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

  const userSnapshot = await getDoc(doc(db, "users", threadDoc.data().userID));
  const opProfilePictureURL =
    userSnapshot && userSnapshot.exists() ? userSnapshot.data().photoURL : null;

  // 🔥 intentamos leer locationId del thread
  let locationHtml = "";
  const locationId = threadDoc.data().locationId;

  if (locationId) {
    try {
      const locationDoc = await getDoc(doc(db, "locations", locationId));
      if (locationDoc.exists()) {
        const locData = locationDoc.data();
        const locName = locData.name;
        const locCategory = locData.category || "";

        locationHtml = `
          <p class="post-location">
            📍 <strong>${locName}</strong> ${
          locCategory ? `(${locCategory})` : ""
        }
            <button 
              type="button" 
              class="view-location-button" 
              data-location-id="${locationId}">
              View on Map
            </button>
          </p>
        `;
      }
    } catch (err) {
      console.error("Failed to load location for thread", err);
    }
  }

  const headerHtml = ` 
    <div class ="op-forum-top-container glow"> 
      <img class="forum-profile-image" src="${opProfilePictureURL || ""}"></img>
      <h2 class="title"> ${threadDoc.data().title}</h2>
      <p class="timestamp"> ${new Date(threadDoc.data().date)
        .toLocaleString()
        .replace(/(.*)\D\d+/, "$1")}
      </p>
    </div>
    ${locationHtml}
    <p> ${threadDoc.data().content} </p>
    <div class="forum-image-container">
      ${
        threadDoc.data().image || ""
          ? `<img class="forum-post-image" src="data:image/jpeg;base64,${
              threadDoc.data().image || ""
            }"></img>`
          : ""
      }
    </div>
    <div class="subtitle">
    <p class="commentcount"> ${threadDoc.data().comment_count} comments</p>
    <button type="button" id="likes" ${
      threadDoc.data().likes.includes(author)
        ? `
        style="
        background-color: var(--success);
        color: var(--highlight);
      "`
        : ""
    }>
    ${threadDoc.data().likes.length}
  <img src="./images/likeButton.png" class="like-icon-small" alt="Like Icon">
  </button>
      <p class="empty"></p>
      <button type="button" id="dislikes" ${
        threadDoc.data().dislikes.includes(author)
          ? `
        style="
        background-color: #741a1a;
        color: var(--highlight);
      "`
          : ""
      }>
      ${threadDoc.data().dislikes.length}
      <img src="./images/dislikeButton.png" class="dislike-icon-small" alt="Dislike Icon">

  </button>
    </div>
  `;
  header.insertAdjacentHTML("beforeend", headerHtml);
}

// después del bucle, añadimos listeners al botón "View on Map"
document.querySelectorAll(".view-location-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const locId = btn.dataset.locationId;
    window.location.href = `./map.html?locationId=${locId}`;
  });
});

// Adds username to likes array and updates the html to reflect
document.getElementById("likes").addEventListener("click", likebtn);

async function likebtn() {
  if (author === "Anonymous" || author === "anonymous") {
    alert("Please sign in before liking!");
  } else {
    const threadDocRef = doc(db, "threads", id.toString());
    const threadDocSnap = await getDoc(threadDocRef);
    var likeCount = threadDocSnap.data().likes.length;
    var increased;
    if (threadDocSnap.data().likes.length == 0) {
      likeCount++;
      increased = true;
      await updateDoc(threadDocRef, {
        likes: arrayUnion(author),
      });
    } else {
      threadDocSnap.data().likes.forEach(async (u) => {
        if (u === author) {
          likeCount--;
          increased = false;
          await updateDoc(threadDocRef, {
            likes: arrayRemove(author),
          });
        } else {
          likeCount++;
          increased = true;
          await updateDoc(threadDocRef, {
            likes: arrayUnion(author),
          });
        }
      });
    }
    giveBackLikeBtn(likeCount, ".commentcount", "likes", increased);
  }
}

function giveBackLikeBtn(likeCount, classSelector, likeType, increased) {
  const existing = document.getElementById(likeType);
  if (existing) existing.remove();
  const isLike = likeType === "likes";

  document.querySelector(classSelector).insertAdjacentHTML(
    "afterend", //Conditional operator in a conditional operator...
    `<button type="button" id="${likeType}" ${
      increased
        ? likeType === "likes"
          ? `style="background-color: var(--success); color: var(--highlight); "`
          : `style="background-color: #741a1a; color: var(--highlight); "`
        : ""
    } >
    <span class="${isLike ? "like-count" : "dislike-count"}">${likeCount}${
      isLike ? "" : ""
    }</span>
      <img src="./images/${
        isLike ? "likeButton" : "dislikeButton"
      }.png" class="like-icon-small" alt="${
      likeType.charAt(0).toUpperCase() + likeType.slice(1)
    } Icon">
    </button>`
  );
  document
    .getElementById(likeType)
    .addEventListener("click", likeType === "likes" ? likebtn : dislikebtn);
}

// Adds username to likes array and updates the html to reflect
document.getElementById("dislikes").addEventListener("click", dislikebtn);

async function dislikebtn() {
  if (author === "Anonymous" || author === "anonymous") {
    alert("Please sign in before liking!");
  } else {
    const threadDocRef = doc(db, "threads", id.toString());
    const threadDocSnap = await getDoc(threadDocRef);
    var dislikeCount = threadDocSnap.data().dislikes.length;
    var increased;
    if (threadDocSnap.data().dislikes.length == 0) {
      dislikeCount++;
      increased = true;
      await updateDoc(threadDocRef, {
        dislikes: arrayUnion(author),
      });
    } else {
      threadDocSnap.data().dislikes.forEach(async (u) => {
        if (u === author) {
          dislikeCount--;
          increased = false;
          await updateDoc(threadDocRef, {
            dislikes: arrayRemove(author),
          });
        } else {
          dislikeCount++;
          increased = true;
          await updateDoc(threadDocRef, {
            dislikes: arrayUnion(author),
          });
        }
      });
    }
    giveBackLikeBtn(dislikeCount, ".empty", "dislikes", increased);
  }
}

// --- nesting depth helpers -----------------------------------------
const MAX_REPLY_DEPTH = 9;
/** depth = 1 for top-level comments (threads/.../comments/X)
 *  depth increases by 1 for each '/replies/' segment in the doc path
 */
function computeDepth(docPath = "") {
  if (!docPath) return 1;
  const matches = docPath.match(/\/replies(\/|$)/g);
  return (matches ? matches.length : 0) + 1;
}
// ------------------------------------------------------------------

// Display comments on page load
const commentDocRef = await getDocs(
  collection(db, "threads", id.toString(), "comments")
);

//For each loop through all comments in the collection
for (const docSnap of commentDocRef.docs) {
  const data = docSnap.data();
  const depth = computeDepth(docSnap.ref.path); // top-level => 1
  const html = renderCommentHTML(
    {
      author: data.user,
      content: data.content,
      date: data.date,
      likes: data.likes || 0,
      dislikes: data.dislikes || 0,
    },
    docSnap.id,
    data.photoURL || data.currentUserPhotoURL || "",
    docSnap.ref.path,
    data.userID || "",
    depth
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
    if (!auth.currentUser) {
      alert("Please sign in before commenting!");
      return;
    }

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

  if (author === "Anonymous" || author === "anonymous") {
    alert("Please sign in before commenting!");
  } else {
    var txt = document.querySelector("textarea");

    var content = document.querySelector("textarea");
    await updateDoc(doc(db, "idCounter", "CommentCounter"), {
      CRcounter: increment(1),
    });
    var newID = (await getDoc(doc(db, "idCounter", "CommentCounter"))).data()
      .CRcounter;

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
        likes: [],
        dislikes: [],
      }
    );

    var comment = {
      content: txt.value,
      date: Date.now(),
      author: author,
      likes: [],
      dislikes: [],
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
  await updateDoc(doc(db, "threads", id.toString()), {
    comment_count: increment(1),
  });
}

//Adds the comment to the screen
function addComments(
  comment,
  commentId,
  authorProfilePictureURL,
  docPath,
  authorUid
) {
  const depth = computeDepth(docPath);
  const commentHtml = renderCommentHTML(
    comment,
    commentId || "",
    authorProfilePictureURL || "",
    docPath || "",
    authorUid || "",
    depth
  );
  updateAllSpines();
  if (comments) comments.insertAdjacentHTML("beforeend", commentHtml);
  //Add event listener for likes and dislikes. this works.
  document.getElementById(commentId).addEventListener("click", () => {
    commLikebtn(commentId);
  });
  document.getElementById(commentId + ".5").addEventListener("click", () => {
    commDislikebtn(commentId + ".5");
  });
}

// helper function for EVERY HTML block, like replies and comments and stuff, just everything
function renderCommentHTML(
  comment,
  commentId,
  authorProfilePictureURL,
  docPath,
  authorUserId,
  depth /* new param, integer */
) {
  const d = Number(depth || computeDepth(docPath));
  const noReplyClass = d >= MAX_REPLY_DEPTH ? " no-reply" : "";
  return `
    <div class="comment" data-comment-id="${commentId || ""}" data-doc-path="${
    docPath || ""
  }" data-user-id="${authorUserId || ""}" data-depth="${d}">
      <div class="comment-container">
        <div class="comment-top">
          <p class="user"> <strong>${comment.author}</strong></p>
          <p class="timestamp">${new Date(comment.date)
            .toLocaleString()
            .replace(/(.*)\D\d+/, "$1")}</p>
            <div class="like-dislike-buttons">
            <button class="comLikes" id="${commentId}" name="${commentId}" ${
    comment.likes.includes(author)
      ? `
        style="
        background-color: var(--success);
        color: var(--highlight);
      "`
      : ""
  }>${
    comment.likes.length == 0 ? 0 : comment.likes.length || comment.likes || 0
  } <img src="./images/likeButton.png" class="like-icon-small" alt="Like Icon"></button>
            <button class="comDislikes" id="${commentId}.5" name="${commentId}.5" ${
    comment.dislikes.includes(author)
      ? `
        style="
        background-color: #741a1a;
        color: var(--highlight);
      "`
      : ""
  }>${
    comment.dislikes.length == 0
      ? 0
      : comment.dislikes.length || comment.dislikes || 0
  } <img src="./images/dislikeButton.png" class="dislike-icon-small" alt="Dislike Icon">
  </button>
  
          <!-- options button for this comment/reply -->
          <button class="options-button" aria-label="Options" title="Options" type="button">⋯</button>
        </div>
        </div>
        <div class="comment-content${noReplyClass}">
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

// Makes an event listener for all comment like buttons, and then calls commLikebtn for that comment
function addCommLikeEventListeners() {
  const likeButtons = document.querySelectorAll(".comLikes");
  likeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      commLikebtn(btn.name);
    });
  });
  const dislikeButtons = document.querySelectorAll(".comDislikes");
  dislikeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      commDislikebtn(btn.name);
    });
  });
}
addCommLikeEventListeners();

async function commLikebtn(i) {
  if (author === "Anonymous" || author === "anonymous") {
    alert("Please sign in before liking!");
  } else {
    const q = query(
      collection(db, "threads", id.toString(), "comments"),
      where("id", "==", parseInt(i))
    );
    var likedComm = await getDocs(q);
    var failed = false;
    do {
      try {
        failed = false;
        var increased;
        var commLikeCount = likedComm.docs[0].data().likes.length;
        if (commLikeCount == 0) {
          commLikeCount++;
          increased = true;
          await updateDoc(likedComm.docs[0].ref, {
            likes: arrayUnion(author),
          });
        } else if (likedComm.docs[0].data().likes.includes(author)) {
          commLikeCount--;
          increased = false;
          await updateDoc(likedComm.docs[0].ref, {
            likes: arrayRemove(author),
          });
        } else {
          commLikeCount++;
          increased = true;
          await updateDoc(likedComm.docs[0].ref, {
            likes: arrayUnion(author),
          });
        }
        const thisBtn = document.getElementById(i.toString());
        thisBtn.innerHTML =
          commLikeCount +
          ' <img src="./images/likeButton.png" class="like-icon-small" alt="Like Icon">';
        thisBtn.style.backgroundColor = increased
          ? "var(--success)"
          : "var(--highlight)";
        thisBtn.style.color = !increased
          ? "var(--success)"
          : "var(--highlight)";
      } catch {
        const q2 = query(
          collectionGroup(db, "replies"),
          where("id", "==", parseInt(i))
        );
        likedComm = await getDocs(q2);
        failed = true;
      }
    } while (failed);
  }
}

async function commDislikebtn(i) {
  if (author === "Anonymous" || author === "anonymous") {
    alert("Please sign in before liking!");
  } else {
    const q = query(
      collection(db, "threads", id.toString(), "comments"),
      where("id", "==", parseFloat(i) - 0.5)
    );
    var dislikedComm = await getDocs(q);
    var failed = false;
    do {
      try {
        failed = false;
        var increased;
        var commDislikeCount = dislikedComm.docs[0].data().dislikes.length;
        if (commDislikeCount == 0) {
          commDislikeCount++;
          increased = true;
          await updateDoc(dislikedComm.docs[0].ref, {
            dislikes: arrayUnion(author),
          });
        } else if (dislikedComm.docs[0].data().dislikes.includes(author)) {
          commDislikeCount--;
          increased = false;
          await updateDoc(dislikedComm.docs[0].ref, {
            dislikes: arrayRemove(author),
          });
        } else {
          commDislikeCount++;
          increased = true;
          await updateDoc(dislikedComm.docs[0].ref, {
            dislikes: arrayUnion(author),
          });
        }
        const thisBtn = document.getElementById(i.toString());
        thisBtn.innerHTML =
          commDislikeCount +
          '<img src="./images/dislikeButton.png" class="dislike-icon-small" alt="Dislike Icon">';
        thisBtn.style.backgroundColor = increased
          ? "#741a1a"
          : "var(--highlight)";
        thisBtn.style.color = !increased ? "#741a1a" : "var(--highlight)";
      } catch {
        const q2 = query(
          collectionGroup(db, "replies"),
          where("id", "==", parseInt(i))
        );
        dislikedComm = await getDocs(q2);
        failed = true;
      }
    } while (failed);
  }
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
      const depth = computeDepth(rDoc.ref.path);
      const html = renderCommentHTML(
        r,
        rDoc.id,
        authorPhoto,
        rDoc.ref.path,
        authorUid,
        depth
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

// selection toggler — prevent selecting if at max depth
document.addEventListener("click", (e) => {
  const headerEl = document.querySelector(".op-forum-top-container");
  const content = e.target.closest(".comment-content");
  if (!content) return;

  const commentEl = content.closest(".comment");
  const depth = commentEl
    ? Number(commentEl.getAttribute("data-depth") || 1)
    : 1;
  if (depth >= MAX_REPLY_DEPTH) {
    // deepest level: do not allow selecting for reply
    return;
  }

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

// takes user details and adds them to reply, then calls addReply(reply)
async function postReply(selectedComment) {
  var txt = document.querySelector("textarea");
  const content = txt.value.trim();
  if (!content) return;

  const user =
    auth.currentUser || (await new Promise((r) => onAuthStateChanged(auth, r)));

  let author = "Anonymous";
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      author = userDoc.exists()
        ? userDoc.data().username
        : localStorage.getItem("displayName") || "Anonymous";
    } catch (e) {
      console.error("Error fetching username:", e);
      author = localStorage.getItem("displayName") || "Anonymous";
    }
  } else {
    author = localStorage.getItem("displayName") || "Anonymous";
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

  // disallow creating a reply that would exceed MAX_REPLY_DEPTH
  const parentDepth = computeDepth(parentDocPath);
  const childDepth = parentDepth + 1;
  if (childDepth > MAX_REPLY_DEPTH) {
    alert("This comment has reached the maximum reply depth.");
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
    await updateDoc(doc(db, "idCounter", "CommentCounter"), {
      CRcounter: increment(1),
    });
    var newID = (await getDoc(doc(db, "idCounter", "CommentCounter"))).data()
      .CRcounter;

    // write reply using canonical field name 'photoURL'
    const replyDocRef = doc(db, ...parentSegments, "replies", newID.toString());
    await setDoc(replyDocRef, {
      id: newID,
      author,
      userID: uid || null, // <-- store author UID for replies
      photoURL, // <-- use freshly-resolved photoURL
      content,
      date: Date.now(),
      likes: [],
      dislikes: [],
    });

    // include photoURL when rendering locally
    const reply = {
      id: newID,
      author,
      content,
      date: Date.now(),
      photoURL,
      userID: uid || null,
      likes: [],
      dislikes: [],
    };
    // compute depth for newly created reply
    const replyDepth = computeDepth(replyDocRef.path);
    addReply(
      reply,
      selectedComment,
      newID.toString(),
      replyDocRef.path,
      replyDepth
    );
    txt.value = "";
    await updateDoc(doc(db, "threads", id.toString()), {
      comment_count: increment(1),
    });
  } catch (err) {
    console.error("Failed to post reply:", err);
    alert("Failed to post reply. Check console for details.");
  }
}

// addReply inserts a nested .comment and leaves its .reply container ready for more replies
function addReply(reply, selectedComment, replyId, docPath, depth) {
  const replyHtml = renderCommentHTML(
    reply,
    replyId || "",
    reply.photoURL || "./images/icons/defaultProfilePicture.png",
    docPath || "",
    reply.userID || "", // <-- include user id on render
    depth || computeDepth(docPath)
  );
  const target = selectedComment && selectedComment.querySelector(".reply");
  if (target) {
    target.insertAdjacentHTML("beforeend", replyHtml);
    updateSpine(target); // adjust height after adding a reply
  }
  updateAllSpines();
  addCommLikeEventListeners();
}

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
  const depth = Number(
    commentEl.getAttribute("data-depth") || computeDepth(docPath)
  );
  const currentUidLocal = auth.currentUser ? auth.currentUser.uid : currentUid;

  // build menu element
  const menu = document.createElement("div");
  menu.className = "options-menu";
  menu.setAttribute("role", "menu");

  // reply/view item - only show Reply if depth < MAX_REPLY_DEPTH
  if (depth < MAX_REPLY_DEPTH) {
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
  } else {
    const info = document.createElement("div");
    info.className = "options-menu-item";
    info.textContent = "Max reply depth reached";
    info.style.opacity = "0.7";
    menu.appendChild(info);
  }

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
        await updateDoc(doc(db, "threads", id.toString()), {
          comment_count: increment(-1),
        });
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

// Forum onboard overlay
(function registerForumOnboard() {
  const STORAGE_KEY = "forumOnboardHidden";

  function createOnboardElement() {
    const wrap = document.createElement("div");
    wrap.id = "forum-onboard-overlay";
    wrap.innerHTML = `
      <div class="onboard-card" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
        <h2 id="onboard-title">Welcome to the Forum</h2>
        <div class="onboard-body">
          <p><strong>How to reply</strong></p>
          <ol>
            <li>Tap any comment to select it for replying (Tapping it again unselects it).</li>
            <li>Write your reply in the text box at the bottom.</li>
            <li>Press <em>Post</em> to submit. Sign in is required for posting.</li>
          </ol>
          <p><strong>Tips</strong></p>
          <ul>
            <li>You can use the options menu (⋯) on a comment to reply or delete (if it's yours).</li>
            <li>Click 'View on Map' on the OP's post to see the location if the post is connected to one.</li>
          </ul>
        </div>
        <div class="onboard-separator">
        <label class="onboard-dismiss"><input type="checkbox" id="onboard-dont-show"> Don't show again</label>
        <div class="onboard-actions">
          <button id="onboard-close" type="button">Got it</button>
        </div>
        </div>
      </div>
    `;
    return wrap;
  }

  function showOnboard() {
    if (localStorage.getItem(STORAGE_KEY) === "1") return; // user opted out

    // create modal and append
    const el = createOnboardElement();
    document.body.appendChild(el);
    document.body.classList.add("modal-open");

    // focus management: focus the close button
    const closeBtn = document.getElementById("onboard-close");
    const dontShow = document.getElementById("onboard-dont-show");
    closeBtn?.focus();

    function close() {
      const dont = dontShow && dontShow.checked;
      if (dont) localStorage.setItem(STORAGE_KEY, "1");
      document.body.classList.remove("modal-open");
      const node = document.getElementById("forum-onboard-overlay");
      if (node) node.remove();
    }

    // close handlers
    closeBtn?.addEventListener("click", close);
    el.addEventListener("click", (e) => {
      // clicking overlay outside card closes (but clicking card doesn't)
      if (e.target === el) close();
    });

    // close on Escape
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    // cleanup listener when closed
    closeBtn?.addEventListener("click", () =>
      document.removeEventListener("keydown", onKey)
    );
  }

  // run when DOM is ready — forumpost.js is a module, but ensure elements exist
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showOnboard);
  } else {
    showOnboard();
  }
})();
