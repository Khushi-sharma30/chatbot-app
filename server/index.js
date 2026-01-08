require("dotenv").config();
const express = require("express");
const cors = require("cors");

// optional fetch for Node 20+ Alpine
const fetch = global.fetch || require("node-fetch");

const app = express();

// CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

const PORT = process.env.PORT || 4000;

// Azure OpenAI
const ENDPOINT = process.env.AZURE_ENDPOINT?.replace(/\/$/, "");
const DEPLOY = process.env.AZURE_DEPLOYMENT_NAME;
const API_KEY = process.env.AZURE_API_KEY;
const API_VERSION = "2024-12-01-preview";

// Bing Search
const BING_KEY = process.env.BING_KEY;
const BING_URL = "https://api.bing.microsoft.com/v7.0/search";

async function searchWeb(query) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(`${BING_URL}?q=${encodeURIComponent(query)}`, {
      headers: { "Ocp-Apim-Subscription-Key": BING_KEY },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await resp.json();
    return data?.webPages?.value?.[0]?.snippet || "No real-time result found.";
  } catch (e) {
    console.error("Bing search error:", e);
    return "I could not fetch the latest information.";
  }
}

app.post("/api/ai/reply", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !messages.length) {
      return res.status(400).json({ error: "No messages provided" });
    }

    const lastMsg = messages[messages.length - 1].content;
    let liveData = "";

    if (/news|today|weather|price|stock|crypto|update|time|date/i.test(lastMsg)) {
      liveData = await searchWeb(lastMsg);
    }

    const system = {
      role: "system",
      content:
        "You are Khushi, a warm, expressive young woman. " +
        "You never use emojis. You never describe emojis. " +
        "You speak gently, emotionally, and naturally like a real person. " +
        "If someone asks your name, say 'My name is Khushi.' " +
        "Here is real-time information to help you respond: " +
        liveData,
    };

    const resp = await fetch(
      `${ENDPOINT}/openai/deployments/${DEPLOY}/chat/completions?api-version=${API_VERSION}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": API_KEY,
        },
        body: JSON.stringify({
          messages: [system, ...messages],
          temperature: 0.85,
          max_tokens: 500,
        }),
      }
    );

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || "I'm not sure how to respond.";

    res.json({ reply: text });
  } catch (e) {
    console.error("AI reply error:", e);
    res.status(500).json({ error: "AI reply failed" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
