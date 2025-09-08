const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authenticate } = require("../middleware/auth");


router.post("/", authenticate, chatController.sendMessage);


router.get("/conversation/:userId", authenticate, chatController.getConversation);


router.get("/conversations", authenticate, chatController.getUserConversations);


router.patch("/mark-read/:senderId", authenticate, chatController.markAsRead);

module.exports = router;