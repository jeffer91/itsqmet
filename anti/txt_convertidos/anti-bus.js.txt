/* =========================================================
Archivo: anti-bus.js
Ubicación: anti/anti-bus.js
Función: Transporte de datos (Firebase).
         - getPeriods / getAllStudents
         - saveAntiPlagioResult(): guarda % en el estudiante
========================================================= */

(function (window) {
  "use strict";

  const db = firebase.firestore();

  const AntiBus = {
    async getPeriods() {
      try {
        const snap = await db.collection("periodos").get();
        return snap.docs
          .map(d => ({
            id: d.id,
            ...d.data(),
            label: d.data().label || d.id
          }))
          .sort((a, b) => String(a.label).localeCompare(String(b.label), "es"));
      } catch (err) {
        console.error("[AntiBus] Error periodos:", err);
        return [];
      }
    },

    async getAllStudents() {
      try {
        const snap = await db.collection("Estudiantes").get();

        return snap.docs.map(d => {
          const data = d.data() || {};
          const docId = String(d.id || "").trim();

          const cedulaActual = String(
            data.cedula || data.Cedula || data.CEDULA || data["Cédula"] || data["cédula"] || ""
          ).trim();

          return {
            ...data,
            cedula: cedulaActual || docId,
            _docId: docId,
            docId: docId
          };
        });
      } catch (err) {
        console.error("[AntiBus] Error estudiantes:", err);
        return [];
      }
    },

    /**
     * Guarda el antiplagio asignado (generado por la app)
     * payload recomendado:
     * {
     *  originalidadNumber, plagioNumber, version, fechaISO, fechaTexto
     * }
     */
    async saveAntiPlagioResult(studentDocId, payload) {
      try {
        const id = String(studentDocId || "").trim();
        if (!id) throw new Error("studentDocId vacío");

        const data = {
          AntiPlagioVersion: String(payload?.version || "2867"),
          AntiPlagioFechaISO: String(payload?.fechaISO || ""),
          AntiPlagioFechaTexto: String(payload?.fechaTexto || ""),
          AntiPlagioOriginalidad: Number(payload?.originalidadNumber ?? 0),
          AntiPlagioPlagio: Number(payload?.plagioNumber ?? 0),
          AntiPlagioCitas: Number(payload?.citasNumber ?? 0),
          AntiPlagioAI: Number(payload?.aiNumber ?? 0),
          AntiPlagioUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("Estudiantes").doc(id).set(data, { merge: true });
        return true;
      } catch (err) {
        console.error("[AntiBus] Error guardando antiplagio:", err);
        return false;
      }
    }
  };

  window.AntiBus = AntiBus;
})(window);
