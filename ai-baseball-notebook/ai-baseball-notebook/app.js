/**
 * App Main Controller (v19.0)
 * - 200文字制限＆高校生等身大言葉の清書
 * - 🧹 同日付の重複ノート自動クリーニング（履歴＆グラフの丸を1日1件に統合）
 * - 🔄 同日ノート自動上書き機能 ＆ ↩️ 元に戻す（Undo）機能
 * - 🔘 ポップアップ「閉じる」＆「元に戻す」2ボタン制御
 * - 🧠 ✨AI深層分析：高校生向けの平易でわかりやすい解説
 */

(function () {

  const state = {
    journals: [],
    currentJournal: null,
    lastOverwrittenJournal: null,
    lastSaveActionType: null,
    privacyLevel: 'strict',
    customApiKey: '',
    selectedCats: ['攻']
  };

  // DOM Elements
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const currentDateDisplay = document.getElementById('currentDateDisplay');
  const rawNoteInput = document.getElementById('rawNoteInput');
  const maskedPreviewText = document.getElementById('maskedPreviewText');
  const detectedEntityCount = document.getElementById('detectedEntityCount');
  const securityAlertBanner = document.getElementById('securityAlertBanner');
  const scoreCatBtns = document.querySelectorAll('.score-cat-btn');
  const btnGenerateAI = document.getElementById('btnGenerateAI');
  const aiResultContainer = document.getElementById('aiResultContainer');
  const btnSaveNote = document.getElementById('btnSaveNote');
  const btnCloseToast = document.getElementById('btnCloseToast');
  const btnUndoSave = document.getElementById('btnUndoSave');
  const streakCount = document.getElementById('streakCount');
  const displayStreakLarge = document.getElementById('displayStreakLarge');
  const themeToggle = document.getElementById('themeToggle');
  const privacyLevelSelect = document.getElementById('privacyLevelSelect');
  const btnResetData = document.getElementById('btnResetData');
  const toastModal = document.getElementById('toastModal');
  const toastTitleText = document.getElementById('toastTitleText');
  const toastBodyText = document.getElementById('toastBodyText');

  // Deep Analysis Elements
  const btnRunDeepAnalysis = document.getElementById('btnRunDeepAnalysis');
  const analysisPlaceholder = document.getElementById('analysisPlaceholder');
  const aiDeepAnalysisContainer = document.getElementById('aiDeepAnalysisContainer');
  const deepTechText = document.getElementById('deepTechText');
  const deepTacticalText = document.getElementById('deepTacticalText');
  const homeDrillsContainer = document.getElementById('homeDrillsContainer');
  const outdoorDrillsContainer = document.getElementById('outdoorDrillsContainer');

  function init() {
    loadState();
    // 🧹 同日付の古い重複データを最新1件のみにクレンジング
    state.journals = cleanDuplicateJournalsByDate(state.journals);
    saveState();

    updateDateDisplay();
    setupEventListeners();
    updateStreakDisplay();
    renderJournalList();
    renderLeaderboard();
    initDefaultCategories();

    if (window.CalendarView) {
      CalendarView.init('calendarGrid', 'calendarMonthYear', 'btnPrevMonth', 'btnNextMonth', state.journals, (journal) => {
        openJournalModal(journal);
      });
    }

    if (window.LineChartRenderer) {
      LineChartRenderer.init('lineChartContainer', state.journals, (journal) => {
        openJournalModal(journal);
      });
    }
  }

  // 🧹 1日につき最新1件だけを保持する重複除去関数
  function cleanDuplicateJournalsByDate(journalsList) {
    if (!journalsList || journalsList.length === 0) return [];
    const seenDates = new Set();
    const cleaned = [];

    // 新しい順（リストの先頭から）同じ日付で最初に出会ったものだけを残す
    for (const item of journalsList) {
      if (!seenDates.has(item.date)) {
        seenDates.add(item.date);
        cleaned.push(item);
      }
    }
    return cleaned;
  }

  function loadState() {
    try {
      const saved = localStorage.getItem('ai_baseball_note_v10');
      if (saved) {
        const parsed = JSON.parse(saved);
        state.journals = parsed.journals || [];
        state.privacyLevel = parsed.privacyLevel || 'strict';
        state.customApiKey = parsed.customApiKey || '';
      }
    } catch (e) {
      console.error("State Load Error:", e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem('ai_baseball_note_v10', JSON.stringify({
        journals: state.journals,
        privacyLevel: state.privacyLevel,
        customApiKey: state.customApiKey
      }));
    } catch (e) {
      console.error("State Save Error:", e);
    }
  }

  function updateDateDisplay() {
    const now = new Date();
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    if (currentDateDisplay) {
      currentDateDisplay.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 (${days[now.getDay()]})`;
    }
  }

  function initDefaultCategories() {
    scoreCatBtns.forEach(btn => {
      const cat = btn.getAttribute('data-cat');
      if (state.selectedCats.includes(cat)) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  function setupEventListeners() {
    // タブ切り替え
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');
        switchTab(tabId);
      });
    });

    // スコアカテゴリ選択
    scoreCatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        if (state.selectedCats.includes(cat)) {
          if (state.selectedCats.length > 1) {
            state.selectedCats = state.selectedCats.filter(c => c !== cat);
            btn.classList.remove('selected');
          }
        } else {
          state.selectedCats.push(cat);
          btn.classList.add('selected');
        }
      });
    });

    function updatePrivacyPreview() {
      const raw = rawNoteInput ? rawNoteInput.value : '';
      const result = PrivacyFilter.generateHighlightedHtml(raw, state.privacyLevel);
      if (maskedPreviewText) maskedPreviewText.innerHTML = result.html || '（学校名、個人名などは自動的にマスキングされます）';
      if (detectedEntityCount) detectedEntityCount.textContent = `固有情報 ${result.count}件`;
      if (securityAlertBanner) {
        if (result.count > 0) securityAlertBanner.classList.remove('hidden');
        else securityAlertBanner.classList.add('hidden');
      }
    }
    if (rawNoteInput) rawNoteInput.addEventListener('input', updatePrivacyPreview);

    // AI 清書 & 分析実行
    if (btnGenerateAI) {
      btnGenerateAI.addEventListener('click', async () => {
        const rawText = rawNoteInput.value;
        if (!rawText || rawText.trim() === '') {
          alert("メモを入力してください。");
          return;
        }
        if (state.selectedCats.length === 0) {
          alert("「攻・投・走・守」から1つ以上選択してください。");
          return;
        }

        btnGenerateAI.disabled = true;
        btnGenerateAI.innerHTML = '<i data-lucide="loader"></i> AIが文章を思考・清書中...';

        const category = document.querySelector('input[name="entryCategory"]:checked').value;
        const position = document.getElementById('inputPosition').value;
        const condition = document.getElementById('inputCondition').value;

        const cleanedText = await AIEngine.transformToCleanJournal(rawText, category, position, condition, state.customApiKey);
        const analysis = await AIEngine.analyzeDailyJournal(rawText, category, position, condition, state.selectedCats, state.customApiKey);

        document.getElementById('aiCleanedText').innerHTML = cleanedText.replace(/\n/g, '<br>');

        const grid = document.getElementById('dynamicScoresGrid');
        grid.innerHTML = analysis.dynamicScores.map(item => `
          <div class="score-card cat-${item.cat}">
            <span class="score-label">${item.name}</span>
            <div class="score-val">${item.val}</div>
            <div class="score-bar"><div class="score-fill" style="width:${item.val}%"></div></div>
          </div>
        `).join('');

        document.getElementById('aiGoodPoints').innerHTML = analysis.goodPoints.map(p => `<li>${p}</li>`).join('');
        document.getElementById('aiIssues').innerHTML = analysis.issues.map(i => `<li>${i}</li>`).join('');
        document.getElementById('aiImmediateAdvice').textContent = analysis.immediateAdvice;

        const todayStr = new Date().toISOString().split('T')[0];
        state.currentJournal = {
          id: 'note-' + Date.now(),
          date: todayStr,
          category, position, condition,
          selectedCats: [...state.selectedCats],
          rawContent: rawText,
          cleanedContent: cleanedText,
          dynamicScores: analysis.dynamicScores,
          goodPoints: analysis.goodPoints,
          issues: analysis.issues,
          immediateAdvice: analysis.immediateAdvice
        };

        if (aiResultContainer) aiResultContainer.classList.remove('hidden');
        btnGenerateAI.disabled = false;
        btnGenerateAI.innerHTML = '<i data-lucide="sparkles"></i> AIで清書 & 分析を実行する';

        if (window.lucide) lucide.createIcons();
      });
    }

    // 🔄 ノート保存ボタン（同日上書き対応）
    if (btnSaveNote) {
      btnSaveNote.addEventListener('click', () => {
        if (!state.currentJournal) return;

        const todayDate = state.currentJournal.date;
        const existingIndex = state.journals.findIndex(j => j.date === todayDate);

        if (existingIndex !== -1) {
          // 同日の既存ノートが存在する場合は上書きバックアップ
          state.lastOverwrittenJournal = { ...state.journals[existingIndex] };
          state.lastSaveActionType = 'overwrite';
          state.journals[existingIndex] = state.currentJournal;
          showToastModal("更新完了！", "同日のノートを最新の内容に上書き保存しました。");
        } else {
          // 新規保存
          state.lastOverwrittenJournal = null;
          state.lastSaveActionType = 'add';
          state.journals.unshift(state.currentJournal);
          showToastModal("保存完了！", "野球ノートを記録しました。連続記録が更新されました！");
        }

        saveState();
        updateStreakDisplay();
        renderJournalList();

        if (window.CalendarView) CalendarView.updateJournals(state.journals);
        if (window.LineChartRenderer) LineChartRenderer.updateJournals(state.journals);

        state.currentJournal = null;
      });
    }

    // 🔘 トーストポップアップの「閉じる」ボタン
    if (btnCloseToast) {
      btnCloseToast.addEventListener('click', () => {
        if (toastModal) toastModal.classList.add('hidden');
      });
    }

    // ↩️ トーストポップアップの「元に戻す (Undo)」ボタン
    if (btnUndoSave) {
      btnUndoSave.addEventListener('click', () => {
        if (state.lastSaveActionType === 'overwrite' && state.lastOverwrittenJournal) {
          const index = state.journals.findIndex(j => j.date === state.lastOverwrittenJournal.date);
          if (index !== -1) {
            state.journals[index] = state.lastOverwrittenJournal;
          }
        } else if (state.lastSaveActionType === 'add') {
          state.journals.shift();
        }

        saveState();
        updateStreakDisplay();
        renderJournalList();

        if (window.CalendarView) CalendarView.updateJournals(state.journals);
        if (window.LineChartRenderer) LineChartRenderer.updateJournals(state.journals);

        if (toastModal) toastModal.classList.add('hidden');
        alert("直前の保存・上書きを取り消し元に戻しました。");
      });
    }

    // ✨ 深層AI分析の手動実行ボタン
    if (btnRunDeepAnalysis) {
      btnRunDeepAnalysis.addEventListener('click', async () => {
        btnRunDeepAnalysis.disabled = true;
        btnRunDeepAnalysis.innerHTML = '<i data-lucide="loader"></i> AIが深層解析中...';
        await renderDeepAIAnalysis();
        btnRunDeepAnalysis.disabled = false;
        btnRunDeepAnalysis.innerHTML = '<i data-lucide="sparkles"></i> ✨ 最新ノートからAI再分析を実行';
      });
    }

    // テーマ切り替え
    if (themeToggle) {
      themeToggle.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
      });
    }

    // 設定
    if (privacyLevelSelect) {
      privacyLevelSelect.value = state.privacyLevel;
      privacyLevelSelect.addEventListener('change', (e) => {
        state.privacyLevel = e.target.value;
        saveState();
        updatePrivacyPreview();
      });
    }

    // リセット
    if (btnResetData) {
      btnResetData.addEventListener('click', () => {
        if (confirm("全てのノートデータを削除しますか？")) {
          state.journals = [];
          saveState();
          location.reload();
        }
      });
    }

    // モーダル閉じる
    const btnCloseModal = document.getElementById('btnCloseModal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => {
        document.getElementById('noteDetailModal').classList.add('hidden');
      });
    }
  }

  function switchTab(tabId) {
    navItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabId) item.classList.add('active');
      else item.classList.remove('active');
    });

    tabPanes.forEach(pane => {
      if (pane.id === tabId) pane.classList.add('active');
      else pane.classList.remove('active');
    });
  }

  // ✨ AI深層分析描画
  async function renderDeepAIAnalysis() {
    if (!deepTechText || !deepTacticalText || !homeDrillsContainer || !outdoorDrillsContainer) return;
    
    const analysisData = await AIEngine.generateDeepAIAnalysis(state.journals, state.customApiKey);
    
    deepTechText.textContent = analysisData.techAnalysis;
    deepTacticalText.textContent = analysisData.tacticalAnalysis;

    homeDrillsContainer.innerHTML = (analysisData.homeDrills || []).map((drill, index) => `
      <div class="drill-item-card">
        <div class="drill-title" style="color:var(--accent-green)"><i data-lucide="home"></i> 家練習 ${index + 1}: ${drill.title}</div>
        <div class="drill-desc">${drill.desc}</div>
      </div>
    `).join('');

    outdoorDrillsContainer.innerHTML = (analysisData.outdoorDrills || []).map((drill, index) => `
      <div class="drill-item-card">
        <div class="drill-title" style="color:var(--accent-blue)"><i data-lucide="sun"></i> 外練習 ${index + 1}: ${drill.title}</div>
        <div class="drill-desc">${drill.desc}</div>
      </div>
    `).join('');

    if (analysisPlaceholder) analysisPlaceholder.classList.add('hidden');
    if (aiDeepAnalysisContainer) aiDeepAnalysisContainer.classList.remove('hidden');

    if (window.lucide) lucide.createIcons();
  }

  function showToastModal(title = "保存完了！", body = "野球ノートを記録しました。") {
    if (!toastModal) return;
    if (toastTitleText) toastTitleText.textContent = title;
    if (toastBodyText) toastBodyText.textContent = body;
    toastModal.classList.remove('hidden');
  }

  function updateStreakDisplay() {
    const uniqueDates = Array.from(new Set(state.journals.map(j => j.date)));
    const streak = uniqueDates.length;

    if (streakCount) streakCount.textContent = streak;
    if (displayStreakLarge) displayStreakLarge.textContent = streak;
  }

  function renderJournalList() {
    const container = document.getElementById('journalListContainer');
    if (!container) return;

    if (state.journals.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:24px;color:var(--text-muted);">
          <i data-lucide="book-open" style="width:36px;height:36px;margin-bottom:8px;opacity:0.5;"></i>
          <p>まだ野球ノートが記入されていません。<br>今日の練習・試合メモを入力してみましょう！</p>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = state.journals.map(j => {
      const summaryTitle = (j.cleanedContent || j.rawContent || '').split(/[\n。]/)[0].substring(0, 22) + '...';
      return `
        <button type="button" class="journal-btn-card" data-id="${j.id}">
          <div class="journal-btn-info">
            <span class="journal-btn-date"><i data-lucide="calendar"></i> ${j.date} 【${j.category} - ${j.position}】</span>
            <span class="journal-btn-title">${summaryTitle}</span>
          </div>
          <i data-lucide="chevron-right" style="color:var(--text-muted);width:18px;height:18px;"></i>
        </button>
      `;
    }).join('');

    container.querySelectorAll('.journal-btn-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const found = state.journals.find(j => j.id === id);
        if (found) openJournalModal(found);
      });
    });

    if (window.lucide) lucide.createIcons();
  }

  function openJournalModal(journal) {
    const modal = document.getElementById('noteDetailModal');
    const title = document.getElementById('modalDateTitle');
    const body = document.getElementById('modalBodyContent');

    if (!modal || !body) return;

    title.textContent = `${journal.date} のノート 【${journal.category}】`;

    body.innerHTML = `
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">ポジション: ${journal.position} / 体調: ${journal.condition}</div>
      
      <div class="cleaned-text-box" style="margin-bottom:12px;">${journal.cleanedContent.replace(/\n/g, '<br>')}</div>
      
      <div class="result-grid-2" style="margin-top:0;">
        <div class="bullet-box-ui box-good-ui">
          <h5>よかった点</h5>
          <ul>${(journal.goodPoints || []).map(g => `<li>${g}</li>`).join('')}</ul>
        </div>
        <div class="bullet-box-ui box-issue-ui">
          <h5>反省・課題</h5>
          <ul>${(journal.issues || []).map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
      </div>

      <div class="advice-card-ui" style="margin-top:10px;">
        <span class="advice-badge-title">AIコーチアドバイス</span>
        <div class="advice-card-body">${journal.immediateAdvice || ''}</div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function renderLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;

    const uniqueDates = Array.from(new Set(state.journals.map(j => j.date)));
    const myStreak = uniqueDates.length;

    const dummyUsers = [
      { name: 'S高校 捕手 (仮名)', streak: 42 },
      { name: 'K高校 投手 (仮name)', streak: 35 },
      { name: 'T高校 中堅手 (仮名)', streak: 28 },
      { name: 'あなた', streak: myStreak, isSelf: true },
      { name: 'M高校 二塁手 (仮名)', streak: 0 }
    ];

    // 降順ソート（自分のストリークを優先）
    dummyUsers.sort((a, b) => b.streak - a.streak);
    dummyUsers.forEach((u, idx) => u.rank = idx + 1);

    container.innerHTML = dummyUsers.map(u => `
      <div class="leaderboard-item" style="${u.isSelf ? 'border-color:var(--accent-blue);background:rgba(0,242,254,0.15);box-shadow:0 0 12px rgba(0,242,254,0.3);' : ''}">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-weight:900;font-size:1.1rem;color:${u.rank <= 3 ? '#F59E0B' : 'var(--text-muted)'}">${u.rank}位</span>
          <span style="font-weight:700;font-size:0.88rem;color:${u.isSelf ? 'var(--accent-blue)' : 'var(--text-main)'}">${u.name} ${u.isSelf ? ' (あなた)' : ''}</span>
        </div>
        <span style="font-size:0.85rem;font-weight:800;color:#F59E0B;">${u.streak}日連続</span>
      </div>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', init);

})();
