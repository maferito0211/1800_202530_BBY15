import { auth } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { signOut } from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
  const nameEl = document.getElementById("displayName");

  // optimistic render from cache (instant)
  const cached = localStorage.getItem("displayName");
  if (nameEl && cached) nameEl.textContent = cached;

  // try immediate value if SDK already restored it
  const immediate = auth.currentUser;
  if (immediate && nameEl) {
    const raw = immediate.displayName || immediate.email || "Profile";
    const short = raw.includes("@") ? raw.split("@")[0] : raw;
    nameEl.textContent = short;
  }

  // update once Firebase finishes initialization
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      location.href = "./loginPage.html";
      return;
    }
    if (nameEl) {
      const raw = user.displayName || user.email || "Profile";
      const shortName = raw.includes("@") ? raw.split("@")[0] : raw;
      nameEl.textContent = shortName;
      // update cache for next page load
      localStorage.setItem("displayName", shortName);
    }
  });

  const btn = document.getElementById("logoutBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      // redirect to login page after sign out
      location.href = "./loginPage.html";
    } catch (err) {
      console.error("Sign out failed:", err);
      alert("Sign out failed. Check console for details.");
    }
  });
});
