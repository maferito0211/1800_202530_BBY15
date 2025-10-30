import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", () => {
  const nameElement = document.getElementById("displayName");

  // update once Firebase finishes initialization
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // If no user is signed in → redirect back to login page.
      location.href = "./loginPage.html";
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const name = userDoc.exists()
      ? userDoc.data().name
      : user.displayName || user.email;

    // Update the welcome message with their name/email.
    if (nameElement) {
      nameElement.textContent = `Hello, ${name}!`;
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
