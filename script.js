const state = {
  mode: "video",
  filter: "all",
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
};

const FRONTEND_BUILD_ID = "2026-04-11-02";
const DEPLOYED_BACKEND_URL = "https://yaptalks.onrender.com";

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const byId = (id) => document.getElementById(id);

const modePills = document.querySelectorAll("[data-mode]");
const filterPills = document.querySelectorAll("[data-filter]");

const previewButton = byId("previewButton");
const findMatchButton = byId("findMatchButton");
const nextMatchButton = byId("nextMatchButton");
const sendButton = byId("sendButton");
const muteButton = byId("muteButton");
const cameraButton = byId("cameraButton");
const reportButton = byId("reportButton");

const chatInput = byId("chatInput");
const chatFeed = byId("chatFeed");
const translationToggle = byId("translationToggle");
const safetyToggle = byId("safetyToggle");
const adLightToggle = byId("adLightToggle");

const localVideo = byId("localVideo");
const remoteVideo = byId("remoteVideo");
const remoteOverlay = byId("remoteOverlay");
const localFallback = byId("localFallback");
const queueStatus = byId("queueStatus");
const matchQuality = byId("matchQuality");
const matchHeadline = byId("matchHeadline");
const matchDescription = byId("matchDescription");
const modeBadge = byId("modeBadge");
const safetyDisplay = byId("safetyDisplay");

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

function isChecked(element, fallback = false) {
  return element ? Boolean(element.checked) : fallback;
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

function setActive(elements, activeValue, attribute) {
  elements.forEach((element) => {
    element.classList.toggle("active", element.dataset[attribute] === activeValue);
  });
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

  const message = state.authReady
    ? `Please log in first to ${actionLabel}.`
    : "Checking account status. Please wait.";
  addMessage("System", message);
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
    mode: state.mode,
    filter: state.filter,
    safer: isChecked(safetyToggle, true),
    translation: isChecked(translationToggle, false),
    adLight: isChecked(adLightToggle, false),
  };
}

function updateSafetyLabel() {
  setText(safetyDisplay, isChecked(safetyToggle, true) ? "Safe mode on" : "Safe mode off");
}

function updateModeBadge() {
  setText(modeBadge, state.mode === "video" ? "Video Mode" : "Text Mode");
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
  if (state.mode !== "video") {
    return true;
  }

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
    addMessage("System", "Camera/microphone permission was denied. You can still use text mode.");
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

  if (state.mode === "video" && state.stream) {
    state.stream.getTracks().forEach((track) => {
      connection.addTrack(track, state.stream);
    });
  }

  return connection;
}

async function handleMatched(payload) {
  state.currentPeerId = payload.peerId;
  state.currentRoomId = payload.roomId;

  setText(queueStatus, "Connected");
  setText(matchHeadline, "Matched with a stranger");
  setText(matchQuality, "Random match");

  addMessage("System", "You are connected. Keep the conversation respectful.");

  if (state.mode === "text") {
    clearRemoteMedia();
    setText(matchDescription, "Text-only match connected. Use the message panel.");
    return;
  }

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
    addMessage("System", "Unable to load the live connection service. Please refresh.");
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

  socket.on("webrtc-offer", async (payload) => {
    if (state.mode !== "video") {
      return;
    }

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

  if (state.mode === "video") {
    await ensureLocalStream();
  }

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
}

modePills.forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    setActive(modePills, state.mode, "mode");
    updateModeBadge();
  });
});

filterPills.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    setActive(filterPills, state.filter, "filter");
  });
});

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
    addMessage("System", "Report submitted. The current match has been skipped.");
    if (state.socket && state.currentRoomId) {
      state.socket.emit("next-match", currentMatchOptions());
      clearCurrentMatch("Reported and skipped");
    }
  });
}

if (safetyToggle) {
  safetyToggle.addEventListener("change", updateSafetyLabel);
}

if (chatInput) {
  chatInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      void sendChat();
    }
  });
}

state.backendUrl = resolveBackendUrl();
setDisconnectedUI("Ready");
updateSafetyLabel();
updateModeBadge();
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

  addMessage("System", "Login successful. You can now start matching.");
});
