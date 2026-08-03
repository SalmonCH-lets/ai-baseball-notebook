const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ APIキーは Render.com の環境変数 GEMINI_API_KEY からのみ安全に取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 🛡️ Gemini API キーをサーバー側に隠蔽して安全に代理呼び出しするAPIエンドポイント
app.post('/api/gemini', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const activeKey = GEMINI_API_KEY || req.headers['x-goog-api-key'];
  if (!activeKey) return res.status(500).json({ error: "API Key not configured" });

  const modelCandidates = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  for (const model of modelCandidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(activeKey.trim())}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': activeKey.trim()
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      if (response.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
        const resultText = data.candidates[0].content.parts[0].text;
        return res.json({ text: resultText, model });
      }
    } catch (e) {
      console.warn(`[Server Gemini Proxy Error (${model})]:`, e.message);
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
