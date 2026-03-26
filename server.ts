import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/translate-menu", async (req, res) => {
    try {
      const { name, description, category } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Gemini API key not configured" });

      const prompt = `Translate this Thai food menu item to concise English. Return ONLY a valid JSON object without markdown formatting like this: {"name_en": "Stir-fried Chicken", "description_en": "With basil.", "category_en": "Main Dish"}.
Thai Name: ${name}
${description ? `Thai Description: ${description}\n` : ''}${category ? `Thai Category: ${category}` : ''}`;
      const referer = req.headers.referer || "http://localhost:3000";

      const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Referer": referer
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!googleRes.ok) {
        const errorText = await googleRes.text();
        throw new Error(`API Error ${googleRes.status}: ${errorText}`);
      }

      const responseData = await googleRes.json();
      const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let parsed = { name_en: "", description_en: "" };
      try { parsed = JSON.parse(cleanJson); } catch (e) {}

      res.json(parsed);
    } catch (err: any) {
      console.error("Translation ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
