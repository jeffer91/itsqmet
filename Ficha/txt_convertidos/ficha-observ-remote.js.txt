// =========================================================
// ARCHIVO: ficha-observ-remote.js
// Guarda observaciones de un estudiante en Firestore
// Colección: Estudiantes
// - Compatible con bases que usan "observaciones" o "Observaciones"
// =========================================================

(function (window) {
  "use strict";

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[FichaObservRemote]");
    console.log.apply(console, args);
  }

  /**
   * guardarObservaciones
   *  - studentId: id del documento en Estudiantes
   *  - texto: observaciones a guardar
   */
  function guardarObservaciones(studentId, texto) {
    return new Promise(function (resolve, reject) {
      var db = window.FichaDB;
      if (!db) {
        var msg = "FichaDB no está disponible. Revisa ficha-firebase-init.js.";
        console.error("[FichaObservRemote]", msg);
        return reject(new Error(msg));
      }

      if (!studentId) {
        var msgId = "Id de estudiante no válido para guardar observaciones.";
        console.error("[FichaObservRemote]", msgId);
        return reject(new Error(msgId));
      }

      var valor = (texto || "").toString();
      var ahoraIso = new Date().toISOString();

      // Guardamos en ambos nombres para evitar inconsistencias entre módulos
      db.collection("Estudiantes")
        .doc(studentId)
        .update({
          observaciones: valor,
          Observaciones: valor,
          observacionesActualizadoEn: ahoraIso,
          ObservacionesActualizadoEn: ahoraIso
        })
        .then(function () {
          log("Observaciones actualizadas para", studentId);
          resolve();
        })
        .catch(function (err) {
          console.error("[FichaObservRemote] Error al guardar observaciones:", err);
          reject(err);
        });
    });
  }

  window.FichaObservRemote = {
    guardarObservaciones: guardarObservaciones
  };
})(window);
