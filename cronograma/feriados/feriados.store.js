/**
 * Archivo: feriados.store.js
 * Función: Persistencia Firestore + cache + realtime
 * Módulo: Feriados
 */

import {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  feriadosCollectionRef,
  feriadosYearDocRef
} from "./feriados.firebase.js";

import { emit, EVENTS } from "./feriados.bus.js";

/* ======================
   Cache en memoria
====================== */

const cache = new Map();

/* ======================
   Lecturas
====================== */

export async function listYears() {
  const snap = await getDocs(feriadosCollectionRef());
  return snap.docs.map(d => Number(d.id)).sort((a, b) => b - a);
}

export async function readYear(year) {
  if (cache.has(year)) return cache.get(year);

  const ref = feriadosYearDocRef(year);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data();
  cache.set(year, data);
  return data;
}

/* ======================
   Escrituras
====================== */

export async function writeYear(year, payload, merge = true) {
  const ref = feriadosYearDocRef(year);
  await setDoc(ref, payload, { merge });
  cache.set(year, payload);
}

export async function patchYear(year, partial) {
  const ref = feriadosYearDocRef(year);
  await updateDoc(ref, partial);

  const prev = cache.get(year) || {};
  cache.set(year, { ...prev, ...partial });
}

/* ======================
   Borrado
====================== */

export async function deleteYear(year) {
  const ref = feriadosYearDocRef(year);
  await deleteDoc(ref);
  cache.delete(year);
}

/* ======================
   Realtime
====================== */

export function subscribeYear(year, callback) {
  const ref = feriadosYearDocRef(year);

  return onSnapshot(ref, snap => {
    if (!snap.exists()) return;

    const data = snap.data();
    cache.set(year, data);

    emit(EVENTS.UPDATED, { year, data });

    if (typeof callback === "function") {
      callback(data);
    }
  });
}
