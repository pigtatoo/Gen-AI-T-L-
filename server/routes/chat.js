import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/chat", async (req, res) => {
  const { message } = req.body; // what the user typed

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3-8b-instruct",  // this is the AI model
        messages: [
          {
            role: "system",
            content: "You are a friendly teacher assistant. Keep answers simple for students."
          },
          { role: "user", content: message } // the user question
        ],
        temperature: 0.7,  // how creative AI is
        max_tokens: 400     // max length of answer
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed to respond" });
  }
});

export default router;
