/**
 * Archivo: feriados-init.js
 * Función: Inicializa la pantalla Feriados (DOM + eventos + render)
 */

import {
  getYears,
  subscribeToYear,
  ensureFresh,
  importYearFromInternet,
  clearYear,
  addOrUpdateFeriado,
  deleteFeriado,
  saveYearSnapshot
} from "./feriados-api.js";

import { isValidISODate } from "./feriados.schema.js";

let currentYear = null;
let unsubscribe = null;

// snapshot local (lo último que vimos del realtime)
let currentSnapshot = { items: [], meta: null, updatedAt: null };

const $ = (id) => document.getElementById(id);

function setStatus(text, kind = "idle") {
  const el = $("feriados-status");
  if (!el) return;
  el.textContent = text;

  el.classList.remove("status--ok", "status--warn", "status--bad");
  if (kind === "ok") el.classList.add("status--ok");
  if (kind === "warn") el.classList.add("status--warn");
  if (kind === "bad") el.classList.add("status--bad");
}

function setYearLabel(year) {
  const el = $("feriados-anio-label");
  if (el) el.textContent = String(year);
}

function setBusy(isBusy) {
  const ids = ["feriados-importar", "feriados-guardar", "feriados-eliminar-anio", "feriados-agregar", "feriados-anio-prev", "feriados-anio-next"];
  ids.forEach((id) => {
    const el = $(id);
    if (el) el.disabled = !!isBusy;
  });
}

function trashSvg() {
  // simple, limpio, y consistente en todos los browsers
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v10h-2V9Zm4 0h2v10h-2V9ZM6 7h12l-1 14H7L6 7Z"></path>
    </svg>
  `;
}

function renderTable(items = []) {
  const tbody = $("feriados-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="muted">No hay feriados registrados en este año.</td></tr>`;
    return;
  }

  items.forEach((f) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.dateISO || ""}</td>
      <td>${f.nombre || ""}</td>
      <td>
        <button class="icon-btn feriado-del" data-id="${f.id}" title="Eliminar" aria-label="Eliminar">
          ${trashSvg()}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function setYear(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return;

  currentYear = y;
  setYearLabel(y);
  setStatus("Cargando…");

  if (typeof unsubscribe === "function") {
    try { unsubscribe(); } catch {}
    unsubscribe = null;
  }

  // Auto-sync si está viejo o no existe (no bloquea si falla)
  try {
    await ensureFresh(y);
  } catch (e) {
    console.warn("ensureFresh falló", e);
    setStatus("No se pudo sincronizar automáticamente. Puedes trabajar manual.", "warn");
  }

  // Realtime
  unsubscribe = subscribeToYear(y, (data) => {
    currentSnapshot = {
      items: Array.isArray(data?.items) ? data.items : [],
      meta: data?.meta || null,
      updatedAt: data?.updatedAt || null
    };

    renderTable(currentSnapshot.items);
    setStatus("Listo. Cambios se guardan al ejecutar acciones (o con Guardar).", "ok");
  });
}

function bindEvents() {
  const btnPrev = $("feriados-anio-prev");
  const btnNext = $("feriados-anio-next");
  const btnImport = $("feriados-importar");
  const btnSave = $("feriados-guardar");
  const btnClear = $("feriados-eliminar-anio");
  const btnAdd = $("feriados-agregar");

  btnPrev?.addEventListener("click", async () => {
    await setYear((currentYear ?? new Date().getFullYear()) - 1);
  });

  btnNext?.addEventListener("click", async () => {
    await setYear((currentYear ?? new Date().getFullYear()) + 1);
  });

  btnImport?.addEventListener("click", async () => {
    if (!currentYear) return;

    setBusy(true);
    setStatus("Importando desde Internet…", "warn");

    try {
      await importYearFromInternet(currentYear);
      setStatus("Importación completada.", "ok");
    } catch (e) {
      console.error(e);
      setStatus("No se pudo importar desde Internet (revisa conexión o fuente).", "bad");
      alert("No se pudo importar desde Internet.");
    } finally {
      setBusy(false);
    }
  });

  btnSave?.addEventListener("click", async () => {
    if (!currentYear) return;

    setBusy(true);
    setStatus("Guardando en Firestore…", "warn");

    try {
      await saveYearSnapshot(currentYear, currentSnapshot);
      setStatus("Guardado correcto.", "ok");
    } catch (e) {
      console.error(e);
      setStatus("No se pudo guardar (permisos o conexión).", "bad");
      alert("No se pudo guardar en la base de datos.");
    } finally {
      setBusy(false);
    }
  });

  btnClear?.addEventListener("click", async () => {
    if (!currentYear) return;
    if (!confirm("¿Seguro que deseas vaciar este año (eliminar todos los feriados guardados)?")) return;

    setBusy(true);
    setStatus("Vaciando año…", "warn");

    try {
      await clearYear(currentYear);
      setStatus("Año vaciado.", "ok");
    } catch (e) {
      console.error(e);
      setStatus("No se pudo vaciar el año.", "bad");
      alert("No se pudo vaciar el año.");
    } finally {
      setBusy(false);
    }
  });

  btnAdd?.addEventListener("click", async () => {
    if (!currentYear) return;

    const dateISO = String($("feriados-fecha-nueva")?.value || "").trim();
    const nombre = String($("feriados-nombre-nuevo")?.value || "").trim();

    if (!isValidISODate(dateISO)) {
      alert("Fecha inválida. Usa formato YYYY-MM-DD.");
      return;
    }
    if (!nombre) {
      alert("Nombre es requerido.");
      return;
    }

    setBusy(true);
    setStatus("Guardando feriado…", "warn");

    try {
      await addOrUpdateFeriado(currentYear, { dateISO, nombre, source: "manual" });
      $("feriados-fecha-nueva").value = "";
      $("feriados-nombre-nuevo").value = "";
      setStatus("Feriado guardado.", "ok");
    } catch (e) {
      console.error(e);
      setStatus("No se pudo agregar/actualizar el feriado.", "bad");
      alert("No se pudo agregar/actualizar el feriado.");
    } finally {
      setBusy(false);
    }
  });

  $("feriados-tbody")?.addEventListener("click", async (e) => {
    const btn = e.target?.closest?.(".feriado-del");
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    if (!confirm("¿Eliminar este feriado?")) return;

    setBusy(true);
    setStatus("Eliminando…", "warn");

    try {
      await deleteFeriado(currentYear, id);
      setStatus("Eliminado.", "ok");
    } catch (err) {
      console.error(err);
      setStatus("No se pudo eliminar.", "bad");
      alert("No se pudo eliminar.");
    } finally {
      setBusy(false);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    let years = await getYears();

    const nowYear = new Date().getFullYear();
    const initialYear = years.length ? years[0] : nowYear;

    bindEvents();
    await setYear(initialYear);
  } catch (e) {
    console.error("Error iniciando feriados", e);
    setStatus("No se pudo iniciar el módulo de feriados.", "bad");
    alert("No se pudo iniciar el módulo de feriados.");
  }
});
