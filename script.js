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
  partyRoomCode: "",
  incomingFriendRequest: null,
  lastStatsSig: "",
};

const DEPLOYED_BACKEND_URL = "https://yaptalks.onrender.com";
const PROFILE_STORAGE_KEY = "yaptalks_profile_v3";
const XP_PER_LEVEL = 150;
const PROMPTS = [
  "Drop your hottest take in 10 seconds.",
  "Tell one funny truth and one fake thing.",
  "What habit changed your life the most?",
  "What is your most unpopular food opinion?",
  "Describe your week in 3 words.",
];

const byId = (id) => document.getElementById(id);
const els = {
  preview: byId("previewButton"),
  find: byId("findMatchButton"),
  next: byId("nextMatchButton"),
  send: byId("sendButton"),
  mute: byId("muteButton"),
  camera: byId("cameraButton"),
  report: byId("reportButton"),
  chatInput: byId("chatInput"),
  chatFeed: byId("chatFeed"),
  localVideo: byId("localVideo"),
  remoteVideo: byId("remoteVideo"),
  remoteOverlay: byId("remoteOverlay"),
  localFallback: byId("localFallback"),
  queueStatus: byId("queueStatus"),
  matchQuality: byId("matchQuality"),
  matchHeadline: byId("matchHeadline"),
  matchDescription: byId("matchDescription"),
  streak: byId("streakValue"),
  level: byId("levelValue"),
  xp: byId("xpValue"),
  xpBar: byId("xpBarFill"),
  challenge: byId("challengeStatus"),
  promptText: byId("promptCardText"),
  newPrompt: byId("newPromptButton"),
  sendPrompt: byId("sendPromptButton"),
  trust: byId("trustScoreValue"),
  reports: byId("reportsValue"),
  matches: byId("matchesValue"),
  guard: byId("safetyGuardButton"),
  partyStatus: byId("partyStatus"),
  partyCreate: byId("partyCreateButton"),
  partyCode: byId("partyCodeInput"),
  partyJoin: byId("partyJoinButton"),
  partyLeave: byId("partyLeaveButton"),
  partyRoomLabel: byId("partyRoomLabel"),
  partyMembers: byId("partyMembers"),
  partyInput: byId("partyChatInput"),
  partySend: byId("partySendButton"),
  addFriend: byId("addFriendButton"),
  acceptFriend: byId("acceptFriendButton"),
  friendsCount: byId("friendsCount"),
  friendsList: byId("friendsList"),
  refreshBoard: byId("refreshLeaderboardButton"),
  boardList: byId("leaderboardList"),
};

const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function setText(el, text) {
  if (el) el.textContent = text;
}
function setHidden(el, hidden) {
  if (el) el.hidden = hidden;
}
function addMessage(author, text, type = "incoming") {
  if (!els.chatFeed) return;
  const wrap = document.createElement("div");
  wrap.className = `message ${type}`;
  const a = document.createElement("span");
  a.className = "author";
  a.textContent = author;
  const p = document.createElement("p");
  p.textContent = text;
  wrap.appendChild(a);
  wrap.appendChild(p);
  els.chatFeed.appendChild(wrap);
  els.chatFeed.scrollTop = els.chatFeed.scrollHeight;
}

function getIdentity() {
  const auth = window.yapTalksAuth || {};
  const name = auth.displayName || (auth.email ? auth.email.split("@")[0] : "Yap User");
  const uid = auth.uid || `guest-${name.toLowerCase().replace(/\s+/g, "-")}`;
  return { uid, name, email: auth.email || "" };
}

function syncAuthState() {
  const auth = window.yapTalksAuth;
  state.authReady = Boolean(auth?.ready);
  state.isAuthenticated = Boolean(auth?.isAuthenticated);
}

function ensureAuthenticated(actionLabel) {
  syncAuthState();
  if (!state.authReady) {
    addMessage("System", "Checking your saved login session...");
    return false;
  }
  if (state.isAuthenticated) return true;
  if (window.yapTalksAuthUI?.open) window.yapTalksAuthUI.open(actionLabel);
  addMessage("System", `Please log in first to ${actionLabel}.`);
  return false;
}

function normalizeBackendUrl(raw) {
  if (!raw) return window.location.origin || "http://localhost:3000";
  const value = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    return window.location.origin || "http://localhost:3000";
  }
}

function resolveBackendUrl() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("backend");
  const reset = params.get("reset_backend");
  const saved = localStorage.getItem("yaptalks_backend_url");
  if (reset === "1") localStorage.removeItem("yaptalks_backend_url");
  if (query) {
    const normalized = normalizeBackendUrl(query);
    localStorage.setItem("yaptalks_backend_url", normalized);
    return normalized;
  }
  return normalizeBackendUrl(saved || DEPLOYED_BACKEND_URL);
}

function getSocketClientUrls() {
  const base = normalizeBackendUrl(state.backendUrl || DEPLOYED_BACKEND_URL);
  return [
    `${base}/socket.io/socket.io.js`,
    "/socket.io/socket.io.js",
    "https://cdn.socket.io/4.8.1/socket.io.min.js",
  ];
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensureSocketClient() {
  if (typeof io === "function") return true;
  if (state.socketClientLoadPromise) {
    await state.socketClientLoadPromise;
    return typeof io === "function";
  }
  state.socketClientLoadPromise = (async () => {
    for (const url of getSocketClientUrls()) {
      try {
        await loadScript(url);
        if (typeof io === "function") return;
      } catch (error) {
        // Try next source.
      }
    }
  })();
  await state.socketClientLoadPromise;
  state.socketClientLoadPromise = null;
  return typeof io === "function";
}

function createDefaultProfile(today) {
  return {
    lastActiveDay: today,
    streakDays: 1,
    xp: 0,
    reportsFiled: 0,
    matchesCompleted: 0,
    dailyMatchesDay: today,
    dailyMatches: 0,
    challengeAnnouncedDay: "",
    safetyGuard: true,
    friends: [],
  };
}

function getLocalDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayDiff(a, b) {
  const pa = new Date(`${a}T00:00:00`);
  const pb = new Date(`${b}T00:00:00`);
  return Math.round((pb - pa) / (24 * 60 * 60 * 1000));
}

function saveProfile() {
  if (!state.profile) return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state.profile));
  } catch (error) {
    // Ignore.
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
  const profile = { ...fallback, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  profile.friends = Array.isArray(profile.friends) ? profile.friends.filter((f) => f && f.uid) : [];
  const gap = dayDiff(profile.lastActiveDay || today, today);
  profile.streakDays = gap === 1 ? Number(profile.streakDays || 1) + 1 : gap > 1 ? 1 : Number(profile.streakDays || 1);
  profile.lastActiveDay = today;
  if (profile.dailyMatchesDay !== today) {
    profile.dailyMatchesDay = today;
    profile.dailyMatches = 0;
  }
  state.profile = profile;
  saveProfile();
}

function levelFromXp(xp) {
  return Math.max(1, Math.floor((Number(xp) || 0) / XP_PER_LEVEL) + 1);
}

function trustScore(profile) {
  let score = 72 + Math.min(12, profile.streakDays * 2) + Math.min(10, Math.floor(profile.matchesCompleted / 4) * 2);
  score += profile.safetyGuard ? 5 : -5;
  score += Math.min(4, profile.reportsFiled);
  return Math.max(50, Math.min(99, score));
}

function maybePushProfileStats(force = false) {
  if (!state.socket || !state.isAuthenticated || !state.profile) return;
  const identity = getIdentity();
  const payload = {
    userId: identity.uid,
    name: identity.name,
    xp: Number(state.profile.xp) || 0,
    streak: Number(state.profile.streakDays) || 1,
    matches: Number(state.profile.matchesCompleted) || 0,
    reports: Number(state.profile.reportsFiled) || 0,
    safetyGuard: Boolean(state.profile.safetyGuard),
  };
  const sig = [payload.userId, payload.xp, payload.streak, payload.matches, payload.reports, payload.safetyGuard ? 1 : 0].join("|");
  if (!force && sig === state.lastStatsSig) return;
  state.lastStatsSig = sig;
  state.socket.emit("profile-stats", payload);
}

function renderFriends() {
  if (!state.profile || !els.friendsList) return;
  const friends = state.profile.friends || [];
  setText(els.friendsCount, `${friends.length} friend${friends.length === 1 ? "" : "s"}`);
  els.friendsList.innerHTML = "";
  if (friends.length === 0) {
    const item = document.createElement("span");
    item.textContent = "No friends yet.";
    els.friendsList.appendChild(item);
    return;
  }
  friends.slice().reverse().slice(0, 6).forEach((friend) => {
    const item = document.createElement("span");
    item.textContent = `${friend.name || friend.uid} · friend`;
    els.friendsList.appendChild(item);
  });
}

function renderProfile() {
  if (!state.profile) return;
  const level = levelFromXp(state.profile.xp);
  const progress = Math.floor(((Number(state.profile.xp) || 0) % XP_PER_LEVEL) / XP_PER_LEVEL * 100);
  setText(els.streak, `${state.profile.streakDays} ${state.profile.streakDays === 1 ? "day" : "days"}`);
  setText(els.level, String(level));
  setText(els.xp, String(state.profile.xp || 0));
  setText(els.trust, `Trust ${trustScore(state.profile)}`);
  setText(els.reports, String(state.profile.reportsFiled || 0));
  setText(els.matches, String(state.profile.matchesCompleted || 0));
  const left = Math.max(0, 3 - (state.profile.dailyMatches || 0));
  setText(els.challenge, left === 0 ? "Daily goal complete. Bonus unlocked." : `Daily goal: ${left} more matches for bonus XP.`);
  setText(els.guard, `Safety Guard: ${state.profile.safetyGuard ? "ON" : "OFF"}`);
  if (els.xpBar) els.xpBar.style.width = `${progress}%`;
  renderFriends();
  maybePushProfileStats();
}

function awardXp(points, message) {
  if (!state.profile || !Number.isFinite(points) || points <= 0) return;
  const oldLevel = levelFromXp(state.profile.xp);
  state.profile.xp = (Number(state.profile.xp) || 0) + Math.floor(points);
  saveProfile();
  renderProfile();
  if (message) addMessage("System", `${message} +${points} XP.`);
  if (levelFromXp(state.profile.xp) > oldLevel) addMessage("System", `Level up! You are now level ${levelFromXp(state.profile.xp)}.`);
}

function addFriend(user) {
  if (!state.profile || !user || !user.uid) return;
  if (state.profile.friends.some((f) => f.uid === user.uid)) return;
  state.profile.friends.push({ uid: user.uid, name: user.name || "Friend", addedAt: Date.now() });
  saveProfile();
  renderProfile();
  awardXp(15, "Mutual add completed");
}

function setPrompt(text) {
  state.currentPrompt = text;
  setText(els.promptText, text);
}

function nextPrompt() {
  let prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  if (PROMPTS.length > 1) while (prompt === state.currentPrompt) prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  setPrompt(prompt);
}

function renderLeaderboard(items) {
  if (!els.boardList) return;
  els.boardList.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    const row = document.createElement("span");
    row.textContent = "Leaderboard is warming up.";
    els.boardList.appendChild(row);
    return;
  }
  items.slice(0, 6).forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "leaderboard-item";
    const name = document.createElement("span");
    name.textContent = `#${index + 1} ${item.name || "Yap User"}`;
    const score = document.createElement("strong");
    score.textContent = `${item.xp || 0} XP`;
    row.appendChild(name);
    row.appendChild(score);
    els.boardList.appendChild(row);
  });
}

function renderPartyState() {
  const inRoom = Boolean(state.partyRoomCode);
  setText(els.partyStatus, inRoom ? "In room" : "No room");
  setText(els.partyRoomLabel, inRoom ? `Room code: ${state.partyRoomCode}` : "No active room.");
  if (!els.partyMembers) return;
  els.partyMembers.innerHTML = "";
  const members = Array.isArray(state.partyMembers) ? state.partyMembers : [];
  if (members.length === 0) {
    const row = document.createElement("span");
    row.textContent = "No members in room yet.";
    els.partyMembers.appendChild(row);
    return;
  }
  members.forEach((member) => {
    const row = document.createElement("span");
    row.textContent = member.name || "Yap User";
    els.partyMembers.appendChild(row);
  });
}

function currentMatchOptions() {
  return { mode: "video", filter: "all" };
}

function resetPeer() {
  if (!state.peerConnection) return;
  state.peerConnection.ontrack = null;
  state.peerConnection.onicecandidate = null;
  state.peerConnection.close();
  state.peerConnection = null;
}

function clearRemoteMedia() {
  if (els.remoteVideo) els.remoteVideo.srcObject = null;
  setHidden(els.remoteOverlay, false);
}

function setDisconnectedUI(reason) {
  setText(els.queueStatus, "Idle");
  setText(els.matchQuality, reason || "Disconnected");
  setText(els.matchHeadline, "No active match");
  setText(els.matchDescription, "Press \"Find match\" to start chatting.");
}

function clearMatch(reason) {
  state.currentPeerId = null;
  state.currentRoomId = null;
  state.incomingFriendRequest = null;
  setHidden(els.acceptFriend, true);
  resetPeer();
  clearRemoteMedia();
  setDisconnectedUI(reason);
}

function applyTracks() {
  if (!state.stream) {
    setText(els.mute, "Mute");
    setText(els.camera, "Camera Off");
    return;
  }
  const a = state.stream.getAudioTracks()[0];
  const v = state.stream.getVideoTracks()[0];
  if (a) a.enabled = !state.localMuted;
  if (v) v.enabled = !state.cameraOff;
  setText(els.mute, state.localMuted ? "Unmute" : "Mute");
  setText(els.camera, state.cameraOff ? "Camera On" : "Camera Off");
}

async function ensureLocalStream() {
  if (state.stream) {
    applyTracks();
    return true;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setText(els.localFallback, "Camera preview needs a browser with media access.");
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: "user" } });
    state.stream = stream;
    if (els.localVideo) els.localVideo.srcObject = stream;
    setHidden(els.localFallback, true);
    setText(els.preview, "Camera preview ready");
    applyTracks();
    addMessage("System", "Camera and microphone are ready.");
    return true;
  } catch (error) {
    setHidden(els.localFallback, false);
    setText(els.localFallback, "Camera or microphone access was blocked.");
    addMessage("System", "Camera/microphone permission was denied.");
    return false;
  }
}

function createPeerConnection(peerId) {
  resetPeer();
  const pc = new RTCPeerConnection(rtcConfig);
  state.peerConnection = pc;

  pc.onicecandidate = (event) => {
    if (!event.candidate || !state.socket || !peerId) return;
    state.socket.emit("webrtc-ice-candidate", { to: peerId, candidate: event.candidate });
  };

  pc.ontrack = (event) => {
    const [remoteStream] = event.streams;
    if (remoteStream && els.remoteVideo) {
      els.remoteVideo.srcObject = remoteStream;
      setHidden(els.remoteOverlay, true);
      setText(els.matchDescription, "Live video connected.");
    }
  };

  if (state.stream) state.stream.getTracks().forEach((track) => pc.addTrack(track, state.stream));
  return pc;
}

async function connectSocketIfNeeded() {
  if (state.socket) return true;
  const ready = await ensureSocketClient();
  if (!ready) {
    addMessage("System", "Unable to load live connection service. Please refresh.");
    return false;
  }

  const me = getIdentity();
  const socket = io(state.backendUrl, {
    transports: ["websocket", "polling"],
    auth: { uid: me.uid, name: me.name, email: me.email },
  });
  state.socket = socket;

  socket.on("connect", () => {
    setText(els.queueStatus, "Online");
    setText(els.matchQuality, "Ready to match");
    addMessage("System", "Connected to live server.");
    maybePushProfileStats(true);
    socket.emit("leaderboard-get");
  });

  socket.on("disconnect", () => {
    clearMatch("Server disconnected");
    state.partyRoomCode = "";
    state.partyMembers = [];
    renderPartyState();
    addMessage("System", "Connection dropped. Reconnecting automatically...");
  });

  socket.on("queued", (payload) => {
    setText(els.queueStatus, "Searching...");
    setText(els.matchQuality, `Queue position ${payload.position}`);
    setText(els.matchHeadline, "Finding your next match");
    setText(els.matchDescription, "Looking for someone to connect with.");
  });

  socket.on("match-found", async (payload) => {
    const isNewRoom = payload.roomId && payload.roomId !== state.currentRoomId;
    state.currentPeerId = payload.peerId;
    state.currentRoomId = payload.roomId;
    state.incomingFriendRequest = null;
    setHidden(els.acceptFriend, true);
    if (isNewRoom && state.profile) {
      state.profile.matchesCompleted = (state.profile.matchesCompleted || 0) + 1;
      state.profile.dailyMatches = (state.profile.dailyMatches || 0) + 1;
      saveProfile();
      renderProfile();
      awardXp(22);
      if (state.profile.dailyMatches >= 3 && state.profile.challengeAnnouncedDay !== getLocalDayKey()) {
        state.profile.challengeAnnouncedDay = getLocalDayKey();
        saveProfile();
        awardXp(30, "Daily challenge completed");
      }
    }
    setText(els.queueStatus, "Connected");
    setText(els.matchHeadline, "Matched with a stranger");
    setText(els.matchQuality, "Random match");
    addMessage("System", "You are connected. Keep the conversation respectful.");
    const mediaReady = await ensureLocalStream();
    if (!mediaReady) return;
    const pc = createPeerConnection(payload.peerId);
    if (payload.initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { to: payload.peerId, sdp: pc.localDescription });
      setText(els.matchDescription, "Connecting video call...");
    } else {
      setText(els.matchDescription, "Completing video handshake...");
    }
  });

  socket.on("chat-message", (payload) => {
    const mine = payload.from === socket.id;
    addMessage(mine ? "You" : "Stranger", payload.text, mine ? "outgoing" : "incoming");
  });

  socket.on("peer-left", () => {
    clearMatch("Stranger left");
    addMessage("System", "The other person left. Press Find match for a new chat.");
  });

  socket.on("report-ack", (payload = {}) => {
    addMessage("System", `Report sent. Target has ${Number(payload.targetReports) || 1} recent safety flags.`);
  });

  socket.on("safety-warning", () => {
    if (state.profile?.safetyGuard) addMessage("System", "Safety Guard notice: your account received a report.");
  });

  socket.on("friend-request", (payload = {}) => {
    state.incomingFriendRequest = payload;
    setText(els.acceptFriend, `Accept request from ${payload.fromUser?.name || "User"}`);
    setHidden(els.acceptFriend, false);
    addMessage("System", `${payload.fromUser?.name || "Someone"} sent you a friend request.`);
  });

  socket.on("friend-accepted", (payload = {}) => {
    addFriend(payload.fromUser || {});
    addMessage("System", `${payload.fromUser?.name || "Friend"} accepted your request.`);
  });

  socket.on("party-state", (payload = {}) => {
    state.partyRoomCode = payload.code || "";
    state.partyMembers = Array.isArray(payload.members) ? payload.members : [];
    renderPartyState();
  });

  socket.on("party-message", (payload = {}) => {
    addMessage(`Party · ${payload.fromName || "Member"}`, payload.text || "");
  });

  socket.on("party-error", (payload = {}) => {
    addMessage("System", payload.message || "Party action failed.");
  });

  socket.on("leaderboard-data", (payload = {}) => {
    renderLeaderboard(payload.items || []);
  });

  socket.on("leaderboard-update", (payload = {}) => {
    renderLeaderboard(payload.items || []);
  });

  socket.on("webrtc-offer", async (payload) => {
    const mediaReady = await ensureLocalStream();
    if (!mediaReady) return;
    const pc = createPeerConnection(payload.from);
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("webrtc-answer", { to: payload.from, sdp: pc.localDescription });
  });

  socket.on("webrtc-answer", async (payload) => {
    if (!state.peerConnection) return;
    await state.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
  });

  socket.on("webrtc-ice-candidate", async (payload) => {
    if (!state.peerConnection) return;
    try {
      await state.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (error) {
      // Ignore candidate timing issues.
    }
  });

  return true;
}

async function requestMatch(useNext = false) {
  if (!ensureAuthenticated("start chat")) return;
  const connected = await connectSocketIfNeeded();
  if (!connected || !state.socket) return;
  await ensureLocalStream();
  if (useNext || state.currentRoomId) {
    state.socket.emit("next-match", currentMatchOptions());
    clearMatch("Searching for next match");
    return;
  }
  state.socket.emit("request-match", currentMatchOptions());
}

async function sendChat() {
  if (!ensureAuthenticated("send messages")) return;
  const text = String(els.chatInput?.value || "").trim();
  if (!text) return;
  const connected = await connectSocketIfNeeded();
  if (!connected || !state.socket || !state.currentRoomId) {
    addMessage("System", "Start a match before sending messages.");
    return;
  }
  state.socket.emit("chat-message", { text });
  els.chatInput.value = "";
  awardXp(3);
}

async function sendPromptToChat() {
  if (!ensureAuthenticated("send prompts")) return;
  if (!state.currentRoomId || !state.socket) {
    addMessage("System", "Start a match first, then use Prompt Battles.");
    return;
  }
  state.socket.emit("chat-message", { text: `Prompt Battle: ${state.currentPrompt}` });
  awardXp(4);
}

async function sendFriendRequest() {
  if (!ensureAuthenticated("add friends")) return;
  const connected = await connectSocketIfNeeded();
  if (!connected || !state.socket || !state.currentPeerId) {
    addMessage("System", "You can send requests only during an active match.");
    return;
  }
  const me = getIdentity();
  state.socket.emit("friend-request", { to: state.currentPeerId, fromUser: { uid: me.uid, name: me.name } });
  addMessage("System", "Friend request sent.");
}

async function acceptFriendRequest() {
  if (!ensureAuthenticated("accept friend requests")) return;
  if (!state.incomingFriendRequest || !state.socket) return;
  const req = state.incomingFriendRequest;
  addFriend(req.fromUser || {});
  const me = getIdentity();
  state.socket.emit("friend-accepted", { to: req.fromSocketId, fromUser: { uid: me.uid, name: me.name } });
  addMessage("System", `You are now friends with ${req.fromUser?.name || "user"}.`);
  state.incomingFriendRequest = null;
  setHidden(els.acceptFriend, true);
}

async function createPartyRoom() {
  if (!ensureAuthenticated("create party rooms")) return;
  const connected = await connectSocketIfNeeded();
  if (!connected || !state.socket) return;
  state.socket.emit("party-create");
}

async function joinPartyRoom() {
  if (!ensureAuthenticated("join party rooms")) return;
  const connected = await connectSocketIfNeeded();
  if (!connected || !state.socket) return;
  const code = String(els.partyCode?.value || "").trim().toUpperCase();
  if (!code) {
    addMessage("System", "Enter a room code to join.");
    return;
  }
  state.socket.emit("party-join", { code });
}

function leavePartyRoom() {
  if (state.socket && state.partyRoomCode) {
    state.socket.emit("party-leave");
  }
  state.partyRoomCode = "";
  state.partyMembers = [];
  renderPartyState();
}

function sendPartyMessage() {
  if (!state.socket || !state.partyRoomCode) {
    addMessage("System", "Join or create a party room first.");
    return;
  }
  const text = String(els.partyInput?.value || "").trim();
  if (!text) return;
  state.socket.emit("party-message", { text });
  els.partyInput.value = "";
  awardXp(2);
}

if (els.preview) els.preview.addEventListener("click", async () => {
  if (!ensureAuthenticated("enable camera")) return;
  await ensureLocalStream();
});
if (els.find) els.find.addEventListener("click", async () => { await requestMatch(false); });
if (els.next) els.next.addEventListener("click", async () => { await requestMatch(true); });
if (els.send) els.send.addEventListener("click", async () => { await sendChat(); });
if (els.newPrompt) els.newPrompt.addEventListener("click", nextPrompt);
if (els.sendPrompt) els.sendPrompt.addEventListener("click", async () => { await sendPromptToChat(); });
if (els.addFriend) els.addFriend.addEventListener("click", async () => { await sendFriendRequest(); });
if (els.acceptFriend) els.acceptFriend.addEventListener("click", async () => { await acceptFriendRequest(); });
if (els.partyCreate) els.partyCreate.addEventListener("click", async () => { await createPartyRoom(); });
if (els.partyJoin) els.partyJoin.addEventListener("click", async () => { await joinPartyRoom(); });
if (els.partyLeave) els.partyLeave.addEventListener("click", leavePartyRoom);
if (els.partySend) els.partySend.addEventListener("click", sendPartyMessage);
if (els.refreshBoard) els.refreshBoard.addEventListener("click", async () => {
  const connected = await connectSocketIfNeeded();
  if (connected && state.socket) state.socket.emit("leaderboard-get");
});
if (els.mute) els.mute.addEventListener("click", () => { state.localMuted = !state.localMuted; applyTracks(); });
if (els.camera) els.camera.addEventListener("click", () => { state.cameraOff = !state.cameraOff; applyTracks(); });
if (els.guard) els.guard.addEventListener("click", () => {
  if (!state.profile) return;
  state.profile.safetyGuard = !state.profile.safetyGuard;
  saveProfile();
  renderProfile();
  addMessage("System", `Safety Guard turned ${state.profile.safetyGuard ? "ON" : "OFF"}.`);
});
if (els.report) els.report.addEventListener("click", () => {
  if (!ensureAuthenticated("report users")) return;
  if (!state.currentRoomId || !state.socket) return addMessage("System", "No active match to report.");
  state.profile.reportsFiled = (state.profile.reportsFiled || 0) + 1;
  saveProfile();
  renderProfile();
  awardXp(6);
  state.socket.emit("report-user", { reason: "inappropriate" });
  state.socket.emit("next-match", currentMatchOptions());
  clearMatch("Reported and skipped");
});
if (els.chatInput) els.chatInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void sendChat();
});
if (els.partyInput) els.partyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendPartyMessage();
  }
});

state.backendUrl = resolveBackendUrl();
loadProfile();
renderProfile();
nextPrompt();
renderLeaderboard([]);
renderPartyState();
setDisconnectedUI("Ready");
applyTracks();
console.info("YapTalks build", "2026-04-12-v2");

window.addEventListener("beforeunload", () => {
  if (state.socket && state.currentRoomId) state.socket.emit("leave-match", { reason: "tab-close" });
  if (state.socket && state.partyRoomCode) state.socket.emit("party-leave");
  if (state.socket) state.socket.disconnect();
  if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
});

window.addEventListener("yaptalks-auth-changed", (event) => {
  const detail = event.detail || {};
  state.authReady = true;
  state.isAuthenticated = Boolean(detail.isAuthenticated);
  if (!state.isAuthenticated) {
    clearMatch("Logged out");
    leavePartyRoom();
    if (state.socket) {
      state.socket.disconnect();
      state.socket = null;
    }
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }
    if (els.localVideo) els.localVideo.srcObject = null;
    setHidden(els.localFallback, false);
    setText(els.preview, "Enable camera preview");
    return;
  }
  addMessage("System", "Login successful. Hype profile v2 is active.");
});
