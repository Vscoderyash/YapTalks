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
    enqueueSocket(socket, options);
  });

  socket.on("leave-match", (payload = {}) => {
    cleanupMatch(socket.id, sanitizeText(payload.reason, "left"));
  });

  socket.on("next-match", (options = {}) => {
    cleanupMatch(socket.id, "next");
    enqueueSocket(socket, options);
  });

  socket.on("chat-message", (payload = {}) => {
    const active = activeMatches.get(socket.id);
    if (!active) return;
    const text = sanitizeText(payload.text, "").slice(0, 500);
    if (!text) return;
    io.to(active.roomId).emit("chat-message", { from: socket.id, text, createdAt: Date.now() });
  });

  socket.on("report-user", (payload = {}) => {
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
  });

  socket.on("friend-request", (payload = {}) => {
    if (!payload.to) return;
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
    if (!payload.to) return;
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
    leaveParty(socket.id);
    const code = createPartyCode();
    partyRooms.set(code, { members: new Set([socket.id]) });
    memberParty.set(socket.id, code);
    socket.join(`party-${code}`);
    emitPartyState(code);
  });

  socket.on("party-join", (payload = {}) => {
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
    leaveParty(socket.id);
  });

  socket.on("party-message", (payload = {}) => {
    const code = memberParty.get(socket.id);
    if (!code || !partyRooms.has(code)) {
      socket.emit("party-error", { message: "Join a party room first." });
      return;
    }
    const text = sanitizeText(payload.text, "").slice(0, 220);
    if (!text) return;
    io.to(`party-${code}`).emit("party-message", {
      code,
      fromSocketId: socket.id,
      fromName: identity.name,
      text,
      createdAt: Date.now(),
    });
  });

  socket.on("profile-stats", (payload = {}) => {
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
    socket.emit("leaderboard-data", { items: topLeaderboard(12) });
  });

  socket.on("webrtc-offer", (payload = {}) => {
    if (!payload.to || !payload.sdp) return;
    io.to(payload.to).emit("webrtc-offer", { from: socket.id, sdp: payload.sdp });
  });

  socket.on("webrtc-answer", (payload = {}) => {
    if (!payload.to || !payload.sdp) return;
    io.to(payload.to).emit("webrtc-answer", { from: socket.id, sdp: payload.sdp });
  });

  socket.on("webrtc-ice-candidate", (payload = {}) => {
    if (!payload.to || !payload.candidate) return;
    io.to(payload.to).emit("webrtc-ice-candidate", { from: socket.id, candidate: payload.candidate });
  });

  socket.on("disconnect", () => {
    removeFromQueues(socket.id);
    cleanupMatch(socket.id, "disconnect");
    leaveParty(socket.id);
    reportCounts.delete(socket.id);
    userPresence.delete(socket.id);
  });
});

server.listen(port, () => {
  console.log(`YapTalks server running on http://localhost:${port}`);
});
