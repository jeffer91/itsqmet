// tabla-selector.js
// Llena el select de períodos usando Firebase y los muestra bonito.
// Si el período ya trae "label" desde Firestore, se usa directamente.
// Si no tiene label, se calcula a partir del id "YYYY-MM_YYYY-MM".

(function (window, document) {
  'use strict';

  const SELECT_ID = "tabla-period-select";

  // Convierte "2025-01_2025-09" → "Enero 2025 a Septiembre 2025"
  function beautifyPeriodo(idPeriodo) {
    if (!idPeriodo || typeof idPeriodo !== "string" || !idPeriodo.includes("_")) {
      return idPeriodo || "(sin nombre)";
    }

    const [ini, fin] = idPeriodo.split("_");
    const [y1, m1] = ini.split("-");
    const [y2, m2] = fin.split("-");

    const meses = [
      "Enero","Febrero","Marzo","Abril","Mayo","Junio",
      "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];

    const mesIni = meses[(Number(m1) - 1)] || m1;
    const mesFin = meses[(Number(m2) - 1)] || m2;

    return `${mesIni} ${y1} a ${mesFin} ${y2}`;
  }

  const TablaSelector = {

    // periodos puede venir como:
    //  - ["2025-01_2025-09", ...]
    //  - [{ id, label, creadoEn }, ...]
    loadPeriodos(periodos) {
      const select = document.getElementById(SELECT_ID);
      if (!select) return;

      select.innerHTML = "";

      // Opción por defecto
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "Selecciona un período";
      select.appendChild(opt0);

      if (!Array.isArray(periodos) || periodos.length === 0) {
        select.disabled = true;
        return;
      }

      // Normalizar a objetos { id, label, creadoEn }
      const normalizados = periodos.map(p => {
        if (typeof p === "string") {
          return {
            id: p,
            label: beautifyPeriodo(p),
            creadoEn: ""
          };
        }

        const id = p.id || p.periodoId || "";
        let label = p.label || p.periodLabel || "";
        if (!label && id) {
          label = beautifyPeriodo(id);
        }

        return {
          id,
          label,
          creadoEn: p.creadoEn || p.fecha || ""
        };
      }).filter(p => p.id);

      // Ordenar por creadoEn (más reciente primero si tiene fecha)
      normalizados.sort((a, b) => {
        if (!a.creadoEn && !b.creadoEn) return 0;
        if (!a.creadoEn) return 1;
        if (!b.creadoEn) return -1;
        return a.creadoEn < b.creadoEn ? 1 : -1;
      });

      // Cargar en el select
      normalizados.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;          // para consultas de estudiantes
        opt.textContent = p.label; // texto legible
        select.appendChild(opt);
      });

      select.disabled = false;
    },

    init() {
      // El listener de cambio está en tabla-ui.js
    }
  };

  // Auto inicialización al cargar el documento
  async function autoInit() {
    try {
      const periodos = await window.TablaBus.getPeriodos();
      TablaSelector.loadPeriodos(periodos);
      TablaSelector.init();
    } catch (e) {
      console.error("[TablaSelector] Error cargando períodos:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  window.TablaSelector = TablaSelector;

})(window, document);
