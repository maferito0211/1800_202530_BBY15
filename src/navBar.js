import { auth } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
  const profileLink = document.getElementById("profile");
  if (!profileLink) return;

  // update href whenever auth state changes
  onAuthStateChanged(auth, (user) => {
    profileLink.href = user ? "./profilePage.html" : "./loginPage.html";
    console.log(
      "Auth state changed. User:",
      user ? user.uid : null,
      "Profile link ->",
      profileLink.href
    );
  });
});
