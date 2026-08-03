/**
 * Visual Calendar Component (v4.0 - Blue Dot Marker & Complete API Integration)
 */

const CalendarView = (function () {
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();

  let stateGridId = '';
  let stateMonthYearId = '';
  let stateJournals = [];
  let stateOnDateClick = null;

  function renderCalendar(gridId, monthYearId, journals = [], onDateClick = null) {
    const grid = document.getElementById(gridId);
    const monthYearText = document.getElementById(monthYearId);
    if (!grid || !monthYearText) return;

    monthYearText.textContent = `${currentYear}年 ${currentMonth + 1}月`;
    grid.innerHTML = '';

    // 曜日ヘッダー (日〜土)
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    dayNames.forEach(d => {
      const h = document.createElement('div');
      h.className = 'cal-day-header';
      if (d === '日') h.style.color = '#EF4444';
      if (d === '土') h.style.color = '#4FACFE';
      h.textContent = d;
      grid.appendChild(h);
    });

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 空白セル
    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-day-cell empty';
      grid.appendChild(blank);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 日付セル
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';

      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

      if (dateKey === todayStr) {
        cell.classList.add('today');
      }

      // ノートが存在するか確認
      const note = journals.find(j => j.date === dateKey);

      let dotHtml = '';
      if (note) {
        cell.classList.add('has-note');
        // 🔵 入力済み日程への鮮やかな青丸（ドット）マーク
        dotHtml = `<div class="cal-dot-blue"></div>`;
      }

      cell.innerHTML = `
        <span class="day-num">${d}</span>
        ${dotHtml}
      `;

      if (onDateClick) {
        cell.addEventListener('click', () => {
          const found = journals.find(j => j.date === dateKey);
          if (found) onDateClick(found);
        });
      }

      grid.appendChild(cell);
    }
  }

  function setMonth(offset, gridId, monthYearId, journals, onDateClick) {
    currentMonth += offset;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    } else if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar(gridId, monthYearId, journals, onDateClick);
  }

  function init(gridId, monthYearId, prevBtnId, nextBtnId, journals = [], onDateClick = null) {
    stateGridId = gridId;
    stateMonthYearId = monthYearId;
    stateJournals = journals;
    stateOnDateClick = onDateClick;

    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);

    if (prevBtn) {
      prevBtn.onclick = () => setMonth(-1, stateGridId, stateMonthYearId, stateJournals, stateOnDateClick);
    }
    if (nextBtn) {
      nextBtn.onclick = () => setMonth(1, stateGridId, stateMonthYearId, stateJournals, stateOnDateClick);
    }

    renderCalendar(stateGridId, stateMonthYearId, stateJournals, stateOnDateClick);
  }

  function updateJournals(newJournals) {
    stateJournals = newJournals;
    renderCalendar(stateGridId, stateMonthYearId, stateJournals, stateOnDateClick);
  }

  return {
    init,
    updateJournals,
    renderCalendar,
    setMonth
  };
})();

window.CalendarView = CalendarView;
