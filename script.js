const state = {
  mode: "video",
  filter: "all",
  billing: "monthly",
  backendUrl: null,
  stream: null,
  socket: null,
  peerConnection: null,
  currentPeerId: null,
  currentRoomId: null,
  localMuted: false,
  cameraOff: false,
  socketClientLoadPromise: null,
};

const DEPLOYED_BACKEND_URL = "https://yaptalks.onrender.com";
const SOCKET_CLIENT_URLS = [
  "/socket.io/socket.io.js",
  "https://cdn.socket.io/4.8.1/socket.io.min.js",
  "https://unpkg.com/socket.io-client@4.8.1/dist/socket.io.min.js",
];

const participantSets = [
  ["Host", "Music Fan", "Night Owl", "Campus Rep", "Mod"],
  ["Admin", "Guest 1", "Guest 2", "VIP", "Sponsor"],
  ["Coach", "Student", "Designer", "Streamer", "VIP"],
];

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const modePills = document.querySelectorAll("[data-mode]");
const filterPills = document.querySelectorAll("[data-filter]");
const billingPills = document.querySelectorAll("[data-billing]");
const priceElements = document.querySelectorAll(".price");

const previewButton = document.getElementById("previewButton");
const findMatchButton = document.getElementById("findMatchButton");
const nextMatchButton = document.getElementById("nextMatchButton");
const sendButton = document.getElementById("sendButton");
const muteButton = document.getElementById("muteButton");
const cameraButton = document.getElementById("cameraButton");
const reportButton = document.getElementById("reportButton");

const chatInput = document.getElementById("chatInput");
const chatFeed = document.getElementById("chatFeed");
const interestInput = document.getElementById("interestInput");
const translationToggle = document.getElementById("translationToggle");
const safetyToggle = document.getElementById("safetyToggle");
const adLightToggle = document.getElementById("adLightToggle");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const remoteOverlay = document.getElementById("remoteOverlay");
const localFallback = document.getElementById("localFallback");
const queueStatus = document.getElementById("queueStatus");
const matchQuality = document.getElementById("matchQuality");
const matchHeadline = document.getElementById("matchHeadline");
const matchDescription = document.getElementById("matchDescription");
const modeBadge = document.getElementById("modeBadge");
const interestDisplay = document.getElementById("interestDisplay");
const safetyDisplay = document.getElementById("safetyDisplay");

const usersRange = document.getElementById("usersRange");
const conversionRange = document.getElementById("conversionRange");
const adRevenue = document.getElementById("adRevenue");
const subscriptionRevenue = document.getElementById("subscriptionRevenue");

const createRoomButton = document.getElementById("createRoomButton");
const joinRoomButton = document.getElementById("joinRoomButton");
const roomTopicInput = document.getElementById("roomTopicInput");
const roomCodeInput = document.getElementById("roomCodeInput");
const roomOutput = document.getElementById("roomOutput");
const roomTitle = document.getElementById("roomTitle");
const roomBadge = document.getElementById("roomBadge");
const participantCloud = document.getElementById("participantCloud");

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

  if (window.location.hostname.endsWith("vercel.app")) {
    return normalizeBackendUrl(DEPLOYED_BACKEND_URL);
  }

  return normalizeBackendUrl("same-origin");
}

function setActive(elements, activeValue, attribute) {
  elements.forEach((element) => {
    element.classList.toggle("active", element.dataset[attribute] === activeValue);
  });
}

function addMessage(author, text, type = "incoming") {
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
    for (const url of SOCKET_CLIENT_URLS) {
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

function parseInterests() {
  return interestInput.value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function currentMatchOptions() {
  return {
    mode: state.mode,
    filter: state.filter,
    interests: parseInterests(),
    safer: Boolean(safetyToggle.checked),
    translation: Boolean(translationToggle.checked),
    adLight: Boolean(adLightToggle.checked),
  };
}

function updateInterestLabel() {
  const interests = interestInput.value.trim();
  interestDisplay.textContent = interests ? `Interests: ${interests}` : "No interests selected";
}

function updateSafetyLabel() {
  safetyDisplay.textContent = safetyToggle.checked ? "Safe mode on" : "Safe mode off";
}

function updateModeBadge() {
  modeBadge.textContent = state.mode === "video" ? "Video Mode" : "Text Mode";
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
  remoteVideo.srcObject = null;
  remoteOverlay.hidden = false;
}

function setDisconnectedUI(reasonText) {
  queueStatus.textContent = "Idle";
  matchQuality.textContent = reasonText || "Disconnected";
  matchHeadline.textContent = "No stranger connected yet";
  matchDescription.textContent = "Click \"Find stranger\" to start a live random chat.";
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
    muteButton.textContent = "Mute";
    cameraButton.textContent = "Camera Off";
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

  muteButton.textContent = state.localMuted ? "Unmute" : "Mute";
  cameraButton.textContent = state.cameraOff ? "Camera On" : "Camera Off";
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
    localFallback.textContent = "Camera preview needs a browser with media access.";
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user" },
    });

    state.stream = stream;
    localVideo.srcObject = stream;
    localFallback.hidden = true;
    previewButton.textContent = "Camera preview ready";
    applyLocalTrackStates();
    addMessage("System", "Camera and mic are ready.");
    return true;
  } catch (error) {
    localFallback.hidden = false;
    localFallback.textContent = "Camera or mic permission was blocked.";
    addMessage("System", "Camera/mic permission was denied. You can still use text mode.");
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
    if (remoteStream) {
      remoteVideo.srcObject = remoteStream;
      remoteOverlay.hidden = true;
      matchDescription.textContent = "Live video connected.";
    }
  };

  connection.onconnectionstatechange = () => {
    const status = connection.connectionState;
    if (status === "connected") {
      matchQuality.textContent = "Live connection stable";
      return;
    }

    if (status === "failed" || status === "disconnected" || status === "closed") {
      clearRemoteMedia();
      matchDescription.textContent = "Connection interrupted. Click Find stranger to reconnect.";
      queueStatus.textContent = "Idle";
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

  queueStatus.textContent = "Connected";
  matchHeadline.textContent = "Connected with a stranger";

  const partnerInterests = Array.isArray(payload.partnerInterests)
    ? payload.partnerInterests.join(", ")
    : "";
  matchQuality.textContent = partnerInterests ? `Shared interests: ${partnerInterests}` : "Random match";

  addMessage("System", "You are now live with a stranger. Be respectful and have fun.");

  if (state.mode === "text") {
    clearRemoteMedia();
    matchDescription.textContent = "Text-only match connected. Use the chat panel.";
    return;
  }

  const mediaReady = await ensureLocalStream();
  if (!mediaReady) {
    clearRemoteMedia();
    matchDescription.textContent = "Video permissions missing. Continue with text chat.";
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
    matchDescription.textContent = "Connecting video call...";
  } else {
    matchDescription.textContent = "Waiting for video handshake...";
  }
}

async function connectSocketIfNeeded() {
  if (state.socket) {
    return true;
  }

  const clientReady = await ensureSocketClient();
  if (!clientReady) {
    addMessage("System", "Socket client failed to load. Refresh the page and check your network/adblock settings.");
    return false;
  }

  const socket = io(state.backendUrl, {
    transports: ["websocket", "polling"],
  });
  state.socket = socket;

  socket.on("connect", () => {
    queueStatus.textContent = "Online";
    matchQuality.textContent = "Ready to match";
    addMessage("System", `Connected to YapTalks live server (${state.backendUrl}).`);
  });

  socket.on("disconnect", () => {
    clearCurrentMatch("Server disconnected");
    addMessage("System", "Disconnected from server. Reconnecting...");
  });

  socket.on("queued", (payload) => {
    queueStatus.textContent = "Searching...";
    matchQuality.textContent = `Queue position ${payload.position}`;
    matchHeadline.textContent = "Finding your next stranger";
    matchDescription.textContent = "Looking for a live match right now.";
  });

  socket.on("match-found", async (payload) => {
    await handleMatched(payload);
  });

  socket.on("chat-message", (payload) => {
    const mine = payload.from === socket.id;
    addMessage(mine ? "You" : "Stranger", payload.text, mine ? "outgoing" : "incoming");
  });

  socket.on("peer-left", () => {
    clearCurrentMatch("Stranger left the chat");
    addMessage("System", "Your stranger left. Click Find stranger for a new match.");
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
      addMessage("System", "Network candidate update failed, retrying with next packet.");
    }
  });

  return true;
}

async function requestMatch(useNext = false) {
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
    clearCurrentMatch("Looking for next stranger");
    return;
  }

  state.socket.emit("request-match", options);
}

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) {
    return;
  }

  const connected = await connectSocketIfNeeded();
  if (!connected || !state.socket || !state.currentRoomId) {
    addMessage("System", "Start a match first, then send chat messages.");
    return;
  }

  state.socket.emit("chat-message", { text });
  chatInput.value = "";
}

function updateBilling(mode) {
  state.billing = mode;
  setActive(billingPills, mode, "billing");
  priceElements.forEach((element) => {
    element.textContent = element.dataset[mode];
  });
}

function updateRevenue() {
  const users = Number(usersRange.value);
  const conversion = Number(conversionRange.value) / 100;
  const projectedAds = users * 0.6;
  const projectedSubs = users * conversion * 90;

  adRevenue.textContent = `$${projectedAds.toLocaleString()}`;
  subscriptionRevenue.textContent = `$${Math.round(projectedSubs).toLocaleString()}`;
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let index = 0; index < 6; index += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

function renderParticipants(names) {
  participantCloud.innerHTML = "";
  names.forEach((name) => {
    const pill = document.createElement("span");
    pill.textContent = name;
    participantCloud.appendChild(pill);
  });
}

function createRoom() {
  const topic = roomTopicInput.value.trim() || "Yap Squad Lounge";
  const code = randomCode();
  roomCodeInput.value = code;
  roomTitle.textContent = topic;
  roomBadge.textContent = "Room live";
  roomOutput.textContent = `Room "${topic}" is ready. Invite friends with code ${code} on YapTalks.`;
  renderParticipants(participantSets[Math.floor(Math.random() * participantSets.length)]);
}

function joinRoom() {
  const code = roomCodeInput.value.trim() || randomCode();
  const topic = roomTopicInput.value.trim() || `Room ${code}`;
  roomTitle.textContent = topic;
  roomBadge.textContent = "Joined";
  roomOutput.textContent = `You joined ${topic} with invite code ${code}.`;
  renderParticipants(["You", "Host", "Guest 1", "Guest 2", "Moderator"]);
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

billingPills.forEach((button) => {
  button.addEventListener("click", () => {
    updateBilling(button.dataset.billing);
  });
});

previewButton.addEventListener("click", async () => {
  await ensureLocalStream();
});

findMatchButton.addEventListener("click", async () => {
  await requestMatch(false);
});

nextMatchButton.addEventListener("click", async () => {
  await requestMatch(true);
});

sendButton.addEventListener("click", async () => {
  await sendChat();
});

muteButton.addEventListener("click", () => {
  state.localMuted = !state.localMuted;
  applyLocalTrackStates();
});

cameraButton.addEventListener("click", () => {
  state.cameraOff = !state.cameraOff;
  applyLocalTrackStates();
});

reportButton.addEventListener("click", () => {
  addMessage("System", "Report submitted. This stranger will be reviewed.");
  if (state.socket && state.currentRoomId) {
    state.socket.emit("next-match", currentMatchOptions());
    clearCurrentMatch("Reported and skipped");
  }
});

interestInput.addEventListener("input", updateInterestLabel);
safetyToggle.addEventListener("change", updateSafetyLabel);
usersRange.addEventListener("input", updateRevenue);
conversionRange.addEventListener("input", updateRevenue);
createRoomButton.addEventListener("click", createRoom);
joinRoomButton.addEventListener("click", joinRoom);

chatInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    void sendChat();
  }
});

updateBilling("monthly");
updateInterestLabel();
updateSafetyLabel();
updateModeBadge();
updateRevenue();
state.backendUrl = resolveBackendUrl();
setDisconnectedUI("Ready");
applyLocalTrackStates();

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
