import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
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
const persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => {
  // Keep default in-memory persistence if blocked by browser settings.
});

const authGate = document.getElementById("authGate");
const appContent = document.getElementById("appContent");
const authName = document.getElementById("authName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const policyConsent = document.getElementById("policyConsent");
const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const openAuthButton = document.getElementById("openAuthButton");
const closeAuthButton = document.getElementById("closeAuthButton");
const logoutButton = document.getElementById("logoutButton");
const authMessage = document.getElementById("authMessage");
const togglePasswordButton = document.getElementById("togglePasswordButton");
const passwordStrengthBar = document.getElementById("passwordStrengthBar");
const passwordStrengthLabel = document.getElementById("passwordStrengthLabel");
const capsLockHint = document.getElementById("capsLockHint");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");

const POLICY_ACCEPTED_STORAGE_KEY = "yaptalks_policy_accepted_v1";
const REMEMBERED_EMAIL_KEY = "yaptalks_remembered_email";
let authUiLoading = false;

if (policyConsent) {
  try {
    policyConsent.checked = localStorage.getItem(POLICY_ACCEPTED_STORAGE_KEY) === "1";
  } catch (error) {
    // Ignore localStorage restrictions.
  }
}

if (authEmail) {
  try {
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) authEmail.value = savedEmail;
  } catch (error) {
    // Ignore localStorage restrictions.
  }
}

function emitAuthState(user) {
  window.yapTalksAuth = {
    ready: true,
    isAuthenticated: Boolean(user),
    uid: user ? user.uid : null,
    email: user ? user.email : null,
    displayName: user ? user.displayName : null,
    emailVerified: user ? user.emailVerified : false,
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
  authMessage.classList.remove("is-success");
}

function setAuthSuccess(message) {
  authMessage.textContent = message;
  authMessage.classList.remove("is-error");
  authMessage.classList.add("is-success");
}

function setAuthUiLoading(isLoading) {
  authUiLoading = isLoading;
  updateAuthActionState();
  loginButton.textContent = isLoading ? "Please wait..." : "Log in";
  signupButton.textContent = isLoading ? "Please wait..." : "Create account";
}

function updateAuthActionState() {
  const consentAccepted = Boolean(policyConsent?.checked);
  loginButton.disabled = authUiLoading || !consentAccepted;
  signupButton.disabled = authUiLoading;
}

function setModalVisibility(isOpen) {
  authGate.hidden = !isOpen;
  document.body.classList.toggle("modal-open", isOpen);

  if (isOpen) {
    if (authEmail.value) {
      authPassword.focus();
    } else {
      authEmail.focus();
    }
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

function rememberPolicyAcceptance() {
  if (!policyConsent?.checked) return;
  try {
    localStorage.setItem(POLICY_ACCEPTED_STORAGE_KEY, "1");
  } catch (error) {
    // Ignore localStorage restrictions.
  }
}

function rememberEmail(email) {
  try {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  } catch (error) {
    // Ignore localStorage restrictions.
  }
}

window.yapTalksAuthUI = {
  open: openAuthModal,
  close: closeAuthModal,
};

if (policyConsent) {
  policyConsent.addEventListener("change", () => {
    updateAuthActionState();
  });
}

// ── Password visibility toggle ────────────────────────────────────────────────
if (togglePasswordButton && authPassword) {
  togglePasswordButton.addEventListener("click", () => {
    const isHidden = authPassword.type === "password";
    authPassword.type = isHidden ? "text" : "password";
    togglePasswordButton.setAttribute("aria-pressed", String(isHidden));
    togglePasswordButton.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    togglePasswordButton.textContent = isHidden ? "Hide" : "Show";
  });
}

// ── Password strength meter ───────────────────────────────────────────────────
function scorePassword(pw) {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Very strong"];
  return { score, label: labels[Math.min(score, labels.length - 1)] };
}

if (authPassword && passwordStrengthBar && passwordStrengthLabel) {
  authPassword.addEventListener("input", () => {
    const { score, label } = scorePassword(authPassword.value);
    const pct = Math.min(100, score * 20);
    passwordStrengthBar.style.width = `${pct}%`;
    passwordStrengthBar.dataset.strength = String(score);
    passwordStrengthLabel.textContent = authPassword.value ? label : "";
  });
}

// ── CapsLock detection ────────────────────────────────────────────────────────
if (authPassword && capsLockHint) {
  const updateCaps = (event) => {
    const on = typeof event.getModifierState === "function" && event.getModifierState("CapsLock");
    capsLockHint.hidden = !on;
  };
  authPassword.addEventListener("keydown", updateCaps);
  authPassword.addEventListener("keyup", updateCaps);
  authPassword.addEventListener("blur", () => {
    capsLockHint.hidden = true;
  });
}

// ── Submit on Enter ───────────────────────────────────────────────────────────
[authEmail, authPassword, authName].forEach((input) => {
  if (!input) return;
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (loginButton.disabled) return;
    event.preventDefault();
    loginButton.click();
  });
});

function validateFields() {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    setAuthMessage("Please enter both email and password.", true);
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAuthMessage("Please enter a valid email address.", true);
    return null;
  }

  if (password.length < 6) {
    setAuthMessage("Password must be at least 6 characters.", true);
    return null;
  }

  if (policyConsent && !policyConsent.checked) {
    setAuthMessage("Please accept the Privacy Policy to continue.", true);
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
    setAuthSuccess(`Welcome ${name}. You are logged in.`);
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
  if (code.includes("user-not-found")) {
    return "No account found with that email. Try creating one.";
  }
  if (code.includes("email-already-in-use")) {
    return "This email already has an account. Try logging in.";
  }
  if (code.includes("invalid-email")) {
    return "That email address looks invalid.";
  }
  if (code.includes("weak-password")) {
    return "Password is too weak. Try a longer one with mixed characters.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (code.includes("network-request-failed")) {
    return "Network error. Please check your internet connection.";
  }
  if (code.includes("user-disabled")) {
    return "This account has been disabled. Contact support.";
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
    await persistenceReady;
    await signInWithEmailAndPassword(auth, fields.email, fields.password);
    rememberPolicyAcceptance();
    rememberEmail(fields.email);
    setAuthSuccess("Login successful.");
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

  const { score } = scorePassword(fields.password);
  if (score < 2) {
    setAuthMessage("Password is too weak. Add length, mixed case, numbers, or symbols.", true);
    return;
  }

  setAuthUiLoading(true);
  try {
    await persistenceReady;
    const credential = await createUserWithEmailAndPassword(auth, fields.email, fields.password);
    if (fields.name) {
      await updateProfile(credential.user, { displayName: fields.name });
    }
    rememberPolicyAcceptance();
    rememberEmail(fields.email);
    setAuthSuccess("Account created. Welcome to YapTalks!");
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

// ── Forgot password ───────────────────────────────────────────────────────────
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async (event) => {
    event.preventDefault();
    const email = authEmail.value.trim();
    if (!email) {
      setAuthMessage("Enter your email above first, then click 'Forgot password'.", true);
      authEmail.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthMessage("Please enter a valid email address.", true);
      return;
    }
    setAuthUiLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setAuthSuccess(`Password reset link sent to ${email}. Check your inbox.`);
    } catch (error) {
      setAuthMessage(friendlyAuthError(error), true);
    } finally {
      setAuthUiLoading(false);
    }
  });
}

onAuthStateChanged(auth, (user) => {
  setUiForUser(user);
  emitAuthState(user);
});

updateAuthActionState();
