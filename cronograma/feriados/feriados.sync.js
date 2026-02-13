/**
 * Archivo: feriados.sync.js
 * Función: Sincronización automática (auto-update con TTL) + import forzado
 */

import {
  dedupeByDate,
  mergeLocalAndRemote,
  fingerprintItems,
  defaultMeta
} from "./feriados.schema.js";

import { readYear, writeYear } from "./feriados.store.js";

// ✅ IMPORTANTE: tu archivo real es "feriados.sources.js" (con punto)
// y NO "feriados-sources.js" (con guion). Eso estaba causando el 404.
import { fetchHolidays } from "./feriados.sources.js";

import { emit, EVENTS } from "./feriados.bus.js";

const TTL_HOURS = 24;

function needsSync(meta) {
  if (!meta || !meta.lastSyncAt) return true;

  const diffHours = (Date.now() - meta.lastSyncAt) / (1000 * 60 * 60);
  return diffHours > TTL_HOURS;
}

export async function ensureYearFresh(year) {
  const y = Number(year);
  emit(EVENTS.SYNC_STARTED, { year: y });

  let local = await readYear(y);

  if (!local) {
    local = {
      items: [],
      meta: defaultMeta(y),
      updatedAt: Date.now()
    };
  }

  if (!needsSync(local.meta)) {
    return local;
  }

  try {
    const remoteItems = await fetchHolidays(y);

    const merged = mergeLocalAndRemote(
      Array.isArray(local.items) ? local.items : [],
      dedupeByDate(remoteItems)
    );

    const hash = fingerprintItems(merged);

    const payload = {
      items: merged,
      meta: {
        ...(local.meta || defaultMeta(y)),
        year: y,
        lastSyncAt: Date.now(),
        lastSyncSource: "nager",
        lastSyncStatus: "ok",
        itemsHash: hash
      },
      updatedAt: Date.now()
    };

    await writeYear(y, payload, true);

    emit(EVENTS.SYNC_DONE, { year: y, count: merged.length });
    return payload;
  } catch (e) {
    emit(EVENTS.SYNC_ERROR, { year: y, error: String(e?.message || e) });
    throw e;
  }
}

export async function forceImportYear(year) {
  const y = Number(year);
  emit(EVENTS.SYNC_STARTED, { year: y });

  const remoteItems = await fetchHolidays(y);

  const payload = {
    items: dedupeByDate(remoteItems),
    meta: {
      ...defaultMeta(y),
      year: y,
      lastSyncAt: Date.now(),
      lastSyncSource: "nager",
      lastSyncStatus: "forced",
      itemsHash: fingerprintItems(dedupeByDate(remoteItems))
    },
    updatedAt: Date.now()
  };

  await writeYear(y, payload, true);

  emit(EVENTS.SYNC_DONE, { year: y, count: payload.items.length });
  return payload;
}
