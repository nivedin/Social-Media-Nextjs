const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const next = require("next");
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
require("dotenv").config({ path: "./config.env" });
const connectDb = require("./utilsServer/connectDb");
connectDb();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const {
  addUser,
  removeUser,
  findConnectedUser,
} = require("./utilsServer/roomActions");
const {
  loadMessages,
  sendMessage,
  setMsgToUnread,
  deleteMsg,
} = require("./utilsServer/messageActions");
const { likeOrUnlikePost } = require("./utilsServer/likeOrUnlikePost");
const { commentedOnPost } = require("./utilsServer/commentedOnPost");

io.on("connection", (socket) => {
  socket.on("join", async ({ userId }) => {
    const users = await addUser(userId, socket.id);
    console.log("Users Connected", users);
    setInterval(() => {
      socket.emit("connectedUsers", {
        users: users.filter((user) => user.userId !== userId),
      });
    }, 10000);
  });

  socket.on("loadMessages", async ({ userId, messagesWith }) => {
    const { chat, error } = await loadMessages(userId, messagesWith);

    !error
      ? socket.emit("messagesLoaded", { chat })
      : socket.emit("noChatFound");
  });

  socket.on("sendNewMessage", async ({ userId, msgSendToUserId, msg }) => {
    const { newMsg, error } = await sendMessage(userId, msgSendToUserId, msg);
    const receiverSocket = findConnectedUser(msgSendToUserId);

    if (receiverSocket) {
      io.to(receiverSocket.socketId).emit("newMsgReceived", { newMsg });
    } else {
      await setMsgToUnread(msgSendToUserId);
    }

    if (!error) {
      socket.emit("messageSend", { newMsg });
    }
  });

  socket.on(
    "sendMsgFromNotification",
    async ({ userId, msgSendToUserId, msg }) => {
      const { newMsg, error } = await sendMessage(userId, msgSendToUserId, msg);
      const receiverSocket = findConnectedUser(msgSendToUserId);

      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit("newMsgReceived", { newMsg });
      } else {
        await setMsgToUnread(msgSendToUserId);
      }

      if (!error) {
        socket.emit("msgSentFromNotification");
      }
    }
  );

  socket.on("likePost", async ({ postId, userId, like }) => {
    const { success, name, profilePicUrl, username, postByUserId, error } =
      await likeOrUnlikePost(postId, userId, like);

    if (success) {
      socket.emit("postLiked");

      if (postByUserId !== userId) {
        const recieverSocket = findConnectedUser(postByUserId);

        if (recieverSocket && like) {
          io.to(recieverSocket.socketId).emit("newNotificationRecieved", {
            name,
            profilePicUrl,
            username,
            postId,
          });
        }
      }
    }
  });

  socket.on("commentPosted", async ({ postId, userId, text }) => {
    const {
      success,
      name,
      profilePicUrl,
      username,
      postByUserId,
      commentId,
      error,
    } = await commentedOnPost(postId, userId, text);

    //console.log("sdsd", name, profilePicUrl, username, postByUserId);

    if (success) {
      socket.emit("commentedOnPost", { commentId });
      if (postByUserId !== userId) {
        const recieverSocket = findConnectedUser(postByUserId);

        if (recieverSocket) {
          io.to(recieverSocket.socketId).emit(
            "newCommentNotificationRecieved",
            {
              name,
              profilePicUrl,
              username,
              postId,
              text,
            }
          );
        }
      }
    }
  });

  socket.on("deleteMsg", async ({ userId, messagesWith, messageId }) => {
    const { success } = await deleteMsg(userId, messagesWith, messageId);

    if (success) {
      socket.emit("messageDeleted");
    }
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
    console.log("User Disconnected");
  });
});

nextApp.prepare().then(() => {
  app.use("/api/signup", require("./api/signup"));
  app.use("/api/auth", require("./api/auth"));
  app.use("/api/search", require("./api/search"));
  app.use("/api/posts", require("./api/posts"));
  app.use("/api/profile", require("./api/profile"));
  app.use("/api/notifications", require("./api/notifications"));
  app.use("/api/chats", require("./api/chats"));

  app.all("*", (req, res) => handle(req, res));

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log("Express server running");
  });
});
