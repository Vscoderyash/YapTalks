const crypto = require("crypto");
const http = require("http");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

const queues = {
  all_video: [],
  all_text: [],
  premium_video: [],
  premium_text: [],
};

const activeMatches = new Map();
const reportCounts = new Map();
const userPresence = new Map();
const leaderboard = new Map();
const partyRooms = new Map();
const memberParty = new Map();

// ─── Security state ────────────────────────────────────────────────────────────
// socketRates: socketId -> { count: number, windowStart: number }
const socketRates = new Map();
// suspicionScores: socketId -> number
const suspicionScores = new Map();
// ipConnectionLog: ip -> array of timestamps (ms)
const ipConnectionLog = new Map();

const RATE_LIMIT_EVENTS_PER_SEC = 25;
const SUSPICION_BAN_THRESHOLD = 80;
const IP_CONN_LIMIT_PER_MINUTE = 12;

/**
 * Returns true if the event is allowed, false if rate-limited.
 * On rate-limit, adds suspicion (+20) automatically.
 */
function checkRate(socketId) {
  const now = Date.now();
  let entry = socketRates.get(socketId);
  if (!entry) {
    entry = { count: 0, windowStart: now };
    socketRates.set(socketId, entry);
  }

  // Reset window if more than 1 second has passed
  if (now - entry.windowStart >= 1000) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT_EVENTS_PER_SEC) {
    addSuspicion(socketId, 20);
    return false;
  }
  return true;
}

/**
 * Adds to a socket's suspicion score. If threshold reached, emit security-ban
 * and disconnect after 500 ms.
 */
function addSuspicion(socketId, amount) {
  const current = suspicionScores.get(socketId) || 0;
  const updated = current + amount;
  suspicionScores.set(socketId, updated);

  if (updated >= SUSPICION_BAN_THRESHOLD) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit("security-ban", { reason: "Suspicious activity detected." });
      setTimeout(() => {
        const s = io.sockets.sockets.get(socketId);
        if (s) s.disconnect(true);
      }, 500);
    }
  }
}

/**
 * Returns true if this IP is allowed to connect, false if over the limit.
 */
function checkIpRate(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  let timestamps = ipConnectionLog.get(ip) || [];
  // Prune timestamps outside the rolling minute
  timestamps = timestamps.filter((t) => now - t < windowMs);
  timestamps.push(now);
  ipConnectionLog.set(ip, timestamps);
  return timestamps.length <= IP_CONN_LIMIT_PER_MINUTE;
}
// ──────────────────────────────────────────────────────────────────────────────

function sanitizeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function sanitizeName(value, fallback = "Yap User") {
  const cleaned = sanitizeText(value, fallback).slice(0, 48);
  return cleaned || fallback;
}

function queueKey(filter, mode) {
  const normalizedMode = mode === "text" ? "text" : "video";
  const normalizedFilter = filter === "premium" ? "premium" : "all";
  return `${normalizedFilter}_${normalizedMode}`;
}

function removeFromQueues(socketId) {
  Object.keys(queues).forEach((key) => {
    queues[key] = queues[key].filter((entry) => entry.socketId !== socketId);
  });
}

function cleanupMatch(socketId, reason = "left") {
  const active = activeMatches.get(socketId);
  if (!active) return;

  const { roomId, peerId } = active;
  activeMatches.delete(socketId);
  activeMatches.delete(peerId);

  const peerSocket = io.sockets.sockets.get(peerId);
  const currentSocket = io.sockets.sockets.get(socketId);

  if (peerSocket) {
    peerSocket.leave(roomId);
    peerSocket.emit("peer-left", { reason });
  }
  if (currentSocket) currentSocket.leave(roomId);
}

function topLeaderboard(limit = 10) {
  return Array.from(leaderboard.values())
    .sort((a, b) => {
      if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
      if ((b.streak || 0) !== (a.streak || 0)) return (b.streak || 0) - (a.streak || 0);
      return (b.matches || 0) - (a.matches || 0);
    })
    .slice(0, limit)
    .map((entry) => ({
      userId: entry.userId,
      name: entry.name,
      xp: entry.xp,
      streak: entry.streak,
      matches: entry.matches,
    }));
}

function emitLeaderboardUpdate() {
  io.emit("leaderboard-update", { items: topLeaderboard(12) });
}

function getMemberList(code) {
  const room = partyRooms.get(code);
  if (!room) return [];
  return Array.from(room.members)
    .map((socketId) => {
      const user = userPresence.get(socketId);
      return {
        socketId,
        name: user ? user.name : "Yap User",
      };
    })
    .slice(0, 20);
}

function emitPartyState(code) {
  const room = partyRooms.get(code);
  if (!room) return;
  io.to(`party-${code}`).emit("party-state", {
    code,
    members: getMemberList(code),
  });
}

function leaveParty(socketId) {
  const code = memberParty.get(socketId);
  if (!code) return;

  const room = partyRooms.get(code);
  memberParty.delete(socketId);
  const socket = io.sockets.sockets.get(socketId);
  if (socket) socket.leave(`party-${code}`);

  if (!room) return;
  room.members.delete(socketId);

  if (room.members.size === 0) {
    partyRooms.delete(code);
    return;
  }
  emitPartyState(code);
}

function createPartyCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempts = 0; attempts < 300; attempts += 1) {
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!partyRooms.has(code)) return code;
  }
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

function tryMatchForKey(key) {
  const queue = queues[key];
  while (queue.length >= 2) {
    const first = queue.shift();
    const second = queue.shift();
    const firstSocket = io.sockets.sockets.get(first.socketId);
    const secondSocket = io.sockets.sockets.get(second.socketId);

    if (!firstSocket || !secondSocket) {
      if (firstSocket && !secondSocket) queue.unshift(first);
      if (!firstSocket && secondSocket) queue.unshift(second);
      continue;
    }

    const roomId = `match-${crypto.randomUUID()}`;
    firstSocket.join(roomId);
    secondSocket.join(roomId);

    activeMatches.set(first.socketId, { roomId, peerId: second.socketId });
    activeMatches.set(second.socketId, { roomId, peerId: first.socketId });

    firstSocket.emit("match-found", { roomId, peerId: second.socketId, initiator: true, mode: first.mode });
    secondSocket.emit("match-found", { roomId, peerId: first.socketId, initiator: false, mode: second.mode });
  }
}

function enqueueSocket(socket, options) {
  removeFromQueues(socket.id);
  cleanupMatch(socket.id, "requeue");
  const key = queueKey(options.filter, options.mode);
  const entry = {
    socketId: socket.id,
    mode: options.mode === "text" ? "text" : "video",
    createdAt: Date.now(),
  };
  queues[key].push(entry);
  socket.emit("queued", { queue: key, position: queues[key].length });
  tryMatchForKey(key);
}

io.on("connection", (socket) => {
  // ── IP connection rate limiting ──────────────────────────────────────────────
  const ip =
    sanitizeText(socket.handshake.headers["x-forwarded-for"], "").split(",")[0].trim() ||
    socket.handshake.address ||
    "unknown";

  if (!checkIpRate(ip)) {
    socket.disconnect(true);
    return;
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Initialise suspicion tracking for this socket
  suspicionScores.set(socket.id, 0);

  const auth = socket.handshake.auth || {};
  const identity = {
    uid: sanitizeText(auth.uid, `guest-${socket.id.slice(0, 8)}`),
    name: sanitizeName(auth.name, "Yap User"),
    email: sanitizeText(auth.email, ""),
  };
  userPresence.set(socket.id, identity);

  socket.emit("ready", { socketId: socket.id, user: identity });
  socket.emit("leaderboard-data", { items: topLeaderboard(12) });

  socket.on("request-match", (options = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    // Repeated empty/invalid payload
    if (typeof options !== "object" || options === null) {
      addSuspicion(socket.id, 5);
      return;
    }
    enqueueSocket(socket, options);
  });

  socket.on("leave-match", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    cleanupMatch(socket.id, sanitizeText(payload.reason, "left"));
  });

  socket.on("next-match", (options = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    if (typeof options !== "object" || options === null) {
      addSuspicion(socket.id, 5);
      return;
    }
    cleanupMatch(socket.id, "next");
    enqueueSocket(socket, options);
  });

  socket.on("chat-message", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    const active = activeMatches.get(socket.id);
    if (!active) {
      // Message with no active match
      addSuspicion(socket.id, 8);
      return;
    }
    if (typeof payload !== "object" || payload === null) {
      addSuspicion(socket.id, 5);
      return;
    }
    const text = sanitizeText(payload.text, "").slice(0, 500);
    if (!text) {
      addSuspicion(socket.id, 5);
      return;
    }
    io.to(active.roomId).emit("chat-message", { from: socket.id, text, createdAt: Date.now() });
  });

  socket.on("report-user", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    const active = activeMatches.get(socket.id);
    if (!active) return;

    const reportedSocketId = active.peerId;
    const updatedCount = (reportCounts.get(reportedSocketId) || 0) + 1;
    reportCounts.set(reportedSocketId, updatedCount);

    socket.emit("report-ack", {
      targetReports: updatedCount,
      reason: sanitizeText(payload.reason, "inappropriate").slice(0, 60),
    });

    const targetSocket = io.sockets.sockets.get(reportedSocketId);
    if (targetSocket) {
      targetSocket.emit("safety-warning", { count: updatedCount });
    }

    // Auto-action: if reported socket has 5+ reports, cleanupMatch after 2 s
    if (updatedCount >= 5) {
      setTimeout(() => {
        cleanupMatch(reportedSocketId, "removed");
      }, 2000);
    }
  });

  socket.on("friend-request", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    if (!payload.to) {
      addSuspicion(socket.id, 5);
      return;
    }
    const targetSocket = io.sockets.sockets.get(payload.to);
    if (!targetSocket) return;
    const fromUser = payload.fromUser || identity;
    targetSocket.emit("friend-request", {
      fromSocketId: socket.id,
      fromUser: {
        uid: sanitizeText(fromUser.uid, identity.uid),
        name: sanitizeName(fromUser.name, identity.name),
      },
    });
  });

  socket.on("friend-accepted", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    if (!payload.to) {
      addSuspicion(socket.id, 5);
      return;
    }
    const targetSocket = io.sockets.sockets.get(payload.to);
    if (!targetSocket) return;
    const fromUser = payload.fromUser || identity;
    targetSocket.emit("friend-accepted", {
      fromSocketId: socket.id,
      fromUser: {
        uid: sanitizeText(fromUser.uid, identity.uid),
        name: sanitizeName(fromUser.name, identity.name),
      },
    });
  });

  socket.on("party-create", () => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    leaveParty(socket.id);
    const code = createPartyCode();
    partyRooms.set(code, { members: new Set([socket.id]) });
    memberParty.set(socket.id, code);
    socket.join(`party-${code}`);
    emitPartyState(code);
  });

  socket.on("party-join", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    const code = sanitizeText(payload.code, "").toUpperCase();
    if (!code || !partyRooms.has(code)) {
      socket.emit("party-error", { message: "Room code not found." });
      return;
    }

    const room = partyRooms.get(code);
    if (room.members.size >= 8) {
      socket.emit("party-error", { message: "Party room is full." });
      return;
    }

    leaveParty(socket.id);
    room.members.add(socket.id);
    memberParty.set(socket.id, code);
    socket.join(`party-${code}`);
    emitPartyState(code);
  });

  socket.on("party-leave", () => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    leaveParty(socket.id);
  });

  socket.on("party-message", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    const code = memberParty.get(socket.id);
    if (!code || !partyRooms.has(code)) {
      socket.emit("party-error", { message: "Join a party room first." });
      return;
    }
    const text = sanitizeText(payload.text, "").slice(0, 220);
    if (!text) {
      addSuspicion(socket.id, 5);
      return;
    }
    io.to(`party-${code}`).emit("party-message", {
      code,
      fromSocketId: socket.id,
      fromName: identity.name,
      text,
      createdAt: Date.now(),
    });
  });

  socket.on("profile-stats", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    if (typeof payload !== "object" || payload === null) {
      addSuspicion(socket.id, 5);
      return;
    }
    const userId = sanitizeText(payload.userId, identity.uid);
    if (!userId) return;

    leaderboard.set(userId, {
      userId,
      name: sanitizeName(payload.name, identity.name),
      xp: Number(payload.xp) || 0,
      streak: Number(payload.streak) || 0,
      matches: Number(payload.matches) || 0,
      reports: Number(payload.reports) || 0,
      safetyGuard: Boolean(payload.safetyGuard),
      updatedAt: Date.now(),
    });
    emitLeaderboardUpdate();
  });

  socket.on("leaderboard-get", () => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    socket.emit("leaderboard-data", { items: topLeaderboard(12) });
  });

  socket.on("webrtc-offer", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    if (!payload.to || !payload.sdp) {
      addSuspicion(socket.id, 5);
      return;
    }
    io.to(payload.to).emit("webrtc-offer", { from: socket.id, sdp: payload.sdp });
  });

  socket.on("webrtc-answer", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    if (!payload.to || !payload.sdp) {
      addSuspicion(socket.id, 5);
      return;
    }
    io.to(payload.to).emit("webrtc-answer", { from: socket.id, sdp: payload.sdp });
  });

  socket.on("webrtc-ice-candidate", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    if (!payload.to || !payload.candidate) {
      addSuspicion(socket.id, 5);
      return;
    }
    io.to(payload.to).emit("webrtc-ice-candidate", { from: socket.id, candidate: payload.candidate });
  });

  // ── New: anime-theme ─────────────────────────────────────────────────────────
  socket.on("anime-theme", (payload = {}) => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    const active = activeMatches.get(socket.id);
    if (!active) return;
    if (typeof payload !== "object" || payload === null) {
      addSuspicion(socket.id, 5);
      return;
    }
    const charId = sanitizeText(payload.charId, "").slice(0, 20);
    const charName = sanitizeText(payload.charName, "").slice(0, 30);
    io.to(active.roomId).emit("anime-theme", { from: socket.id, charId, charName });
  });

  // ── New: typing ──────────────────────────────────────────────────────────────
  socket.on("typing", () => {
    if (!checkRate(socket.id)) {
      addSuspicion(socket.id, 20);
      return;
    }
    const active = activeMatches.get(socket.id);
    if (!active) return;
    io.to(active.roomId).emit("typing", { from: socket.id });
  });

  socket.on("disconnect", () => {
    removeFromQueues(socket.id);
    cleanupMatch(socket.id, "disconnect");
    leaveParty(socket.id);
    reportCounts.delete(socket.id);
    userPresence.delete(socket.id);
    // Clean up security data
    socketRates.delete(socket.id);
    suspicionScores.delete(socket.id);
  });
});

server.listen(port, () => {
  console.log(`YapTalks server running on http://localhost:${port}`);
});
