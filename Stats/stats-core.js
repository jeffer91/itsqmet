/* =========================================================
Archivo: stats-core.js
Función: Controlador principal. Orquesta la inicialización, tabs y flujo de datos.
========================================================= */

(function (window, document) {
  "use strict";

  const State = {
    allStudents: [],
    periods: [],
    currentPeriodId: null,
    filters: {
      career: "",
      req: ""
    },
    ui: {
      activeTab: "global"
    },
    cache: {
      students: [],
      stats: null,
      deadline: null,
      focusReqKey: null
    }
  };

  async function init() {
    console.log("[StatsCore] Iniciando...");

    State.periods = await window.StatsBus.getPeriods();
    State.allStudents = await window.StatsBus.getAllStudents();

    window.StatsUIFilters.render(
      "stats-filters-bar",
      State.periods,
      handleFilterChange,
      handleSaveDate
    );

    initTabs();
  }

  function initTabs() {
    const btns = document.querySelectorAll(".stats-tab-btn");
    if (!btns || btns.length === 0) return;

    btns.forEach(btn => {
      btn.addEventListener("click", () => {
        btns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        State.ui.activeTab = (btn.dataset.target || "global").trim();
        renderTablesFromCache();
      });
    });
  }

  function getStudentCareer(s) {
    return s.nombrecarrera || s.nombreCarrera || s.NombreCarrera || "";
  }

  function handleFilterChange(type, value) {
    if (type === "period") {
      State.currentPeriodId = value;

      const p = State.periods.find(x => x.id === value);
      window.StatsUIFilters.setDeadline(p ? p.fechaLimiteRequisitos : "");

      const studentsInPeriod = getStudentsInPeriod();
      const careers = [...new Set(studentsInPeriod.map(s =>
        window.StatsUtils.normalizeCareer(getStudentCareer(s))
      ))].sort();

      window.StatsUIFilters.updateCareers(careers);
    }

    if (type === "career") State.filters.career = value;
    if (type === "req") State.filters.req = value;

    updateDashboard();
  }

  async function handleSaveDate(dateString) {
    if (!State.currentPeriodId) return alert("Selecciona un período primero");
    await window.StatsBus.saveDeadline(State.currentPeriodId, dateString);

    const p = State.periods.find(x => x.id === State.currentPeriodId);
    if (p) p.fechaLimiteRequisitos = dateString;

    updateDashboard();
  }

  function getStudentsInPeriod() {
    if (!State.currentPeriodId) return [];
    return State.allStudents.filter(s => {
      const pid = (s.periodoId || s.periodo_id || "").trim();
      if (pid !== State.currentPeriodId) return false;
      return !window.StatsLogic.isRetired(s);
    });
  }

  function updateDashboard() {
    const students = getStudentsInPeriod();

    const filteredStudents = State.filters.career
      ? students.filter(s =>
          window.StatsUtils.normalizeCareer(getStudentCareer(s)) === State.filters.career
        )
      : students;

    const focusReqKey = (State.filters.req || "").trim() || null;

    const stats = window.StatsLogic.processStats(filteredStudents, focusReqKey);

    const p = State.periods.find(x => x.id === State.currentPeriodId);
    const deadline = p ? p.fechaLimiteRequisitos : null;

    State.cache.students = filteredStudents;
    State.cache.stats = stats;
    State.cache.deadline = deadline;
    State.cache.focusReqKey = focusReqKey;

    window.StatsUIKPI.render("stats-kpi-grid", stats, "stats-analysis-panel", deadline);
    window.StatsUICharts.update(stats);

    renderTablesFromCache();
  }

  function renderTablesFromCache() {
    const { students, stats, focusReqKey } = State.cache;

    const c = document.getElementById("stats-table-container");
    if (!stats) {
      if (c) c.innerHTML = `<div style="color:#64748b;">Selecciona un período para ver resultados.</div>`;
      return;
    }

    if (State.ui.activeTab === "carreras") {
      window.StatsUITables.renderByCareer("stats-table-container", { stats, students, focusReqKey });
      return;
    }

    if (State.ui.activeTab === "detalle") {
      window.StatsUITables.renderDetail("stats-table-container", { stats, students, focusReqKey });
      return;
    }

    window.StatsUITables.renderGlobal("stats-table-container", stats);
  }

  document.addEventListener("DOMContentLoaded", init);

})(window, document);
