// excel-historial.repo.js
// Repo Firestore - Historial por período (versionado)

// Asegurar namespace
window.ExcelHistorialRepo = window.ExcelHistorialRepo || {};

(function (window) {
  "use strict";

  function ensureDb() {
    if (!window.db || typeof window.db.collection !== "function") {
      throw new Error("Firestore no inicializado (window.db). Revisa excel.html.");
    }
    return window.db;
  }

  function getHistCol() {
    // Preferir constantes si existen
    if (window.ExcelConstants && window.ExcelConstants.COL && window.ExcelConstants.COL.HISTORIAL) {
      return window.ExcelConstants.COL.HISTORIAL; // "historial_periodos"
    }
    // Fallback compatible
    return "historial_periodos";
  }

  function safeStringify(obj) {
    try { return JSON.stringify(obj ?? null); } catch { return ""; }
  }

  async function listar(periodoId) {
    const db = ensureDb();
    const col = getHistCol();

    const snap = await db.collection(col).where("periodoId", "==", periodoId).get();
    const arr = [];
    snap.forEach(doc => {
      const d = doc.data() || {};
      arr.push({
        _docId: doc.id,
        periodoId: d.periodoId,
        version: d.version || 0,
        totalEstudiantes: d.totalEstudiantes ?? d.total ?? 0,
        requisitos: d.requisitos || null,
        carreras: d.carreras || null,
        meta: d.meta || null,
        fechaIso: d.fechaIso || "",
        fechaTxt: d.fechaTxt || d.fecha || ""
      });
    });

    // Orden por versión (sin depender de orderBy/index)
    arr.sort((a, b) => (a.version || 0) - (b.version || 0));
    return arr;
  }

  async function obtenerUltimo(periodoId) {
    const list = await listar(periodoId);
    return list.length ? list[list.length - 1] : null;
  }

  // Guarda SOLO si cambió el consolidado (requisitos/carreras/total)
  async function guardarSiCambio(periodoId, consolidado, meta) {
    if (!periodoId) throw new Error("periodoId requerido.");
    if (!consolidado) return { guardado: false, motivo: "sin consolidado" };

    const db = ensureDb();
    const col = getHistCol();

    const ultimo = await obtenerUltimo(periodoId);

    const actualKey = safeStringify({
      totalEstudiantes: consolidado.totalEstudiantes ?? 0,
      requisitos: consolidado.requisitos || null,
      carreras: consolidado.carreras || null
    });

    const previoKey = ultimo
      ? safeStringify({
          totalEstudiantes: ultimo.totalEstudiantes ?? 0,
          requisitos: ultimo.requisitos || null,
          carreras: ultimo.carreras || null
        })
      : "";

    if (ultimo && actualKey === previoKey) {
      return { guardado: false, motivo: "sin cambios", version: ultimo.version || 0 };
    }

    const version = (ultimo ? (ultimo.version || 0) : 0) + 1;

    const payload = {
      periodoId,
      version,
      totalEstudiantes: consolidado.totalEstudiantes ?? 0,
      requisitos: consolidado.requisitos || null,
      carreras: consolidado.carreras || null,
      meta: meta || null,
      fechaIso: new Date().toISOString(),
      fechaTxt: new Date().toLocaleString()
    };

    await db.collection(col).add(payload);
    return { guardado: true, version };
  }

  async function borrarVersion(periodoId, index) {
    const db = ensureDb();
    const col = getHistCol();

    const hist = await listar(periodoId);
    if (!hist.length) return false;

    if (index < 0 || index >= hist.length) {
      throw new Error("Índice de historial inválido.");
    }

    const docId = hist[index]._docId;
    if (!docId) throw new Error("No se encontró _docId del historial.");
    await db.collection(col).doc(docId).delete();
    return true;
  }

  async function borrarPorPeriodo(periodoId) {
    const db = ensureDb();
    const col = getHistCol();

    const hist = await listar(periodoId);
    if (!hist.length) return { eliminados: 0 };

    const CHUNK = (window.ExcelConstants && window.ExcelConstants.BATCH_CHUNK) || 450;
    let eliminados = 0;

    for (let i = 0; i < hist.length; i += CHUNK) {
      const batch = db.batch();
      const chunk = hist.slice(i, i + CHUNK);
      chunk.forEach(h => {
        batch.delete(db.collection(col).doc(h._docId));
        eliminados++;
      });
      await batch.commit();
    }
    return { eliminados };
  }

  // Exponer API pública
  window.ExcelHistorialRepo.listar = listar;
  window.ExcelHistorialRepo.obtenerUltimo = obtenerUltimo;
  window.ExcelHistorialRepo.guardarSiCambio = guardarSiCambio;
  window.ExcelHistorialRepo.borrarVersion = borrarVersion;
  window.ExcelHistorialRepo.borrarPorPeriodo = borrarPorPeriodo;

})(window);
