import { onAuthReady } from "./authentication.js";
import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  increment,
  getDoc,
  getCountFromServer,
} from "firebase/firestore";

//Used to grab the user's id for the profile picture, Thor you can probably use this for
// you way to check if user is signed in to post comments! - Tens (tyson)
import { getAuth, onAuthStateChanged } from "firebase/auth";

localStorage.removeItem("forumImage");

const auth = getAuth();
let currentUid = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUid = user.uid; // <- current user's id
  } else {
    currentUid = null;
  }
});

// wait for initial auth state so currentUser is available before interacting
await new Promise((resolve) => onAuthStateChanged(auth, resolve));

//Display the header
const pageTitle = "💬FORUMS";

const urlParams = new URLSearchParams(window.location.search);
const locationIdFromUrl = urlParams.get("locationId");

const headerLeftSection = document.getElementById("header-left-section");

headerLeftSection.innerHTML = `
            <div>
              <button id="return-button">←</button>
            </div>
            <a id="logoContainer">
              <img id="logo" src="./images/logoImg.png" alt="Site Logo" />
            </a>
          </div>
`;

document.getElementById("return-button").addEventListener("click", function () {
  window.location.href = "./forum-main.html";
});

document.getElementById("pageTitleSection").innerHTML = pageTitle;
//Display header end

const querySnapshot = await getDocs(collection(db, "threads"));
const coll = collection(db, "threads");
const getCount = await getCountFromServer(coll);
const counterRef = await doc(db, "idCounter", "IdCounterDoc");
const getCountForID = await getDoc(doc(db, "idCounter", "IdCounterDoc"));

function uploadImage() {
  const input = document.getElementById("forumImageInput");
  if (!input) {
    console.error("forumImageInput not found");
    return;
  }

  input.addEventListener("change", handleFileSelect);

  async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // quick guard for non-image files
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    // create an image bitmap for reliable drawing (better memory characteristics)
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (e) {
      // fallback to Image + FileReader if createImageBitmap isn't available
      await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            bitmap = { width: img.width, height: img.height, img };
            resolve();
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // determine source dims
    const srcWidth = bitmap.width || (bitmap.img && bitmap.img.width);
    const srcHeight = bitmap.height || (bitmap.img && bitmap.img.height);

    // max dimension (change as needed)
    const MAX_DIM = 1024;

    let dstWidth = srcWidth;
    let dstHeight = srcHeight;
    if (Math.max(srcWidth, srcHeight) > MAX_DIM) {
      const scale = MAX_DIM / Math.max(srcWidth, srcHeight);
      dstWidth = Math.round(srcWidth * scale);
      dstHeight = Math.round(srcHeight * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = dstWidth;
    canvas.height = dstHeight;
    const ctx = canvas.getContext("2d");

    if (bitmap instanceof ImageBitmap) {
      ctx.drawImage(bitmap, 0, 0, dstWidth, dstHeight);
      bitmap.close && bitmap.close(); // free if supported
    } else if (bitmap.img) {
      ctx.drawImage(bitmap.img, 0, 0, dstWidth, dstHeight);
    }

    // compress to JPEG and reduce quality until under size target (200KB)
    const SIZE_TARGET_BYTES = 200 * 1024;
    let quality = 0.8;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);

    // dataUrl length is ~ (4/3)*bytes, so loop until below target or min quality
    while (dataUrl.length / 1.33 > SIZE_TARGET_BYTES && quality > 0.2) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    // final base64
    const base64String = dataUrl.split(",")[1];

    // try storing, handle quota errors
    try {
      localStorage.setItem("forumImage", base64String);
      console.log(
        "Compressed image stored in localStorage, size (KB):",
        Math.round(base64String.length / 1.33 / 1024)
      );
    } catch (err) {
      console.error("Failed storing image in localStorage:", err);
      alert(
        "Image still too large to save locally. Please pick a smaller image or reduce dimensions."
      );
      return;
    }

    // set preview (ensure preview element exists)
    const previewEl = document.getElementById("forumImagePreview");
    if (previewEl && previewEl.tagName === "IMG") {
      previewEl.style.display = "block";
      previewEl.src = dataUrl;
    } else if (previewEl) {
      // if existing element isn't an IMG, set background
      previewEl.style.backgroundImage = `url(${dataUrl})`;
      previewEl.style.backgroundSize = "cover";
    }
  }
}

//TLDR: This was vibe coded, and IDK what it does fully, but hopefully it downsizes images - Tens
uploadImage();

//You know what they say: all posters post posts
document.getElementById("post").addEventListener("click", async function () {
  var title = document.querySelector("#threadtitle");
  var content = document.querySelector("#content");
  const inputImage = localStorage.getItem("forumImage") || "";

  // read the live signed-in user
  const user =
    auth.currentUser || (await new Promise((r) => onAuthStateChanged(auth, r)));
  const uid = user ? user.uid : null;

  const userName =
    localStorage.getItem("displayName") || user?.displayName || "Anonymous";

  var newID = getCountForID.data().counter + 1;
  const ThreadRef = collection(db, "threads");
  var tags = -1;
  var ele = document.getElementsByName("filters");
  for (var i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      tags = i;
    }
  }

  if (userName != "Anonymous") {
    // Everytime a new thread is created, increment the counter by 1
    updateDoc(counterRef, { counter: increment(1) });

    await setDoc(doc(db, "threads", newID.toString()), {
      id: newID,
      user: userName,
      userID: uid, // <- stores UID reliably
      title: title.value,
      date: Date.now(),
      content: content.value,
      comment_count: 0,
      tags: tags,
      likes: [],
      dislikes: [],
      image: inputImage,
      locationId: locationIdFromUrl || null,
    });

    setTimeout(() => {
      window.location.href = `./forumpost.html?id=${newID}`;
    }, 3000);
  } else {
    alert("Please sign in before posting!");
  }
});

// Clear category selection button
document
  .getElementById("clearCategorySelection")
  .addEventListener("click", function () {
    var ele = document.getElementsByName("filters");
    for (var i = 0; i < ele.length; i++) {
      ele[i].checked = false;
    }
  });
