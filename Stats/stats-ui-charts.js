/* =========================================================
Archivo: stats-ui-charts.js
Función: Manejo de Chart.js para visualizar métricas.
========================================================= */

(function (window) {
  "use strict";

  let globalChart = null;
  let focusPie = null;
  let careerReqChart = null;

  function safeDestroy(chart) {
    try { if (chart) chart.destroy(); } catch (e) {}
    return null;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function showFocusBlock(show) {
    const wrap = document.getElementById("stats-focus-wrap");
    const empty = document.getElementById("stats-focus-empty");
    if (wrap) wrap.style.display = show ? "block" : "none";
    if (empty) empty.style.display = show ? "none" : "flex";
  }

  function showCareerReqBlock(show) {
    const wrap = document.getElementById("stats-careerreq-wrap");
    const empty = document.getElementById("stats-careerreq-empty");
    if (wrap) wrap.style.display = show ? "block" : "none";
    if (empty) empty.style.display = show ? "none" : "flex";
  }

  function setCareerReqHeight(numCareers) {
    const wrapper = document.getElementById("stats-careerreq-wrapper");
    if (!wrapper) return;

    // Altura dinámica para que se lea bien cuando hay muchas carreras
    const rows = Math.max(1, Number(numCareers || 0));
    const px = Math.min(900, Math.max(360, rows * 28)); // 28px por fila aprox
    wrapper.style.height = px + "px";
  }

  const StatsUICharts = {
    update(stats) {
      // =========================
      // 1) GLOBAL: barras (siempre)
      // =========================
      const globalCanvas = document.getElementById("stats-global-chart");
      if (globalCanvas) {
        const reqStatsAll = Array.isArray(stats?.reqStatsAll)
          ? stats.reqStatsAll
          : (Array.isArray(stats?.reqStats) ? stats.reqStats : []);

        const labels = reqStatsAll.map(r => r.label);
        const cumpleData = reqStatsAll.map(r => r.cumple);
        const noCumpleData = reqStatsAll.map(r => r.noCumple);

        globalChart = safeDestroy(globalChart);

        globalChart = new Chart(globalCanvas, {
          type: "bar",
          data: {
            labels,
            datasets: [
              { label: "Cumple", data: cumpleData, backgroundColor: "#10b981", borderRadius: 4 },
              { label: "No Cumple", data: noCumpleData, backgroundColor: "#ef4444", borderRadius: 4 }
            ]
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true, grid: { display: false } },
              y: { stacked: true, grid: { display: false } }
            },
            plugins: {
              legend: { position: "bottom" },
              tooltip: { enabled: true }
            }
          }
        });
      }

      // ==========================================
      // 2) FOCUS: pastel (solo si eliges requisito)
      // ==========================================
      const hasFocus = stats && stats.mode === "req" && stats.focus;

      if (!hasFocus) {
        // Oculta focus
        showFocusBlock(false);
        focusPie = safeDestroy(focusPie);

        setText("stats-focus-title", "Resumen del Requisito");
        setText("stats-focus-label", "Selecciona un requisito");
        setText("stats-focus-cumple", "—");
        setText("stats-focus-nocumple", "—");
        setText("stats-focus-total", "—");

        // Oculta gráfico por carrera del requisito
        showCareerReqBlock(false);
        careerReqChart = safeDestroy(careerReqChart);
        setText("stats-careerreq-title", "Distribución por Carrera (Requisito)");

        return;
      }

      // ----- Pastel -----
      const focus = stats.focus;
      const focusCanvas = document.getElementById("stats-focus-pie");
      if (focusCanvas) {
        showFocusBlock(true);

        setText("stats-focus-title", "Resumen del Requisito");
        setText("stats-focus-label", focus.label || focus.key || "");
        setText("stats-focus-cumple", String(focus.cumple ?? 0));
        setText("stats-focus-nocumple", String(focus.noCumple ?? 0));
        setText("stats-focus-total", `De ${String(focus.total ?? 0)} estudiantes`);

        const pieData = [focus.cumple ?? 0, focus.noCumple ?? 0];

        focusPie = safeDestroy(focusPie);
        focusPie = new Chart(focusCanvas, {
          type: "doughnut",
          data: {
            labels: ["Cumple", "No Cumple"],
            datasets: [
              {
                data: pieData,
                backgroundColor: ["#10b981", "#ef4444"],
                borderWidth: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
              legend: { position: "bottom" },
              tooltip: { enabled: true }
            }
          }
        });
      }

      // ==========================================================
      // 3) NUEVO: Por Carrera (solo si eliges requisito)
      // ==========================================================
      const byCareer = Array.isArray(stats?.focusByCareer) ? stats.focusByCareer : [];
      const careerCanvas = document.getElementById("stats-careerreq-chart");

      if (!careerCanvas || byCareer.length === 0) {
        showCareerReqBlock(false);
        careerReqChart = safeDestroy(careerReqChart);
        setText("stats-careerreq-title", `Distribución por Carrera (${focus.label || "Requisito"})`);
        return;
      }

      showCareerReqBlock(true);
      setText("stats-careerreq-title", `Distribución por Carrera (${focus.label || "Requisito"})`);

      const labels = byCareer.map(x => x.career);
      const cumpleData = byCareer.map(x => x.cumple);
      const noCumpleData = byCareer.map(x => x.noCumple);

      setCareerReqHeight(labels.length);

      careerReqChart = safeDestroy(careerReqChart);
      careerReqChart = new Chart(careerCanvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Cumple", data: cumpleData, backgroundColor: "#10b981", borderRadius: 4 },
            { label: "No Cumple", data: noCumpleData, backgroundColor: "#ef4444", borderRadius: 4 }
          ]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { precision: 0 } },
            y: { stacked: true, grid: { display: false } }
          },
          plugins: {
            legend: { position: "bottom" },
            tooltip: { enabled: true }
          }
        }
      });
    }
  };

  window.StatsUICharts = StatsUICharts;
})(window);
