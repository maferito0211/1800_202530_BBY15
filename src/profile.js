// -------------------------------------------------------------
// profile.js — Displays user info from Firestore and Auth
// -------------------------------------------------------------
import { auth, db } from "./firebaseConfig.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

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
    let snap = await getDoc(docRef);

    // 🔥 If user doc does NOT exist yet, create it now
    if (!snap.exists()) {
      // Try to get full name from localStorage or Firebase Auth
      const fullNameFromLocal =
        localStorage.getItem("fullName") || user.displayName || "";
      let inferredFirstName = "";
      let inferredLastName = "";

      if (fullNameFromLocal) {
        const parts = fullNameFromLocal.trim().split(/\s+/);
        inferredFirstName = parts[0] || "";
        inferredLastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
      }

      const defaultProfile = {
        firstName: inferredFirstName,
        lastName: inferredLastName,
        username: user.email ? user.email.split("@")[0] : "",
        email: user.email || "",
        bio: "",
        photoURL: user.photoURL || "./images/defaultProfilePicture.png",
        createdAt: serverTimestamp(),
        comment_count: 0,
      };

      try {
        await setDoc(docRef, defaultProfile);
        console.log("✅ User document auto-created from profile.js");
        snap = await getDoc(docRef); // reload with fresh data
      } catch (err) {
        console.error("❌ Failed to create user document from profile:", err);
      }
    }

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

  // 🔓 Logout functionality (igual que antes)
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
