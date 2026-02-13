/**
 * Archivo: feriados.schema.js
 * Función: Validación, normalización y merge de feriados
 * Módulo: Feriados
 */

export const SCHEMA_VERSION = 1;
export const DEFAULT_COUNTRY = "EC";

/* ======================
   Validaciones básicas
====================== */

export function isValidISODate(dateISO) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateISO);
}

export function validateFeriado(f) {
  if (!f) return false;
  if (!isValidISODate(f.dateISO)) return false;
  if (!f.nombre || !String(f.nombre).trim()) return false;
  return true;
}

/* ======================
   Normalización
====================== */

export function normalizeFeriado(raw) {
  return {
    id: raw.id || crypto.randomUUID(),
    dateISO: raw.dateISO,
    nombre: String(raw.nombre).trim(),
    tipo: raw.tipo || "oficial",
    source: raw.source || "manual",
    createdAt: raw.createdAt || Date.now()
  };
}

/* ======================
   Orden y deduplicación
====================== */

export function sortByDate(items = []) {
  return [...items].sort((a, b) =>
    a.dateISO.localeCompare(b.dateISO)
  );
}

export function dedupeByDate(items = []) {
  const map = new Map();
  items.forEach(i => {
    map.set(i.dateISO, i);
  });
  return Array.from(map.values());
}

/* ======================
   Merge local vs remoto
====================== */

export function mergeLocalAndRemote(local = [], remote = []) {
  const map = new Map();

  local.forEach(f => map.set(f.dateISO, f));
  remote.forEach(f => map.set(f.dateISO, f));

  return sortByDate(Array.from(map.values()));
}

/* ======================
   Fingerprint / Hash
====================== */

export function fingerprintItems(items = []) {
  return JSON.stringify(
    items.map(i => `${i.dateISO}|${i.nombre}`).sort()
  );
}

/* ======================
   Meta por defecto
====================== */

export function defaultMeta(year) {
  return {
    schemaVersion: SCHEMA_VERSION,
    country: DEFAULT_COUNTRY,
    year,
    lastSyncAt: null,
    lastSyncSource: null,
    lastSyncStatus: "never",
    itemsHash: null
  };
}
