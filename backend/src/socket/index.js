// ============================================
// Socket.io — Real-time Event Handler
// ============================================
// This file sets up all Socket.io event listeners.
// It is called once during server startup with the `io` instance.
//
// ROOM STRATEGY:
//   Each route has its own room: "route:<routeId>"
//   Each bus has its own room:   "bus:<busId>"
//
//   A passenger watching Route 45 joins "route:<route45Id>"
//   When bus AA-001 moves, the server broadcasts ONLY to that room.
//   This prevents every client from receiving every bus update.
//
// CLIENT → SERVER EVENTS:
//   subscribe:route    — join a route's update room
//   unsubscribe:route  — leave a route's update room
//   subscribe:bus      — join a specific bus's update room
//   unsubscribe:bus    — leave a bus's update room
//
// SERVER → CLIENT EVENTS:
//   connected          — sent once on successful connection
//   subscribed         — confirms a successful subscription
//   unsubscribed       — confirms a successful unsubscription
//   bus:locationUpdate — a bus's GPS position has changed (main event)

const initializeSocket = (io) => {
  // ── fires every time a new client connects ──────────────
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected    → ${socket.id}`);

    // ── Confirm connection to the client ──────────────────
    socket.emit("connected", {
      message: "Connected to Addis Bus Tracker real-time server 🚌",
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // ─────────────────────────────────────────────────────
    // subscribe:route
    // Client wants live updates for all buses on a route.
    // Payload: routeId (string)
    // ─────────────────────────────────────────────────────
    socket.on("subscribe:route", (routeId) => {
      if (!routeId) {
        socket.emit("error:socket", { message: "routeId is required to subscribe." });
        return;
      }

      const room = `route:${routeId}`;
      socket.join(room);

      console.log(`📡 ${socket.id} subscribed   → ${room}`);

      socket.emit("subscribed", {
        type: "route",
        routeId,
        room,
        message: `You will now receive live bus location updates for this route.`,
      });
    });

    // ─────────────────────────────────────────────────────
    // unsubscribe:route
    // Client no longer wants updates for a route.
    // Payload: routeId (string)
    // ─────────────────────────────────────────────────────
    socket.on("unsubscribe:route", (routeId) => {
      if (!routeId) return;

      const room = `route:${routeId}`;
      socket.leave(room);

      console.log(`📴 ${socket.id} unsubscribed → ${room}`);

      socket.emit("unsubscribed", {
        type: "route",
        routeId,
        room,
      });
    });

    // ─────────────────────────────────────────────────────
    // subscribe:bus
    // Client wants live updates for one specific bus.
    // Payload: busId (string)
    // ─────────────────────────────────────────────────────
    socket.on("subscribe:bus", (busId) => {
      if (!busId) {
        socket.emit("error:socket", { message: "busId is required to subscribe." });
        return;
      }

      const room = `bus:${busId}`;
      socket.join(room);

      console.log(`📡 ${socket.id} subscribed   → ${room}`);

      socket.emit("subscribed", {
        type: "bus",
        busId,
        room,
        message: `You will now receive live location updates for this bus.`,
      });
    });

    // ─────────────────────────────────────────────────────
    // unsubscribe:bus
    // Client no longer wants updates for a specific bus.
    // Payload: busId (string)
    // ─────────────────────────────────────────────────────
    socket.on("unsubscribe:bus", (busId) => {
      if (!busId) return;

      const room = `bus:${busId}`;
      socket.leave(room);

      console.log(`📴 ${socket.id} unsubscribed → ${room}`);

      socket.emit("unsubscribed", {
        type: "bus",
        busId,
        room,
      });
    });

    // ─────────────────────────────────────────────────────
    // disconnect
    // Fires when the client loses connection or closes app.
    // Socket.io automatically removes them from all rooms.
    // ─────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Client disconnected → ${socket.id} (${reason})`);
    });

    // ─────────────────────────────────────────────────────
    // error
    // Catches any low-level socket errors.
    // ─────────────────────────────────────────────────────
    socket.on("error", (error) => {
      console.error(`❌ Socket error [${socket.id}]:`, error.message);
    });
  });
};

module.exports = { initializeSocket };
