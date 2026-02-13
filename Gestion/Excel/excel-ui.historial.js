// =========================================================
// Archivo: excel-ui.historial.js
// Ruta: /Gestion/Excel/excel-ui.historial.js
// Función: UI Sección Historial (listar/borrar versión)
// =========================================================
(function (window, document) {
  "use strict";

  function must(name) {
    const x = window[name];
    if (!x) throw new Error(`${name} no disponible.`);
    return x;
  }
  function byId(id) { return document.getElementById(id); }

  let els = {};
  let booted = false;

  async function render() {
    must("ExcelState");
    must("ExcelHistorialRepo");

    const st = window.ExcelState.get();
    const pid = st.periodoId;
    if (!pid) {
      if (els.historyBox) els.historyBox.innerHTML = "Selecciona un período.";
      return;
    }

    const hist = await window.ExcelHistorialRepo.listar(pid);
    if (!hist.length) {
      els.historyBox.innerHTML = "No hay historial.";
      return;
    }

    els.historyBox.innerHTML = `
      <table class="hist-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Fecha</th>
            <th>Versión</th>
            <th>Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${hist.map((h, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${h.fechaTxt || ""}</td>
              <td>${h.version || ""}</td>
              <td>${h.totalEstudiantes ?? 0}</td>
              <td>
                <button class="btn ghost danger" data-action="delete-version" data-index="${i}">
                  Borrar
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  async function onClick(e) {
    const btn = e.target.closest('button[data-action="delete-version"]');
    if (!btn) return;

    must("ExcelState");
    must("ExcelHistorialRepo");

    const st = window.ExcelState.get();
    const pid = st.periodoId;
    const idx = parseInt(btn.dataset.index, 10);

    if (!confirm("¿Borrar esta versión del historial?")) return;

    try {
      await window.ExcelHistorialRepo.borrarVersion(pid, idx);
      await render();
    } catch (err) {
      console.error("[excel-ui.historial] borrar versión", err);
      alert(err.message || "No se pudo borrar la versión.");
    }
  }

  function boot() {
    if (booted) return;
    booted = true;

    els = {
      historyBox: byId("excel-history"),
    };

    els.historyBox.addEventListener("click", onClick);

    // refrescar en cambios de período y después de guardados/borrados
    must("ExcelState");
    window.ExcelState.on("period:changed", render);
    window.ExcelState.on("save:done", render);
    window.ExcelState.on("delete:done", render);

    render();
  }

  window.ExcelUIHistorial = { boot, render };
})(window, document);
