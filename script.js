const state = {
  backendUrl: null,
  stream: null,
  socket: null,
  peerConnection: null,
  currentPeerId: null,
  currentRoomId: null,
  localMuted: false,
  cameraOff: false,
  socketClientLoadPromise: null,
  authReady: false,
  isAuthenticated: false,
  profile: null,
  currentPrompt: "",
  reportedCurrentMatch: false,
};

const FRONTEND_BUILD_ID = "2026-04-12-01";
const DEPLOYED_BACKEND_URL = "https://yaptalks.onrender.com";
const PROFILE_STORAGE_KEY = "yaptalks_profile_v2";
const XP_PER_LEVEL = 150;

const PROMPT_BATTLES = [
  "What is your most unpopular food opinion?",
  "If your life had a theme song, what would it be?",
  "Describe your week in exactly three words.",
  "What is one skill everyone should learn before 18?",
  "What is the most random thing that makes you happy?",
  "Drop your hottest take in 10 seconds.",
  "Which city would you move to tomorrow and why?",
  "Tell one funny truth and one fake thing about you.",
  "What is better: voice notes or texting?",
  "If you had one free ticket anywhere, where would you go?",
  "What habit changed your life the most?",
  "What is one thing people pretend to like but actually don’t?",
];

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const byId = (id) => document.getElementById(id);

const previewButton = byId("previewButton");
const findMatchButton = byId("findMatchButton");
const nextMatchButton = byId("nextMatchButton");
const sendButton = byId("sendButton");
const muteButton = byId("muteButton");
const cameraButton = byId("cameraButton");
const reportButton = byId("reportButton");

const chatInput = byId("chatInput");
const chatFeed = byId("chatFeed");

const localVideo = byId("localVideo");
const remoteVideo = byId("remoteVideo");
const remoteOverlay = byId("remoteOverlay");
const localFallback = byId("localFallback");
const queueStatus = byId("queueStatus");
const matchQuality = byId("matchQuality");
const matchHeadline = byId("matchHeadline");
const matchDescription = byId("matchDescription");

const streakValue = byId("streakValue");
const levelValue = byId("levelValue");
const xpValue = byId("xpValue");
const xpBarFill = byId("xpBarFill");
const challengeStatus = byId("challengeStatus");
const promptCardText = byId("promptCardText");
const newPromptButton = byId("newPromptButton");
const sendPromptButton = byId("sendPromptButton");
const trustScoreValue = byId("trustScoreValue");
const reportsValue = byId("reportsValue");
const matchesValue = byId("matchesValue");
const safetyGuardButton = byId("safetyGuardButton");

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function setHidden(element, hidden) {
  if (element) {
    element.hidden = hidden;
  }
}

function getSocketClientUrls() {
  const backendBase = normalizeBackendUrl(state.backendUrl || DEPLOYED_BACKEND_URL);
  return [
    `${backendBase}/socket.io/socket.io.js`,
    "/socket.io/socket.io.js",
    "https://cdn.socket.io/4.8.1/socket.io.min.js",
    "https://unpkg.com/socket.io-client@4.8.1/dist/socket.io.min.js",
  ];
}

function normalizeBackendUrl(rawValue) {
  const sameOriginDefault = window.location.origin && window.location.origin !== "null"
    ? window.location.origin
    : "http://localhost:3000";

  if (!rawValue || typeof rawValue !== "string") {
    return sameOriginDefault;
  }

  let value = rawValue.trim();
  if (!value) {
    return sameOriginDefault;
  }

  if (value === "same-origin") {
    return sameOriginDefault;
  }

  if (value.startsWith("//")) {
    value = `${window.location.protocol}${value}`;
  } else if (!value.startsWith("http://") && !value.startsWith("https://")) {
    value = `https://${value}`;
  }

  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    return sameOriginDefault;
  }
}

function resolveBackendUrl() {
  const params = new URLSearchParams(window.location.search);
  const queryBackend = params.get("backend");
  const resetBackend = params.get("reset_backend");
  const savedBackend = localStorage.getItem("yaptalks_backend_url");

  if (resetBackend === "1") {
    localStorage.removeItem("yaptalks_backend_url");
  }

  if (queryBackend) {
    const normalized = normalizeBackendUrl(queryBackend);
    localStorage.setItem("yaptalks_backend_url", normalized);
    return normalized;
  }

  if (savedBackend) {
    return normalizeBackendUrl(savedBackend);
  }

  return normalizeBackendUrl(DEPLOYED_BACKEND_URL);
}

function addMessage(author, text, type = "incoming") {
  if (!chatFeed) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = `message ${type}`;

  const authorEl = document.createElement("span");
  authorEl.className = "author";
  authorEl.textContent = author;

  const bodyEl = document.createElement("p");
  bodyEl.textContent = text;

  wrapper.appendChild(authorEl);
  wrapper.appendChild(bodyEl);
  chatFeed.appendChild(wrapper);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDayKey(dayKey) {
  const parts = String(dayKey).split("-").map((value) => Number(value));
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function dayDiff(fromDay, toDay) {
  const fromDate = parseDayKey(fromDay);
  const toDate = parseDayKey(toDay);
  if (!fromDate || !toDate) {
    return 0;
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toDate - fromDate) / msPerDay);
}

function createDefaultProfile(todayKey) {
  return {
    lastActiveDay: todayKey,
    streakDays: 1,
    xp: 0,
    reportsFiled: 0,
    matchesCompleted: 0,
    dailyMatchesDay: todayKey,
    dailyMatches: 0,
    challengeAnnouncedDay: "",
    safetyGuard: true,
  };
}

function saveProfile() {
  if (!state.profile) {
    return;
  }
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state.profile));
  } catch (error) {
    // Ignore storage write failures in restricted browser modes.
  }
}

function loadProfile() {
  const today = getLocalDayKey();
  const fallback = createDefaultProfile(today);

  let parsed = null;
  try {
    parsed = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "null");
  } catch (error) {
    parsed = null;
  }

  const profile = {
    ...fallback,
    ...(parsed && typeof parsed === "object" ? parsed : {}),
  };

  profile.streakDays = Number(profile.streakDays) || 1;
  profile.xp = Number(profile.xp) || 0;
  profile.reportsFiled = Number(profile.reportsFiled) || 0;
  profile.matchesCompleted = Number(profile.matchesCompleted) || 0;
  profile.dailyMatches = Number(profile.dailyMatches) || 0;
  profile.safetyGuard = profile.safetyGuard !== false;

  const gap = dayDiff(profile.lastActiveDay, today);
  if (gap === 1) {
    profile.streakDays += 1;
  } else if (gap > 1 || gap < 0) {
    profile.streakDays = 1;
  }
  profile.lastActiveDay = today;

  if (profile.dailyMatchesDay !== today) {
    profile.dailyMatchesDay = today;
    profile.dailyMatches = 0;
  }

  state.profile = profile;
  saveProfile();
}

function levelFromXp(xp) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

function xpProgressPercent(xp) {
  return Math.floor(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100);
}

function computeTrustScore(profile) {
  let score = 72;
  score += Math.min(12, profile.streakDays * 2);
  score += Math.min(10, Math.floor(profile.matchesCompleted / 4) * 2);
  score += profile.safetyGuard ? 5 : -5;
  score += Math.min(4, profile.reportsFiled);
  return Math.max(50, Math.min(99, score));
}

function renderProfile() {
  if (!state.profile) {
    return;
  }

  const level = levelFromXp(state.profile.xp);
  const progress = xpProgressPercent(state.profile.xp);
  const trustScore = computeTrustScore(state.profile);
  const streakLabel = `${state.profile.streakDays} ${state.profile.streakDays === 1 ? "day" : "days"}`;
  const dailyLeft = Math.max(0, 3 - state.profile.dailyMatches);

  setText(streakValue, streakLabel);
  setText(levelValue, String(level));
  setText(xpValue, String(state.profile.xp));
  setText(trustScoreValue, `Trust ${trustScore}`);
  setText(reportsValue, String(state.profile.reportsFiled));
  setText(matchesValue, String(state.profile.matchesCompleted));
  setText(
    challengeStatus,
    dailyLeft === 0
      ? "Daily goal complete. Bonus unlocked."
      : `Daily goal: ${dailyLeft} more match${dailyLeft === 1 ? "" : "es"} for bonus XP.`,
  );
  setText(safetyGuardButton, `Safety Guard: ${state.profile.safetyGuard ? "ON" : "OFF"}`);

  if (xpBarFill) {
    xpBarFill.style.width = `${progress}%`;
  }
}

function awardXp(points, reason = "", announce = false) {
  if (!state.profile || !Number.isFinite(points) || points <= 0) {
    return;
  }

  const oldLevel = levelFromXp(state.profile.xp);
  state.profile.xp += Math.floor(points);
  const newLevel = levelFromXp(state.profile.xp);

  saveProfile();
  renderProfile();

  if (announce && reason) {
    addMessage("System", `${reason} +${points} XP.`);
  }

  if (newLevel > oldLevel) {
    addMessage("System", `Level up! You are now level ${newLevel}.`);
  }
}

function maybeCompleteDailyChallenge() {
  if (!state.profile) {
    return;
  }

  const today = getLocalDayKey();
  if (state.profile.dailyMatches >= 3 && state.profile.challengeAnnouncedDay !== today) {
    state.profile.challengeAnnouncedDay = today;
    saveProfile();
    awardXp(30, "Daily challenge completed", true);
  }
}

function randomPrompt(excludeCurrent = true) {
  if (PROMPT_BATTLES.length === 0) {
    return "Ask your match about their favorite song.";
  }

  let candidate = PROMPT_BATTLES[Math.floor(Math.random() * PROMPT_BATTLES.length)];
  if (excludeCurrent && PROMPT_BATTLES.length > 1) {
    while (candidate === state.currentPrompt) {
      candidate = PROMPT_BATTLES[Math.floor(Math.random() * PROMPT_BATTLES.length)];
    }
  }
  return candidate;
}

function setPrompt(text) {
  state.currentPrompt = text;
  setText(promptCardText, text);
}

function syncAuthState() {
  const authState = window.yapTalksAuth;
  state.authReady = Boolean(authState?.ready);
  state.isAuthenticated = Boolean(authState?.isAuthenticated);
}

function ensureAuthenticated(actionLabel) {
  syncAuthState();

  if (!state.authReady) {
    addMessage("System", "Checking your saved login session...");
    return false;
  }

  if (state.isAuthenticated) {
    return true;
  }

  const authUi = window.yapTalksAuthUI;
  if (authUi && typeof authUi.open === "function") {
    authUi.open(actionLabel);
  }

  addMessage("System", `Please log in first to ${actionLabel}.`);
  return false;
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${url}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.src = url;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => {
      reject(new Error(`Failed to load ${url}`));
    }, { once: true });

    document.head.appendChild(script);
  });
}

async function ensureSocketClient() {
  if (typeof io === "function") {
    return true;
  }

  if (state.socketClientLoadPromise) {
    await state.socketClientLoadPromise;
    return typeof io === "function";
  }

  state.socketClientLoadPromise = (async () => {
    for (const url of getSocketClientUrls()) {
      try {
        await loadScript(url);
        if (typeof io === "function") {
          return;
        }
      } catch (error) {
        // Try the next fallback source.
      }
    }
  })();

  await state.socketClientLoadPromise;
  state.socketClientLoadPromise = null;
  return typeof io === "function";
}

function currentMatchOptions() {
  return {
    mode: "video",
    filter: "all",
  };
}

function resetPeerConnection() {
  if (!state.peerConnection) {
    return;
  }

  state.peerConnection.ontrack = null;
  state.peerConnection.onicecandidate = null;
  state.peerConnection.onconnectionstatechange = null;
  state.peerConnection.close();
  state.peerConnection = null;
}

function clearRemoteMedia() {
  if (remoteVideo) {
    remoteVideo.srcObject = null;
  }
  setHidden(remoteOverlay, false);
}

function setDisconnectedUI(reasonText) {
  setText(queueStatus, "Idle");
  setText(matchQuality, reasonText || "Disconnected");
  setText(matchHeadline, "No active match");
  setText(matchDescription, "Press \"Find match\" to start chatting.");
}

function clearCurrentMatch(reasonText) {
  state.currentPeerId = null;
  state.currentRoomId = null;
  state.reportedCurrentMatch = false;
  resetPeerConnection();
  clearRemoteMedia();
  setDisconnectedUI(reasonText);
}

function applyLocalTrackStates() {
  if (!state.stream) {
    setText(muteButton, "Mute");
    setText(cameraButton, "Camera Off");
    return;
  }

  const audioTrack = state.stream.getAudioTracks()[0];
  const videoTrack = state.stream.getVideoTracks()[0];

  if (audioTrack) {
    audioTrack.enabled = !state.localMuted;
  }
  if (videoTrack) {
    videoTrack.enabled = !state.cameraOff;
  }

  setText(muteButton, state.localMuted ? "Unmute" : "Mute");
  setText(cameraButton, state.cameraOff ? "Camera On" : "Camera Off");
}

async function ensureLocalStream() {
  if (state.stream) {
    applyLocalTrackStates();
    return true;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setText(localFallback, "Camera preview needs a browser with media access.");
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user" },
    });

    state.stream = stream;
    if (localVideo) {
      localVideo.srcObject = stream;
    }
    setHidden(localFallback, true);
    setText(previewButton, "Camera preview ready");
    applyLocalTrackStates();
    addMessage("System", "Camera and microphone are ready.");
    return true;
  } catch (error) {
    setHidden(localFallback, false);
    setText(localFallback, "Camera or microphone access was blocked.");
    addMessage("System", "Camera/microphone permission was denied.");
    return false;
  }
}

function createPeerConnection(peerId) {
  resetPeerConnection();

  const connection = new RTCPeerConnection(rtcConfig);
  state.peerConnection = connection;

  connection.onicecandidate = (event) => {
    if (!event.candidate || !state.socket || !peerId) {
      return;
    }

    state.socket.emit("webrtc-ice-candidate", {
      to: peerId,
      candidate: event.candidate,
    });
  };

  connection.ontrack = (event) => {
    const [remoteStream] = event.streams;
    if (remoteStream && remoteVideo) {
      remoteVideo.srcObject = remoteStream;
      setHidden(remoteOverlay, true);
      setText(matchDescription, "Live video connected.");
    }
  };

  connection.onconnectionstatechange = () => {
    const status = connection.connectionState;
    if (status === "connected") {
      setText(matchQuality, "Live connection stable");
      return;
    }

    if (status === "failed" || status === "disconnected" || status === "closed") {
      clearRemoteMedia();
      setText(matchDescription, "Connection interrupted. Press Find match to reconnect.");
      setText(queueStatus, "Idle");
    }
  };

  if (state.stream) {
    state.stream.getTracks().forEach((track) => {
      connection.addTrack(track, state.stream);
    });
  }

  return connection;
}

async function handleMatched(payload) {
  const isNewRoom = payload.roomId && payload.roomId !== state.currentRoomId;

  state.currentPeerId = payload.peerId;
  state.currentRoomId = payload.roomId;
  state.reportedCurrentMatch = false;

  if (isNewRoom && state.profile) {
    state.profile.matchesCompleted += 1;
    if (state.profile.dailyMatchesDay !== getLocalDayKey()) {
      state.profile.dailyMatchesDay = getLocalDayKey();
      state.profile.dailyMatches = 0;
    }
    state.profile.dailyMatches += 1;
    saveProfile();
    awardXp(22, "New match", false);
    maybeCompleteDailyChallenge();
  }

  setText(queueStatus, "Connected");
  setText(matchHeadline, "Matched with a stranger");
  setText(matchQuality, "Random match");

  addMessage("System", "You are connected. Keep the conversation respectful.");

  const mediaReady = await ensureLocalStream();
  if (!mediaReady) {
    clearRemoteMedia();
    setText(matchDescription, "Video permission missing. Continue with text chat.");
    return;
  }

  const connection = createPeerConnection(payload.peerId);

  if (payload.initiator) {
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    state.socket.emit("webrtc-offer", {
      to: payload.peerId,
      sdp: connection.localDescription,
    });
    setText(matchDescription, "Connecting video call...");
  } else {
    setText(matchDescription, "Completing video handshake...");
  }
}

async function connectSocketIfNeeded() {
  if (state.socket) {
    return true;
  }

  const clientReady = await ensureSocketClient();
  if (!clientReady) {
    addMessage("System", "Unable to load live connection service. Please refresh.");
    return false;
  }

  const socket = io(state.backendUrl, {
    transports: ["websocket", "polling"],
  });
  state.socket = socket;

  socket.on("connect", () => {
    setText(queueStatus, "Online");
    setText(matchQuality, "Ready to match");
    addMessage("System", "Connected to live server.");
  });

  socket.on("disconnect", () => {
    clearCurrentMatch("Server disconnected");
    addMessage("System", "Connection dropped. Reconnecting automatically...");
  });

  socket.on("queued", (payload) => {
    setText(queueStatus, "Searching...");
    setText(matchQuality, `Queue position ${payload.position}`);
    setText(matchHeadline, "Finding your next match");
    setText(matchDescription, "Looking for someone to connect with.");
  });

  socket.on("match-found", async (payload) => {
    await handleMatched(payload);
  });

  socket.on("chat-message", (payload) => {
    const mine = payload.from === socket.id;
    addMessage(mine ? "You" : "Stranger", payload.text, mine ? "outgoing" : "incoming");
  });

  socket.on("peer-left", () => {
    clearCurrentMatch("Stranger left");
    addMessage("System", "The other person left. Press Find match for a new chat.");
  });

  socket.on("report-ack", (payload = {}) => {
    const count = Number(payload.targetReports) || 1;
    addMessage("System", `Report sent. This account now has ${count} recent safety flags.`);
  });

  socket.on("safety-warning", () => {
    if (state.profile?.safetyGuard) {
      addMessage("System", "Safety Guard notice: your account received a report.");
    }
  });

  socket.on("webrtc-offer", async (payload) => {
    const mediaReady = await ensureLocalStream();
    if (!mediaReady) {
      return;
    }

    const connection = createPeerConnection(payload.from);
    await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    socket.emit("webrtc-answer", {
      to: payload.from,
      sdp: connection.localDescription,
    });
  });

  socket.on("webrtc-answer", async (payload) => {
    if (!state.peerConnection) {
      return;
    }
    await state.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
  });

  socket.on("webrtc-ice-candidate", async (payload) => {
    if (!state.peerConnection) {
      return;
    }

    try {
      await state.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (error) {
      // Ignore occasional candidate timing issues.
    }
  });

  return true;
}

async function requestMatch(useNext = false) {
  if (!ensureAuthenticated("start chat")) {
    return;
  }

  const connected = await connectSocketIfNeeded();
  if (!connected || !state.socket) {
    return;
  }

  await ensureLocalStream();

  const options = currentMatchOptions();

  if (useNext || state.currentRoomId) {
    state.socket.emit("next-match", options);
    clearCurrentMatch("Searching for next match");
    return;
  }

  state.socket.emit("request-match", options);
}

async function sendChat() {
  if (!ensureAuthenticated("send messages")) {
    return;
  }

  if (!chatInput) {
    return;
  }

  const text = chatInput.value.trim();
  if (!text) {
    return;
  }

  const connected = await connectSocketIfNeeded();
  if (!connected || !state.socket || !state.currentRoomId) {
    addMessage("System", "Start a match before sending messages.");
    return;
  }

  state.socket.emit("chat-message", { text });
  chatInput.value = "";
  awardXp(3);
}

async function sendPromptToChat() {
  if (!ensureAuthenticated("send prompts")) {
    return;
  }

  const prompt = state.currentPrompt || randomPrompt(false);
  if (!state.currentRoomId || !state.socket) {
    addMessage("System", "Start a match first, then use Prompt Battles.");
    return;
  }

  state.socket.emit("chat-message", {
    text: `Prompt Battle: ${prompt}`,
  });
  awardXp(4);
}

if (previewButton) {
  previewButton.addEventListener("click", async () => {
    if (!ensureAuthenticated("enable camera")) {
      return;
    }
    await ensureLocalStream();
  });
}

if (findMatchButton) {
  findMatchButton.addEventListener("click", async () => {
    await requestMatch(false);
  });
}

if (nextMatchButton) {
  nextMatchButton.addEventListener("click", async () => {
    await requestMatch(true);
  });
}

if (sendButton) {
  sendButton.addEventListener("click", async () => {
    await sendChat();
  });
}

if (newPromptButton) {
  newPromptButton.addEventListener("click", () => {
    setPrompt(randomPrompt(true));
  });
}

if (sendPromptButton) {
  sendPromptButton.addEventListener("click", async () => {
    await sendPromptToChat();
  });
}

if (safetyGuardButton) {
  safetyGuardButton.addEventListener("click", () => {
    if (!state.profile) {
      return;
    }
    state.profile.safetyGuard = !state.profile.safetyGuard;
    saveProfile();
    renderProfile();
    addMessage("System", `Safety Guard turned ${state.profile.safetyGuard ? "ON" : "OFF"}.`);
  });
}

if (muteButton) {
  muteButton.addEventListener("click", () => {
    state.localMuted = !state.localMuted;
    applyLocalTrackStates();
  });
}

if (cameraButton) {
  cameraButton.addEventListener("click", () => {
    state.cameraOff = !state.cameraOff;
    applyLocalTrackStates();
  });
}

if (reportButton) {
  reportButton.addEventListener("click", () => {
    if (!ensureAuthenticated("report users")) {
      return;
    }
    if (!state.currentRoomId || !state.socket) {
      addMessage("System", "No active match to report.");
      return;
    }
    if (state.reportedCurrentMatch) {
      addMessage("System", "You already reported this match.");
      return;
    }

    state.reportedCurrentMatch = true;
    if (state.profile) {
      state.profile.reportsFiled += 1;
      saveProfile();
      renderProfile();
    }

    awardXp(6);
    state.socket.emit("report-user", { reason: "inappropriate" });
    state.socket.emit("next-match", currentMatchOptions());
    clearCurrentMatch("Reported and skipped");
  });
}

if (chatInput) {
  chatInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      void sendChat();
    }
  });
}

state.backendUrl = resolveBackendUrl();
loadProfile();
renderProfile();
setPrompt(randomPrompt(false));
setDisconnectedUI("Ready");
applyLocalTrackStates();
console.info("YapTalks build", FRONTEND_BUILD_ID);

window.addEventListener("beforeunload", () => {
  if (state.socket && state.currentRoomId) {
    state.socket.emit("leave-match", { reason: "tab-close" });
  }

  if (state.socket) {
    state.socket.disconnect();
  }

  if (state.stream) {
    state.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
});

window.addEventListener("yaptalks-auth-changed", (event) => {
  const detail = event.detail || {};
  state.authReady = true;
  state.isAuthenticated = Boolean(detail.isAuthenticated);

  if (!state.isAuthenticated) {
    clearCurrentMatch("Logged out");

    if (state.socket) {
      state.socket.disconnect();
      state.socket = null;
    }

    if (state.stream) {
      state.stream.getTracks().forEach((track) => {
        track.stop();
      });
      state.stream = null;
    }

    if (localVideo) {
      localVideo.srcObject = null;
    }
    setHidden(localFallback, false);
    setText(previewButton, "Enable camera preview");
    return;
  }

  addMessage("System", "Login successful. Your Yap profile is active.");
});
