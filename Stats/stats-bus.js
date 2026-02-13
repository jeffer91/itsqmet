/* =========================================================
Archivo: stats-bus.js
Ubicación: /reportes/stats-bus.js
Función: Capa de transporte de datos. Conecta exclusivamente con Firebase.
         CORRECCIÓN: Inyecta el doc.id (cédula) dentro del objeto del estudiante,
         porque en Firestore la cédula es el ID del documento, no un campo.
========================================================= */

(function (window) {
  "use strict";
  const db = firebase.firestore();

  const StatsBus = {
    // Obtener lista de periodos ordenados
    async getPeriods() {
      try {
        const snap = await db.collection("periodos").get();
        return snap.docs
          .map(d => ({
            id: d.id,
            ...d.data(),
            label: d.data().label || d.id
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "es"));
      } catch (err) {
        console.error("StatsBus Error (Periodos):", err);
        return [];
      }
    },

    // Obtener todos los estudiantes (se filtran luego en lógica)
    // IMPORTANTE:
    // - Firestore NO incluye el doc.id dentro de d.data()
    // - Aquí agregamos la cédula desde d.id para que la UI la pueda mostrar
    async getAllStudents() {
      try {
        const snap = await db.collection("Estudiantes").get();

        return snap.docs.map(d => {
          const data = d.data() || {};
          const docId = (d.id || "").trim();

          // Si ya existe un campo "cedula" válido, NO lo pisamos.
          // Caso común: NO existe, entonces usamos doc.id.
          const cedulaActual = String(data.cedula || data.Cedula || data.CEDULA || "").trim();

          return {
            ...data,

            // Campo preferido para UI
            cedula: cedulaActual || docId,

            // Campos extra (fallbacks) para robustez futura
            _docId: docId,
            docId: docId
          };
        });
      } catch (err) {
        console.error("StatsBus Error (Estudiantes):", err);
        return [];
      }
    },

    // Guardar fecha límite para un periodo
    async saveDeadline(periodId, dateString) {
      if (!periodId || !dateString) return;
      try {
        await db.collection("periodos").doc(periodId).set(
          { fechaLimiteRequisitos: dateString },
          { merge: true }
        );
        console.log("Fecha límite guardada:", dateString);
      } catch (err) {
        console.error("StatsBus Error (Guardar Fecha):", err);
      }
    }
  };

  window.StatsBus = StatsBus;
})(window);
