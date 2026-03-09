const express = require("express");
const app = express();

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});


const socket = require("socket.io");
const io = socket(server);

// io.on("connection", (client) => {
//   console.log("new user connected");

//   client.on("step", (data) => {
//     client.broadcast.emit("step", data);
//   });

// });

io.on("connection", (client) => {
  // console.log("🟢 new user connected", client.id);

  client.on("step", (data) => {
    // console.log("👣 server got step", data);
    client.broadcast.emit("step", data);
  });
});

