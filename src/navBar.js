import { auth } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";

console.log("navBar.js loaded ");

document.addEventListener("DOMContentLoaded", () => {
  const profileLink = document.getElementById("profileIcon");
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

onAuthStateChanged(auth, (user) => {
  const profileIcon = document.getElementById("profileIcon");
  if (user) {
    profileIcon.setAttribute("href", "./profile.html");
  } else {
    profileIcon.setAttribute("href", "./loginPage.html");
  }
});
