const express = require("express");
const { sendMessage, clearHistory } = require("../controllers/chatbotController");
const { authenticate } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });

// Send message to chatbot
router.post("/:moduleId/chat", authenticate, sendMessage);

// Clear chat history for a module
router.delete("/:moduleId/chat/history", authenticate, clearHistory);

module.exports = router;
