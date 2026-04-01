const express = require("express");
const app = express();

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});

const socket = require("socket.io");
const io = socket(server);

io.on("connection", (client) => {
  client.on("step", (data) => {
    client.broadcast.emit("step", data);
  });
});

