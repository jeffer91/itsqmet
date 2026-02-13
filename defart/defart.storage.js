/* =========================================================
Archivo: defart.storage.js
Ruta - Ubicación: /defart/defart.storage.js
Función o funciones:
- Guardar 3 campos DefArt (Notart/Notdef/Notafinal) en Estudiantes (docId = cédula)
- Guardado por fila (botón en fila)
- Guardado global (botón flotante): guarda TODAS las filas visibles filtradas
- Respeta bloqueo (no guarda bloqueados)
- Usa batch commit para rendimiento
========================================================= */
(function (window) {
  "use strict";

  var U = window.DefArtUtils;
  var Data = window.DefArtData;
  var Table = window.DefArtTable;

  var db = null;

  function ensureDB() {
    if (db) return db;
    db = window.DefArtDB || null;
    if (!db) throw new Error("DefArtDB no disponible");
    return db;
  }

  function setStatus(msg, kind) {
    if (window.DefArtUI && typeof window.DefArtUI.setStatus === "function") {
      window.DefArtUI.setStatus(msg, kind);
    }
  }

  function saveOne(id) {
    var res = Table.getRowPayload(id);
    if (!res) return Promise.reject(new Error("Fila no encontrada"));
    if (res.blocked) return Promise.resolve({ skipped: true, id: id, reason: "BLOQ" });

    var payload = res.payload;
    var dbi = ensureDB();

    setStatus("Guardando " + id + "…", "work");
    return dbi.collection("Estudiantes").doc(id).set(payload, { merge: true })
      .then(function () {
        setStatus("Guardado: " + id, "ok");
        // limpiar dirty visual
        var tr = document.querySelector('tr[data-id="' + CSS.escape(id) + '"]');
        if (tr) tr.classList.remove("row-dirty");
        return { ok: true, id: id };
      })
      .catch(function (err) {
        console.error("[DefArtStorage] saveOne error", err);
        setStatus("Error guardando " + id + ": " + (err && err.message ? err.message : err), "bad");
        return { ok: false, id: id, error: err };
      });
  }

  function saveVisible() {
    var ids = Table.getVisibleRowIds();
    if (!ids.length) return Promise.resolve({ ok: true, total: 0, saved: 0, skipped: 0 });

    var dbi = ensureDB();
    var batch = dbi.batch();

    var saved = 0, skipped = 0;
    var skippedIds = [];

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var row = Table.getRowPayload(id);
      if (!row || row.blocked) { skipped++; skippedIds.push(id); continue; }

      var ref = dbi.collection("Estudiantes").doc(id);
      batch.set(ref, row.payload, { merge: true });
      saved++;
    }

    setStatus("Guardando visibles… (" + saved + " a guardar, " + skipped + " omitidos)", "work");
    return batch.commit()
      .then(function () {
        setStatus("Guardado global OK. Guardados: " + saved + " | Omitidos: " + skipped, "ok");
        // limpiar dirty
        for (var j = 0; j < ids.length; j++) {
          var tr = document.querySelector('tr[data-id="' + CSS.escape(ids[j]) + '"]');
          if (tr) tr.classList.remove("row-dirty");
        }
        return { ok: true, total: ids.length, saved: saved, skipped: skipped, skippedIds: skippedIds };
      })
      .catch(function (err) {
        console.error("[DefArtStorage] saveVisible error", err);
        setStatus("Error en guardado global: " + (err && err.message ? err.message : err), "bad");
        return { ok: false, error: err };
      });
  }

  window.DefArtStorage = {
    saveOne: saveOne,
    saveVisible: saveVisible
  };
})(window);
