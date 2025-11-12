// -------------------------------------------------------------
// editProfile.js — Allows users to edit profile fields securely
// with client-side validation and duplicate username checks
// -------------------------------------------------------------
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const storage = getStorage();

document.addEventListener("DOMContentLoaded", () => {
  const profileImg = document.getElementById("profile-picture");
  const fileInput = document.getElementById("profileImageInput");
  const form = document.getElementById("editProfileForm");
  const firstNameEl = document.getElementById("firstName");
  const lastNameEl = document.getElementById("lastName");
  const usernameEl = document.getElementById("username");
  const bioEl = document.getElementById("bio");

  let currentUser = null;
  let currentPhotoURL = null;

  // -------------------------------------------------------------
  // 1️⃣ Load user info and pre-fill form
  // -------------------------------------------------------------
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      location.href = "./loginPage.html";
      return;
    }

    currentUser = user;
    const docRef = doc(db, "users", user.uid);
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : {};

    firstNameEl.value = data.firstName || "";
    lastNameEl.value = data.lastName || "";
    usernameEl.value = data.username || "";
    bioEl.value = data.bio || "";

    profileImg.src =
      data.photoURL || user.photoURL || "./images/defaultProfilePicture.png";
    currentPhotoURL = profileImg.src;
  });

  // -------------------------------------------------------------
  // 2️⃣ Profile picture upload handler
  // -------------------------------------------------------------
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    try {
      const storageRef = ref(storage, `profilePictures/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await updateProfile(currentUser, { photoURL: url });
      await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url });

      profileImg.src = url;
      showToast("📸 Profile picture updated!");
    } catch (err) {
      console.error("Photo upload failed:", err);
      alert("Failed to upload photo. Try again.");
    }
  });

  // -------------------------------------------------------------
  // 3️⃣ Form submission with validation
  // -------------------------------------------------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const firstName = firstNameEl.value.trim();
    const lastName = lastNameEl.value.trim();
    const username = usernameEl.value.trim().toLowerCase();
    const bio = bioEl.value.trim();

    // --- Basic field validation ---
    if (!firstName || !lastName || !username) {
      showToast("⚠️ Please fill in all required fields.", "danger");
      return;
    }

    if (username.length < 3 || username.length > 20) {
      showToast("⚠️ Username must be between 3 and 20 characters.", "danger");
      return;
    }

    if (bio.length > 300) {
      showToast("⚠️ Bio must be 300 characters or less.", "danger");
      return;
    }

    // --- Check username uniqueness in Firestore ---
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const snapshot = await getDocs(q);

    // If someone else already uses this username
    if (!snapshot.empty && snapshot.docs[0].id !== currentUser.uid) {
      showToast("❌ This username is already taken.", "danger");
      return;
    }

    // --- Prepare data to save ---
    const updatedData = {
      firstName,
      lastName,
      username,
      bio,
      photoURL: currentPhotoURL,
    };

    try {
      await updateDoc(doc(db, "users", currentUser.uid), updatedData);
      await updateProfile(currentUser, {
        displayName: `${firstName} ${lastName}`,
      });

      localStorage.setItem("fullName", `${firstName} ${lastName}`);
      localStorage.setItem("displayName", username);

      showToast("✅ Profile updated successfully!");
      setTimeout(() => (window.location.href = "./profilePage.html"), 1500);
    } catch (err) {
      console.error(err);
      showToast("⚠️ Error saving changes. Try again.", "danger");
    }
  });

  // -------------------------------------------------------------
  // 4️⃣ Helper: show toast message
  // -------------------------------------------------------------
  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `alert alert-${type} text-center position-fixed top-0 start-50 translate-middle-x mt-3 shadow`;
    toast.style.zIndex = "2000";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
});
