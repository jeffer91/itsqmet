// =========================================================
// Archivo: excel-estudiantes.repo.js
// Ruta: /Gestion/Excel/excel-estudiantes.repo.js
// Función: Repo Firestore - Estudiantes (upsert/borrado/validación)
// =========================================================
(function (window) {
  "use strict";

  function ensureDb() {
    if (!window.db) throw new Error("Firestore no inicializado (window.db). Revisa excel.html.");
    return window.db;
  }

  function C() {
    if (!window.ExcelConstants) throw new Error("ExcelConstants no disponible (excel-constants.js).");
    return window.ExcelConstants;
  }

  function normalize(v) {
    return String(v ?? "").trim();
  }

  function getRowId(r) {
    const v =
      r.numeroidentificacion ||
      r.NumeroIdentificacion ||
      r.numeroIdentificacion ||
      r.numeroIdentificacion ||
      r.cedula ||
      r.Cedula;
    return v ? normalize(v) : "";
  }

  function validateHeaders(foundHeaders) {
    const consts = C();
    const found = new Set((foundHeaders || []).map(h => normalize(h)));
    const missing = consts.EXPECTED_HEADERS.filter(h => !found.has(h));
    const extra = (foundHeaders || []).filter(h => !consts.EXPECTED_HEADERS.includes(h));
    const criticalMissing = consts.CRITICAL_HEADERS.filter(h => !found.has(h));
    return {
      ok: missing.length === 0,
      missing,
      extra,
      expected: consts.EXPECTED_HEADERS.slice(),
      criticalMissing
    };
  }

function mapRowToFirestore(r, periodoId, ahoraIso) {
  const consts = C();

  const payload = {
    // Identidad
    numeroIdentificacion: getRowId(r),
    Nombres: normalize(r.nombres),

    // Carrera
    CodigoCarrera: normalize(r.codigocarrera),
    NombreCarrera: normalize(r.nombrecarrera),
    HorarioComplexivo: normalize(r.horariocomplexivo),

    // Requisitos (mismos nombres finales en Firestore)
    Academico: normalize(r.academico),
    Documentacion: normalize(r.documentacion),
    Financiero: normalize(r.financiero),
    Titulacion: normalize(r.titulacion),
    "PrácticasVinculacion": normalize(r["prácticasvinculacion"]),
    Vinculacion: normalize(r.vinculacion),
    SeguimientoGraduados: normalize(r.seguimientograduados),
    Ingles: normalize(r.ingles),
    "ActualizaciónDatos": normalize(r["actualizacióndatos"]),

    // Contacto
    CorreoPersonal: normalize(r.correopersonal),
    CorreoInstitucional: normalize(r.correoinstitucional),
    Celular: normalize(r.celular),

    // Operativo
    estadoMatricula: consts.ESTADO.ACTIVO,
    ultimoPeriodoId: periodoId,
    periodoId: periodoId,
    ultimaSincronizacion: ahoraIso
  };

  // -----------------------------
  // Campos extra (opcionales)
  // Nota: excel-reader normaliza headers a lower+sin espacios.
  // -----------------------------
  const nFloat = (v) => {
    const s = String(v ?? "").trim().replace(",", ".");
    const x = parseFloat(s);
    return Number.isFinite(x) ? x : undefined;
  };
  const nInt = (v) => {
    const s = String(v ?? "").trim();
    const x = parseInt(s, 10);
    return Number.isFinite(x) ? x : undefined;
  };
  const setIf = (key, val) => {
    if (val === undefined || val === null) return;
    const s = String(val).trim();
    if (!s) return;
    payload[key] = val;
  };

  // AntiPlagio*
  const apAI = nInt(r.antiplagioai);
  if (apAI !== undefined) payload.AntiPlagioAI = apAI;

  const apCitas = nInt(r.antiplagiocitas);
  if (apCitas !== undefined) payload.AntiPlagioCitas = apCitas;

  const apOrig = nFloat(r.antiplagiooriginalidad);
  if (apOrig !== undefined) payload.AntiPlagioOriginalidad = apOrig;

  const apPlagio = nFloat(r.antiplagioplagio);
  if (apPlagio !== undefined) payload.AntiPlagioPlagio = apPlagio;

  setIf("AntiPlagioVersion", normalize(r.antiplagioversion));
  setIf("AntiPlagioFechaISO", normalize(r.antiplagiofechaiso));
  setIf("AntiPlagioFechaTexto", normalize(r.antiplagiofechatexto));

  // AntiPlagioUpdatedAt: si viene como texto, lo guardamos como string para no romper
  // (si luego quieres Timestamp real, lo tratamos como error aparte)
  setIf("AntiPlagioUpdatedAt", normalize(r.antiplagioupdatedat));

  // DefArt*
  setIf("DefArtModalidad", normalize(r.defartmodalidad));
  setIf("DefArtNotaArticulo", normalize(r.defartnotaarticulo));
  setIf("DefArtNotaDefensa", normalize(r.defartnotadefensa));
  setIf("DefArtNotaFinal", normalize(r.defartnotafinal));
  setIf("DefArtActualizadoEn", normalize(r.defartactualizadoen));

  return payload;
}

  async function upsert(periodoId, rows, headers) {
    const db = ensureDb();
    const consts = C();
    const ahoraIso = new Date().toISOString();

    const schema = validateHeaders(headers || []);

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

    let escritos = 0;
    const CHUNK = consts.BATCH_CHUNK || 450;

    for (let i = 0; i < clean.length; i += CHUNK) {
      const batch = db.batch();
      const chunk = clean.slice(i, i + CHUNK);
      chunk.forEach(r => {
        const id = getRowId(r);
        const ref = db.collection(consts.COL.ESTUDIANTES).doc(id);
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
      schema,
    };
  }

  async function borrarPorPeriodo(periodoId) {
    const db = ensureDb();
    const consts = C();

    const s1 = await db.collection(consts.COL.ESTUDIANTES)
      .where("ultimoPeriodoId", "==", periodoId).get();

    const s2 = await db.collection(consts.COL.ESTUDIANTES)
      .where("periodoId", "==", periodoId).get();

    const ids = new Set();
    s1.forEach(d => ids.add(d.id));
    s2.forEach(d => ids.add(d.id));

    const all = Array.from(ids);
    if (!all.length) return { eliminados: 0 };

    const CHUNK = consts.BATCH_CHUNK || 450;
    let eliminados = 0;

    for (let i = 0; i < all.length; i += CHUNK) {
      const batch = db.batch();
      const chunk = all.slice(i, i + CHUNK);
      chunk.forEach(id => {
        batch.delete(db.collection(consts.COL.ESTUDIANTES).doc(id));
        eliminados++;
      });
      await batch.commit();
    }

    return { eliminados };
  }

  window.ExcelEstudiantesRepo = {
    validateHeaders,
    upsert,
    borrarPorPeriodo,
    getRowId, // útil para estados/sync
  };
})(window);
