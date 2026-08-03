/**
 * SVG Line Chart Renderer Module (v6.0 - Authentic Data Only Engine with init & updateJournals)
 * データが保存された後にのみ、実際のデータを折れ線グラフとして生成・追加
 */

const LineChartRenderer = (function () {

  let stateContainerId = '';
  let stateJournals = [];
  let stateMode = 'batting';
  let stateOnPointClick = null;

  /**
   * SVG折れ線グラフをレンダリングする
   * @param {string} containerId 描画先要素のID
   * @param {Array} dataSet ノートの配列
   * @param {string} mode 'batting' | 'pitching' | 'condition'
   * @param {Function} onPointClick データポイントタップ時のコールバック
   */
  function renderLineChart(containerId, dataSet, mode = 'batting', onPointClick = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // データが0件の場合はサンプル線を出さず、メッセージカードのみ表示
    if (!dataSet || dataSet.length === 0) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); padding: 30px 16px; background: rgba(0, 0, 0, 0.2); border-radius: var(--radius-sm); border: 1px dashed var(--border-color); text-align: center;">
          <i data-lucide="trending-up" style="width: 36px; height: 36px; color: var(--accent-blue); opacity: 0.6; margin-bottom: 8px;"></i>
          <p style="font-weight: 700; font-size: 0.88rem; color: var(--text-main); margin-bottom: 4px;">まだグラフデータがありません</p>
          <p style="font-size: 0.76rem; color: var(--text-sub);">「ノート」を作成して保存すると、ここに成長軌跡がグラフとして生成されます。</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // 保存された最新10件のデータを時系列順（古い順）にソート
    const sortedData = [...dataSet].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-10);

    const width = container.clientWidth || 450;
    const height = 210;
    const padding = { top: 30, right: 30, bottom: 35, left: 35 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const getYValue = (item) => {
      if (item.dynamicScores && Array.isArray(item.dynamicScores)) {
        if (mode === 'batting') {
          const found = item.dynamicScores.find(s => s.cat === '攻' || s.name.includes('打撃'));
          if (found) return found.val;
        } else if (mode === 'pitching') {
          const found = item.dynamicScores.find(s => s.cat === '投' || s.cat === '守' || s.name.includes('投球') || s.name.includes('守備'));
          if (found) return found.val;
        } else if (mode === 'condition') {
          const found = item.dynamicScores.find(s => s.cat === 'mental' || s.name.includes('メンタル') || s.name.includes('意識'));
          if (found) return found.val;
        }
      }
      const condMap = { '絶好調': 92, '好調': 82, '普通': 65, 'やや不調': 48, '不調': 30 };
      return condMap[item.condition] || 65;
    };

    const minY = 20;
    const maxY = 100;

    const points = sortedData.map((d, index) => {
      const x = padding.left + (chartW / Math.max(1, sortedData.length - 1)) * index;
      const val = getYValue(d);
      const y = padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;
      return { x, y, val, data: d };
    });

    let pathD = '';
    points.forEach((p, idx) => {
      if (idx === 0) {
        pathD += `M ${p.x} ${p.y}`;
      } else {
        const prev = points[idx - 1];
        const cx1 = prev.x + (p.x - prev.x) / 2;
        const cy1 = prev.y;
        const cx2 = prev.x + (p.x - prev.x) / 2;
        const cy2 = p.y;
        pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
      }
    });

    const areaD = points.length > 1 ?
      `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z` : '';

    let lineColor = '#00F2FE';
    let areaGradientStart = 'rgba(0, 242, 254, 0.35)';
    if (mode === 'pitching') {
      lineColor = '#EF4444';
      areaGradientStart = 'rgba(239, 68, 68, 0.35)';
    } else if (mode === 'condition') {
      lineColor = '#10B981';
      areaGradientStart = 'rgba(16, 185, 129, 0.35)';
    }

    let gridLinesHtml = '';
    [40, 60, 80, 100].forEach(val => {
      const y = padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;
      gridLinesHtml += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="3 3" />
        <text x="${padding.left - 8}" y="${y + 4}" fill="var(--text-sub)" font-size="10" text-anchor="end">${val}</text>
      `;
    });

    let pointsHtml = '';
    points.forEach((p, idx) => {
      const dateParts = p.data.date ? p.data.date.split('-') : ['08', '03'];
      const dateLabel = `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`;

      pointsHtml += `
        <text x="${p.x}" y="${height - 10}" fill="var(--text-sub)" font-size="10" text-anchor="middle">${dateLabel}</text>
        
        <circle cx="${p.x}" cy="${p.y}" r="6" fill="${lineColor}" stroke="#0B0F19" stroke-width="2" class="chart-point" data-index="${idx}" style="cursor:pointer;">
          <title>${p.data.date}: スコア ${p.val}</title>
        </circle>
        
        <text x="${p.x}" y="${p.y - 10}" fill="var(--text-main)" font-size="11" font-weight="bold" text-anchor="middle">${p.val}点</text>
      `;
    });

    const svgHtml = `
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        <defs>
          <linearGradient id="chartGradient_${mode}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${areaGradientStart}" />
            <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
          </linearGradient>
          <filter id="glowEffect_${mode}">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        ${gridLinesHtml}
        ${areaD ? `<path d="${areaD}" fill="url(#chartGradient_${mode})" />` : ''}
        <path d="${pathD}" fill="none" stroke="${lineColor}" stroke-width="3" filter="url(#glowEffect_${mode})" />
        ${pointsHtml}
      </svg>
    `;

    container.innerHTML = svgHtml;

    if (onPointClick) {
      const circles = container.querySelectorAll('.chart-point');
      circles.forEach(c => {
        c.addEventListener('click', (e) => {
          const idx = parseInt(e.target.getAttribute('data-index'));
          if (!isNaN(idx) && points[idx]) {
            onPointClick(points[idx].data);
          }
        });
      });
    }
  }

  function init(containerId, journals = [], onPointClick = null) {
    stateContainerId = containerId;
    stateJournals = journals;
    stateOnPointClick = onPointClick;

    const btns = document.querySelectorAll('.btn-tab-chart');
    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        btns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        stateMode = e.target.getAttribute('data-chart');
        renderLineChart(stateContainerId, stateJournals, stateMode, stateOnPointClick);
      });
    });

    renderLineChart(stateContainerId, stateJournals, stateMode, stateOnPointClick);
  }

  function updateJournals(newJournals) {
    stateJournals = newJournals;
    renderLineChart(stateContainerId, stateJournals, stateMode, stateOnPointClick);
  }

  return { init, updateJournals, renderLineChart };

})();

window.LineChartRenderer = LineChartRenderer;
