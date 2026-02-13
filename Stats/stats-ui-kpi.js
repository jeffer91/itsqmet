/* =========================================================
Archivo: stats-ui-kpi.js
Función: Dibuja tarjetas de indicadores clave (KPIs) y análisis de texto.
========================================================= */

(function (window) {
  "use strict";

  const StatsUIKPI = {
    render(containerId, data, analysisContainerId, deadlineDate) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const isReqMode = data && data.mode === "req" && data.focus;

      let cards;

      if (isReqMode) {
        // KPIs orientados al requisito elegido
        const f = data.focus;
        cards = [
          {
            label: `Requisito`,
            value: f.label,
            icon: "fa-filter",
            color: "var(--primary)",
            sub: `Vista enfocada`
          },
          {
            label: "Cumple",
            value: f.cumple,
            icon: "fa-check",
            color: "var(--success)",
            sub: `De ${f.total} estudiantes`
          },
          {
            label: "No Cumple",
            value: f.noCumple,
            icon: "fa-times",
            color: "var(--danger)",
            sub: `Pendientes en ${f.label}`
          },
          {
            label: "% Cumplimiento",
            value: f.pcCumple,
            icon: "fa-chart-line",
            color: "var(--warning)",
            sub: `Nivel de avance`
          }
        ];
      } else {
        // KPIs globales del proceso (como antes)
        cards = [
          {
            label: "Total Estudiantes",
            value: data.total,
            icon: "fa-users",
            color: "var(--primary)",
            sub: "Activos en este período"
          },
          {
            label: "Habilitados Artículo",
            value: data.habilitadosArticulo,
            icon: "fa-pencil-alt",
            color: "var(--warning)",
            sub: "Cumplen todo menos titulación"
          },
          {
            label: "Titulación Completa",
            value: data.titulacionCompleta,
            icon: "fa-graduation-cap",
            color: "var(--primary-dark)",
            sub: "Nota art. ≥ 7 o req. ok"
          },
          {
            label: "Aprobados Finales",
            value: data.aprobadosFinales,
            icon: "fa-check-circle",
            color: "var(--success)",
            sub: `Tasa de éxito: ${data.pcAprobados}`
          }
        ];
      }

      container.innerHTML = cards.map(c => `
        <div class="stats-kpi-card" style="border-left-color: ${c.color}">
          <i class="fas ${c.icon} stats-kpi-icon" style="color: ${c.color}"></i>
          <div class="stats-kpi-label">${c.label}</div>
          <div class="stats-kpi-value">${c.value}</div>
          <div class="stats-kpi-sub">${c.sub}</div>
        </div>
      `).join("");

      this.renderAnalysis(analysisContainerId, data, deadlineDate);
    },

    renderAnalysis(containerId, data, deadlineDate) {
      const el = document.getElementById(containerId);
      if (!el) return;

      const isReqMode = data && data.mode === "req" && data.focus;

      let msg = "";

      if (isReqMode) {
        const f = data.focus;
        msg += `Se han analizado <strong>${data.total}</strong> estudiantes. `;
        msg += `En el requisito <strong>${f.label}</strong>, `;
        msg += `<strong>${f.cumple}</strong> cumplen y <strong>${f.noCumple}</strong> no cumplen `;
        msg += `(<strong>${f.pcCumple}</strong> de cumplimiento).`;
      } else {
        msg = `Se han analizado <strong>${data.total}</strong> estudiantes. `;
        if (data.total > 0) {
          msg += `El <strong>${data.pcAprobados}</strong> ya ha finalizado todo el proceso. `;
          msg += `Hay <strong>${data.habilitadosArticulo}</strong> estudiantes listos para presentar su artículo.`;
        } else {
          msg += "No hay datos para mostrar.";
        }
      }

      let dateMsg = "<br><br>No se ha definido fecha límite.";
      if (deadlineDate) {
        const today = new Date();
        const dead = new Date(deadlineDate + "T23:59:59");
        const diffDays = Math.ceil((dead - today) / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          dateMsg = `<br><br>Faltan <span class="stats-analysis-highlight">${diffDays} días</span> para el cierre.`;
        } else {
          dateMsg = `<br><br><span style="color:var(--danger)">El plazo ha finalizado hace ${Math.abs(diffDays)} días.</span>`;
        }
      }

      el.innerHTML = `<h3>Análisis Inteligente</h3><p>${msg}${dateMsg}</p>`;
    }
  };

  window.StatsUIKPI = StatsUIKPI;
})(window);
