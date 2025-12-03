// -------------------------------------------------------------
// src/loginSignup.js
// -------------------------------------------------------------
// Part of the COMP1800 Projects 1 Course (BCIT).
// Starter code provided for students to use and adapt.
// Manages the login/signup form behaviour and redirects.
// -------------------------------------------------------------

import "../styles/loginPage.css";
import { loginUser, signupUser, authErrorMessage } from "./authentication.js";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebaseConfig.js";

// --- Login and Signup Page ---

const pageTitle = "👤PROFILE";

document.getElementById("pageTitleSection").innerHTML = pageTitle;

//Checks if the user is already logged in, if so redirects to the profile page
// firebase auth state listener
const auth = getAuth();
// guard to prevent onAuthStateChanged from redirecting while we are handling signup/login
let suppressAuthRedirect = false;

onAuthStateChanged(auth, (user) => {
  if (user && !suppressAuthRedirect) {
    // User is signed in, redirect to profile page
    window.location.href = "profilePage.html";
  }
});

// Handles toggling between Login/Signup views and form submits
// using plain DOM APIs for simplicity and maintainability.

function initAuthUI() {
  // --- DOM Elements ---
  const alertEl = document.getElementById("authAlert");
  const loginView = document.getElementById("loginView");
  const signupView = document.getElementById("signupView");
  const toSignupBtn = document.getElementById("toSignup");
  const toLoginBtn = document.getElementById("toLogin");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const redirectUrl = "index.html";

  // --- Helper Functions ---
  // Toggle element visibility
  function setVisible(el, visible) {
    el.classList.toggle("d-none", !visible);
  }

  // Show error message with accessibility and auto-hide
  let errorTimeout;
  function showError(msg) {
    alertEl.textContent = msg || "";
    alertEl.classList.remove("d-none");
    clearTimeout(errorTimeout);
    errorTimeout = setTimeout(hideError, 5000); // Auto-hide after 5s
  }

  // Hide error message
  function hideError() {
    alertEl.classList.add("d-none");
    alertEl.textContent = "";
    clearTimeout(errorTimeout);
  }

  // Enable/disable submit button for forms
  function setSubmitDisabled(form, disabled) {
    const submitBtn = form?.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = disabled;
  }

  // --- Event Listeners ---
  // Toggle buttons
  toSignupBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    hideError();
    setVisible(loginView, false);
    setVisible(signupView, true);
    signupView?.querySelector("input")?.focus();
  });

  toLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    hideError();
    setVisible(signupView, false);
    setVisible(loginView, true);
    loginView?.querySelector("input")?.focus();
  });

  // Login form submit
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();
    const email = document.querySelector("#loginEmail")?.value?.trim() ?? "";
    const password = document.querySelector("#loginPassword")?.value ?? "";
    if (!email || !password) {
      showError("Please enter your email and password.");
      return;
    }
    setSubmitDisabled(loginForm, true);
    suppressAuthRedirect = true;
    try {
      const userCredential = await loginUser(email, password);
      // cache name for instant UI on other pages
      try {
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        const userData = userDoc.data();
        localStorage.setItem(
          "displayName",
          userData?.username || email.split("@")[0]
        );
        console.log("User data fetched and stored locally.");
      } catch (e) {
        console.error("Error fetching user data:", e);
      }
      location.href = redirectUrl;
    } catch (err) {
      showError(authErrorMessage(err));
      console.error(err);
    } finally {
      suppressAuthRedirect = false;
      setSubmitDisabled(loginForm, false);
    }
  });

  // Signup form submit
  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();
    const firstName =
      document.querySelector("#signupFirstName")?.value?.trim() ?? "";
    const lastName =
      document.querySelector("#signupLastName")?.value?.trim() ?? "";
    const username =
      document.querySelector("#signupUsername")?.value?.trim() ?? "";
    const email = document.querySelector("#signupEmail")?.value?.trim() ?? "";
    const password = document.querySelector("#signupPassword")?.value ?? "";

    if (!firstName || !lastName || !username || !email || !password) {
      showError("Please fill in all fields.");
      return;
    }

    setSubmitDisabled(signupForm, true);
    suppressAuthRedirect = true;

    try {
      const user = await signupUser(
        firstName,
        lastName,
        username,
        email,
        password
      );

      localStorage.setItem("fullName", `${firstName} ${lastName}`);
      localStorage.setItem("displayName", username);
      location.href = redirectUrl;
    } catch (err) {
      showError(authErrorMessage(err));
      console.error(err);
    } finally {
      suppressAuthRedirect = false;
      setSubmitDisabled(signupForm, false);
    }
  });
}

// --- Initialize UI on DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", initAuthUI);
