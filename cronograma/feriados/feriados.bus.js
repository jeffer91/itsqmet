/**
 * Archivo: feriados.bus.js
 * Función: Bus de eventos interno (pub/sub)
 * Módulo: Feriados
 */

const listeners = new Map();

/* ======================
   API del Bus
====================== */

export function on(event, handler) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(handler);
}

export function off(event, handler) {
  if (!listeners.has(event)) return;
  listeners.get(event).delete(handler);
}

export function emit(event, payload) {
  if (!listeners.has(event)) return;
  listeners.get(event).forEach(fn => {
    try {
      fn(payload);
    } catch (e) {
      console.error("Error en bus handler", event, e);
    }
  });
}

/* ======================
   Eventos estándar
====================== */

export const EVENTS = {
  UPDATED: "FERIADOS_UPDATED",
  SYNC_STARTED: "FERIADOS_SYNC_STARTED",
  SYNC_DONE: "FERIADOS_SYNC_DONE",
  SYNC_ERROR: "FERIADOS_SYNC_ERROR"
};
