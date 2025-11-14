import { db } from "./firebaseConfig.js";
import { doc } from "firebase/firestore";
import {
  collection,
  getDocs,
  addDoc,
  getCountFromServer,
  query,
  where,
  setDoc,
} from "firebase/firestore";

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
document.querySelector("title").textContent = threadSnap.docs[0].data().title;

threadSnap.forEach((doc) => {
  var header = document.querySelector(".header");
  var headerHtml = `
      <h2 class="title"> ${doc.data().title}</h2>
      <p> ${doc.data().content} </p>
      <div class="subtitle">
        <p class="timestamp"> ${new Date(doc.data().date).toLocaleString()}</p>
        <p class="commentcount"> ${doc.data().comment_count} comments</p>
      </div>
      `;
  header.insertAdjacentHTML("beforeend", headerHtml);
});

// Display comments on page load
const commentDocRef = await getDocs(
  collection(db, "threads", id.toString(), "comments")
);

//For each loop through all comments in the collection
for (const docSnap of commentDocRef.docs) {
  // pass the document path so replies know where to be stored
  const html = renderCommentHTML(
    {
      author: docSnap.data().user,
      content: docSnap.data().content,
      date: docSnap.data().date,
    },
    docSnap.id,
    docSnap.ref.path
  );

  if (comments) comments.insertAdjacentHTML("beforeend", html);

  // find reply container just inserted for this comment and load nested replies recursively
  const commentEl = document.querySelector(
    `.comment[data-comment-id="${docSnap.id}"]`
  );
  const replyContainer = commentEl && commentEl.querySelector(".reply");

  // NOTE: call loadReplies with the full document path (docSnap.ref.path)
  if (replyContainer) await loadReplies(id, docSnap.ref.path, replyContainer);
}

// post button logic — detect visible selection (.comment-content) but use parent .comment for ids
document
  .getElementById("postCommentButton")
  .addEventListener("click", function () {
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
  });

//Takes User details and adds them to comment, then calls addComment(comment)
async function postComment() {
  var txt = document.querySelector("textarea");

  var author = localStorage.getItem("fullName") || "Anonymous";

  const coll = collection(db, "threads", id.toString(), "comments");
  const getCount = await getCountFromServer(coll);

  var content = document.querySelector("textarea");
  var newID = getCount.data().count;

  await setDoc(
    doc(db, "threads", id.toString(), "comments", newID.toString()),
    {
      id: newID,
      user: author,
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
  addComments(comment, newID.toString(), newDocPath);
  txt.value = "";
}

//Adds the comment to the screen
function addComments(comment, commentId, docPath) {
  const commentHtml = renderCommentHTML(
    comment,
    commentId || "",
    docPath || ""
  );
  if (comments) comments.insertAdjacentHTML("beforeend", commentHtml);
}

// helper function for EVERY HTML block, like replies and comments and stuff, just everything
function renderCommentHTML(comment, commentId, docPath) {
  return `
    <div class="comment" data-comment-id="${commentId || ""}" data-doc-path="${
    docPath || ""
  }">
      <div class="comment-top">
        <p class="user"> <b>${comment.author}</b></p>
        <p class="timestamp">${new Date(comment.date).toLocaleString()}</p>
      </div>
      <div class="comment-content">
        ${comment.content}
      </div>
      <div class="reply"></div>
    </div>
  `;
}

// recursive loader: loads replies for a given parent comment document path and appends to container
async function loadReplies(threadId, parentDocPath, container) {
  try {
    // Grabs the path and then splits it into segments to access the correct subcollection
    // e.g. "threads/1/comments/5" => ["threads","1","comments","5"], pretty cool huh
    const parentSegments = parentDocPath.split("/");
    const repliesSnap = await getDocs(
      collection(db, ...parentSegments, "replies")
    );

    // for each reply document found, render and insert into container, r = reply btw
    for (const rDoc of repliesSnap.docs) {
      const r = rDoc.data();
      // pass the full document path of this reply so its own replies are saved under it
      const html = renderCommentHTML(r, rDoc.id, rDoc.ref.path);
      container.insertAdjacentHTML("beforeend", html);

      // find the newly inserted comment element and its .reply container
      const newCommentEl = container.querySelector(
        `.comment[data-comment-id="${rDoc.id}"]`
      );
      const replyContainer =
        newCommentEl && newCommentEl.querySelector(".reply");

      // Recall's itself to load nested replies ~_~
      if (replyContainer) {
        await loadReplies(threadId, rDoc.ref.path, replyContainer);
      }
    }
  } catch (err) {
    console.error("Failed to load replies for", parentDocPath, err);
  }
}

//takes user details and adds them to reply, then calls addReply(reply)
async function postReply(selectedComment) {
  var txt = document.querySelector("textarea");
  const content = txt.value.trim();
  if (!content) return;

  const author = localStorage.getItem("displayName") || "anonymous";

  // get the document path for the selected comment (this can be a top-level comment or a nested reply)
  const parentDocPath =
    selectedComment &&
    selectedComment.dataset &&
    selectedComment.dataset.docPath;
  if (!parentDocPath) {
    console.warn("No doc path found for reply target");
    return;
  }

  try {
    // build collection path segments and reserve a numeric id for the reply
    const parentSegments = parentDocPath.split("/"); // e.g. ["threads","1","comments","5"]
    const repliesColl = collection(db, ...parentSegments, "replies");

    // get a numeric id (keeps numbering consistent with comments)
    const getCount = await getCountFromServer(repliesColl);
    const newID = getCount.data().count;

    // create a document reference for the numeric id and write using setDoc
    const replyDocRef = doc(db, ...parentSegments, "replies", newID.toString());
    await setDoc(replyDocRef, {
      id: newID,
      author,
      content,
      date: Date.now(),
    });

    // render reply locally as a nested .comment and allow further nesting
    const reply = { id: newID, author, content, date: Date.now() };
    // pass the numeric id and the full doc path so further replies are stored under this reply
    addReply(reply, selectedComment, newID.toString(), replyDocRef.path);
    txt.value = "";
  } catch (err) {
    console.error("Failed to post reply:", err);
    alert("Failed to post reply. Check console for details.");
  }
}

// addReply inserts a nested .comment and leaves its .reply container ready for more replies
function addReply(reply, selectedComment, replyId, docPath) {
  const replyHtml = renderCommentHTML(reply, replyId || "", docPath || "");
  const target = selectedComment && selectedComment.querySelector(".reply");
  if (target) target.insertAdjacentHTML("beforeend", replyHtml);
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
  const content = e.target.closest(".comment-content");
  if (!content) return;

  // toggle selection: deselect if already selected, otherwise select this and clear others
  if (content.classList.contains("selected-comment")) {
    content.classList.remove("selected-comment");
  } else {
    document
      .querySelectorAll(".comment-content.selected-comment")
      .forEach((c) => c.classList.remove("selected-comment"));
    content.classList.add("selected-comment");
  }
});
