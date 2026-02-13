/*  Archivo: config.db.js
    Ubicación: raíz del módulo
    Función: Firestore (plantillas + versiones) SIN requerir índice compuesto.
    Cambio clave: listByTipo() ya NO usa orderBy(meta.createdAt), por lo que no exige índice.
    Orden: se ordena en cliente por sufijo numérico del ID (articulo1, articulo2, ...).
*/

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { db } from "./config.fb.js";

const COL = "plantillasCronograma";
const SUB = "versiones";

/* Helpers */
function toStr(v){ return String(v ?? ""); }

function parseN(tipo, id){
  // articulo12 -> 12, complexivo3 -> 3, trabajo1 -> 1
  const re = new RegExp(`^${tipo}(\\d+)$`, "i");
  const m = toStr(id).match(re);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

export function buildId(tipo, n){
  const nn = Number(n);
  if (!Number.isFinite(nn) || nn < 1) throw new Error("Número inválido");
  return `${tipo}${nn}`;
}

/* LISTA por tipo SIN orderBy -> NO requiere índice compuesto */
export async function listByTipo(tipo){
  const colRef = collection(db, COL);

  // Solo filtro por tipo: no requiere índice compuesto
  const qy = query(colRef, where("meta.tipo", "==", tipo));
  const snap = await getDocs(qy);

  const out = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    out.push({ id: d.id, meta: data.meta || {} });
  });

  // Orden estable: por sufijo numérico del ID (articulo1, articulo2...)
  out.sort((a, b) => {
    const na = parseN(tipo, a.id);
    const nb = parseN(tipo, b.id);

    // Si ambos tienen número, orden numérico asc
    if (na != null && nb != null) return na - nb;

    // Si uno tiene número y el otro no, el numerado primero
    if (na != null && nb == null) return -1;
    if (na == null && nb != null) return 1;

    // Fallback: orden alfabético
    return toStr(a.id).localeCompare(toStr(b.id));
  });

  return out;
}

export async function nextNumber(tipo){
  const list = await listByTipo(tipo);
  let max = 0;
  for (const it of list){
    const n = parseN(tipo, it.id);
    if (n != null && n > max) max = n;
  }
  return max + 1;
}

export async function getTpl(id){
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createTpl(tipo, plantilla, meta = {}){
  const n = await nextNumber(tipo);
  const id = buildId(tipo, n);

  const ref = doc(db, COL, id);
  const nombre = toStr(meta.nombre).trim() || id;

  const payload = {
    meta: {
      tipo,
      nombre,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    plantilla: JSON.parse(JSON.stringify(plantilla || {}))
  };

  await setDoc(ref, payload, { merge: false });
  return { ok: true, id };
}

export async function updateTpl(id, plantilla, meta = {}){
  const ref = doc(db, COL, id);
  const nombre = toStr(meta.nombre).trim();

  const payload = {
    "meta.updatedAt": serverTimestamp(),
    plantilla: JSON.parse(JSON.stringify(plantilla || {}))
  };

  if (nombre) payload["meta.nombre"] = nombre;

  await setDoc(ref, payload, { merge: true });
  return { ok: true, id };
}

export async function delTpl(id){
  await deleteDoc(doc(db, COL, id));
  return true;
}

/* Versiones */
export async function saveVer(tplId, plantilla, meta = {}){
  const colRef = collection(db, COL, tplId, SUB);
  const nombre = toStr(meta.nombre).trim() || "Versión";
  const nota = toStr(meta.nota).trim() || "";

  const payload = {
    plantillaId: tplId,
    nombre,
    nota,
    createdAt: serverTimestamp(),
    plantilla: JSON.parse(JSON.stringify(plantilla || {}))
  };

  const res = await addDoc(colRef, payload);
  return { ok: true, id: res.id };
}

export async function listVer(tplId){
  // Mantengo simple: sin orderBy para evitar índices.
  // Orden en cliente por createdAt si existe.
  const colRef = collection(db, COL, tplId, SUB);
  const snap = await getDocs(colRef);

  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));

  out.sort((a, b) => {
    const ta = a?.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b?.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    // Desc (más reciente primero). Si no hay ts, quedan al final.
    return tb - ta;
  });

  return out;
}

export async function getVer(tplId, verId){
  const ref = doc(db, COL, tplId, SUB, verId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function delVer(tplId, verId){
  await deleteDoc(doc(db, COL, tplId, SUB, verId));
  return true;
}
