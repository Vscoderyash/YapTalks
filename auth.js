import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAc2dvio2jmpcMwz9_RxrefvkiD0XqIsMk",
  authDomain: "yap-talks.firebaseapp.com",
  projectId: "yap-talks",
  storageBucket: "yap-talks.firebasestorage.app",
  messagingSenderId: "597534370658",
  appId: "1:597534370658:web:aa3336c1079f9e3f271a3b",
  measurementId: "G-ZL2QN82HQB",
};

const app = initializeApp(firebaseConfig);

isSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  })
  .catch(() => {
    // Analytics is optional in some browsers and private modes.
  });

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Keep default in-memory persistence if blocked by browser settings.
});

const authGate = document.getElementById("authGate");
const appContent = document.getElementById("appContent");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const openAuthButton = document.getElementById("openAuthButton");
const closeAuthButton = document.getElementById("closeAuthButton");
const logoutButton = document.getElementById("logoutButton");
const authMessage = document.getElementById("authMessage");

function emitAuthState(user) {
  window.yapTalksAuth = {
    ready: true,
    isAuthenticated: Boolean(user),
    uid: user ? user.uid : null,
    email: user ? user.email : null,
    displayName: user ? user.displayName : null,
  };

  window.dispatchEvent(
    new CustomEvent("yaptalks-auth-changed", {
      detail: window.yapTalksAuth,
    }),
  );
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("is-error", isError);
}

function setAuthUiLoading(isLoading) {
  loginButton.disabled = isLoading;
  signupButton.disabled = isLoading;
  loginButton.textContent = isLoading ? "Please wait..." : "Log in";
  signupButton.textContent = isLoading ? "Please wait..." : "Create account";
}

function setModalVisibility(isOpen) {
  authGate.hidden = !isOpen;
  document.body.classList.toggle("modal-open", isOpen);

  if (isOpen) {
    authEmail.focus();
  }
}

function openAuthModal(actionLabel = "start chatting") {
  if (window.yapTalksAuth?.isAuthenticated) {
    return;
  }

  setAuthMessage(`Please log in to ${actionLabel}.`);
  setModalVisibility(true);
}

function closeAuthModal() {
  setModalVisibility(false);
}

window.yapTalksAuthUI = {
  open: openAuthModal,
  close: closeAuthModal,
};

function validateFields() {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    setAuthMessage("Please enter both email and password.", true);
    return null;
  }

  if (password.length < 6) {
    setAuthMessage("Password must be at least 6 characters.", true);
    return null;
  }

  return { email, password, name: authName.value.trim() };
}

function setUiForUser(user) {
  const loggedIn = Boolean(user);
  appContent.hidden = false;
  logoutButton.hidden = !loggedIn;
  openAuthButton.hidden = loggedIn;

  if (loggedIn) {
    const name = user.displayName || user.email || "Member";
    setAuthMessage(`Welcome ${name}. You are logged in.`);
    closeAuthModal();
  } else {
    setAuthMessage("Sign in to unlock matching and messaging.");
    closeAuthModal();
  }
}

function friendlyAuthError(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) {
    return "Incorrect email or password.";
  }
  if (code.includes("email-already-in-use")) {
    return "This email already has an account. Try logging in.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please wait and try again.";
  }
  if (code.includes("network-request-failed")) {
    return "Network error. Please check your internet connection.";
  }
  return "Authentication failed. Please try again.";
}

loginButton.addEventListener("click", async () => {
  const fields = validateFields();
  if (!fields) {
    return;
  }

  setAuthUiLoading(true);
  try {
    await signInWithEmailAndPassword(auth, fields.email, fields.password);
    setAuthMessage("Login successful.");
  } catch (error) {
    setAuthMessage(friendlyAuthError(error), true);
  } finally {
    setAuthUiLoading(false);
  }
});

signupButton.addEventListener("click", async () => {
  const fields = validateFields();
  if (!fields) {
    return;
  }

  setAuthUiLoading(true);
  try {
    const credential = await createUserWithEmailAndPassword(auth, fields.email, fields.password);
    if (fields.name) {
      await updateProfile(credential.user, { displayName: fields.name });
    }
    setAuthMessage("Account created successfully.");
  } catch (error) {
    setAuthMessage(friendlyAuthError(error), true);
  } finally {
    setAuthUiLoading(false);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    setAuthMessage("Unable to log out right now. Please try again.", true);
  }
});

openAuthButton.addEventListener("click", () => {
  openAuthModal("start chatting");
});

closeAuthButton.addEventListener("click", () => {
  closeAuthModal();
});

authGate.addEventListener("click", (event) => {
  if (event.target === authGate) {
    closeAuthModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !authGate.hidden) {
    closeAuthModal();
  }
});

onAuthStateChanged(auth, (user) => {
  setUiForUser(user);
  emitAuthState(user);
});
