// Asegúrate de exponer estas funciones
(function (window) {
  "use strict";

  function ensureDb() {
    if (!window.db || typeof window.db.collection !== "function") {
      throw new Error(
        "Firestore no inicializado: window.db no existe. Revisa la inicialización en excel.html (Firebase/Firestore)."
      );
    }
    return window.db;
  }

  window.ExcelPeriodos = {
    listarTodos: async function () {
      const db = ensureDb();
      const snap = await db.collection("periodos").get();
      return snap.docs.map(d => ({
        id: d.id,
        label: (d.data() || {}).label || d.id
      }));
    },

crear: async function (iniA, iniM, finA, finM) {
  const db = ensureDb();

  const pad2 = (n) => String(n).padStart(2, "0");
  const meses = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];
  const mesTxt = (m) => meses[(parseInt(m, 10) || 0) - 1] || String(m);

  // ✅ ID como en tu BD: 2025-11_2026-05
  const id = `${iniA}-${pad2(iniM)}_${finA}-${pad2(finM)}`;

  // ✅ Label como en tu BD: "Noviembre 2025 a Mayo 2026"
  const label = `${mesTxt(iniM)} ${iniA} a ${mesTxt(finM)} ${finA}`;

await db.collection("periodos").doc(id).set({
  creadoEn: new Date().toISOString(),
  id: id,
  label: label
}, { merge: true });

  return { ok: true, id, label };
}

  };
})(window);
