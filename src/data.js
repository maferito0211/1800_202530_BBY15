var threads = [
    {
        id: 1,
        title: "Thread 1",
        author: "User1",
        date: Date.now(),
        content: "Thread content",
        comments: [
            {
                author: "User2",
                date: Date.now(),
                content: "Comment text",
                replys: [
                    {
                        author: "User3",
                        date: Date.now(),
                        content: "reply content"
                    }
                ]
                
            },
            {
                author: "User2",
                date: Date.now(),
                content: "More comments"
            }
        ]
    },
    {
        id: 2,
        title: "Thread 2",
        author: "User1",
        date: Date.now(),
        content: "Thread content",
        comments: [
            {
                author: "User2",
                date: Date.now(),
                content: "Comment text"
            },
            {
                author: "User2",
                date: Date.now(),
                content: "More comments"
            }
        ]
    }
];

//Displays posted threads for forum-main.html
function displayThreads() {
    var thread;
      var container = document.querySelector("ul");
      for (let thread of threads) {
        var html =
          `<li>
            <a href="./forumpost.html?id=${thread.id}">
              <h4 class="title"> ${thread.title} </h4>
              <div class="subtitle">
                <p class="timestamp"> ${new Date(thread.date).toLocaleString()} </p>
                <p class="commentcount"> ${thread.comments.length} comments </p>
              </div>
            </a>
          </li>`;
        container.insertAdjacentHTML("beforeend", html);
      }
}

//forumpost functions

//Inserts the main post details on page load
    function addThread() {

      
      var header = document.querySelector('.header');
      var headerHtml = `
      <h2 class="title"> ${thread.title}</h2>
      <p> ${thread.content} </p>
      <div class="subtitle">
        <p class="timestamp"> ${new Date(thread.date).toLocaleString()}</p>
        <p class="commentcount"> ${thread.comments.length} comments</p>
      </div>
      `;
      header.insertAdjacentHTML("beforeend", headerHtml);
}

//Takes User details and adds them to comment, then calls addComment(comment)
function postComment() {
      var txt = document.querySelector('textarea');
      var comment = {
        content: txt.value,
        date: Date.now(),
        author: 'User0',
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
    console.log(thread.comments.length);
    
    
      }




//takes user details and adds them to reply, then calls addReply(reply)
function postReply() {
    var txt = document.querySelector("textarea");
    var reply = {
        content: txt.value,
        date: Date.now(),
        author: "User0"
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







      



