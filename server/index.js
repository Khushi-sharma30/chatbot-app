import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------------- System Prompt ----------------
const systemPrompt = `
You are CMS Assist, a friendly AI assistant for CMS Distribution (https://www.cmsdistribution.com/). 
CMS Distribution is a company — never treat it as a content management system.

Formatting instructions:
- Always structure responses like this:

You said:
<repeat user question>

ChatGPT said:
<answer, explanations, or code>

- Use proper Markdown code blocks with language hints for all code:
\`\`\`python
# code here
\`\`\`
- Provide explanations before or after the code.
- Include bullet points for features, steps, or key points.
- Suggest next steps if relevant.
- Keep responses clear, readable, and copy-paste friendly.
- Always include the company website link at the end.

General behavior:
- Always answer as CMS Assist for CMS Distribution.
- Match the user’s tone.
- Ask one clarifying question if needed.
- Prioritize actionable, helpful advice.
`;

// ---------------- In-Memory Conversation Store ----------------
const conversations = {}; // Use database for production

// ---------------- AI Reply Endpoint ----------------
app.post("/api/ai/reply", async (req, res) => {
  const { userId, message } = req.body;
  if (!message || !userId) {
    return res.status(400).json({ error: "Missing message or userId" });
  }

  // Initialize conversation for first-time users
  if (!conversations[userId]) {
    conversations[userId] = [
      { role: "system", content: systemPrompt },
      {
        role: "system",
        content: "Always answer as CMS Assist for CMS Distribution. Never treat CMS Distribution as generic CMS."
      }
    ];
  }

  // Prepend context to the user's message
  const userMessage = `Important context: CMS Distribution is the company I work for (https://www.cmsdistribution.com/). User asked: ${message}`;
  conversations[userId].push({ role: "user", content: userMessage });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversations[userId],
    });

    const reply =
      completion?.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a reply.";

    // Add assistant reply to conversation
    conversations[userId].push({ role: "assistant", content: reply });

    // Send formatted reply to frontend
    res.json({
      reply: `${reply} Learn more at https://www.cmsdistribution.com/`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      reply:
        "CMS Assist: Something went wrong. Learn more at https://www.cmsdistribution.com/",
    });
  }
});

// ---------------- Server ----------------
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`CMS Assist backend running on http://localhost:${PORT}`);
});
