/* =========================================================
Archivo: anti-ui-table.js
Ubicación: anti/anti-ui-table.js
Función: Render tabla + columna Antiplagio (guardado en BD)
========================================================= */

(function (window, document) {
  "use strict";

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmtPct(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return "—";
    return v.toFixed(2).replace(".", ",") + "%";
  }

  const AntiUITable = {
    render(containerId, rows, selectionState, onToggleOne, onToggleAll, onDownloadOne) {
      const el = document.getElementById(containerId);
      if (!el) return;

      const list = Array.isArray(rows) ? rows : [];

      if (!list.length) {
        el.innerHTML = `<div style="padding:12px; color:#64748b;">No hay estudiantes habilitados con los filtros actuales.</div>`;
        return;
      }

      const allSelected = list.every(r => !!selectionState[r.cedula]);
      const selectedCount = list.filter(r => !!selectionState[r.cedula]).length;

      let html = `
        <table class="anti-table">
          <thead>
            <tr>
              <th style="width:42px;">
                <input type="checkbox" id="anti-check-all" ${allSelected ? "checked" : ""} />
              </th>
              <th>Cédula</th>
              <th>Estudiante</th>
              <th>Carrera</th>
              <th style="width:120px;">Antiplagio</th>
              <th>Estado</th>
              <th style="width:170px;">Acciones</th>
            </tr>
          </thead>
          <tbody>
      `;

      for (const r of list) {
        const checked = selectionState[r.cedula] ? "checked" : "";
        const anti = fmtPct(r.antiOriginalidad);

        html += `
          <tr>
            <td>
              <input type="checkbox" class="anti-check-one" data-ced="${esc(r.cedula)}" ${checked} />
            </td>
            <td>${esc(r.cedula)}</td>
            <td><strong>${esc(r.nombre)}</strong></td>
            <td>${esc(r.carrera)}</td>
            <td><span class="anti-badge badge-ok">${esc(anti)}</span></td>
            <td><span class="anti-badge badge-ok">HABILITADO</span></td>
            <td>
              <button class="anti-btn anti-btn-primary anti-download-one" data-ced="${esc(r.cedula)}">
                <i class="fas fa-file-pdf"></i> Descargar PDF
              </button>
            </td>
          </tr>
        `;
      }

      html += `</tbody></table>
        <div style="padding:10px 12px; color:#475569; font-weight:800;">
          Seleccionados: ${selectedCount} de ${list.length}
        </div>
      `;

      el.innerHTML = html;

      const checkAll = document.getElementById("anti-check-all");
      if (checkAll) checkAll.addEventListener("change", (e) => onToggleAll(!!e.target.checked));

      el.querySelectorAll(".anti-check-one").forEach(ch => {
        ch.addEventListener("change", (e) => {
          const ced = e.target.getAttribute("data-ced");
          onToggleOne(ced, !!e.target.checked);
        });
      });

      el.querySelectorAll(".anti-download-one").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const ced = e.currentTarget.getAttribute("data-ced");
          onDownloadOne(ced);
        });
      });
    }
  };

  window.AntiUITable = AntiUITable;
})(window, document);
