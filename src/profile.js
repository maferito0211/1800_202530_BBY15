// -------------------------------------------------------------
// profile.js — Displays user info from Firestore and Auth
// -------------------------------------------------------------
import { auth, db } from "./firebaseConfig.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const pageTitle = "👤PROFILE";

document.getElementById("pageTitleSection").innerHTML = pageTitle;

document.addEventListener("DOMContentLoaded", () => {
  const fullNameEl = document.getElementById("fullName");
  const usernameEl = document.getElementById("username");
  const bioEl = document.getElementById("bio");
  const profileImg = document.getElementById("profile-picture");
  const logoutBtn = document.getElementById("logoutBtn");

  // Load user info once auth state is ready
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "./loginPage.html";
      return;
    }

    const docRef = doc(db, "users", user.uid);
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};

    // Fill in user info
    fullNameEl.textContent =
      localStorage.getItem("fullName") ||
      `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
      user.displayName ||
      "Anonymous User";
    usernameEl.textContent = data.username
      ? `@${data.username}`
      : `@${user.email.split("@")[0]}`;
    bioEl.textContent = data.bio || "No bio yet.";
    profileImg.src =
      data.photoURL || user.photoURL || "./images/defaultProfilePicture.png";
  });

  // Logout functionality
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "./loginPage.html";

      localStorage.removeItem("displayName");
      localStorage.removeItem("fullName");
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Logout failed. Please try again.");
    }
  });
});
