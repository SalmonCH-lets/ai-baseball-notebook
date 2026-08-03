const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// 使用済みコードのファイル永続化（サーバー再起動でも消えない仕組み）
const USED_CODES_FILE = path.join(__dirname, 'used_codes.json');

function loadUsedCodes() {
  try {
    if (fs.existsSync(USED_CODES_FILE)) {
      const data = fs.readFileSync(USED_CODES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Used codes load error:", e);
  }
  return [];
}

function saveUsedCode(code) {
  try {
    const codes = loadUsedCodes();
    if (!codes.includes(code)) {
      codes.push(code);
      fs.writeFileSync(USED_CODES_FILE, JSON.stringify(codes, null, 2), 'utf8');
    }
  } catch (e) {
    console.error("Used code save error:", e);
  }
}

// 🛡️ API Proxy Endpoint (Gemini API Call)
app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Server GEMINI_API_KEY is missing in environment variables.' });
    }

    const modelCandidates = ['gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastError = null;

    for (const model of modelCandidates) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const data = await response.json();
        if (response.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
          const textResult = data.candidates[0].content.parts[0].text;
          return res.json({ text: textResult, model });
        } else {
          lastError = data.error || data;
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    return res.status(500).json({ error: 'All Gemini API models failed.', details: lastError });

  } catch (err) {
    console.error('Server Proxy Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// 🔒 サーバー側使用済みコード判定＆登録 API
app.post('/api/verify-code', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ valid: false, error: 'コードが提供されていません。' });

  const cleanCode = code.trim().toUpperCase();
  const usedCodes = loadUsedCodes();

  if (usedCodes.includes(cleanCode)) {
    return res.json({ valid: false, used: true, error: 'このコードはすでに使用済みです。二度と使用できません。' });
  }

  return res.json({ valid: true, used: false });
});

// 🎟️ コード使用完了登録 API
app.post('/api/consume-code', (req, res) => {
  const { code } = req.body;
  if (code) {
    saveUsedCode(code.trim().toUpperCase());
    return res.json({ success: true });
  }
  return res.status(400).json({ error: '無効なコード' });
});

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`🚀 AI Baseball Journal Proxy Server running on port ${PORT}`);
  console.log(`=================================`);
});
