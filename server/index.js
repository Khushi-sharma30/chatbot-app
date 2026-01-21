import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Azure OpenAI client
const client = new OpenAI({
  apiKey: process.env.AZURE_KEY,
  baseURL: `${process.env.AZURE_ENDPOINT}/openai/deployments/${process.env.AZURE_DEPLOYMENT}`,
  defaultQuery: { "api-version": process.env.AZURE_API_VERSION || "2023-07-01-preview" },
  defaultHeaders: {
    "api-key": process.env.AZURE_KEY,
  },
});

// System prompt
const systemPrompt = `
You are CMS Assist, a professional AI assistant for CMS Distribution.
Website: https://www.cmsdistribution.com/

Formatting rules:
- Use Markdown
- Be professional and concise
- End with the website link
`;

// Per-user conversations
const conversations = {};

// Health check
app.get("/", (req, res) => res.json({ message: "Backend is running!" }));

// AI Reply endpoint
app.post("/api/ai/reply", async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) return res.status(400).json({ reply: "Missing userId or message" });

  if (!conversations[userId]) conversations[userId] = [{ role: "system", content: systemPrompt }];
  const conversation = conversations[userId];
  conversation.push({ role: "user", content: message });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.AZURE_DEPLOYMENT,
      messages: conversation,
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0].message.content;
    conversation.push({ role: "assistant", content: reply });

    res.json({ reply: `${reply}\n\nhttps://www.cmsdistribution.com/` });
  } catch (err) {
    console.error("AZURE OPENAI ERROR:", err);
    res.status(500).json({ reply: "CMS Assist: Azure OpenAI request failed." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Backend running on http://0.0.0.0:${PORT}`));
