const Module = require("../models/Modules");
const Topic = require("../models/Topics");

const conversationHistories = {};

const getConversationHistory = (moduleId) => {
  if (!conversationHistories[moduleId]) {
    conversationHistories[moduleId] = [];
  }
  return conversationHistories[moduleId];
};

const clearConversationHistory = (moduleId) => {
  delete conversationHistories[moduleId];
};

const sendMessage = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const module = await Module.findOne({
      where: { module_id: moduleId, user_id: userId },
    });

    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    const conversationHistory = getConversationHistory(moduleId);

    // TODO: Add your AI API here
    // For now, returning a simple echo response
    const botResponse = `You asked: "${message}". Please configure your AI API.`;

    conversationHistory.push({ type: "user", text: message });
    conversationHistory.push({ type: "bot", text: botResponse });

    if (conversationHistory.length > 20) {
      conversationHistory.splice(0, 2);
    }

    res.json({ message: botResponse, moduleId });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ error: error.message || "Failed to process message" });
  }
};

const clearHistory = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;

    const module = await Module.findOne({
      where: { module_id: moduleId, user_id: userId },
    });

    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    clearConversationHistory(moduleId);

    res.json({ message: "Conversation history cleared" });
  } catch (error) {
    console.error("Error in clearHistory:", error);
    res.status(500).json({ error: error.message || "Failed to clear history" });
  }
};

module.exports = {
  sendMessage,
  clearHistory,
};
