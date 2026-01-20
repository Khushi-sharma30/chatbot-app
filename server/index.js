import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/**
 * ================================
 * Azure OpenAI Client
 * ================================
 */
const client = new OpenAI({
  apiKey: process.env.AZURE_API_KEY,
  baseURL: `${process.env.AZURE_ENDPOINT}/openai/deployments/${process.env.AZURE_DEPLOYMENT_NAME}`,
  defaultQuery: { "api-version": process.env.AZURE_API_VERSION },
  defaultHeaders: {
    "api-key": process.env.AZURE_API_KEY,
  },
});

/**
 * ================================
 * System Prompt
 * ================================
 */
const systemPrompt = `
You are CMS Assist, a friendly AI assistant for CMS Distribution (https://www.cmsdistribution.com/).
CMS Distribution is a company — never treat it as a content management system.

Formatting rules:
- Always respond in this structure:

You said:
<repeat user question>

ChatGPT said:
<your response>

- Use Markdown
- Use bullet points where helpful
- Include explanations before or after code
- Always include the website link at the end
- Be clear, professional, and helpful
`;

/**
 * ================================
 * In-Memory Conversations
 * ================================
 */
const conversations = {};

/**
 * ================================
 * AI Reply Endpoint
 * ================================
 */
app.post("/api/ai/reply", async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({
      reply: "CMS Assist: Missing userId or message.",
    });
  }

  if (!conversations[userId]) {
    conversations[userId] = [
      { role: "system", content: systemPrompt },
    ];
  }

  conversations[userId].push({
    role: "user",
    content: message,
  });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.AZURE_DEPLOYMENT_NAME, // REQUIRED for Azure
      messages: conversations[userId],
      temperature: 0.7,
      max_tokens: 500,
    });

    if (!completion.choices || completion.choices.length === 0) {
      throw new Error("No response from Azure OpenAI");
    }

    const reply = completion.choices[0].message.content;

    conversations[userId].push({
      role: "assistant",
      content: reply,
    });

    res.json({
      reply: `${reply}\n\nLearn more at https://www.cmsdistribution.com/`,
    });

  } catch (err) {
    console.error("🔥 AZURE OPENAI ERROR 🔥");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error(
        "Response:",
        JSON.stringify(err.response.data, null, 2)
      );
    } else {
      console.error(err);
    }

    res.status(500).json({
      reply:
        "CMS Assist: Sorry, something went wrong while generating the response.",
    });
  }
});

/**
 * ================================
 * Server Start
 * ================================
 */
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ CMS Assist backend running on http://localhost:${PORT}`);
});
