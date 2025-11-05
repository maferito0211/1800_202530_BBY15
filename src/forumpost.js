import { onAuthReady } from "./authentication.js";
import { db, auth } from "./firebaseConfig.js";
import { doc } from "firebase/firestore";
import { getDoc } from "firebase/firestore";

var id = window.location.search.slice(4);

const docSnap = await getDoc(doc(db, "threads", id));
const docData = docSnap.data();

var header = document.querySelector(".header");
var headerHtml = `
      <h2 class="title"> ${docData.title}</h2>
      <p> ${docData.content} </p>
      <div class="subtitle">
        <p class="timestamp"> ${new Date(docData.date).toLocaleString()}</p>
        <p class="commentcount"> ${docData.comment_count} comments</p>
      </div>
      `;
header.insertAdjacentHTML("beforeend", headerHtml);

document
  .getElementById("postCommentButton")
  .addEventListener("click", function () {
    postComment();
  });

//Takes User details and adds them to comment, then calls addComment(comment)
async function postComment() {
  var txt = document.querySelector("textarea");

  // determine author from Firebase auth if available
  var author = "anonymous";

  try {
    if (window.firebaseAuth && window.firebaseAuth.currentUser) {
      const user = window.firebaseAuth.currentUser;

      // If Firestore helper functions are available, try to load the user doc
      if (
        typeof window.firebaseDb === "object" &&
        typeof window.firebaseDb.getDoc === "function" &&
        typeof doc === "function" &&
        typeof db !== "undefined"
      ) {
        const userDoc = await window.firebaseDb.getDoc(
          doc(db, "users", user.uid)
        );
        if (userDoc && userDoc.exists()) {
          const data = userDoc.data();
          author = data.name || "anonymous";
        } else {
          author = "anonymous";
        }
      } else {
        // Fallback to auth profile info if present
        author =
          user.displayName ||
          (user.email && user.email.split("@")[0]) ||
          "anonymous";
      }
    }
  } catch (e) {
    author = "anonymous";
  }

  var comment = {
    content: txt.value,
    date: Date.now(),
    author: author,
  };
  addComments(comment);
  txt.value = "";
}

//Adds the comment to the screen
function addComments(comment) {
  var commentHtml = `
        <div class="comment">
        <div class="comment-top">
          <h4 class="user"> ${comment.author}</h4>
          <p class="timestamp">${new Date(comment.date).toLocaleString()}</p>
        </div>
        <div class="comment content">
          ${comment.content}
        </div>
        <div class="reply">
        </div>
      </div>
        `;
  comments.insertAdjacentHTML("beforeend", commentHtml);
}

//takes user details and adds them to reply, then calls addReply(reply)
function postReply() {
  var txt = document.querySelector("textarea");
  var reply = {
    content: txt.value,
    date: Date.now(),
    author: "User0",
  };
  addReply(reply);
  txt.value = "";
}

//adds reply to comment
function addReply(reply) {
  var replyHtml = `
        <div class="comment-top">
          <h4 class="user"> ${reply.author}</h4>
          <p class="timestamp">${new Date(reply.date).toLocaleString()}</p>
        </div>
        <div class="comment content">
          ${reply.content}
        </div>
        <div class="reply">
        </div>
    `;
  replys.insertAdjacentHTML("beforeend", replyHtml);

  var replys = document.querySelector(".reply");
  for (let reply of comment.replys) {
  }
}
