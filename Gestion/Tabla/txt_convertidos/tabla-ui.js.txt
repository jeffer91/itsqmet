// tabla-ui.js
// -------------------------------------------------------------
// CONTROL DE INTERFAZ DE USUARIO PARA TABLA FIREBASE
// -------------------------------------------------------------
// ACTUALIZACIÓN:
// - Filtro "Completos": Estudiantes sin ningún pendiente.
// - Filtro "Egresados": Estudiantes cuyo ÚNICO pendiente es Titulación.
// -------------------------------------------------------------

(function (window, document) {
  "use strict";

  let tbody,
    selectPeriodo,
    loader,
    chipContainer,
    searchInput,
    thead,
    resumenPeriodo;

  let rowsOriginal = [];
  let rowsFiltradas = [];
  let currentPeriodoId = null;

  // Estado de Filtros
  let filtrosRequisitos = []; // claves canon: academico, financiero, etc.
  let filtroEspecial = null;  // null | "Completos" | "Egresados"
  let currentSearch = "";

  // Orden por defecto: NOMBRES asc
  let currentSort = { field: "nombres", dir: "asc" };

  // Mapa de chips -> claves de requisitos
  // Nota: Completos y Egresados son nulos aquí porque se manejan con filtroEspecial
  const REQ_KEY_MAP = {
    Todos: null,
    Completos: null,
    Egresados: null,
    Academico: "academico",
    Documentacion: "documentacion",
    Financiero: "financiero",
    Titulacion: "titulacion",
    Practicas: "practicas",
    Vinculacion: "vinculacion",
    Seguimiento: "seguimiento",
    Ingles: "ingles",
    Datos: "datos"
  };

  const LABELS =
    (window.TablaLogic && window.TablaLogic.LABELS_REQUISITOS) ||
    {
      academico: "Académico",
      documentacion: "Documentación",
      financiero: "Financiero",
      ingles: "Inglés",
      practicas: "Prácticas",
      seguimiento: "Seguimiento",
      titulacion: "Titulación",
      vinculacion: "Vinculación",
      datos: "Datos"
    };

  // ============================================================
  // Helpers seguros
  // ============================================================
  function escapeHtml(value) {
    const s = (value === null || value === undefined) ? "" : String(value);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    tbody = document.getElementById("tabla-grid-body");
    selectPeriodo = document.getElementById("tabla-period-select");
    chipContainer = document.getElementById("tabla-chip-container");
    searchInput = document.getElementById("tabla-search-input");
    thead = document.querySelector("#tabla-grid-container thead");
    resumenPeriodo = document.getElementById("tabla-resumen-periodo");
    loader = crearLoader();

    if (!tbody || !selectPeriodo) {
      console.error("[tabla-ui] Error: no se encontraron elementos clave.");
      return;
    }

    // Cambio de período
    selectPeriodo.addEventListener("change", async () => {
      const periodoId = selectPeriodo.value;
      if (!periodoId) {
        currentPeriodoId = null;
        rowsOriginal = [];
        actualizarResumenPeriodo();
        pintarMensajeVacio("Selecciona un período.");
        return;
      }
      currentPeriodoId = periodoId;
      await cargarTabla(periodoId);
    });

    // Chips de requisitos
    if (chipContainer) {
      chipContainer.addEventListener("click", onClickChip);
    }

    // Buscador
    if (searchInput) {
      searchInput.addEventListener("input", (ev) => {
        currentSearch = (ev.target.value || "").toLowerCase().trim();
        refrescarTabla();
      });
    }

    // Orden por cabeceras
    if (thead) {
      thead.addEventListener("click", onClickHeader);
    }

    console.log("[tabla-ui] Inicializado correctamente.");
  }

  // ============================================================
  // Loader
  // ============================================================
  function crearLoader() {
    const div = document.createElement("div");
    div.id = "tabla-loader";
    div.style.position = "fixed";
    div.style.top = "50%";
    div.style.left = "50%";
    div.style.transform = "translate(-50%, -50%)";
    div.style.padding = "10px 20px";
    div.style.background = "#fff";
    div.style.borderRadius = "10px";
    div.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    div.style.display = "none";
    div.textContent = "Cargando...";
    document.body.appendChild(div);
    return div;
  }

  function mostrarLoader() {
    if (loader) loader.style.display = "block";
    if (tbody) tbody.style.opacity = 0.4;
  }

  function ocultarLoader() {
    if (loader) loader.style.display = "none";
    if (tbody) tbody.style.opacity = 1;
  }

  // ============================================================
  // Cargar estudiantes desde Firebase
  // ============================================================
  async function cargarTabla(periodoId) {
    mostrarLoader();
    rowsOriginal = [];
    try {
      const rawRows = await window.TablaBus.cargarEstudiantesPorPeriodo(periodoId);
      rowsOriginal = window.TablaLogic.procesarEstudiantes(rawRows || []);

      // Reset de filtros y orden
      filtrosRequisitos = [];
      filtroEspecial = null;
      currentSearch = "";
      if (searchInput) searchInput.value = "";
      resetChipsUI(true);
      currentSort = { field: "nombres", dir: "asc" };
      actualizarIndicadoresOrden();

      actualizarResumenPeriodo();
      refrescarTabla();
    } catch (err) {
      console.error("[tabla-ui] Error cargando estudiantes:", err);
      pintarMensajeVacio("Error cargando datos.");
    }
    actualizarResumenPeriodo();
    ocultarLoader();
  }

  // ============================================================
  // Resumen: Estadísticas básicas en el header
  // ============================================================
  function actualizarResumenPeriodo() {
    if (!resumenPeriodo) return;
    if (!currentPeriodoId) {
      resumenPeriodo.textContent = "";
      return;
    }
    const total = rowsOriginal.length;

    // Completos (0 pendientes)
    const completos = rowsOriginal.filter((r) => {
      const pend = r.requisitosPendientes || [];
      return pend.length === 0;
    }).length;

    // Egresados (Solo falta titulación)
    const egresados = rowsOriginal.filter((r) => {
      const p = r.requisitosPendientes || [];
      return p.length === 1 && p[0] === "titulacion";
    }).length;

    resumenPeriodo.textContent = `Total: ${total} · Completos: ${completos} · Egresados: ${egresados}`;
  }

  // ============================================================
  // Filtros + Orden + Pintar
  // ============================================================
  function refrescarTabla() {
    if (!rowsOriginal.length) {
      pintarMensajeVacio("No hay estudiantes para este período.");
      return;
    }

    let rows = rowsOriginal.slice();

    // 1) Filtro Especial
    if (filtroEspecial === "Completos") {
      rows = rows.filter((r) => (r.requisitosPendientes || []).length === 0);
    } else if (filtroEspecial === "Egresados") {
      rows = rows.filter((r) => {
        const p = r.requisitosPendientes || [];
        return p.length === 1 && p.includes("titulacion");
      });
    }
    // 2) Filtros de requisitos pendientes
    else if (filtrosRequisitos.length > 0) {
      rows = rows.filter((r) => {
        const req = r.requisitos || {};
        return filtrosRequisitos.every((key) => {
          const v = (req[key] || "").toUpperCase();
          if (!v) return false;
          return v !== "CUMPLE";
        });
      });
    }

    // 3) Buscador
    if (currentSearch) {
      rows = rows.filter((r) => {
        const texto = [
          r.apellidos || "",
          r.nombres || "",
          r.numeroidentificacion || "",
          r.nombrecarrera || ""
        ].join(" ").toLowerCase();
        return texto.includes(currentSearch);
      });
    }

    // 4) Orden
    const field = currentSort.field;
    const dir = currentSort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const va = (a[field] || "").toString().toLowerCase();
      const vb = (b[field] || "").toString().toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    rowsFiltradas = rows;

    if (!rowsFiltradas.length) {
      pintarMensajeVacio("No hay estudiantes que cumplan ese filtro.");
      return;
    }

    pintarTabla(rowsFiltradas, currentPeriodoId);
  }

  // ============================================================
  // Pintar tabla
  // ============================================================
  function pintarMensajeVacio(msj) {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" class="empty">${escapeHtml(msj)}</td></tr>`;
  }

  function pintarTabla(rows, periodoId) {
    let html = "";

    // Mapa para inyectar observaciones de forma segura por value
    const obsById = Object.create(null);

    rows.forEach((r) => {
      let alertaRemovido = "";
      let claseFila = "";

      if (r.removido === true) {
        alertaRemovido = "⚠️ Estudiante removido del Excel anterior";
        claseFila = "row-removido";
      }

      const pendientes = r.requisitosPendientes || [];
      let reqHtml = "";

      if (pendientes.length === 0) {
        reqHtml = `<span class="req-badge req-badge-ok">Completo</span>`;
      } else {
        reqHtml = pendientes
          .map((key) => {
            const label = LABELS[key] || key;
            return `<span class="req-badge req-badge-pend">${escapeHtml(label)}</span>`;
          })
          .join(" ");
      }

      const obsTexto = ((r.observaciones || "") + (alertaRemovido ? " " + alertaRemovido : "")).trim();
      const id = r._id || "";

      // Guardamos el texto para asignarlo luego como textarea.value
      obsById[id] = obsTexto;

      html += `
        <tr class="${claseFila}">
          <td>${escapeHtml(r.nombres || "")}</td>
          <td>${escapeHtml(r.apellidos || "")}</td>
          <td>${escapeHtml(r.numeroidentificacion || "")}</td>
          <td>${escapeHtml(r.nombrecarrera || "")}</td>
          <td>${reqHtml}</td>
          <td>
            <textarea class="obs-box" data-id="${escapeHtml(id)}"></textarea>
          </td>
          <td>
            <a href="#"
               class="tabla-btn-perfil"
               data-cedula="${escapeHtml(r.numeroidentificacion || "")}"
               data-periodo="${escapeHtml(periodoId || "")}"
               data-nombre="${escapeHtml(r.nombreCompletoOriginal || "")}"
               data-carrera="${escapeHtml(r.nombrecarrera || "")}">
               Ver
            </a>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Inyectar observaciones como value para que no rompan HTML
    const textareas = tbody.querySelectorAll(".obs-box[data-id]");
    textareas.forEach((ta) => {
      const id = ta.dataset.id || "";
      ta.value = obsById[id] || "";
    });
  }

  // ============================================================
  // Manejo de chips
  // ============================================================
  function onClickChip(ev) {
    const btn = ev.target.closest(".chip");
    if (!btn) return;

    const key = btn.dataset.req;
    if (!key) return;

    if (key === "Todos") {
      filtroEspecial = null;
      filtrosRequisitos = [];
      resetChipsUI(true);
      refrescarTabla();
      return;
    }

    if (key === "Completos" || key === "Egresados") {
      const yaActivo = btn.classList.contains("chip-active");

      resetChipsUI(false);

      if (!yaActivo) {
        btn.classList.add("chip-active");
        filtroEspecial = key;
        filtrosRequisitos = [];
      } else {
        filtroEspecial = null;
        const chipTodos = document.querySelector('.chip[data-req="Todos"]');
        if (chipTodos) chipTodos.classList.add("chip-active");
      }

      refrescarTabla();
      return;
    }

    filtroEspecial = null;

    ["Todos", "Completos", "Egresados"].forEach((k) => {
      const b = chipContainer.querySelector(`.chip[data-req="${k}"]`);
      if (b) b.classList.remove("chip-active");
    });

    btn.classList.toggle("chip-active");

    const activos = Array.from(chipContainer.querySelectorAll(".chip.chip-active"))
      .map((el) => el.dataset.req);

    filtrosRequisitos = activos
      .map((nombre) => REQ_KEY_MAP[nombre])
      .filter(Boolean);

    if (filtrosRequisitos.length === 0) {
      resetChipsUI(true);
    }

    refrescarTabla();
  }

  function resetChipsUI(activaTodos) {
    if (!chipContainer) return;
    const chips = chipContainer.querySelectorAll(".chip");
    chips.forEach((c) => c.classList.remove("chip-active"));

    if (activaTodos) {
      const chipTodos = chipContainer.querySelector('.chip[data-req="Todos"]');
      if (chipTodos) chipTodos.classList.add("chip-active");
    }
  }

  // ============================================================
  // Manejo de orden por cabeceras
  // ============================================================
  function onClickHeader(ev) {
    const th = ev.target.closest("[data-sort-field]");
    if (!th) return;

    const field = th.dataset.sortField;
    if (!field) return;

    if (currentSort.field === field) {
      currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
    } else {
      currentSort.field = field;
      currentSort.dir = "asc";
    }

    actualizarIndicadoresOrden();
    refrescarTabla();
  }

  function actualizarIndicadoresOrden() {
    if (!thead) return;
    const ths = thead.querySelectorAll("[data-sort-field]");
    ths.forEach((th) => {
      th.classList.remove("sortable-asc", "sortable-desc");
      const field = th.dataset.sortField;
      if (field === currentSort.field) {
        th.classList.add(currentSort.dir === "asc" ? "sortable-asc" : "sortable-desc");
      }
    });
  }

  // ============================================================
  // EXPORTAR
  // ============================================================
  window.TablaUI = { init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
