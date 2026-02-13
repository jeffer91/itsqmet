const HistoricoUICharts = {

  render(containerId, opts) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const {
      cutsAsc = [],
      career = "",
      requisito = ""
    } = opts || {};

    if (!requisito) {
      el.innerHTML = `
        <div class="charts-wrap">
          <div class="charts-head">
            <h3 class="charts-title">Gráfico histórico</h3>
            <p class="charts-subtitle">Selecciona un requisito para ver la serie.</p>
          </div>
        </div>
      `;
      return;
    }

    const series = this.buildSeries(cutsAsc, career, requisito);

    el.innerHTML = `
      <div class="charts-wrap">
        <div class="charts-head">
          <h3 class="charts-title">Histórico: ${HistoricoUtils.esc(requisito)}</h3>
          <p class="charts-subtitle">
            ${career ? "Carrera: " + HistoricoUtils.esc(career) : "Todas las carreras"}
          </p>
        </div>

        ${this.renderSVG(series)}

        <div class="chart-legend">
          <span><span class="legend-swatch legend-primary"></span> CUMPLE</span>
          <span><span class="legend-swatch legend-secondary"></span> NO CUMPLE</span>
        </div>
      </div>
    `;
  },

  buildSeries(cutsAsc, career, requisito) {
    const points = [];

    for (const cut of cutsAsc) {
      const label = HistoricoLogic.formatDate(cut.createdAt) || "—";
      const agg = cut.agg || {};

      let cumple = 0, noCumple = 0, total = 0;

      if (career) {
        const c = HistoricoLogic.getCounts(agg, career, requisito);
        cumple = c.cumple; noCumple = c.noCumple; total = c.total;
      } else {
        // Suma sobre todas las carreras
        for (const carrera of Object.keys(agg)) {
          const c = HistoricoLogic.getCounts(agg, carrera, requisito);
          cumple += c.cumple;
          noCumple += c.noCumple;
          total += c.total;
        }
      }

      points.push({ label, cumple, noCumple, total });
    }

    return points;
  },

  renderSVG(points) {
    // SVG simple: 2 líneas (cumple/noCumple) con escalado automático
    const w = 900, h = 220;
    const padL = 48, padR = 16, padT = 14, padB = 34;

    if (!points.length) {
      return `<div class="historico-empty">Sin datos para graficar.</div>`;
    }

    const maxY = Math.max(1, ...points.flatMap(p => [p.cumple, p.noCumple]));
    const n = points.length;

    const x = i => {
      if (n === 1) return (padL + (w - padR)) / 2;
      return padL + (i * ((w - padL - padR) / (n - 1)));
    };

    const y = v => {
      const plotH = h - padT - padB;
      return padT + (plotH - (v / maxY) * plotH);
    };

    const path = (key) => {
      return points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(p[key]).toFixed(2)}`).join(" ");
    };

    // grid (4 líneas)
    const gridLines = [];
    for (let k = 0; k <= 4; k++) {
      const v = (maxY * k) / 4;
      const yy = y(v);
      gridLines.push(`<line x1="${padL}" y1="${yy}" x2="${w - padR}" y2="${yy}"></line>`);
    }

    // x labels (máximo 6 etiquetas)
    const labelEvery = Math.max(1, Math.ceil(n / 6));
    const xLabels = points.map((p, i) => {
      if (i % labelEvery !== 0 && i !== n - 1) return "";
      const xx = x(i);
      return `<text x="${xx}" y="${h - 12}" text-anchor="middle">${HistoricoUtils.esc(this.shortLabel(p.label))}</text>`;
    }).join("");

    // y labels (0, max/2, max)
    const yLabels = `
      <text x="${padL - 8}" y="${y(0) + 4}" text-anchor="end">0</text>
      <text x="${padL - 8}" y="${y(maxY / 2) + 4}" text-anchor="end">${Math.round(maxY / 2)}</text>
      <text x="${padL - 8}" y="${y(maxY) + 4}" text-anchor="end">${Math.round(maxY)}</text>
    `;

    return `
      <svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <g class="chart-grid">
          ${gridLines.join("")}
        </g>

        <g class="chart-axis">
          ${yLabels}
          ${xLabels}
        </g>

        <path class="chart-line" d="${path("cumple")}"></path>
        <path class="chart-line secondary" d="${path("noCumple")}"></path>
      </svg>
    `;
  },

  shortLabel(full) {
    // De "12/1/2026, 10:12:00" a "12/1"
    const s = String(full || "");
    const m = s.match(/^(\d{1,2}\/\d{1,2})/);
    return m ? m[1] : (s.slice(0, 10) || "—");
  }
};
