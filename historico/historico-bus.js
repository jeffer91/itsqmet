// Archivo: historico-bus.js
// Ubicación: /historico/historico-bus.js
// Función: Acceso a Firestore. Incluye fallback automático cuando falta índice compuesto (orderBy).
const HistoricoBus = (function () {
  const db = firebase.firestore();
  const FieldValue = firebase.firestore.FieldValue;

  const COLLECTIONS = {
    periodos: "periodos",
    estudiantes: "Estudiantes",
    historial: "historial"
  };

  // Detecta el error típico de Firestore cuando falta un índice compuesto
  function isIndexRequiredError(err) {
    const msg = String(err?.message || "").toLowerCase();
    return err?.code === "failed-precondition" || msg.includes("requires an index");
  }

  // Intenta extraer el link de creación de índice desde el texto del error
  function extractIndexUrl(err) {
    const msg = String(err?.message || "");
    const m = msg.match(/https:\/\/console\.firebase\.google\.com\/v1\/r\/project\/[^\s]+/i);
    return m ? m[0] : "";
  }

  // Ordena docs por createdAt desc en memoria (soporta Timestamp o string/Date)
  function sortByCreatedAtDesc(items) {
    const toMs = (v) => {
      if (!v) return 0;
      if (typeof v?.toMillis === "function") return v.toMillis();
      if (typeof v?.toDate === "function") return v.toDate().getTime();
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    return [...items].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  }

  return {

    async getPeriods() {
      const snap = await db.collection(COLLECTIONS.periodos).orderBy("label").get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Lee estudiantes por periodoId (fuente)
    async listStudentsByPeriod(periodoId) {
      if (!periodoId) return [];
      const snap = await db.collection(COLLECTIONS.estudiantes)
        .where("periodoId", "==", periodoId)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Lista cortes macro guardados en historial (destino)
    // - Preferido: consulta con orderBy (requiere índice compuesto)
    // - Fallback: si falta índice, consulta sin orderBy y ordena localmente
    async listMacroCuts(periodoId) {
      if (!periodoId) return [];

      try {
        const snap = await db.collection(COLLECTIONS.historial)
          .where("kind", "==", "macro")
          .where("periodoId", "==", periodoId)
          .orderBy("createdAt", "desc")
          .get();

        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        if (!isIndexRequiredError(err)) throw err;

        // Fallback sin orderBy (no requiere índice compuesto)
        const snap = await db.collection(COLLECTIONS.historial)
          .where("kind", "==", "macro")
          .where("periodoId", "==", periodoId)
          .get();

        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sorted = sortByCreatedAtDesc(items);

        // Adjuntamos metadata útil (no rompe: JS permite propiedades extra)
        sorted.__indexRequired = true;
        sorted.__indexUrl = extractIndexUrl(err) || "";

        return sorted;
      }
    },

    async getMacroCut(docId) {
      const doc = await db.collection(COLLECTIONS.historial).doc(docId).get();
      return { id: doc.id, ...doc.data() };
    },

    // Obtiene el último corte macro (si existe)
    // - Preferido: orderBy + limit(1)
    // - Fallback: traer todos, ordenar local y tomar primero
    async getLastMacroCut(periodoId) {
      if (!periodoId) return null;

      try {
        const snap = await db.collection(COLLECTIONS.historial)
          .where("kind", "==", "macro")
          .where("periodoId", "==", periodoId)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        if (snap.empty) return null;
        const d = snap.docs[0];
        return { id: d.id, ...d.data() };
      } catch (err) {
        if (!isIndexRequiredError(err)) throw err;

        const snap = await db.collection(COLLECTIONS.historial)
          .where("kind", "==", "macro")
          .where("periodoId", "==", periodoId)
          .get();

        if (snap.empty) return null;

        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sorted = sortByCreatedAtDesc(items);
        const first = sorted[0] || null;

        // marca para UI
        if (first) {
          first.__indexRequired = true;
          first.__indexUrl = extractIndexUrl(err) || "";
        }

        return first;
      }
    },

    // Guarda un nuevo corte macro (si hay cambios en delta)
    async saveMacroCut({ periodoId, agg, delta, meta }) {
      const payload = {
        kind: "macro",
        periodoId,
        createdAt: FieldValue.serverTimestamp(),
        agg,
        delta,
        meta: meta || {}
      };

      const ref = await db.collection(COLLECTIONS.historial).add(payload);
      return ref.id;
    }

  };
})();
