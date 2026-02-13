/**
 * Archivo: feriados-api.js
 * Función: Fachada pública del módulo Feriados (UI solo usa esta API)
 */

import { listYears, readYear, subscribeYear, writeYear, patchYear } from "./feriados.store.js";
import { ensureYearFresh, forceImportYear } from "./feriados.sync.js";
import { normalizeFeriado, dedupeByDate, sortByDate, defaultMeta } from "./feriados.schema.js";

/* ======================
   Lecturas
====================== */
export async function getYears() {
  return await listYears();
}

export async function getYearData(year) {
  return await readYear(Number(year));
}

export function subscribeToYear(year, callback) {
  return subscribeYear(Number(year), callback);
}

/* ======================
   Sync
====================== */
export async function ensureFresh(year) {
  return await ensureYearFresh(Number(year));
}

export async function importYearFromInternet(year) {
  return await forceImportYear(Number(year));
}

/* ======================
   Guardado explícito (botón Guardar)
====================== */
export async function saveYearSnapshot(year, snapshot) {
  const y = Number(year);

  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const meta = snapshot?.meta || defaultMeta(y);

  const payload = {
    items,
    meta: { ...meta, year: y },
    updatedAt: Date.now()
  };

  await writeYear(y, payload, true);
  return payload;
}

/* ======================
   CRUD manual
====================== */
export async function addOrUpdateFeriado(year, feriadoRaw) {
  const y = Number(year);
  let data = await readYear(y);

  // si no existe el doc del año, lo creamos base
  if (!data) {
    data = {
      items: [],
      meta: defaultMeta(y),
      updatedAt: Date.now()
    };
    await writeYear(y, data, true);
  }

  const nuevo = normalizeFeriado(feriadoRaw);
  const items = sortByDate(dedupeByDate([...(data.items || []), nuevo]));

  await patchYear(y, { items, updatedAt: Date.now() });
}

export async function deleteFeriado(year, id) {
  const y = Number(year);
  const data = await readYear(y);
  if (!data) return;

  const items = (data.items || []).filter((f) => f.id !== id);
  await patchYear(y, { items, updatedAt: Date.now() });
}

export async function clearYear(year) {
  const y = Number(year);

  const payload = {
    items: [],
    meta: {
      ...defaultMeta(y),
      lastSyncStatus: "cleared"
    },
    updatedAt: Date.now()
  };

  await writeYear(y, payload, true);
}
