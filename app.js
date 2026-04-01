/*
This server:
1. serves the static files from the public folder
2. creates a Socket.IO connection
3. relays step data between connected clients
*/

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT || 3000;

// Serve the front-end files from the public folder
app.use(express.static("public"));

// Create an HTTP server so Express and Socket.IO can share it
const server = http.createServer(app);

// Create the Socket.IO server
const io = new Server(server);

// Relay step data from one client to all other connected clients
io.on("connection", (client) => {
  client.on("step", (stepData) => {
    client.broadcast.emit("step", stepData);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});