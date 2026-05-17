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
  callStartTime: null,
  callTimerInterval: null,
  typingEmitTimeout: null,
  typingDisplayTimeout: null,
  darkMode: false,
  animeChar: "none",
  videoEnhance: false,
  filterCanvas: null,
  filterCtx: null,
  filteredStream: null,
  filterAnimFrame: null,
};

const DEPLOYED_BACKEND_URL = "https://yaptalks.onrender.com";
const PROFILE_STORAGE_KEY = "yaptalks_profile_v3";

const RANKS = [
  { minLevel: 1, title: "Newcomer" },
  { minLevel: 3, title: "Chatter" },
  { minLevel: 6, title: "Regular" },
  { minLevel: 11, title: "Veteran" },
  { minLevel: 16, title: "Pro Yapper" },
  { minLevel: 26, title: "Elite" },
  { minLevel: 41, title: "Legend" },
  { minLevel: 61, title: "Myth" },
];

const INTERESTS = [
  "Gaming", "Music", "Sports", "Tech", "Art",
  "Travel", "Food", "Movies", "Fitness", "Books",
  "Memes", "Fashion",
];

const AVATARS = ["😊", "😎", "🎮", "🎵", "🔥", "💎", "🌟", "🐺", "🦊", "🐉", "🚀", "🎯"];

const EMOJI_REACTIONS = ["😂", "🔥", "❤️", "👏", "😮", "🎉"];

const MISSION_POOL = [
  { id: "m_msg5", label: "Send 5 messages", field: "dailyMessages", target: 5, xp: 15 },
  { id: "m_match2", label: "Complete 2 matches", field: "dailyMatchCount", target: 2, xp: 20 },
  { id: "m_prompt3", label: "Send 3 prompts", field: "dailyPrompts", target: 3, xp: 18 },
  { id: "m_react5", label: "Send 5 reactions", field: "dailyReactions", target: 5, xp: 12 },
  { id: "m_rate1", label: "Rate a match", field: "dailyRatings", target: 1, xp: 15 },
  { id: "m_partymsg", label: "Send a party message", field: "dailyPartyMsgs", target: 1, xp: 10 },
  { id: "m_match5", label: "Complete 5 matches", field: "dailyMatchCount", target: 5, xp: 40 },
  { id: "m_msg10", label: "Send 10 messages", field: "dailyMessages", target: 10, xp: 25 },
  { id: "m_friend1", label: "Add a friend", field: "dailyFriends", target: 1, xp: 25 },
];

const ACHIEVEMENTS = [
  { id: "first_match", label: "First Match", desc: "Complete 1 match", xpReward: 25, check: (p) => p.matchesCompleted >= 1 },
  { id: "social_butterfly", label: "Social Butterfly", desc: "Add 3 friends", xpReward: 40, check: (p) => (p.friends || []).length >= 3 },
  { id: "prompt_master", label: "Prompt Master", desc: "Send 10 prompts", xpReward: 30, check: (p) => (p.promptsSent || 0) >= 10 },
  { id: "week_streak", label: "Week Streak", desc: "7-day streak", xpReward: 75, check: (p) => p.streakDays >= 7 },
  { id: "reporter", label: "Safety Champion", desc: "File 5 reports", xpReward: 50, check: (p) => p.reportsFiled >= 5 },
  { id: "party_animal", label: "Party Animal", desc: "Join a party room", xpReward: 20, check: (p) => p.joinedParty === true },
  { id: "xp_hunter", label: "XP Hunter", desc: "Earn 500 total XP", xpReward: 0, check: (p) => (p.xp || 0) >= 500 },
  { id: "centurion", label: "Centurion", desc: "Complete 100 matches", xpReward: 150, check: (p) => p.matchesCompleted >= 100 },
  { id: "reactor", label: "Reactor", desc: "Send 20 emoji reactions", xpReward: 20, check: (p) => (p.reactionsUsed || 0) >= 20 },
  { id: "critic", label: "Critic", desc: "Rate 5 matches", xpReward: 25, check: (p) => (p.ratingsGiven || 0) >= 5 },
  { id: "night_owl", label: "Night Owl", desc: "Complete a match after 11pm", xpReward: 30, check: (p) => p.nightOwl === true },
  { id: "avatar_up", label: "Avatar Up", desc: "Set a custom avatar", xpReward: 10, check: (p) => p.avatar && p.avatar !== "😊" },
  { id: "interest_seeker", label: "Interest Seeker", desc: "Select 3 interests", xpReward: 15, check: (p) => (p.interests || []).length >= 3 },
  { id: "speed_yapper", label: "Speed Yapper", desc: "Complete 5 matches in one day", xpReward: 50, check: (p) => (p.dailyMatches || 0) >= 5 },
  { id: "prestige_1", label: "Prestige", desc: "Reach first prestige", xpReward: 200, check: (p) => (p.prestige || 0) >= 1 },
  { id: "legend_lvl", label: "Legend", desc: "Reach level 41", xpReward: 100, check: (p) => levelFromXp(p.xp || 0) >= 41 },
];

const ANIME_CHARS = [
  { id: "none",     name: "Off",      emoji: "🚫", filter: "none",                                                       color: "#64748b" },
  { id: "naruto",   name: "Naruto",   emoji: "🍃", filter: "saturate(1.5) hue-rotate(12deg) contrast(1.1)",              color: "#f97316" },
  { id: "goku",     name: "Goku",     emoji: "⚡", filter: "brightness(1.35) saturate(1.7) contrast(1.2)",               color: "#eab308" },
  { id: "luffy",    name: "Luffy",    emoji: "☠️", filter: "saturate(1.4) hue-rotate(-22deg) brightness(1.1)",           color: "#ef4444" },
  { id: "levi",     name: "Levi",     emoji: "⚔️", filter: "grayscale(0.5) contrast(1.4) brightness(0.88)",              color: "#94a3b8" },
  { id: "gojo",     name: "Gojo",     emoji: "🌀", filter: "brightness(1.25) saturate(0.65) hue-rotate(210deg)",         color: "#a78bfa" },
  { id: "tanjiro",  name: "Tanjiro",  emoji: "🔥", filter: "hue-rotate(-28deg) saturate(1.6) contrast(1.15)",           color: "#22c55e" },
  { id: "todoroki", name: "Todoroki", emoji: "🧊", filter: "hue-rotate(180deg) saturate(1.4) brightness(1.15)",          color: "#38bdf8" },
  { id: "saitama",  name: "Saitama",  emoji: "👊", filter: "brightness(1.5) saturate(0.35) contrast(1.35)",             color: "#fbbf24" },
  { id: "zoro",     name: "Zoro",     emoji: "🗡️", filter: "hue-rotate(92deg) saturate(1.5) contrast(1.2)",             color: "#4ade80" },
];

const PROMPTS = [
  "Drop your hottest take in 10 seconds.",
  "Tell one funny truth and one fake thing.",
  "What habit changed your life the most?",
  "What is your most unpopular food opinion?",
  "Describe your week in 3 words.",
  "What would you do with a free day tomorrow?",
  "Pick: time travel to past or future?",
  "Name one thing you secretly love but never admit.",
  "What app could you not survive without?",
  "Best or worst purchase you made recently?",
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
  localStage: byId("localStage"),
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
  xpProgress: byId("xpProgress"),
  xpMultiplier: byId("xpMultiplier"),
  weeklyChallenge: byId("weeklyChallenge"),
  achievementsList: byId("achievementsList"),
  achievementsCount: byId("achievementsCount"),
  rankBadge: byId("rankBadge"),
  darkModeBtn: byId("darkModeButton"),
  onlineCount: byId("onlineCount"),
  callTimer: byId("callTimer"),
  typingIndicator: byId("typingIndicator"),
  avatarDisplay: byId("avatarDisplay"),
  avatarSelector: byId("avatarSelector"),
  interestTags: byId("interestTags"),
  missionsList: byId("missionsList"),
  missionsCompleted: byId("missionsCompleted"),
  ratingOverlay: byId("ratingOverlay"),
  prestigeButton: byId("prestigeButton"),
  prestigeCount: byId("prestigeCount"),
  emojiReactions: byId("emojiReactions"),
  videoStack: byId("videoStack"),
  animeCharPicker: byId("animeCharPicker"),
  animeActiveLabel: byId("animeActiveLabel"),
  enhanceBtn: byId("enhanceButton"),
  peerAnimeBadge: byId("peerAnimeBadge"),
};

const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function setText(el, text) {
  if (el) el.textContent = text;
}
function setHidden(el, hidden) {
  if (el) el.hidden = hidden;
}
function setLocalFallback(message = "", shouldShow = false) {
  if (!els.localFallback) return;
  els.localFallback.textContent = message;
  setHidden(els.localFallback, !shouldShow);
}
function setLocalStageVisible(shouldShow) {
  setHidden(els.localStage, !shouldShow);
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

function isVercelHost(hostname) {
  return /\.vercel\.app$/i.test(String(hostname || ""));
}

function resolveBackendUrl() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("backend");
  const reset = params.get("reset_backend");
  const fallback = normalizeBackendUrl(DEPLOYED_BACKEND_URL);
  const currentOrigin = normalizeBackendUrl(window.location.origin);
  let saved = "";
  try {
    saved = localStorage.getItem("yaptalks_backend_url") || "";
  } catch (error) {
    saved = "";
  }
  if (reset === "1") {
    try { localStorage.removeItem("yaptalks_backend_url"); } catch (error) {}
    saved = "";
  }
  if (query) {
    const normalized = normalizeBackendUrl(query);
    try { localStorage.setItem("yaptalks_backend_url", normalized); } catch (error) {}
    return normalized;
  }
  const savedNormalized = saved ? normalizeBackendUrl(saved) : "";
  if (isVercelHost(window.location.hostname)) {
    const shouldUseFallback = !savedNormalized || savedNormalized === currentOrigin || savedNormalized.includes(".vercel.app");
    if (shouldUseFallback) {
      try { localStorage.setItem("yaptalks_backend_url", fallback); } catch (error) {}
      return fallback;
    }
  }
  return savedNormalized || fallback;
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
      } catch (error) {}
    }
  })();
  await state.socketClientLoadPromise;
  state.socketClientLoadPromise = null;
  return typeof io === "function";
}

// ── Progression helpers ──────────────────────────────────────────────────────

function xpForNextLevel(level) {
  return Math.floor(100 * Math.pow(1.35, level - 1));
}

function totalXpForLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForNextLevel(i);
  return total;
}

function levelFromXp(xp) {
  let level = 1;
  while (totalXpForLevel(level + 1) <= (Number(xp) || 0)) level++;
  return level;
}

function xpProgress(xp) {
  const level = levelFromXp(xp);
  const start = totalXpForLevel(level);
  const end = totalXpForLevel(level + 1);
  const current = (Number(xp) || 0) - start;
  const needed = end - start;
  return { current, needed, pct: Math.min(100, Math.floor((current / needed) * 100)) };
}

function rankTitle(level) {
  let title = RANKS[0].title;
  for (const r of RANKS) if (level >= r.minLevel) title = r.title;
  return title;
}

function xpMultiplierValue(streakDays, prestige = 0) {
  let base = 1.0;
  if (streakDays >= 30) base = 2.0;
  else if (streakDays >= 14) base = 1.75;
  else if (streakDays >= 7) base = 1.5;
  else if (streakDays >= 3) base = 1.25;
  return Math.round((base + prestige * 0.1) * 100) / 100;
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

function getWeekKey() {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const year = d.getFullYear();
  const week = Math.ceil((((d - new Date(year, 0, 1)) / 86400000) + 1) / 7);
  return `${year}-W${week}`;
}

// ── Sound effects (Web Audio API) ────────────────────────────────────────────

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "match") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === "message") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === "levelup") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.7);
    }
  } catch (e) {}
}

// ── Confetti ──────────────────────────────────────────────────────────────────

function launchConfetti() {
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const colors = ["#0ea37f", "#0f6ee9", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
  const pieces = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: -14,
    w: Math.random() * 8 + 4,
    h: Math.random() * 14 + 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: Math.random() * 3 + 2,
    vx: (Math.random() - 0.5) * 2.5,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 8,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 130) requestAnimationFrame(draw);
    else canvas.remove();
  }
  requestAnimationFrame(draw);
}

// ── XP Toast ─────────────────────────────────────────────────────────────────

function showXpToast(points, boosted) {
  const toast = document.createElement("div");
  toast.className = boosted ? "xp-toast xp-toast-boosted" : "xp-toast";
  toast.textContent = `+${points} XP`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("xp-toast-in")));
  setTimeout(() => {
    toast.classList.remove("xp-toast-in");
    setTimeout(() => toast.remove(), 500);
  }, 1600);
}

// ── Call Timer ────────────────────────────────────────────────────────────────

function startCallTimer() {
  state.callStartTime = Date.now();
  if (els.callTimer) els.callTimer.textContent = "0:00";
  state.callTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.callStartTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    if (els.callTimer) els.callTimer.textContent = `${m}:${String(s).padStart(2, "0")}`;
  }, 1000);
}

function stopCallTimer() {
  if (state.callTimerInterval) {
    clearInterval(state.callTimerInterval);
    state.callTimerInterval = null;
  }
  const elapsed = state.callStartTime ? Math.floor((Date.now() - state.callStartTime) / 1000) : 0;
  state.callStartTime = null;
  if (els.callTimer) els.callTimer.textContent = "0:00";
  return elapsed;
}

// ── Dark Mode ─────────────────────────────────────────────────────────────────

function applyDarkMode(on) {
  state.darkMode = on;
  document.body.classList.toggle("dark-mode", on);
  if (els.darkModeBtn) els.darkModeBtn.textContent = on ? "☀ Light" : "🌙 Dark";
}

function initDarkMode() {
  let saved = false;
  try { saved = localStorage.getItem("yaptalks_dark_mode") === "1"; } catch (e) {}
  applyDarkMode(saved);
}

function toggleDarkMode() {
  applyDarkMode(!state.darkMode);
  try { localStorage.setItem("yaptalks_dark_mode", state.darkMode ? "1" : "0"); } catch (e) {}
}

// ── Profile helpers ──────────────────────────────────────────────────────────

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
    achievements: [],
    promptsSent: 0,
    joinedParty: false,
    weeklyMatchesWeek: "",
    weeklyMatches: 0,
    weeklyChallengeAnnouncedWeek: "",
    avatar: "😊",
    interests: [],
    reactionsUsed: 0,
    ratingsGiven: 0,
    nightOwl: false,
    prestige: 0,
    dailyMissionsDay: "",
    dailyMissionProgress: {},
    dailyMissionsCompleted: [],
  };
}

function saveProfile() {
  if (!state.profile) return;
  try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state.profile)); } catch (error) {}
}

function loadProfile() {
  const today = getLocalDayKey();
  const fallback = createDefaultProfile(today);
  let parsed = null;
  try { parsed = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "null"); } catch (error) {}
  const profile = { ...fallback, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  profile.friends = Array.isArray(profile.friends) ? profile.friends.filter((f) => f && f.uid) : [];
  const gap = dayDiff(profile.lastActiveDay || today, today);
  profile.streakDays = gap === 1 ? Number(profile.streakDays || 1) + 1 : gap > 1 ? 1 : Number(profile.streakDays || 1);
  profile.lastActiveDay = today;
  if (profile.dailyMatchesDay !== today) {
    profile.dailyMatchesDay = today;
    profile.dailyMatches = 0;
  }
  if (!Array.isArray(profile.achievements)) profile.achievements = [];
  const currentWeek = getWeekKey();
  if (profile.weeklyMatchesWeek !== currentWeek) {
    profile.weeklyMatchesWeek = currentWeek;
    profile.weeklyMatches = 0;
  }
  if (profile.dailyMissionsDay !== today) {
    profile.dailyMissionsDay = today;
    profile.dailyMissionProgress = {};
    profile.dailyMissionsCompleted = [];
  }
  state.profile = profile;
  saveProfile();
}

// ── Missions ──────────────────────────────────────────────────────────────────

function getDailyMissions() {
  const seed = parseInt(getLocalDayKey().replace(/-/g, ""), 10);
  const pool = [...MISSION_POOL];
  let s = seed;
  for (let i = pool.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

function updateMissionProgress(field, amount = 1) {
  if (!state.profile) return;
  if (!state.profile.dailyMissionProgress) state.profile.dailyMissionProgress = {};
  state.profile.dailyMissionProgress[field] = (state.profile.dailyMissionProgress[field] || 0) + amount;
  const missions = getDailyMissions();
  const today = getLocalDayKey();
  if (!Array.isArray(state.profile.dailyMissionsCompleted)) state.profile.dailyMissionsCompleted = [];
  missions.forEach((m) => {
    const key = `${today}_${m.id}`;
    if (state.profile.dailyMissionsCompleted.includes(key)) return;
    const prog = state.profile.dailyMissionProgress[m.field] || 0;
    if (prog >= m.target) {
      state.profile.dailyMissionsCompleted.push(key);
      saveProfile();
      awardXp(m.xp, `Mission: ${m.label}`);
    }
  });
  saveProfile();
  renderMissions();
}

function renderMissions() {
  if (!els.missionsList || !state.profile) return;
  const missions = getDailyMissions();
  const today = getLocalDayKey();
  const completed = new Set(state.profile.dailyMissionsCompleted || []);
  const progress = state.profile.dailyMissionProgress || {};
  els.missionsList.innerHTML = "";
  let doneCount = 0;
  missions.forEach((m) => {
    const key = `${today}_${m.id}`;
    const done = completed.has(key);
    if (done) doneCount++;
    const current = Math.min(progress[m.field] || 0, m.target);
    const pct = Math.min(100, Math.floor((current / m.target) * 100));
    const row = document.createElement("div");
    row.className = done ? "mission-row done" : "mission-row";
    row.innerHTML = `
      <div class="mission-info">
        <span class="mission-label">${done ? "✓ " : ""}${m.label}</span>
        <span class="mission-reward">+${m.xp} XP</span>
      </div>
      <div class="mission-bar"><span style="width:${pct}%"></span></div>
      <span class="mission-prog">${current}/${m.target}</span>
    `;
    els.missionsList.appendChild(row);
  });
  setText(els.missionsCompleted, `${doneCount} / 3`);
}

// ── Interest Tags ─────────────────────────────────────────────────────────────

function renderInterestTags() {
  if (!els.interestTags || !state.profile) return;
  const selected = new Set(state.profile.interests || []);
  els.interestTags.innerHTML = "";
  INTERESTS.forEach((tag) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = selected.has(tag) ? "interest-tag active" : "interest-tag";
    btn.textContent = tag;
    btn.addEventListener("click", () => {
      if (selected.has(tag)) {
        selected.delete(tag);
      } else if (selected.size < 5) {
        selected.add(tag);
      }
      state.profile.interests = [...selected];
      saveProfile();
      checkAchievements();
      renderInterestTags();
    });
    els.interestTags.appendChild(btn);
  });
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function renderAvatarSelector() {
  if (!els.avatarSelector || !state.profile) return;
  els.avatarSelector.innerHTML = "";
  AVATARS.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = state.profile.avatar === emoji ? "avatar-option selected" : "avatar-option";
    btn.textContent = emoji;
    btn.title = emoji;
    btn.addEventListener("click", () => {
      state.profile.avatar = emoji;
      saveProfile();
      checkAchievements();
      renderProfile();
      renderAvatarSelector();
    });
    els.avatarSelector.appendChild(btn);
  });
}

// ── Match Rating ──────────────────────────────────────────────────────────────

function showRatingOverlay() {
  if (els.ratingOverlay) els.ratingOverlay.hidden = false;
}

function dismissRatingOverlay() {
  if (els.ratingOverlay) els.ratingOverlay.hidden = true;
}

function submitRating(stars) {
  dismissRatingOverlay();
  if (!state.profile) return;
  state.profile.ratingsGiven = (state.profile.ratingsGiven || 0) + 1;
  saveProfile();
  updateMissionProgress("dailyRatings", 1);
  awardXp(5, `Match rated ${stars}★`);
  checkAchievements();
}

// ── Prestige ──────────────────────────────────────────────────────────────────

function checkPrestige() {
  if (!state.profile) return;
  const level = levelFromXp(state.profile.xp);
  setHidden(els.prestigeButton, level < 50);
}

function doPrestige() {
  if (!state.profile) return;
  if (levelFromXp(state.profile.xp) < 50) {
    addMessage("System", "Reach level 50 to unlock prestige.");
    return;
  }
  state.profile.prestige = (state.profile.prestige || 0) + 1;
  state.profile.xp = 0;
  saveProfile();
  checkAchievements();
  renderProfile();
  launchConfetti();
  playSound("levelup");
  addMessage("System", `Prestige ${state.profile.prestige} achieved! XP resets — your multiplier is now ${xpMultiplierValue(state.profile.streakDays, state.profile.prestige)}x.`);
  setHidden(els.prestigeButton, true);
}

// ── Trust Score ───────────────────────────────────────────────────────────────

function trustScore(profile) {
  let score = 72 + Math.min(12, profile.streakDays * 2) + Math.min(10, Math.floor(profile.matchesCompleted / 4) * 2);
  score += profile.safetyGuard ? 5 : -5;
  score += Math.min(4, profile.reportsFiled);
  return Math.max(50, Math.min(99, score));
}

// ── Profile Stats Push ────────────────────────────────────────────────────────

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

// ── Achievements ──────────────────────────────────────────────────────────────

function renderAchievements() {
  if (!els.achievementsList || !state.profile) return;
  const unlocked = new Set(state.profile.achievements || []);
  setText(els.achievementsCount, `${unlocked.size} / ${ACHIEVEMENTS.length}`);
  els.achievementsList.innerHTML = "";
  ACHIEVEMENTS.forEach((ach) => {
    const badge = document.createElement("div");
    badge.className = unlocked.has(ach.id) ? "achievement-badge unlocked" : "achievement-badge locked";
    badge.title = `${ach.label}: ${ach.desc}${ach.xpReward ? ` (+${ach.xpReward} XP)` : ""}`;
    const icon = document.createElement("span");
    icon.className = "achievement-icon";
    icon.textContent = unlocked.has(ach.id) ? "★" : "○";
    const label = document.createElement("span");
    label.textContent = ach.label;
    badge.appendChild(icon);
    badge.appendChild(label);
    els.achievementsList.appendChild(badge);
  });
}

function checkAchievements() {
  if (!state.profile) return;
  if (!Array.isArray(state.profile.achievements)) state.profile.achievements = [];
  let changed = false;
  for (const ach of ACHIEVEMENTS) {
    if (!state.profile.achievements.includes(ach.id) && ach.check(state.profile)) {
      state.profile.achievements.push(ach.id);
      changed = true;
      if (ach.xpReward > 0) {
        state.profile.xp = (Number(state.profile.xp) || 0) + ach.xpReward;
        addMessage("System", `Achievement unlocked: ${ach.label}! +${ach.xpReward} XP.`);
        if (typeof toast !== "undefined") toast.success(`${ach.label} — +${ach.xpReward} XP`, 5000);
      } else {
        addMessage("System", `Achievement unlocked: ${ach.label}!`);
        if (typeof toast !== "undefined") toast.success(ach.label, 5000);
      }
    }
  }
  if (changed) saveProfile();
}

// ── Render Friends ────────────────────────────────────────────────────────────

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

// ── Render Leaderboard ────────────────────────────────────────────────────────

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
    const medal = ["🥇", "🥈", "🥉"][index] || `#${index + 1}`;
    const name = document.createElement("span");
    name.textContent = `${medal} ${item.name || "Yap User"}`;
    const score = document.createElement("strong");
    score.textContent = `${item.xp || 0} XP`;
    row.appendChild(name);
    row.appendChild(score);
    els.boardList.appendChild(row);
  });
}

// ── Render Party State ────────────────────────────────────────────────────────

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

// ── Render Profile ────────────────────────────────────────────────────────────

function renderProfile() {
  if (!state.profile) return;
  const level = levelFromXp(state.profile.xp);
  const { current, needed, pct } = xpProgress(state.profile.xp);
  const rank = rankTitle(level);
  const prestige = state.profile.prestige || 0;
  const mult = xpMultiplierValue(state.profile.streakDays || 1, prestige);
  const prestigeStars = prestige > 0 ? " " + "⭐".repeat(Math.min(prestige, 5)) : "";

  setText(els.streak, `${state.profile.streakDays} ${state.profile.streakDays === 1 ? "day" : "days"}`);
  setText(els.level, `${level}${prestigeStars}`);
  setText(els.xp, String(state.profile.xp || 0));
  if (els.rankBadge) els.rankBadge.textContent = rank;
  if (els.avatarDisplay) els.avatarDisplay.textContent = state.profile.avatar || "😊";
  if (els.prestigeCount) els.prestigeCount.textContent = prestige > 0 ? `${prestige} Prestige${prestige > 1 ? "s" : ""}` : "";
  if (els.xpProgress) els.xpProgress.textContent = `${current} / ${needed} XP to next level`;
  if (els.xpMultiplier) {
    els.xpMultiplier.textContent = `${mult}x boost`;
    setHidden(els.xpMultiplier, mult <= 1);
  }
  setText(els.trust, `Trust ${trustScore(state.profile)}`);
  setText(els.reports, String(state.profile.reportsFiled || 0));
  setText(els.matches, String(state.profile.matchesCompleted || 0));

  const dailyLeft = Math.max(0, 3 - (state.profile.dailyMatches || 0));
  setText(els.challenge, dailyLeft === 0
    ? "Daily goal complete. Bonus unlocked."
    : `Daily: ${dailyLeft} more match${dailyLeft === 1 ? "" : "es"} for +30 XP.`);

  const weeklyLeft = Math.max(0, 15 - (state.profile.weeklyMatches || 0));
  if (els.weeklyChallenge) {
    els.weeklyChallenge.textContent = weeklyLeft === 0
      ? "Weekly goal complete! +100 XP earned."
      : `Weekly: ${weeklyLeft} more match${weeklyLeft === 1 ? "" : "es"} for +100 XP.`;
  }

  setText(els.guard, `Safety Guard: ${state.profile.safetyGuard ? "ON" : "OFF"}`);
  if (els.xpBar) els.xpBar.style.width = `${pct}%`;
  checkPrestige();
  renderAchievements();
  renderFriends();
  renderMissions();
  maybePushProfileStats();
}

// ── Award XP ──────────────────────────────────────────────────────────────────

function awardXp(points, message) {
  if (!state.profile || !Number.isFinite(points) || points <= 0) return;
  const mult = xpMultiplierValue(state.profile.streakDays || 1, state.profile.prestige || 0);
  const actual = Math.floor(points * mult);
  const oldLevel = levelFromXp(state.profile.xp);
  state.profile.xp = (Number(state.profile.xp) || 0) + actual;
  saveProfile();
  checkAchievements();
  renderProfile();
  showXpToast(actual, mult > 1);
  if (message) addMessage("System", `${message} +${actual} XP${mult > 1.01 ? ` (${mult}x boost)` : ""}.`);
  const newLevel = levelFromXp(state.profile.xp);
  if (newLevel > oldLevel) {
    addMessage("System", `Level up! You are now level ${newLevel} — ${rankTitle(newLevel)}.`);
    playSound("levelup");
    launchConfetti();
    if (typeof window.celebrateLevelUp === "function") window.celebrateLevelUp(newLevel);
  }
}

// ── Add Friend ────────────────────────────────────────────────────────────────

function addFriend(user) {
  if (!state.profile || !user || !user.uid) return;
  if (state.profile.friends.some((f) => f.uid === user.uid)) return;
  state.profile.friends.push({ uid: user.uid, name: user.name || "Friend", addedAt: Date.now() });
  saveProfile();
  renderProfile();
  awardXp(15, "Mutual add completed");
  updateMissionProgress("dailyFriends", 1);
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function setPrompt(text) {
  state.currentPrompt = text;
  setText(els.promptText, text);
}

function nextPrompt() {
  let prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  if (PROMPTS.length > 1) while (prompt === state.currentPrompt) prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  setPrompt(prompt);
}

// ── WebRTC helpers ────────────────────────────────────────────────────────────

function currentMatchOptions() {
  return { mode: "video", filter: "all", interests: state.profile?.interests || [] };
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
  const elapsed = stopCallTimer();
  state.currentPeerId = null;
  state.currentRoomId = null;
  state.incomingFriendRequest = null;
  setHidden(els.acceptFriend, true);
  setHidden(els.typingIndicator, true);
  clearTimeout(state.typingDisplayTimeout);
  if (els.videoStack) els.videoStack.classList.remove("is-live");
  if (els.peerAnimeBadge) els.peerAnimeBadge.hidden = true;
  resetPeer();
  clearRemoteMedia();
  setDisconnectedUI(reason);
  if (elapsed >= 30) showRatingOverlay();
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
  if (state.stream) { applyTracks(); return true; }
  if (!navigator.mediaDevices?.getUserMedia) {
    setLocalStageVisible(true);
    setLocalFallback("Camera preview needs a browser with media access.", true);
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    state.stream = stream;
    if (els.localVideo) els.localVideo.srcObject = stream;
    setLocalStageVisible(true);
    setLocalFallback("", false);
    setText(els.preview, "Camera ready");
    if (state.animeChar !== "none") {
      const char = ANIME_CHARS.find((c) => c.id === state.animeChar);
      if (char) {
        startCanvasFilterLoop(char.filter);
        if (els.localVideo) els.localVideo.style.filter = char.filter;
      }
    }
    applyTracks();
    addMessage("System", "Camera and microphone are ready.");
    return true;
  } catch (error) {
    setLocalStageVisible(true);
    setLocalFallback("Camera or microphone access was blocked.", true);
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
  if (state.stream) {
    const streamToSend = (state.animeChar !== "none" && state.filteredStream) ? state.filteredStream : state.stream;
    streamToSend.getTracks().forEach((track) => pc.addTrack(track, streamToSend));
  }
  return pc;
}

// ── Socket Connection ─────────────────────────────────────────────────────────

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

  socket.on("anime-theme", (payload = {}) => {
    if (payload.from === state.currentPeerId && els.peerAnimeBadge) {
      const char = ANIME_CHARS.find((c) => c.id === payload.charId);
      if (!char || char.id === "none") {
        els.peerAnimeBadge.hidden = true;
      } else {
        els.peerAnimeBadge.hidden = false;
        els.peerAnimeBadge.textContent = `${char.emoji} ${char.name}`;
        els.peerAnimeBadge.style.setProperty("--char-color", char.color);
      }
    }
  });

  socket.on("security-ban", () => {
    addMessage("System", "You have been disconnected for unusual activity.");
  });

  socket.on("connect", () => {
    setText(els.queueStatus, "Online");
    setText(els.matchQuality, "Ready to match");
    addMessage("System", "Connected to live server.");
    maybePushProfileStats(true);
    socket.emit("leaderboard-get");
    socket.emit("get-online-count");
  });

  socket.on("disconnect", () => {
    stopCallTimer();
    clearMatch("Server disconnected");
    state.partyRoomCode = "";
    state.partyMembers = [];
    renderPartyState();
    addMessage("System", "Connection dropped. Reconnecting automatically...");
  });

  socket.on("online-count", (payload = {}) => {
    const n = Number(payload.count) || 0;
    if (els.onlineCount) els.onlineCount.textContent = `${n.toLocaleString()} online`;
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
    setHidden(els.typingIndicator, true);
    if (els.videoStack) els.videoStack.classList.add("is-live");
    showMatchFlash();
    if (isNewRoom && state.profile) {
      state.profile.matchesCompleted = (state.profile.matchesCompleted || 0) + 1;
      state.profile.dailyMatches = (state.profile.dailyMatches || 0) + 1;
      state.profile.weeklyMatches = (state.profile.weeklyMatches || 0) + 1;
      const hour = new Date().getHours();
      if (hour >= 23 || hour < 4) state.profile.nightOwl = true;
      saveProfile();
      renderProfile();
      playSound("match");
      startCallTimer();
      awardXp(22);
      updateMissionProgress("dailyMatchCount", 1);
      if (state.profile.dailyMatches >= 3 && state.profile.challengeAnnouncedDay !== getLocalDayKey()) {
        state.profile.challengeAnnouncedDay = getLocalDayKey();
        saveProfile();
        awardXp(30, "Daily challenge completed");
      }
      if (state.profile.weeklyMatches >= 15 && state.profile.weeklyChallengeAnnouncedWeek !== getWeekKey()) {
        state.profile.weeklyChallengeAnnouncedWeek = getWeekKey();
        saveProfile();
        awardXp(100, "Weekly challenge completed");
      }
    }
    setText(els.queueStatus, "Connected");
    setText(els.matchHeadline, "Matched with a stranger");
    const interestList = (state.profile?.interests || []).join(", ");
    setText(els.matchQuality, interestList ? `Interests: ${interestList}` : "Random match");
    addMessage("System", "You are connected. Keep the conversation respectful.");
    if (typeof toast !== "undefined") toast.info("New match found!", 3000);
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
    if (!mine) playSound("message");
  });

  socket.on("typing", () => {
    if (!els.typingIndicator) return;
    els.typingIndicator.hidden = false;
    clearTimeout(state.typingDisplayTimeout);
    state.typingDisplayTimeout = setTimeout(() => {
      if (els.typingIndicator) els.typingIndicator.hidden = true;
    }, 2000);
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
    playSound("message");
  });

  socket.on("friend-accepted", (payload = {}) => {
    addFriend(payload.fromUser || {});
    addMessage("System", `${payload.fromUser?.name || "Friend"} accepted your request.`);
  });

  socket.on("party-state", (payload = {}) => {
    const wasInParty = Boolean(state.partyRoomCode);
    state.partyRoomCode = payload.code || "";
    state.partyMembers = Array.isArray(payload.members) ? payload.members : [];
    if (state.partyRoomCode && !wasInParty && state.profile && !state.profile.joinedParty) {
      state.profile.joinedParty = true;
      saveProfile();
      checkAchievements();
    }
    renderPartyState();
  });

  socket.on("party-message", (payload = {}) => {
    addMessage(`Party · ${payload.fromName || "Member"}`, payload.text || "");
    playSound("message");
  });

  socket.on("party-error", (payload = {}) => {
    addMessage("System", payload.message || "Party action failed.");
  });

  socket.on("leaderboard-data", (payload = {}) => { renderLeaderboard(payload.items || []); });
  socket.on("leaderboard-update", (payload = {}) => { renderLeaderboard(payload.items || []); });

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
    } catch (error) {}
  });

  return true;
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function requestMatch(useNext = false) {
  if (!ensureAuthenticated("start chat")) return;
  const connected = await connectSocketIfNeeded();
  if (!connected || !state.socket) return;
  await ensureLocalStream();
  if (useNext || state.currentRoomId) {
    stopCallTimer();
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
  updateMissionProgress("dailyMessages", 1);
}

function emitTyping() {
  if (!state.socket || !state.currentRoomId || !state.currentPeerId) return;
  if (state.typingEmitTimeout) return;
  state.socket.emit("typing", { to: state.currentPeerId });
  state.typingEmitTimeout = setTimeout(() => { state.typingEmitTimeout = null; }, 1000);
}

async function sendPromptToChat() {
  if (!ensureAuthenticated("send prompts")) return;
  if (!state.currentRoomId || !state.socket) {
    addMessage("System", "Start a match first, then use Prompt Battles.");
    return;
  }
  state.socket.emit("chat-message", { text: `Prompt Battle: ${state.currentPrompt}` });
  if (state.profile) {
    state.profile.promptsSent = (state.profile.promptsSent || 0) + 1;
    saveProfile();
  }
  awardXp(4);
  updateMissionProgress("dailyPrompts", 1);
}

function sendReaction(emoji) {
  if (!state.currentRoomId || !state.socket) {
    addMessage("System", "Start a match first.");
    return;
  }
  state.socket.emit("chat-message", { text: emoji });
  if (state.profile) {
    state.profile.reactionsUsed = (state.profile.reactionsUsed || 0) + 1;
    saveProfile();
  }
  awardXp(1);
  updateMissionProgress("dailyReactions", 1);
  checkAchievements();
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
  if (!code) { addMessage("System", "Enter a room code to join."); return; }
  state.socket.emit("party-join", { code });
}

function leavePartyRoom() {
  if (state.socket && state.partyRoomCode) state.socket.emit("party-leave");
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
  updateMissionProgress("dailyPartyMsgs", 1);
}

// ── Event Listeners ───────────────────────────────────────────────────────────

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
if (els.darkModeBtn) els.darkModeBtn.addEventListener("click", toggleDarkMode);
if (els.prestigeButton) els.prestigeButton.addEventListener("click", doPrestige);
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
if (els.chatInput) {
  els.chatInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void sendChat();
    else emitTyping();
  });
}
if (els.partyInput) els.partyInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); sendPartyMessage(); }
});
if (els.localVideo) {
  els.localVideo.addEventListener("loadeddata", () => {
    setLocalStageVisible(true);
    setLocalFallback("", false);
  });
  els.localVideo.addEventListener("playing", () => {
    setLocalStageVisible(true);
    setLocalFallback("", false);
  });
}

// Emoji reaction buttons
if (els.emojiReactions) {
  els.emojiReactions.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-emoji]");
    if (btn) sendReaction(btn.dataset.emoji);
  });
}

// Rating overlay stars
if (els.ratingOverlay) {
  els.ratingOverlay.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-stars]");
    if (btn) submitRating(Number(btn.dataset.stars));
    if (event.target.id === "skipRatingButton") dismissRatingOverlay();
  });
}

// ── Splash Screen ─────────────────────────────────────────────────────────────

function runSplash(onDone) {
  const splash = document.getElementById("splash");
  const fill = document.getElementById("splashBarFill");
  if (!splash) { onDone(); return; }

  let pct = 0;
  const steps = [
    { to: 30,  delay: 120 },
    { to: 55,  delay: 200 },
    { to: 75,  delay: 180 },
    { to: 88,  delay: 250 },
    { to: 100, delay: 160 },
  ];

  function runStep(i) {
    if (i >= steps.length) {
      setTimeout(() => {
        splash.classList.add("splash-done");
        setTimeout(onDone, 700);
      }, 280);
      return;
    }
    const s = steps[i];
    setTimeout(() => {
      pct = s.to;
      if (fill) fill.style.width = pct + "%";
      runStep(i + 1);
    }, s.delay);
  }

  runStep(0);
}

// ── Bot Detection ─────────────────────────────────────────────────────────────

let humanScore = 0;
const incHuman = (n) => { humanScore = Math.min(humanScore + n, 100); };
document.addEventListener("mousemove", () => incHuman(1), { passive: true });
document.addEventListener("keydown",   () => incHuman(5), { passive: true });
document.addEventListener("touchstart",() => incHuman(10), { passive: true });
document.addEventListener("scroll",    () => incHuman(3), { passive: true });
function isHuman() { return humanScore >= 8; }

// ── Anime Character System ─────────────────────────────────────────────────────

function renderAnimeCharPicker() {
  const container = els.animeCharPicker;
  if (!container) return;
  container.innerHTML = "";
  ANIME_CHARS.forEach((char) => {
    const btn = document.createElement("button");
    btn.className = "char-btn" + (state.animeChar === char.id ? " active" : "");
    btn.type = "button";
    btn.dataset.charId = char.id;
    btn.title = char.name;
    btn.innerHTML = `<span class="char-emoji">${char.emoji}</span><span class="char-name">${char.name}</span>`;
    if (char.id !== "none") btn.style.setProperty("--char-color", char.color);
    container.appendChild(btn);
  });
}

// ── Canvas Filter (bakes CSS filters into video stream sent via WebRTC) ───────

function stopCanvasFilterLoop() {
  if (state.filterAnimFrame) {
    cancelAnimationFrame(state.filterAnimFrame);
    state.filterAnimFrame = null;
  }
}

function startCanvasFilterLoop(cssFilter) {
  stopCanvasFilterLoop();
  if (!els.localVideo) return;

  if (!state.filterCanvas) {
    state.filterCanvas = document.createElement("canvas");
    state.filterCanvas.width = 1280;
    state.filterCanvas.height = 720;
    state.filterCtx = state.filterCanvas.getContext("2d");
  }

  const ctx = state.filterCtx;
  const canvas = state.filterCanvas;

  function draw() {
    if (!els.localVideo || els.localVideo.readyState < 2) {
      state.filterAnimFrame = requestAnimationFrame(draw);
      return;
    }
    const vw = els.localVideo.videoWidth;
    const vh = els.localVideo.videoHeight;
    if (vw && vh && (canvas.width !== vw || canvas.height !== vh)) {
      canvas.width = vw;
      canvas.height = vh;
    }
    ctx.filter = cssFilter;
    ctx.drawImage(els.localVideo, 0, 0, canvas.width, canvas.height);
    state.filterAnimFrame = requestAnimationFrame(draw);
  }

  state.filteredStream = canvas.captureStream(30);
  if (state.stream) {
    const audioTracks = state.stream.getAudioTracks();
    audioTracks.forEach((t) => state.filteredStream.addTrack(t));
  }

  draw();
}

function replaceRTCVideoTrack(newVideoTrack) {
  if (!state.peerConnection || !newVideoTrack) return;
  const senders = state.peerConnection.getSenders();
  const videoSender = senders.find((s) => s.track && s.track.kind === "video");
  if (videoSender) videoSender.replaceTrack(newVideoTrack);
}

function applyAnimeFilter(charId) {
  state.animeChar = charId;
  const char = ANIME_CHARS.find((c) => c.id === charId) || ANIME_CHARS[0];

  if (char.id === "none") {
    stopCanvasFilterLoop();
    state.filteredStream = null;
    if (els.localVideo) els.localVideo.style.filter = "";
    if (state.stream) {
      const rawVideo = state.stream.getVideoTracks()[0];
      replaceRTCVideoTrack(rawVideo);
    }
  } else {
    startCanvasFilterLoop(char.filter);
    // CSS filter on localVideo = what the user sees in their own preview
    // Canvas stream = what the peer actually receives via WebRTC
    if (els.localVideo) els.localVideo.style.filter = char.filter;
    if (state.filteredStream) {
      const canvasVideo = state.filteredStream.getVideoTracks()[0];
      replaceRTCVideoTrack(canvasVideo);
    }
  }

  if (els.localStage) {
    els.localStage.style.boxShadow = char.id === "none" ? "" : `0 0 0 3px ${char.color}, 0 0 20px ${char.color}55`;
  }
  if (els.animeActiveLabel) els.animeActiveLabel.textContent = char.id === "none" ? "Off" : `${char.emoji} ${char.name}`;
  renderAnimeCharPicker();
  if (state.socket && state.currentRoomId) {
    state.socket.emit("anime-theme", { charId: char.id, charName: char.name });
  }
}

// ── Video Enhancement ──────────────────────────────────────────────────────────

function toggleVideoEnhance() {
  state.videoEnhance = !state.videoEnhance;
  if (els.remoteVideo) {
    els.remoteVideo.style.filter = state.videoEnhance
      ? "brightness(1.14) contrast(1.09) saturate(1.12)"
      : "";
  }
  if (els.enhanceBtn) {
    els.enhanceBtn.textContent = state.videoEnhance ? "✨ HD ON" : "✨ HD";
    els.enhanceBtn.classList.toggle("active-enhance", state.videoEnhance);
  }
  if (els.videoStack) els.videoStack.classList.toggle("video-enhanced", state.videoEnhance);
}

// ── Emoji Burst ────────────────────────────────────────────────────────────────

function emojiBurst(emoji, clientX, clientY) {
  const count = 6;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "emoji-burst";
    el.textContent = emoji;
    const angle = (360 / count) * i + Math.random() * 30 - 15;
    const dist = 60 + Math.random() * 50;
    const rad = (angle * Math.PI) / 180;
    el.style.cssText = `left:${clientX}px;top:${clientY}px;--dx:${Math.cos(rad) * dist}px;--dy:${Math.sin(rad) * dist}px;animation-delay:${i * 35}ms`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
}

// ── Match Flash ────────────────────────────────────────────────────────────────

function showMatchFlash() {
  const el = document.createElement("div");
  el.className = "match-flash";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ── Sidebar Tabs ──────────────────────────────────────────────────────────────

function initSidebarTabs() {
  const tabs = document.querySelectorAll(".sidebar-tab");
  const panels = document.querySelectorAll(".tab-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.setAttribute("hidden", ""));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      const panel = document.querySelector(`.tab-panel[data-panel="${target}"]`);
      if (panel) panel.removeAttribute("hidden");
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

state.backendUrl = resolveBackendUrl();
initDarkMode();
loadProfile();
renderProfile();
renderInterestTags();
renderAvatarSelector();
renderAnimeCharPicker();
nextPrompt();
renderLeaderboard([]);
renderPartyState();
setDisconnectedUI("Ready");
setLocalStageVisible(false);
setLocalFallback("", false);
applyTracks();
console.info("YapTalks build", "2026-05-10-v4");

runSplash(() => {});
initSidebarTabs();

// Anime picker click delegation
if (els.animeCharPicker) {
  els.animeCharPicker.addEventListener("click", (e) => {
    const btn = e.target.closest(".char-btn");
    if (!btn) return;
    applyAnimeFilter(btn.dataset.charId);
  });
}

// Video enhance toggle
if (els.enhanceBtn) {
  els.enhanceBtn.addEventListener("click", toggleVideoEnhance);
}

// Emoji burst on reaction click
if (els.emojiReactions) {
  els.emojiReactions.addEventListener("click", (e) => {
    const btn = e.target.closest(".emoji-btn");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    emojiBurst(btn.dataset.emoji, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
}

// Bot-detection guard on find match
if (els.find) {
  const origFind = els.find.onclick;
  els.find.addEventListener("click", (e) => {
    if (!isHuman()) {
      e.stopImmediatePropagation();
      setText(els.find, "Verifying...");
      setTimeout(() => setText(els.find, "Find match"), 1200);
    }
  }, true);
}

window.addEventListener("beforeunload", () => {
  if (state.socket && state.currentRoomId) state.socket.emit("leave-match", { reason: "tab-close" });
  if (state.socket && state.partyRoomCode) state.socket.emit("party-leave");
  if (state.socket) state.socket.disconnect();
  if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
  stopCanvasFilterLoop();
  stopCallTimer();
});

window.addEventListener("yaptalks-auth-changed", (event) => {
  const detail = event.detail || {};
  state.authReady = true;
  state.isAuthenticated = Boolean(detail.isAuthenticated);
  if (!state.isAuthenticated) {
    stopCallTimer();
    clearMatch("Logged out");
    leavePartyRoom();
    if (state.socket) { state.socket.disconnect(); state.socket = null; }
    if (state.stream) { state.stream.getTracks().forEach((track) => track.stop()); state.stream = null; }
    if (els.localVideo) els.localVideo.srcObject = null;
    setLocalStageVisible(false);
    setLocalFallback("", false);
    setText(els.preview, "Enable camera");
    return;
  }
  addMessage("System", "Login successful. YapTalks v3 is active.");
  if (typeof toast !== "undefined") toast.success("Welcome back!", 3000);
});

// ── Cursor Glow ───────────────────────────────────────────────────────────────

(function initCursorGlow() {
  const glow = document.getElementById("cursorGlow");
  if (!glow) return;
  if (!window.matchMedia("(pointer: fine)").matches) {
    glow.style.display = "none";
    return;
  }
  document.addEventListener("mousemove", (e) => {
    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";
  }, { passive: true });
})();

// ── Hero Stat Sync (mirrors online count into hero) ───────────────────────────

(function initHeroStatSync() {
  const heroEl = document.getElementById("heroStatOnline");
  const sourceEl = document.getElementById("onlineCount");
  if (!heroEl || !sourceEl) return;
  const sync = () => {
    const raw = sourceEl.textContent.trim();
    heroEl.textContent = raw || "···";
  };
  sync();
  new MutationObserver(sync).observe(sourceEl, { childList: true, characterData: true, subtree: true });
})();

// ── Toast System ─────────────────────────────────────────────────────────────

const toast = (() => {
  const container = document.getElementById("toastContainer");
  const icons = { success: "✓", error: "✕", info: "i", warn: "!" };
  const titles = { success: "Success", error: "Error", info: "Info", warn: "Warning" };

  function show(message, type = "info", duration = 4000) {
    if (!container) return;
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.setAttribute("role", "alert");
    el.setAttribute("aria-live", "assertive");
    el.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span>
      <div class="toast-body">
        <div class="toast-title">${titles[type] || "Notice"}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss" type="button">×</button>`;

    const dismiss = () => {
      el.classList.add("toast-out");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    };
    el.querySelector(".toast-close").addEventListener("click", dismiss);
    container.appendChild(el);
    if (duration > 0) setTimeout(dismiss, duration);
    return dismiss;
  }

  return {
    success: (msg, dur) => show(msg, "success", dur),
    error:   (msg, dur) => show(msg, "error",   dur),
    info:    (msg, dur) => show(msg, "info",     dur),
    warn:    (msg, dur) => show(msg, "warn",     dur),
    show,
  };
})();

// ── Network Status Banner ────────────────────────────────────────────────────

(function initNetworkStatus() {
  const banner = document.getElementById("networkBanner");
  if (!banner) return;

  let hideTimer = null;

  function showBanner(online) {
    clearTimeout(hideTimer);
    banner.hidden = false;
    banner.classList.toggle("is-visible", false);
    // force reflow so transition fires
    void banner.offsetWidth;
    banner.classList.toggle("is-online", online);
    banner.classList.add("is-visible");

    if (online) {
      hideTimer = setTimeout(() => {
        banner.classList.remove("is-visible");
        banner.addEventListener("transitionend", () => { banner.hidden = true; }, { once: true });
      }, 3000);
    }
  }

  window.addEventListener("offline", () => {
    showBanner(false);
    toast.error("No internet connection.", 0);
  });

  window.addEventListener("online", () => {
    showBanner(true);
    toast.success("Back online!");
  });

  if (!navigator.onLine) showBanner(false);
})();

// ── Help Modal ───────────────────────────────────────────────────────────────

(function initHelpModal() {
  const modal   = document.getElementById("helpModal");
  const openBtn = document.getElementById("helpButton");
  const mobileHelpBtn = document.getElementById("mobileHelpBtn");
  const closeBtn = document.getElementById("helpCloseButton");
  if (!modal) return;

  function openHelp() {
    modal.hidden = false;
    modal.querySelector(".help-card")?.focus?.();
    document.body.style.overflow = "hidden";
  }
  function closeHelp() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  openBtn?.addEventListener("click", openHelp);
  mobileHelpBtn?.addEventListener("click", openHelp);
  closeBtn?.addEventListener("click", closeHelp);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeHelp(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) { e.preventDefault(); closeHelp(); }
  });

  window._helpModal = { open: openHelp, close: closeHelp };
})();

// ── Keyboard Shortcuts ───────────────────────────────────────────────────────

(function initKeyboardShortcuts() {
  const ignore = () => {
    const t = document.activeElement?.tagName;
    return t === "INPUT" || t === "TEXTAREA" || t === "SELECT";
  };

  document.addEventListener("keydown", (e) => {
    // Don't fire when typing in inputs
    if (ignore()) return;

    switch (e.key) {
      case "?":
        e.preventDefault();
        window._helpModal?.open();
        break;

      case "m":
      case "M":
        // Toggle mute
        e.preventDefault();
        document.getElementById("muteButton")?.click();
        break;

      case "c":
      case "C":
        // Toggle camera
        e.preventDefault();
        document.getElementById("cameraButton")?.click();
        break;

      case "n":
      case "N":
        // Next / skip current peer
        e.preventDefault();
        document.getElementById("nextMatchButton")?.click();
        break;

      case "d":
      case "D":
        // Toggle dark mode
        e.preventDefault();
        document.getElementById("darkModeButton")?.click();
        break;

      case "Escape":
        // Close any open panel (help closed by its own handler)
        document.getElementById("authModal")?.setAttribute("hidden", "");
        break;
    }

    // Ctrl/Cmd + Enter → send chat message
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      const focused = document.activeElement;
      const chatInput = document.getElementById("chatInput");
      if (chatInput && focused === chatInput) {
        e.preventDefault();
        document.getElementById("sendButton")?.click();
      }
    }
  });
})();

// ── Server-Shutdown Handler ──────────────────────────────────────────────────

(function initServerShutdownHandler() {
  // socket is set up later; attach on the socket after init
  const attachShutdown = () => {
    if (!state.socket) return;
    state.socket.on("server-shutdown", () => {
      toast.warn("Server is restarting. You will be reconnected shortly.", 0);
      addMessage("System", "Server is restarting — please wait.");
    });
  };

  // Poll until socket is ready (it's created asynchronously)
  const poll = setInterval(() => {
    if (state.socket) {
      attachShutdown();
      clearInterval(poll);
    }
  }, 500);
})();

// ── XP Level-Up Celebration ──────────────────────────────────────────────────

function celebrateLevelUp(newLevel) {
  toast.success(`Level ${newLevel} reached! Keep going.`, 5000);

  // Brief full-page flash
  const flash = document.createElement("div");
  flash.style.cssText = `
    position:fixed;inset:0;z-index:9000;pointer-events:none;
    background:radial-gradient(circle at 50% 40%, rgba(14,163,127,0.22) 0%, transparent 70%);
    animation:fadeIn 0.15s ease forwards, fadeOut 0.6s 0.4s ease forwards;
  `;
  document.body.appendChild(flash);
  flash.addEventListener("animationend", (e) => {
    if (e.animationName === "fadeOut") flash.remove();
  });
}

// Expose so XP handling code can call it
window.celebrateLevelUp = celebrateLevelUp;

// ── Scroll-Reveal (Intersection Observer) ────────────────────────────────────

(function initScrollReveal() {
  if (!("IntersectionObserver" in window)) {
    // Fallback: just show everything
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Also observe any dynamically added .reveal elements
  new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.classList?.contains("reveal")) io.observe(node);
        node.querySelectorAll?.(".reveal").forEach((el) => io.observe(el));
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();

// ── Topbar Scroll-Shrink ──────────────────────────────────────────────────────

(function initTopbarShrink() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  const onScroll = () => topbar.classList.toggle("is-scrolled", window.scrollY > 20);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

// ── Animated Number Counter ──────────────────────────────────────────────────

function animateCounter(el, targetStr) {
  const target = parseInt(targetStr.replace(/[^0-9]/g, ""), 10);
  if (isNaN(target)) { el.textContent = targetStr; return; }

  const current = parseInt(el.textContent.replace(/[^0-9]/g, ""), 10) || 0;
  if (current === target) return;

  const diff = target - current;
  const duration = Math.min(Math.abs(diff) * 18, 800);
  const steps = Math.min(Math.abs(diff), 40);
  const stepTime = duration / steps;
  let step = 0;

  el.classList.add("counting");
  const timer = setInterval(() => {
    step++;
    const progress = step / steps;
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    el.textContent = Math.round(current + diff * eased).toLocaleString();
    if (step >= steps) {
      clearInterval(timer);
      el.textContent = target.toLocaleString();
      el.classList.remove("counting");
    }
  }, stepTime);
}

// Patch online-count socket event to use animated counter
const _origOnlineUpdate = window.__onlineCountHandler;
(function patchOnlineCount() {
  const countEl  = document.getElementById("onlineCount");
  const heroEl   = document.getElementById("heroStatOnline");
  if (!countEl) return;

  // Watch for text changes via MutationObserver and animate
  const animateIfChanged = (el) => {
    if (!el) return;
    let last = el.textContent;
    new MutationObserver(() => {
      const now = el.textContent;
      if (now !== last && /^\d/.test(now)) {
        animateCounter(el, now);
        last = now;
      }
    }).observe(el, { childList: true, characterData: true, subtree: true });
  };
  animateIfChanged(countEl);
  animateIfChanged(heroEl);
})();

// ── Leaderboard Skeleton Loader ──────────────────────────────────────────────

function showLeaderboardSkeleton(container, rows = 5) {
  if (!container) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < rows; i++) {
    const item = document.createElement("div");
    item.className = "leaderboard-skeleton-item";
    item.innerHTML = `
      <span class="skeleton skeleton-avatar"></span>
      <div style="flex:1;display:flex;flex-direction:column;gap:5px">
        <span class="skeleton skeleton-line w-3-4"></span>
        <span class="skeleton skeleton-line w-1-2"></span>
      </div>
      <span class="skeleton skeleton-line w-1-3" style="height:20px;border-radius:20px"></span>`;
    frag.appendChild(item);
  }
  container.replaceChildren(frag);
}

// Expose so leaderboard render can call it before data loads
window.showLeaderboardSkeleton = showLeaderboardSkeleton;

// ── Video Stage Connecting Pulse ──────────────────────────────────────────────

(function initStagePulse() {
  const remoteStage = document.querySelector(".video-stage:not(#localStage)") ||
                      document.getElementById("remoteStage");
  if (!remoteStage) return;

  // Watch matchHeadline text to derive connection state
  const headline = document.getElementById("matchHeadline");
  if (!headline) return;

  const update = () => {
    const text = headline.textContent.toLowerCase();
    const connecting = text.includes("searching") || text.includes("connecting") || text.includes("queue");
    const connected  = text.includes("matched") || text.includes("connected");
    remoteStage.classList.toggle("is-connecting", connecting && !connected);
    remoteStage.classList.toggle("peer-connected", connected);
  };
  update();
  new MutationObserver(update).observe(headline, { childList: true, characterData: true, subtree: true });
})();

// ── Typing Indicator Helper ───────────────────────────────────────────────────

function createTypingIndicator() {
  const el = document.createElement("div");
  el.className = "typing-indicator";
  el.setAttribute("aria-label", "Stranger is typing");
  el.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;
  return el;
}

// Expose so the typing-event handler can swap in the animated dots
window.createTypingIndicator = createTypingIndicator;

// ── Audio Visualizer ─────────────────────────────────────────────────────────

(function initAudioVisualizer() {
  const container = document.getElementById("audioVisualizer");
  if (!container) return;

  let analyser = null;
  let dataArr  = null;
  let rafId    = null;
  let isActive = false;

  function buildBars() {
    container.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const bar = document.createElement("div");
      bar.className = "audio-bar";
      container.appendChild(bar);
    }
  }
  buildBars();

  function startVisualization(stream) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      dataArr = new Uint8Array(analyser.frequencyBinCount);
      isActive = true;
      container.classList.remove("is-muted");
      animateFrame();
    } catch (e) { /* audio ctx not available */ }
  }

  function animateFrame() {
    if (!isActive || !analyser) return;
    analyser.getByteFrequencyData(dataArr);
    const bars = container.querySelectorAll(".audio-bar");
    bars.forEach((bar, i) => {
      const val = dataArr[Math.floor(i * dataArr.length / bars.length)] || 0;
      const h = Math.max(3, (val / 255) * 20);
      bar.style.height = h + "px";
    });
    const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length;
    container.classList.toggle("is-speaking", avg > 20);
    rafId = requestAnimationFrame(animateFrame);
  }

  function stopVisualization() {
    isActive = false;
    cancelAnimationFrame(rafId);
    analyser = null;
    container.classList.add("is-muted");
    container.querySelectorAll(".audio-bar").forEach(b => b.style.height = "3px");
  }

  // Hook into state.stream changes
  const origEnsure = window.__ensureLocalStream;
  window._audioViz = { start: startVisualization, stop: stopVisualization };
})();

// ── Match Timer ──────────────────────────────────────────────────────────────

(function initMatchTimer() {
  const el = document.getElementById("matchTimerDisplay");
  if (!el) return;

  function fmt(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  let start = null;
  let raf   = null;

  function tick() {
    if (!start) return;
    const elapsed = Math.floor((Date.now() - start) / 1000);
    el.textContent = fmt(elapsed);
    el.closest(".match-timer")?.classList.toggle("long", elapsed > 300);
    raf = requestAnimationFrame(tick);
  }

  window._matchTimer = {
    start() { start = Date.now(); tick(); },
    stop()  { start = null; cancelAnimationFrame(raf); el.textContent = "00:00"; },
  };
})();

// ── Floating Emoji Reaction ──────────────────────────────────────────────────

function floatReaction(emoji, originEl) {
  const rect = originEl
    ? originEl.getBoundingClientRect()
    : { left: window.innerWidth / 2, top: window.innerHeight * 0.6, width: 0, height: 0 };
  const el = document.createElement("div");
  el.className = "reaction-float";
  el.textContent = emoji;
  el.style.left = (rect.left + rect.width / 2 + (Math.random() - 0.5) * 40) + "px";
  el.style.top  = (rect.top + rect.height / 2) + "px";
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}
window.floatReaction = floatReaction;

// ── Profile Card Mouse-follow Glow ───────────────────────────────────────────

(function initProfileCardGlow() {
  document.addEventListener("mousemove", (e) => {
    document.querySelectorAll(".profile-card").forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
      const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
      card.style.setProperty("--mx", x + "%");
      card.style.setProperty("--my", y + "%");
    });
  }, { passive: true });
})();

// ── XP Milestone Popup ───────────────────────────────────────────────────────

function showXpMilestonePopup(level, rankTitle) {
  const el = document.createElement("div");
  el.className = "xp-milestone-popup";
  el.innerHTML = `Level ${level}<small>${rankTitle}</small>`;
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}
window.showXpMilestonePopup = showXpMilestonePopup;

// ── data-tip Tooltip via CSS attr() (no JS needed) ───────────────────────────
// Add data-tip="text" to any element; CSS handles the rest.
// This function is a helper to set them programmatically.
function setTip(el, text) {
  if (!el) return;
  if (text) el.setAttribute("data-tip", text);
  else el.removeAttribute("data-tip");
}
window.setTip = setTip;

// ── Match Quality Pill Builder ────────────────────────────────────────────────

function renderMatchQuality(interests) {
  const el = document.getElementById("matchQualityPill");
  if (!el) return;
  if (!interests || interests.length === 0) {
    el.className = "match-quality-pill low";
    el.textContent = "Random match";
    return;
  }
  if (interests.length >= 3) {
    el.className = "match-quality-pill high";
    el.textContent = `${interests.length} shared interests`;
  } else {
    el.className = "match-quality-pill medium";
    el.textContent = `${interests.length} shared interest${interests.length > 1 ? "s" : ""}`;
  }
}
window.renderMatchQuality = renderMatchQuality;

// ── Mobile Bottom Navigation ──────────────────────────────────────────────────

(function initMobileNav() {
  const nav = document.getElementById("mobileBottomNav");
  if (!nav) return;

  const panel     = document.querySelector(".control-panel");
  const videoWrap = document.querySelector(".video-panel");
  const chatFeed  = document.getElementById("chatFeed");
  const btns      = nav.querySelectorAll(".mobile-nav-btn");

  function activate(name) {
    btns.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    if (name === "chat" || name === "video") {
      panel?.classList.remove("mobile-visible");
      videoWrap?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (name === "sidebar") {
      panel?.classList.add("mobile-visible");
      panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (name === "match") {
      panel?.classList.remove("mobile-visible");
      document.getElementById("findMatchButton")?.click();
    }
  }

  btns.forEach((btn) => {
    btn.addEventListener("click", () => activate(btn.dataset.tab));
  });

  // Default to video tab
  activate("video");
})();

// ── Swipe Gesture — next match on left swipe over video stage ────────────────

(function initSwipeGesture() {
  const stage = document.querySelector(".video-stage-wrap") ||
                document.querySelector(".video-panel");
  if (!stage) return;

  let startX = 0;
  let startY = 0;

  stage.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  stage.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    // Horizontal swipe must dominate and exceed 60px
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) {
        // Left swipe → next match
        document.getElementById("nextMatchButton")?.click();
        if (typeof toast !== "undefined") toast.info("Swiped to next match", 2000);
      }
      // Right swipe could be "go back" — no-op for now
    }
  }, { passive: true });
})();

// ── Accessibility: Focus Trap ─────────────────────────────────────────────────

function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (!first) return () => {};

  function onKey(e) {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  container.addEventListener("keydown", onKey);
  document.body.classList.add("focus-trap-active");
  first.focus();

  return function release() {
    container.removeEventListener("keydown", onKey);
    document.body.classList.remove("focus-trap-active");
  };
}

// Wire focus trap to help modal
(function wireHelpTrap() {
  const modal    = document.getElementById("helpModal");
  const closeBtn = document.getElementById("helpCloseButton");
  if (!modal) return;
  let releaseTrap = null;

  const orig = window._helpModal;
  window._helpModal = {
    open() {
      orig?.open();
      releaseTrap?.();
      releaseTrap = trapFocus(modal.querySelector(".help-card") || modal);
    },
    close() {
      orig?.close();
      releaseTrap?.();
      releaseTrap = null;
    },
  };
})();

// ── Accessibility: ARIA Live Region Flash ─────────────────────────────────────

function flashLiveRegion(el) {
  if (!el) return;
  el.classList.remove("flash");
  void el.offsetWidth; // reflow
  el.classList.add("flash");
  el.addEventListener("animationend", () => el.classList.remove("flash"), { once: true });
}

// ── Accessibility: Announce to Screen Readers ─────────────────────────────────

const announce = (() => {
  let el = document.getElementById("srAnnounce");
  if (!el) {
    el = document.createElement("div");
    el.id = "srAnnounce";
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    el.className = "sr-only";
    document.body.appendChild(el);
  }
  return (msg, priority = "polite") => {
    el.setAttribute("aria-live", priority);
    el.textContent = "";
    requestAnimationFrame(() => { el.textContent = msg; });
  };
})();

window.announce = announce;

// ── Accessibility: Auth form inline validation ────────────────────────────────

(function initAuthInlineValidation() {
  const emailInput = document.getElementById("authEmail");
  const passInput  = document.getElementById("authPassword");
  if (!emailInput || !passInput) return;

  function validateEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  emailInput.addEventListener("blur", () => {
    const ok = !emailInput.value || validateEmail(emailInput.value);
    emailInput.setAttribute("aria-invalid", ok ? "false" : "true");
    emailInput.classList.toggle("is-error", !ok);
    let errEl = emailInput.parentElement.querySelector(".field-error");
    if (!ok) {
      if (!errEl) {
        errEl = document.createElement("p");
        errEl.className = "field-error";
        errEl.id = "emailError";
        emailInput.parentElement.appendChild(errEl);
        emailInput.setAttribute("aria-describedby", "emailError");
      }
      errEl.textContent = "Enter a valid email address.";
    } else {
      errEl?.remove();
      emailInput.removeAttribute("aria-describedby");
    }
  });

  passInput.addEventListener("input", () => {
    const ok = passInput.value.length === 0 || passInput.value.length >= 6;
    passInput.setAttribute("aria-invalid", ok ? "false" : "true");
    passInput.classList.toggle("is-error", !ok);
  });
})();

// ── Announce match events to screen readers ────────────────────────────────────

(function patchAddMessageForA11y() {
  const chatFeed = document.getElementById("chatFeed");
  if (!chatFeed) return;

  // Observe new chat messages and announce system ones
  new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.classList?.contains("system-message") || node.dataset?.author === "System") {
          announce(node.textContent?.trim(), "polite");
        }
      });
    });
  }).observe(chatFeed, { childList: true });
})();

// ── Performance: Image Lazy Loading ───────────────────────────────────────────

(function initLazyImages() {
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const img = e.target;
      if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
      if (img.dataset.srcset) { img.srcset = img.dataset.srcset; delete img.dataset.srcset; }
      io.unobserve(img);
    });
  }, { rootMargin: "200px" });
  document.querySelectorAll("img[data-src]").forEach((img) => io.observe(img));
})();

// ── Performance: Idle-time prefetch of Socket.IO ──────────────────────────────

(function prefetchSocketIO() {
  if (!("requestIdleCallback" in window)) return;
  requestIdleCallback(() => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = "/socket.io/socket.io.js";
    document.head.appendChild(link);
  }, { timeout: 3000 });
})();

// ── Performance: Font load observer ───────────────────────────────────────────

(function trackFontLoad() {
  if (!document.fonts) return;
  document.fonts.ready.then(() => {
    document.documentElement.classList.add("fonts-loaded");
  });
})();
