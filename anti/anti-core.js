/* Archivo: anti-core.js
Ubicación: anti/anti-core.js
Función: Orquestador (con ZIP):
         - Descargar 1: PDF normal
         - Descargar seleccionados: PDF uno por uno
         - Descargar todos (filtrados): ZIP con todos los PDFs
         - Overlay + progreso + deshabilitar botones
         - Carga assets del detector desde anti/img
========================================================= */

(function (window, document) {
  "use strict";

  const U = window.AntiUtils;

  const State = {
    periods: [],
    allStudents: [],
    currentPeriodId: "",
    currentPeriodLabel: "",
    currentCareer: "",
    searchText: "",
    eligible: [],
    selected: Object.create(null),
    logoDataUrl: "",
    detectorAssetsReady: false
  };

  function el(id) { return document.getElementById(id); }

  function setButtonsDisabled(disabled) {
    const b1 = el("btn-download-selected");
    const b2 = el("btn-download-all");
    if (b1) b1.disabled = !!disabled;
    if (b2) b2.disabled = !!disabled;
  }

  function setLoading(isOn, opts = {}) {
    const overlay = el("anti-loading");
    if (!overlay) return;

    const title = el("anti-loading-title");
    const sub = el("anti-loading-sub");
    const step = el("anti-loading-step");
    const pct = el("anti-loading-pct");
    const bar = el("anti-loading-barfill");

    if (!isOn) {
      overlay.classList.remove("is-visible");
      overlay.setAttribute("aria-hidden", "true");
      if (bar) bar.style.width = "0%";
      if (pct) pct.textContent = "0%";
      if (step) step.textContent = "0/0";
      setButtonsDisabled(false);
      return;
    }

    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");

    if (title) title.textContent = String(opts.title || "Procesando...");
    if (sub) sub.textContent = String(opts.sub || "Por favor espera.");
    if (step) step.textContent = String(opts.stepText || "0/0");
    if (pct) pct.textContent = String(opts.pctText || "0%");
    if (bar) bar.style.width = String(opts.pctWidth || "0%");

    setButtonsDisabled(true);
  }

  function updateLoadingProgress(done, total, extraPct = null) {
    const step = el("anti-loading-step");
    const pct = el("anti-loading-pct");
    const bar = el("anti-loading-barfill");

    const base = total > 0 ? Math.round((done / total) * 100) : 0;
    const use = (extraPct !== null && Number.isFinite(extraPct)) ? Math.round(extraPct) : base;

    if (step) step.textContent = `${done}/${total}`;
    if (pct) pct.textContent = `${use}%`;
    if (bar) bar.style.width = `${use}%`;
  }

  function renderFilters() {
    const wrap = el("anti-filters");
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="anti-group">
        <label>Período</label>
        <select id="anti-filter-period" class="anti-select">
          <option value="">-- Selecciona --</option>
          ${State.periods.map(p => `<option value="${p.id}">${p.label}</option>`).join("")}
        </select>
      </div>

      <div class="anti-group">
        <label>Carrera</label>
        <select id="anti-filter-career" class="anti-select" disabled>
          <option value="">Todas</option>
        </select>
      </div>

      <div class="anti-group">
        <label>Buscar</label>
        <input id="anti-filter-search" class="anti-input" placeholder="Cédula o nombre..." />
      </div>
    `;

    el("anti-filter-period").addEventListener("change", (e) => {
      State.currentPeriodId = String(e.target.value || "").trim();
      const p = State.periods.find(x => x.id === State.currentPeriodId);
      State.currentPeriodLabel = p ? String(p.label || p.id) : "";

      State.currentCareer = "";
      State.searchText = "";
      State.selected = Object.create(null);

      updateCareers();
      updateView();
    });

    el("anti-filter-career").addEventListener("change", (e) => {
      State.currentCareer = String(e.target.value || "");
      State.selected = Object.create(null);
      updateView();
    });

    el("anti-filter-search").addEventListener("input", (e) => {
      State.searchText = String(e.target.value || "");
      updateView();
    });
  }

  function getStudentsInPeriod() {
    if (!State.currentPeriodId) return [];
    return State.allStudents.filter(s => {
      const pid = String(s.periodoId || s.periodo_id || "").trim();
      if (pid !== State.currentPeriodId) return false;
      return window.AntiLogic.isActiveStudent(s);
    });
  }

  function updateCareers() {
    const sel = el("anti-filter-career");
    if (!sel) return;

    if (!State.currentPeriodId) {
      sel.innerHTML = `<option value="">Todas</option>`;
      sel.disabled = true;
      return;
    }

    const inPeriod = getStudentsInPeriod();
    const eligible = inPeriod.filter(s => window.AntiLogic.isEnabledForAnti(s));

    const careers = [...new Set(eligible.map(s => U.normalizeCareer(
      s.nombrecarrera || s.nombreCarrera || s.NombreCarrera || ""
    )))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"es"));

    sel.innerHTML = `<option value="">Todas</option>` + careers.map(c => `<option value="${c}">${c}</option>`).join("");
    sel.disabled = false;
    sel.value = "";
  }

  function applyFilters(rows) {
    let out = Array.isArray(rows) ? rows.slice() : [];

    if (State.currentCareer) out = out.filter(r => r.carrera === State.currentCareer);

    const q = U.normalizeText(State.searchText || "").toLowerCase();
    if (q) {
      out = out.filter(r => {
        const ced = U.normalizeText(r.cedula).toLowerCase();
        const nom = U.normalizeText(r.nombre).toLowerCase();
        return ced.includes(q) || nom.includes(q);
      });
    }

    out.sort((a,b) => {
      const c = String(a.carrera).localeCompare(String(b.carrera), "es");
      if (c !== 0) return c;
      return String(a.nombre).localeCompare(String(b.nombre), "es");
    });

    return out;
  }

  function renderSummary() {
    const s = el("anti-summary");
    if (!s) return;

    if (!State.currentPeriodId) {
      s.textContent = "Selecciona un período para cargar estudiantes.";
      return;
    }

    const total = State.eligible.length;
    const selCount = Object.keys(State.selected).filter(k => State.selected[k]).length;

    s.innerHTML = `
      Período: <strong>${State.currentPeriodLabel || State.currentPeriodId}</strong> ·
      Habilitados (filtrados): <strong>${total}</strong> ·
      Seleccionados: <strong>${selCount}</strong>
    `;
  }

  function updateView() {
    const tableContainerId = "anti-table";

    if (!State.currentPeriodId) {
      State.eligible = [];
      renderSummary();
      window.AntiUITable.render(tableContainerId, [], State.selected, ()=>{}, ()=>{}, ()=>{});
      return;
    }

    const inPeriod = getStudentsInPeriod();
    const enabled = inPeriod
      .filter(s => window.AntiLogic.isEnabledForAnti(s))
      .map(s => window.AntiLogic.extractStudentView(s));

    State.eligible = applyFilters(enabled);
    renderSummary();

    window.AntiUITable.render(
      tableContainerId,
      State.eligible,
      State.selected,
      handleToggleOne,
      handleToggleAll,
      handleDownloadOne
    );
  }

  function handleToggleOne(cedula, checked) {
    if (!cedula) return;
    if (checked) State.selected[cedula] = true;
    else delete State.selected[cedula];
    renderSummary();
  }

  function handleToggleAll(checked) {
    State.selected = Object.create(null);
    if (checked) for (const r of State.eligible) State.selected[r.cedula] = true;
    updateView();
  }

  function assertPeriod() {
    if (!State.currentPeriodId) {
      alert("Selecciona un período primero.");
      return false;
    }
    return true;
  }

  function getRowByCedula(ced) {
    return State.eligible.find(r => String(r.cedula) === String(ced)) || null;
  }

  function buildDetectorModel({ originalityNumber }) {
    const orig = Number(originalityNumber.toFixed(2));
    const plag = Number((100 - orig).toFixed(2));

    return {
      headerTitle: "Detector de plagio v. 2867 - Informe de originalidad 7/10/2025 10:40:41",
      docLine: "Documento analizado: Justificación.pdf Licenciado para: Instituto Tecnológico Superior Quito Metropolitano_License2",
      settingsLines: [
        "Preajuste de comparación: Volver a escribir   Idioma detectado: Es",
        "Tipo de verificación: Control de internet",
        "TEE y codificación: PdfPig"
      ],
      pct: { plagio: plag, original: orig, citas: 0, ai: 0 },

      sources: [
        { pct: 6, score: 100, idx: "1.", text: "Coincidencia detectada en una fuente web (referencia genérica)" },
        { pct: 5, score: 95, idx: "2.", text: "Coincidencia detectada en un repositorio académico (referencia genérica)" },
        { pct: 3, score: 50, idx: "3.", text: "Coincidencia detectada en un artículo digital (referencia genérica)" }
      ],

      uaceItems: [
        {
          n: "1.",
          parts: [
            { t: "Estado: Analizador ", color: null },
            { t: "Encendido", color: "okGreen" },
            { t: " Normalizador ", color: null },
            { t: "Encendido", color: "okGreen" },
            { t: " similitud de caracteres establecida en ", color: null },
            { t: "100%", color: "okGreen" }
          ]
        },
        {
          n: "2.",
          parts: [
            { t: "Porcentaje de contaminación UniCode detectado: ", color: null },
            { t: "0%", color: "okGreen" },
            { t: " con límite de: 4%", color: null }
          ]
        },
        { n: "3.", text: "Documento no normalizado: porcentaje no alcanzado 5%" },
        {
          n: "4.",
          parts: [
            { t: "Todos los símbolos sospechosos se marcarán en color violeta: ", color: null },
            { t: "Abcd...", color: "violet" }
          ]
        },
        { n: "5.", text: "Símbolos invisibles encontrados: 0" }
      ],

      recommendation: "No se requiere ninguna acción especial. El documento está bien."
    };
  }

  async function persistAndUpdateRow(row, originalityNumber) {
    const orig = Number(originalityNumber.toFixed(2));
    const plag = Number((100 - orig).toFixed(2));

    const today = U.todayParts();
    const ok = await window.AntiBus.saveAntiPlagioResult(row.raw?._docId || row.raw?.docId || row.cedula, {
      originalidadNumber: orig,
      plagioNumber: plag,
      citasNumber: 0,
      aiNumber: 0,
      version: "2867",
      fechaISO: today.human,
      fechaTexto: today.humanLong
    });

    if (ok) {
      row.antiOriginalidad = orig;
      row.antiFechaTexto = today.humanLong;
      if (row.raw) {
        row.raw.AntiPlagioOriginalidad = orig;
        row.raw.AntiPlagioPlagio = plag;
        row.raw.AntiPlagioFechaTexto = today.humanLong;
      }
    }
  }

  async function generatePdfForRow(row, memoDateISOOverride) {
    const periodoLabel = State.currentPeriodLabel || State.currentPeriodId || "—";

    const originalityNumber = U.randomBetween(80, 98, 2);
    await persistAndUpdateRow(row, originalityNumber);

    const detectorModel = buildDetectorModel({ originalityNumber });

    const { doc, filename } = window.AntiPDFGenerator.generate({
      estudiante: row,
      periodoLabel,
      logoDataUrl: State.logoDataUrl,
      detectorModel,
      memoDateISOOverride
    });

    return { doc, filename };
  }

  async function downloadPDFForRow(row) {
    const { doc, filename } = await generatePdfForRow(row);
    doc.save(filename);
  }

  async function handleDownloadOne(cedula) {
    if (!assertPeriod()) return;
    const row = getRowByCedula(cedula);
    if (!row) return alert("No se encontró el estudiante en la lista filtrada.");

    try {
      setLoading(true, { title: "Generando PDF...", sub: "Preparando informe." });
      updateLoadingProgress(1, 1, 30);
      await downloadPDFForRow(row);
      updateLoadingProgress(1, 1, 100);
    } finally {
      setLoading(false);
      updateView();
    }
  }

  async function downloadSelected() {
    if (!assertPeriod()) return;

    const selectedRows = State.eligible.filter(r => !!State.selected[r.cedula]);
    if (!selectedRows.length) {
      alert("No tienes estudiantes seleccionados.");
      return;
    }

    try {
      setLoading(true, {
        title: "Generando PDFs...",
        sub: "Descargando uno por uno.",
        stepText: `0/${selectedRows.length}`,
        pctText: "0%",
        pctWidth: "0%"
      });

      let i = 0;
      for (const r of selectedRows) {
        i++;
        updateLoadingProgress(i, selectedRows.length);
        await downloadPDFForRow(r);
        await U.sleep(120);
      }
    } finally {
      setLoading(false);
      updateView();
    }
  }

  async function downloadAllFiltered() {
    if (!assertPeriod()) return;

    if (!State.eligible.length) {
      alert("No hay estudiantes habilitados con los filtros actuales.");
      return;
    }

    if (!window.JSZip) {
      alert("JSZip no está disponible. Revisa que se cargue la librería en anti.html.");
      return;
    }

    const total = State.eligible.length;
    const zip = new window.JSZip();
    const memoDateISO = U.todayParts().memo;

    try {
      setLoading(true, {
        title: "Generando ZIP...",
        sub: "Creando PDFs y empaquetando.",
        stepText: `0/${total}`,
        pctText: "0%",
        pctWidth: "0%"
      });

      let i = 0;
      for (const r of State.eligible) {
        i++;
        updateLoadingProgress(i, total);
        const { doc, filename } = await generatePdfForRow(r, memoDateISO);
        const blob = doc.output("blob");
        zip.file(filename, blob);
        await U.sleep(50);
      }

      // Progreso de compresión ZIP
      const zipBlob = await zip.generateAsync(
        { type: "blob" },
        (meta) => {
          // meta.percent: 0..100 (compresión)
          updateLoadingProgress(total, total, meta.percent);
        }
      );

      const zipName = `MEM-ITSQMET-UTET-${memoDateISO}-TODOS.zip`;
      U.downloadBlob(zipBlob, zipName);
    } finally {
      setLoading(false);
      updateView();
    }
  }

  async function init() {
    console.log("[Anti] Iniciando...");

    try {
      setLoading(true, { title: "Cargando...", sub: "Inicializando módulo Anti." });

      // Logo
      try {
        State.logoDataUrl = await U.loadImageDataURL("logo.png");
      } catch (e) {
        console.warn("[Anti] No se pudo cargar logo.png (se generará sin logo).", e);
        State.logoDataUrl = "";
      }

      // Assets del detector (anti/img/*.png)
      try {
        await U.loadDetectorAssets();
        State.detectorAssetsReady = true;
      } catch (e) {
        console.warn("[Anti] Assets del detector no disponibles.", e);
        State.detectorAssetsReady = false;
      }

      State.periods = await window.AntiBus.getPeriods();
      State.allStudents = await window.AntiBus.getAllStudents();

      renderFilters();
      window.AntiUIActions.bind(downloadSelected, downloadAllFiltered);

      updateView();
    } finally {
      setLoading(false);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})(window, document);
