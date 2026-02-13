/**
 * Archivo: feriados-sources.js
 * Función: Obtención de feriados desde internet (fuente principal)
 */

import { normalizeFeriado } from "./feriados.schema.js";

const COUNTRY_CODE = "EC";
const BASE_URL = "https://date.nager.at/api/v3/PublicHolidays";

// timeout para evitar “se queda pegado”
const FETCH_TIMEOUT_MS = 15000;

async function fetchFromNager(year) {
  const url = `${BASE_URL}/${year}/${COUNTRY_CODE}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      throw new Error(`No se pudo obtener feriados desde Nager.Date (HTTP ${res.status})`);
    }

    const data = await res.json();

    return data.map((item) =>
      normalizeFeriado({
        dateISO: item.date,
        nombre: item.localName || item.name,
        tipo: item.type || "oficial",
        source: "nager"
      })
    );
  } catch (e) {
    if (String(e?.name) === "AbortError") {
      throw new Error("Tiempo de espera agotado consultando feriados (timeout).");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchHolidays(year) {
  return await fetchFromNager(year);
}
