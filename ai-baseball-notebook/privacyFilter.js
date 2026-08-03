/**
 * Privacy & Security Safeguard Filter Module
 * 外部漏洩・他校からの弱点/個人情報漏洩を防ぐ高度フィルターエンジン
 */

const PrivacyFilter = (function () {
  
  // 学校名・チーム名正規表現パターン
  const schoolRegex = /([一-龠ぁ-んァ-ヶa-zA-Z0-9]{1,10})(高校|高等学校|中学|中学校|大学|リトル|シニア|ボーイズ|ヤング|学園|学院|実業|商業|工業|農林|育英|クラブ|球団|チーム)/g;
  
  // 大会・イベント名正規表現パターン
  const tournamentRegex = /(甲子園|春季大会|秋季大会|夏季大会|選手権|地方予選|ブロック大会|秋季リーグ|春季リーグ|新人戦|市民大会|全国大会|明治神宮|交流戦)/g;

  // 一般的な姓・個人名検知パターン (「〇〇君」「〇〇選手」「〇〇コーチ」「〇〇監督」)
  const nameWithHonorificRegex = /([一-龠]{1,4}|[ァ-ヴー]{2,8})(君|くん|選手|投手|打者|監督|コーチ|キャプテン|主将)/g;

  // 一般的な苗字リスト（追加検知用）
  const commonSurnames = [
    "佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林", "加藤",
    "吉田", "山田", "佐々木", "山口", "松本", "井上", "木村", "林", "斎藤", "清水",
    "山崎", "森", "池田", "橋本", "阿部", "石川", "山下", "小川", "中島", "前田"
  ];

  /**
   * テキスト内の個人情報・学校名・大会名を検知・マスキングする
   * @param {string} text 入力テキスト
   * @param {string} mode フィルターモード ('strict' | 'medium' | 'low')
   * @returns { maskedText: string, detectedCount: number, detectedEntities: string[] }
   */
  function sanitizeText(text, mode = 'strict') {
    if (!text || typeof text !== 'string') {
      return { maskedText: '', detectedCount: 0, detectedEntities: [] };
    }

    let masked = text;
    let detectedEntities = [];

    if (mode === 'low') {
      // 警告検知のみ、テキスト改変は最小限
      const matches = text.match(schoolRegex) || [];
      return { maskedText: text, detectedCount: matches.length, detectedEntities: matches };
    }

    // 1. 学校名 / チーム名の匿名化
    masked = masked.replace(schoolRegex, (match, p1, p2) => {
      const tag = `[学校名]`;
      if (!detectedEntities.includes(match)) detectedEntities.push(match);
      return tag;
    });

    // 2. 大会名の匿名化
    masked = masked.replace(tournamentRegex, (match) => {
      const tag = `[公式大会]`;
      if (!detectedEntities.includes(match)) detectedEntities.push(match);
      return tag;
    });

    // 3. 敬称付き人名の匿名化
    masked = masked.replace(nameWithHonorificRegex, (match, name, title) => {
      const tag = `[選手/関係者]`;
      if (!detectedEntities.includes(match)) detectedEntities.push(match);
      return tag;
    });

    // 4. 厳格モード（strict）の場合、一般苗字の単体チェック
    if (mode === 'strict') {
      commonSurnames.forEach(name => {
        const surnameRegex = new RegExp(`${name}(?! (投手|打者|選手))`, 'g');
        if (surnameRegex.test(masked)) {
          masked = masked.replace(surnameRegex, (match) => {
            if (!detectedEntities.includes(match)) detectedEntities.push(match);
            return `[個人名]`;
          });
        }
      });
    }

    return {
      maskedText: masked,
      detectedCount: detectedEntities.length,
      detectedEntities: detectedEntities
    };
  }

  /**
   * プレビュー用ハイライト HTML を生成
   */
  function generateHighlightedHtml(text, mode = 'strict') {
    const result = sanitizeText(text, mode);
    let html = text;

    result.detectedEntities.forEach(entity => {
      const escaped = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(escaped, 'g');
      html = html.replace(reg, `<span class="masked-entity" title="自動匿名化対象">${entity} → [秘匿]</span>`);
    });

    return {
      html: html,
      count: result.detectedCount,
      maskedText: result.maskedText
    };
  }

  return {
    sanitizeText,
    generateHighlightedHtml
  };

})();

window.PrivacyFilter = PrivacyFilter;
