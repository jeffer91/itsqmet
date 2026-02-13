// =========================================================
// ARCHIVO: ficha-tipo-remote.js
// Acceso remoto específico para el tipo de titulación
// - Guarda el campo TipoTitulacion en el documento Estudiantes/{id}
// =========================================================

(function (window) {
  "use strict";

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[FichaTipoRemote]");
    console.log.apply(console, args);
  }

  function guardarTipoTitulacion(studentId, tipo) {
    if (!window.FichaDB) {
      var msgNoDb = "FichaDB no está disponible al guardar TipoTitulacion.";
      console.error("[FichaTipoRemote]", msgNoDb);
      return Promise.reject(new Error(msgNoDb));
    }

    if (!studentId) {
      var msgId = "Se requiere studentId para guardar TipoTitulacion.";
      console.error("[FichaTipoRemote]", msgId);
      return Promise.reject(new Error(msgId));
    }

    var db = window.FichaDB;
    var tipoTexto = (tipo || "").toString().trim();

    log("Guardando TipoTitulacion para", studentId, "→", tipoTexto);

    return db
      .collection("Estudiantes")
      .doc(studentId)
      .update({ TipoTitulacion: tipoTexto })
      .then(function () {
        log("TipoTitulacion guardado correctamente para", studentId);
        return { studentId: studentId, tipo: tipoTexto };
      })
      .catch(function (err) {
        console.error("[FichaTipoRemote] Error al guardar TipoTitulacion:", err);
        throw err;
      });
  }

  window.FichaTipoRemote = {
    guardarTipoTitulacion: guardarTipoTitulacion
  };
})(window);
