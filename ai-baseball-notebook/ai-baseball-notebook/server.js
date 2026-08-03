const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ APIキーは Render.com の環境変数 GEMINI_API_KEY から安全に読み込み
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 🛡️ サーバープロキシ API エンドポイント
app.post('/api/gemini', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const activeKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) 
    ? process.env.GEMINI_API_KEY.trim() 
    : "";

  if (!activeKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing on Render." });
  }

  const modelCandidates = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  for (const model of modelCandidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(activeKey)}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': activeKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      if (response.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
        const resultText = data.candidates[0].content.parts[0].text;
        console.log(`[Server Proxy Success (${model})] AI応答取得成功`);
        return res.json({ text: resultText, model });
      } else {
        console.warn(`[Server Proxy API Error (${model})]:`, data);
      }
    } catch (e) {
      console.warn(`[Server Proxy Fetch Error (${model})]:`, e.message);
    }
  }

  return res.status(500).json({ error: "Gemini API Proxy Error" });
});

// 静的ファイルのルート
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 AI Baseball Notebook Server is running on port ${PORT}`);
});
