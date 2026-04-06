const crypto = require("crypto");
const http = require("http");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

const queues = {
  all_video: [],
  all_text: [],
  premium_video: [],
  premium_text: [],
};

const activeMatches = new Map();

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
  if (!active) {
    return;
  }

  const { roomId, peerId } = active;
  activeMatches.delete(socketId);
  activeMatches.delete(peerId);

  const peerSocket = io.sockets.sockets.get(peerId);
  const currentSocket = io.sockets.sockets.get(socketId);

  if (peerSocket) {
    peerSocket.leave(roomId);
    peerSocket.emit("peer-left", { reason });
  }

  if (currentSocket) {
    currentSocket.leave(roomId);
  }
}

function tryMatchForKey(key) {
  const queue = queues[key];
  while (queue.length >= 2) {
    const first = queue.shift();
    const second = queue.shift();

    const firstSocket = io.sockets.sockets.get(first.socketId);
    const secondSocket = io.sockets.sockets.get(second.socketId);

    if (!firstSocket || !secondSocket) {
      if (firstSocket && !secondSocket) {
        queue.unshift(first);
      }
      if (!firstSocket && secondSocket) {
        queue.unshift(second);
      }
      continue;
    }

    const roomId = `match-${crypto.randomUUID()}`;
    firstSocket.join(roomId);
    secondSocket.join(roomId);

    activeMatches.set(first.socketId, {
      roomId,
      peerId: second.socketId,
    });
    activeMatches.set(second.socketId, {
      roomId,
      peerId: first.socketId,
    });

    firstSocket.emit("match-found", {
      roomId,
      peerId: second.socketId,
      initiator: true,
      mode: first.mode,
      partnerInterests: second.interests,
    });
    secondSocket.emit("match-found", {
      roomId,
      peerId: first.socketId,
      initiator: false,
      mode: second.mode,
      partnerInterests: first.interests,
    });
  }
}

function enqueueSocket(socket, options) {
  removeFromQueues(socket.id);
  cleanupMatch(socket.id, "requeue");

  const key = queueKey(options.filter, options.mode);
  const interests = Array.isArray(options.interests)
    ? options.interests.slice(0, 8)
    : [];

  const entry = {
    socketId: socket.id,
    mode: options.mode === "text" ? "text" : "video",
    interests,
    createdAt: Date.now(),
  };

  queues[key].push(entry);
  socket.emit("queued", {
    queue: key,
    position: queues[key].length,
  });
  tryMatchForKey(key);
}

io.on("connection", (socket) => {
  socket.emit("ready", { socketId: socket.id });

  socket.on("request-match", (options = {}) => {
    enqueueSocket(socket, options);
  });

  socket.on("leave-match", (payload = {}) => {
    cleanupMatch(socket.id, payload.reason || "left");
  });

  socket.on("next-match", (options = {}) => {
    cleanupMatch(socket.id, "next");
    enqueueSocket(socket, options);
  });

  socket.on("chat-message", (payload = {}) => {
    const active = activeMatches.get(socket.id);
    if (!active) {
      return;
    }

    const rawText = typeof payload.text === "string" ? payload.text : "";
    const text = rawText.trim().slice(0, 500);
    if (!text) {
      return;
    }

    io.to(active.roomId).emit("chat-message", {
      from: socket.id,
      text,
      createdAt: Date.now(),
    });
  });

  socket.on("webrtc-offer", (payload = {}) => {
    if (!payload.to || !payload.sdp) {
      return;
    }
    io.to(payload.to).emit("webrtc-offer", {
      from: socket.id,
      sdp: payload.sdp,
    });
  });

  socket.on("webrtc-answer", (payload = {}) => {
    if (!payload.to || !payload.sdp) {
      return;
    }
    io.to(payload.to).emit("webrtc-answer", {
      from: socket.id,
      sdp: payload.sdp,
    });
  });

  socket.on("webrtc-ice-candidate", (payload = {}) => {
    if (!payload.to || !payload.candidate) {
      return;
    }
    io.to(payload.to).emit("webrtc-ice-candidate", {
      from: socket.id,
      candidate: payload.candidate,
    });
  });

  socket.on("disconnect", () => {
    removeFromQueues(socket.id);
    cleanupMatch(socket.id, "disconnect");
  });
});

server.listen(port, () => {
  console.log(`YapTalks server running on http://localhost:${port}`);
});
