// =========================================================
// Archivo: excel-firebase-save.js
// Ruta: /Gestion/Excel/excel-firebase-save.js
// Función:
// - Asegura window.db (Firestore) ya inicializado desde excel.html
// - API de historial: obtener/guardar/borrar
// - UPSERT de Estudiantes por numeroIdentificacion (docId)
// - Borrado de estudiantes por período
// =========================================================

(function (window) {
  "use strict";

  window.FirebaseSave = window.FirebaseSave || {};

  function ensureDb() {
    if (!window.db) {
      throw new Error("Firestore no inicializado (window.db). Revisa FIREBASE_CONFIG en excel.html.");
    }
    return window.db;
  }

  // -------------------------
  // HISTORIAL
  // -------------------------
  async function obtenerHistorial(periodoId) {
    const db = ensureDb();
    const snap = await db.collection("historial").where("periodoId", "==", periodoId).get();

    const arr = [];
    snap.forEach(doc => {
      const d = doc.data() || {};
      arr.push({
        _docId: doc.id,
        periodoId: d.periodoId,
        version: d.version || 0,
        totalEstudiantes: d.totalEstudiantes,
        requisitos: d.requisitos || null,
        carreras: d.carreras || null,
        fecha: d.fecha || ""
      });
    });

    arr.sort((a, b) => (a.version || 0) - (b.version || 0));
    return arr;
  }

  async function guardarHistorial(periodoId, payload) {
    const db = ensureDb();
    if (!payload || !payload.data) return false;

    const hist = await obtenerHistorial(periodoId);
    const version = (hist.length ? (hist[hist.length - 1].version || hist.length) : 0) + 1;

    await db.collection("historial").add({
      periodoId,
      version,
      fileName: payload.fileName || null,
      totalEstudiantes: payload.data.totalEstudiantes,
      requisitos: payload.data.requisitos || null,
      carreras: payload.data.carreras || null,
      fecha: new Date().toLocaleString()
    });

    return true;
  }

  async function borrarHistorial(periodoId, index) {
    const db = ensureDb();
    const hist = await obtenerHistorial(periodoId);

    if (!hist.length) return false;
    if (index < 0 || index >= hist.length) throw new Error("Índice de historial inválido.");

    const docId = hist[index]._docId;
    if (!docId) throw new Error("No se encontró docId del historial.");

    await db.collection("historial").doc(docId).delete();
    return true;
  }

  async function borrarHistorialPorPeriodo(periodoId) {
    const db = ensureDb();
    const hist = await obtenerHistorial(periodoId);
    if (!hist.length) return { eliminados: 0 };

    let eliminados = 0;
    const CHUNK = 450;

    for (let i = 0; i < hist.length; i += CHUNK) {
      const batch = db.batch();
      const chunk = hist.slice(i, i + CHUNK);
      chunk.forEach(h => {
        batch.delete(db.collection("historial").doc(h._docId));
        eliminados++;
      });
      await batch.commit();
    }

    return { eliminados };
  }

  // -------------------------
  // ESTUDIANTES (UPSERT)
  // -------------------------

  // Headers esperados tal como vienen en el Excel (normalizados por excel-reader.js)
  const EXPECTED_HEADERS = [
    "numeroidentificacion",
    "nombres",
    "codigocarrera",
    "nombrecarrera",
    "horariocomplexivo",
    "academico",
    "documentacion",
    "financiero",
    "titulacion",
    "prácticasvinculacion",
    "vinculacion",
    "seguimientograduados",
    "ingles",
    "actualizacióndatos",
    "correopersonal",
    "correoinstitucional",
    "celular"
  ];

  function getRowId(r) {
    const v =
      r.numeroidentificacion ||
      r.NumeroIdentificacion ||
      r.numeroIdentificacion ||
      r.cedula ||
      r.Cedula;
    return v ? String(v).trim() : "";
  }

  // Mapea del objeto normalizado (keys lower) a los nombres exactos en tu BD
  function mapRowToFirestore(r, periodoId, ahoraIso) {
    return {
      // Identidad
      numeroIdentificacion: getRowId(r),
      Nombres: (r.nombres || "").trim(),

      // Carrera
      CodigoCarrera: (r.codigocarrera || "").trim(),
      NombreCarrera: (r.nombrecarrera || "").trim(),
      HorarioComplexivo: (r.horariocomplexivo || "").trim(),

      // Requisitos (mantener exactamente los nombres)
      Academico: (r.academico || "").trim(),
      Documentacion: (r.documentacion || "").trim(),
      Financiero: (r.financiero || "").trim(),
      Titulacion: (r.titulacion || "").trim(),
      "PrácticasVinculacion": (r["prácticasvinculacion"] || "").trim(),
      Vinculacion: (r.vinculacion || "").trim(),
      SeguimientoGraduados: (r.seguimientograduados || "").trim(),
      Ingles: (r.ingles || "").trim(),
      "ActualizaciónDatos": (r["actualizacióndatos"] || "").trim(),

      // Contacto
      CorreoPersonal: (r.correopersonal || "").trim(),
      CorreoInstitucional: (r.correoinstitucional || "").trim(),
      Celular: (r.celular || "").trim(),

      // Metadatos operativos
      estadoMatricula: "ACTIVO",
      ultimoPeriodoId: periodoId,
      periodoId: periodoId,
      ultimaSincronizacion: ahoraIso
    };
  }

  function validateHeaders(foundHeaders) {
    const found = new Set((foundHeaders || []).map(h => String(h || "").trim()));
    const missing = EXPECTED_HEADERS.filter(h => !found.has(h));
    const extra = (foundHeaders || []).filter(h => !EXPECTED_HEADERS.includes(h));
    return { ok: missing.length === 0, missing, extra, expected: EXPECTED_HEADERS.slice() };
  }

  async function upsertEstudiantes(periodoId, rows, headers) {
    const db = ensureDb();
    const ahoraIso = new Date().toISOString();

    const schema = validateHeaders(headers || []);
    if (!schema.ok) {
      // No abortamos completamente: reportamos, pero si hay ID podemos guardar igual.
      // El BUS/ UI mostrará missing claramente.
    }

    // Deduplicación por docId
    const seen = new Set();
    const clean = [];
    let duplicados = 0;
    let sinId = 0;

    (rows || []).forEach(r => {
      const id = getRowId(r);
      if (!id) { sinId++; return; }
      if (seen.has(id)) { duplicados++; return; }
      seen.add(id);
      clean.push(r);
    });

    const CHUNK = 450;
    let escritos = 0;

    for (let i = 0; i < clean.length; i += CHUNK) {
      const batch = db.batch();
      const chunk = clean.slice(i, i + CHUNK);

      chunk.forEach(r => {
        const id = getRowId(r);
        const ref = db.collection("Estudiantes").doc(id);
        const payload = mapRowToFirestore(r, periodoId, ahoraIso);
        batch.set(ref, payload, { merge: true });
        escritos++;
      });

      await batch.commit();
    }

    return {
      escritos,
      totalFilas: (rows || []).length,
      validas: clean.length,
      duplicados,
      sinId,
      schema
    };
  }

  async function borrarEstudiantesPorPeriodo(periodoId) {
    const db = ensureDb();

    // 1) docs donde ultimoPeriodoId == periodoId
    const s1 = await db.collection("Estudiantes").where("ultimoPeriodoId", "==", periodoId).get();
    // 2) docs donde periodoId == periodoId (por compat con datos antiguos)
    const s2 = await db.collection("Estudiantes").where("periodoId", "==", periodoId).get();

    const ids = new Set();
    s1.forEach(d => ids.add(d.id));
    s2.forEach(d => ids.add(d.id));

    const all = Array.from(ids);
    if (!all.length) return { eliminados: 0 };

    const CHUNK = 450;
    let eliminados = 0;

    for (let i = 0; i < all.length; i += CHUNK) {
      const batch = db.batch();
      const chunk = all.slice(i, i + CHUNK);
      chunk.forEach(id => {
        batch.delete(db.collection("Estudiantes").doc(id));
        eliminados++;
      });
      await batch.commit();
    }

    return { eliminados };
  }

  // Exponer API
  window.FirebaseSave.obtenerHistorial = obtenerHistorial;
  window.FirebaseSave.guardarHistorial = guardarHistorial;
  window.FirebaseSave.borrarHistorial = borrarHistorial;
  window.FirebaseSave.borrarHistorialPorPeriodo = borrarHistorialPorPeriodo;

  window.FirebaseSave.upsertEstudiantes = upsertEstudiantes;
  window.FirebaseSave.borrarEstudiantesPorPeriodo = borrarEstudiantesPorPeriodo;
  window.FirebaseSave.validateHeaders = validateHeaders;

})(window);
