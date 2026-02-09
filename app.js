const express = require("express");
const app = express();

const server = app.listen(3000, () => {
  console.log("server started on port 3000");
});




app.use(express.static("public"));

const socket = require("socket.io");
const io = socket(server);

// io.on("connection", (client) => {
//   console.log("new user connected");

//   client.on("step", (data) => {
//     client.broadcast.emit("step", data);
//   });

// });

io.on("connection", (client) => {
  console.log("🟢 new user connected", client.id);

  client.on("step", (data) => {
    console.log("👣 server got step", data);
    client.broadcast.emit("step", data);
  });
});

