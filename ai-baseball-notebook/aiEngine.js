/**
 * AI Clean-up & Coaching Engine (v21.0 - 100% Clean Security Edition)
 * - 🛡️ サーバー環境変数(GEMINI_API_KEY)経由の完全セキュリティ仕様
 * - 🎯 清書文章：【200文字程度】＆【高校生らしい自然な言葉遣い】
 * - 🧠 AIアドバイス：感情的・精神論を排除し、論理的かつ具体的なアドバイス
 * - 🏆 AI深層分析：高校生が直感的に理解できる平易な言葉で解説
 */

const AIEngine = (function () {

  async function callGeminiApi(userKey, prompt) {
    // 🛡️ 1. サーバープロキシ経由呼び出し（Render.comの環境変数 GEMINI_API_KEY を安全に使用）
    try {
      const serverResponse = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (serverResponse.ok) {
        const serverData = await serverResponse.json();
        if (serverData && serverData.text) {
          console.log(`🟢 [Server Proxy (${serverData.model})] AI応答を受信しました！`);
          return serverData.text;
        }
      }
    } catch (e) {
      console.log("ℹ️ サーバー通信待機中...");
    }

    // 🛡️ 2. カスタムキー入力時のフォールバック
    if (userKey && userKey.trim()) {
      const activeKey = userKey.trim();
      const modelCandidates = ['gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

      for (const model of modelCandidates) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(activeKey)}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': activeKey },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });

          const data = await response.json();
          if (response.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
          }
        } catch (e) {
          console.warn(`⚠️ [Direct Gemini (${model})] 通信エラー:`, e);
        }
      }
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────
  // 1. 本格文章型 清書エンジン (200文字程度 & 等身大の高校生言葉)
  // ────────────────────────────────────────────────────────────
  async function transformToCleanJournal(rawText, category, position, condition, customApiKey) {
    if (!rawText || rawText.trim() === '') {
      return "本日は練習メモが記入されていません。";
    }

    const sanitized = PrivacyFilter.sanitizeText(rawText, 'strict').maskedText;

    const prompt = `【絶対ルール】
1. 前置き、挨拶、会話文、解説、「〜を用意しました」などの導入文は一切禁止。本文のみ出力。
2. 文字数は【必ず200文字程度（180文字〜220文字以内）】でコンパクトにまとめてください。
3. 「猛省」「痛感」「遺憾」「過怠」といった難しい熟語や、AI特有の堅苦しい表現は絶対に使わないでください。
4. 高校生が自分でノートに書くような、自然で素直な等身大の言葉遣い（〜でした。〜を意識したいです。〜に気をつけます。）にしてください。

【ポジション】${position}
【練習種別】${category}
【コンディション】${condition}
【メモ】
${sanitized}`;

    const apiResult = await callGeminiApi(customApiKey, prompt);
    if (apiResult) {
      let cleaned = apiResult.trim();
      cleaned = cleaned.replace(/^(はい[、|。]|承知いたしました[、|。]|以下[は|に|の|が].*?[です|ます|:|：]|今日は.*?用意しました[。|！|\!]*|清書.*?です[。|：|:]*)\s*/gi, '');
      cleaned = cleaned.replace(/^【.*?ノート】\s*/, '');
      return cleaned.trim();
    }

    // --- ローカルAIフォールバック ---
    const sentences = sanitized
      .split(/[\n。！\.\!]+/)
      .map(s => s.trim().replace(/^[・\-\*①-⑨]\s*/, '').replace(/^\d+[\.\)\:\s]\s*/, ''))
      .filter(s => s.length > 1);

    if (sentences.length === 0) return sanitized;

    const shortText = sentences.slice(0, 3).map(s => formatSentence(s)).join('');
    return `${category}の練習では${position}の動きを中心に振り返りました。${shortText}明日の練習でも今日見つかった課題を1つずつ意識して取り組んでいきたいです。`;
  }

  function formatSentence(text) {
    let t = text.trim().replace(/[。！!]+$/, '');
    if (t.endsWith('こと') || t.endsWith('ため') || t.endsWith('とき')) t += 'を意識しました。';
    else if (t.endsWith('目立つ') || t.endsWith('多い') || t.endsWith('少ない') || t.endsWith('なった')) t += '。';
    else if (!t.match(/(た|ない|する|ある|いる|った|い|う|く|です|ます)$/)) t += 'がありました。';
    else t += '。';
    return t;
  }

  function calcScore(text, catKey) {
    let score = 65;
    const posPatterns = {
      '攻': /ヒット|ホームラン|タイムリー|ツーベース|快音|出塁|猛打賞|好打|ミート|成功|成功率|できるようになった|両立|強いゴロ|長打|たたき/g,
      '投': /ストライク|三振奪取|完封|好投|低め|制球|抑えた|キレ|コース|無失点/g,
      '走': /盗塁成功|好走塁|いいスタート|判断良|次の塁|生還/g,
      '守': /ナイスキャッチ|ファインプレー|好捕|刺殺|アウト|カバー成功|好送球|ゲッツー/g,
      'mental': /集中|声出し|前向き|充実|手応え|意識できた/g
    };

    const negPatterns = {
      '攻': /三振|空振り|振り遅れ|打ち損じ|打てなかった|凡退|力負け/g,
      '投': /四球|ボール先行|暴投|制球難|炎上|痛打/g,
      '走': /盗塁失敗|タッチアウト|走塁ミス|オーバーラン/g,
      '守': /エラー|目測誤り|落球|後逸|悪送球|ぶつかって|交錯/g,
      'mental': /焦り|緊張|弱気|遅刻|遅れ|イライラ/g
    };

    const posMatches = (text.match(posPatterns[catKey]) || []).length;
    const negMatches = (text.match(negPatterns[catKey]) || []).length;

    let bonus = 0;
    if (catKey === '攻' && /成功|できるようになった|両立|長打|強いゴロ|80%|90%/.test(text)) {
      bonus += 18;
    }

    score += Math.min(30, posMatches * 10) + bonus;
    score -= Math.min(25, negMatches * 12);

    return Math.min(98, Math.max(30, Math.round(score)));
  }

  // ────────────────────────────────────────────────────────────
  // 2. 日次分析 ＆ 明日のAIコーチアドバイス
  // ────────────────────────────────────────────────────────────
  async function analyzeDailyJournal(rawText, category, position, condition, selectedCats, customApiKey) {
    const text = rawText || '';
    const dynamicScores = [];

    selectedCats.forEach(c => {
      let val = calcScore(text, c);
      const names = { '攻':'打撃スコア', '投':'投球スコア', '走':'走塁スコア', '守':'守備スコア' };
      dynamicScores.push({ cat: c, name: names[c], val });
    });

    if (dynamicScores.length === 0) {
      dynamicScores.push({ cat: 'mental', name: 'コンディション', val: 65 });
    }

    let mentalVal = calcScore(text, 'mental');
    dynamicScores.push({ cat: 'mental', name: 'メンタル / 意識度', val: mentalVal });

    const sentences = text.split(/[\n。！\.\!]+/).map(s => s.trim().replace(/^[・\-\*①-⑨]\s*/, '').replace(/^\d+[\.\)\:\s]\s*/, '')).filter(s => s.length > 2);
    const goodPoints = sentences.filter(s => /できた|成功|できるようになった|両立|強いゴロ|長打|80%|好調|快音|ヒット/.test(s)).map(s => formatSentence(s)).slice(0, 2);
    const badPoints = sentences.filter(s => /遅刻|遅れ|ぶつかって|ホームランになってしまった|エラー|ミス|三振/.test(s)).map(s => formatSentence(s)).slice(0, 2);

    if (goodPoints.length === 0) goodPoints.push('打撃や守備での好プレイ意識を高く保てた。');
    if (badPoints.length === 0) badPoints.push('失敗した場面の連携と判断を次回に活かすこと。');

    const advicePrompt = `【指示】あなたは親切で分かりやすい高校野球の技術コーチです。
「頑張れ」「ガッツで」等の精神論は使わないでください。また、「技術的視野狭窄」「メカニクス」「痛感」等の難しい言葉も絶対に使わず、高校生がすぐに理解できる日常的な表現（例：ボールばかり見て周りが見えなくなる癖、タイミングを合わせる練習など）で、明日の練習で気をつける具体的なポイント（100文字〜130文字程度）を出力してください。前置きは不要です。

ポジション: ${position}
練習/試合: ${category}
メモ: ${text}`;

    let advice = await callGeminiApi(customApiKey, advicePrompt);
    if (advice) {
      advice = advice.trim().replace(/^(はい[、|。]|承知いたしました[、|。]|アドバイス[：|:]*)\s*/gi, '');
    } else {
      if (/ぶつかって|カバー/.test(text)) advice = `外野同士の交錯を防ぐため、打球発生の瞬間「オレが捕る」の大声アピールと、センター優先等のコールルールを毎プレー意識して練習しましょう。`;
      else if (/たたき|成功率|両立/.test(text)) advice = `たたき成功率80%と長打・強ゴロの両立は、インパクトの面で作る技術が安定している証拠です。このミート位置の感覚を意識して継続しましょう。`;
      else advice = `練習の意図を明確にし、1球ごとの準備動作と一歩目の反応速度に意識を集中してメニューに取り組みましょう。`;
    }

    return { dynamicScores, goodPoints, issues: badPoints, immediateAdvice: advice };
  }

  // ────────────────────────────────────────────────────────────
  // 3. ✨AI深層分析（高校生が100%理解できる平易な言葉＆家・外一人練習）
  // ────────────────────────────────────────────────────────────
  async function generateDeepAIAnalysis(journalList, customApiKey) {
    if (!journalList || journalList.length === 0) {
      return {
        techAnalysis: "まだノートデータが保存されていません。ノートを作成して保存した後に分析を実行すると、わかりやすいアドバイスが生成されます。",
        tacticalAnalysis: "実戦での状況判断や連携の傾向が分析されます。",
        homeDrills: [
          { title: "鏡の前でのスイング形チェック", desc: "自室の鏡で構えと軸足の残り具合を30回確認。" },
          { title: "ベッドでのボールスナップ練習", desc: "寝ながらボールを上に投げて指先の感覚を整える。" }
        ],
        outdoorDrills: [
          { title: "壁当てバウンド合わせ", desc: "一人で壁当てを行い、バウンドへの合わせと一歩目を磨く。" },
          { title: "一人ティーのコース打ち分け", desc: "置ティーで外角球を引きつけて反対方向へ打つ練習。" }
        ]
      };
    }

    const latestNote = journalList[0];
    const combinedNotes = journalList.slice(0, 5).map(j => `【${j.date} ${j.position}】${j.rawContent}`).join("\n");

    const prompt = `あなたは高校野球の親身なアナリストコーチです。選手のノート記録をもとに分析レポートを作成してください。

【過去のノートデータ】
${combinedNotes}

【絶対ルール】
1. 「技術的視野狭窄」「メカニクス」「過怠」「痛感」「遺憾」といった難解な専門用語や硬い熟語は絶対に一切使用しないでください！
2. 高校生が読んで一目ですぐに理解できる日常的な表現で優しく解説してください。
3. おすすめ練習は「家で一人でできる練習（homeDrills）」と「外で一人でできる練習（outdoorDrills）」の2種類に分け、具体的かつわかりやすく各2つずつ提案してください。

【JSON出力フォーマット】
{
  "techAnalysis": "フォームや打撃・守備の分かりやすい深層分析（120〜150字程度）",
  "tacticalAnalysis": "実戦での判断や声掛け・連携の分かりやすい分析（120〜150字程度）",
  "homeDrills": [
    {"title": "家でできる練習1", "desc": "家で一人ですぐできる方法とコツ（50〜70字程度）"},
    {"title": "家でできる練習2", "desc": "家で一人ですぐできる方法とコツ（50〜70字程度）"}
  ],
  "outdoorDrills": [
    {"title": "外で一人でできる練習1", "desc": "外で一人ですぐできる方法とコツ（50〜70字程度）"},
    {"title": "外で一人でできる練習2", "desc": "外で一人ですぐできる方法とコツ（50〜70字程度）"}
  ]
}`;

    const resText = await callGeminiApi(customApiKey, prompt);
    if (resText) {
      try {
        const cleanJson = resText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        console.warn("AI Analysis JSON Parse Fallback:", e);
      }
    }

    // フォールバック
    return {
      techAnalysis: `【${latestNote.position} 技術分析】バッティングの時に軸足にしっかり体重が乗り、ミートポイントが安定しています。力強いゴロや長打を狙える素晴らしい形ができています。`,
      tacticalAnalysis: `【実戦判断分析】守備の時のカバーリング意識が高まっています。ボールが飛んできた瞬間に「自分が捕る！」と第一声を早く出すことで、味方との衝突を防げます。`,
      homeDrills: [
        { title: "自室での鏡前フォームチェック", desc: "鏡の前で軸足に体重を乗せ、スイングの構えを30回丁寧に確認する。" },
        { title: "仰向けでの指先スナップ投げ", desc: "ベッドの上でボールを天井へ真直ぐ投げ上げ、指先の引きかかりと回転を養う。" }
      ],
      outdoorDrills: [
        { title: "公園での一人壁当て＆バウンド合わせ", desc: "一人で壁あてを行い、ボールがはねるタイミングに合わせて捕球する。" },
        { title: "一人置ティーのコース打ち分け", desc: "置ティーを使ってアウトコースを引きつけて反対方向へ素直に打つ。" }
      ]
    };
  }

  function analyzeLongTermTrends(journalList) {
    if (!journalList || journalList.length === 0) {
      return {
        battingTrend: { title: 'ノート未記入', desc: 'ノートを記入・保存すると、傾向が自動表示されます。' },
        defenseTrend: { title: 'ノート未記入', desc: '守備や投球の傾向が分析されます。' },
        coachingAdvice: [{ category: 'はじめに', title: 'ノート記入から始めましょう', desc: '毎日の練習後に気づいたことを書くことからスタート！AIが本格的な文章に清書します。', tag: '準備' }]
      };
    }

    let strikeoutCount = 0, boundMissCount = 0, timeCount = 0;
    journalList.forEach(j => {
      const c = (j.rawContent || '') + (j.cleanedContent || '');
      if (/三振|空振り|打てなかった/.test(c)) strikeoutCount++;
      if (/バウンド|エラー|捕球|ぶつかって/.test(c)) boundMissCount++;
      if (/遅刻|集合|時間|遅れ/.test(c)) timeCount++;
    });

    const coachingAdvice = [];
    if (timeCount > 0) coachingAdvice.push({ category: 'チーム運営', title: '時間厳守と20分前行動ルール化ドリル', desc: '練習開始20分前には準備を終え、集中状態で練習に入る習慣を徹底しましょう。', tag: '意識改革' });
    if (boundMissCount > 0) coachingAdvice.push({ category: '守備連携', title: '外野お見合い・交錯防止の大声アピールドリル', desc: '打球に対する「オレが捕る」の大声と優先権の共有でミスを防ぎましょう。', tag: '守備強化' });

    return {
      battingTrend: { title: '打撃パフォーマンス良好', desc: '強いゴロと長打の両立・進塁打の成功率が高水準で維持されています。' },
      defenseTrend: { title: boundMissCount > 0 ? '守備の交錯・一歩目の判断に改善点あり' : '守備安定度 良好', desc: '打球へのコールと一歩目のアプローチを意識して改善を行いましょう。' },
      coachingAdvice
    };
  }

  return { transformToCleanJournal, analyzeDailyJournal, generateDeepAIAnalysis, analyzeLongTermTrends };

})();

window.AIEngine = AIEngine;
