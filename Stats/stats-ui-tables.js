/* =========================================================
Archivo: stats-ui-tables.js
Ubicación: /reportes/stats-ui-tables.js
Función: Renderizado de tablas (Global, Por Carrera, Detalle Estudiantes).
         CORRECCIÓN: Lectura robusta de cédula incluyendo docId inyectado desde StatsBus.
========================================================= */

(function (window) {
  "use strict";

  const Utils = window.StatsUtils;

  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getStudentName(s) {
    return s.nombres || s.Nombres || s.nombre || s.Nombre || s.apellidos || s.Apellidos || "";
  }

  function getStudentCedula(s) {
    const direct =
      s.cedula || s.Cedula || s.CEDULA || s["Cédula"] || s["cédula"] ||
      s.identificacion || s.Identificacion || s.IDENTIFICACION ||
      s.dni || s.DNI;

    if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
      return String(direct).trim();
    }

    const docBased =
      s._docId || s.docId || s.__docId || s.__id || s._id || s.id;

    return (docBased !== undefined && docBased !== null) ? String(docBased).trim() : "";
  }

  function getStudentCareerRaw(s) {
    return s.nombrecarrera || s.nombreCarrera || s.NombreCarrera || "";
  }

  function normCareer(s) {
    return Utils.normalizeCareer(getStudentCareerRaw(s));
  }

  function badge(noCumple, cumple) {
    const badgeClass =
      noCumple === 0 ? "badge-success" :
      (cumple >= noCumple ? "badge-neutral" : "badge-danger");

    const badgeText = noCumple === 0 ? "OPTIMO" : "PENDIENTE";
    return `<span class="stats-badge ${badgeClass}">${badgeText}</span>`;
  }

  function statusBadge(status) {
    const st = String(status || "").toUpperCase();
    if (st === "CUMPLE") return `<span class="stats-badge badge-success">CUMPLE</span>`;
    return `<span class="stats-badge badge-danger">NO CUMPLE</span>`;
  }

  const StatsUITables = {

    renderGlobal(containerId, data) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const reqStats = Array.isArray(data.reqStats) ? data.reqStats : [];

      let html = `
        <table class="stats-table">
          <thead>
            <tr>
              <th>Requisito</th>
              <th>Cumple</th>
              <th>No Cumple</th>
              <th>% Cumplimiento</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
      `;

      reqStats.forEach(r => {
        const total = r.cumple + r.noCumple;
        const pc = Utils.toPercent(r.cumple, total);
        html += `
          <tr>
            <td><strong>${esc(r.label)}</strong></td>
            <td>${r.cumple}</td>
            <td>${r.noCumple}</td>
            <td>${pc}</td>
            <td>${badge(r.noCumple, r.cumple)}</td>
          </tr>
        `;
      });

      if (reqStats.length === 0) {
        html += `
          <tr>
            <td colspan="5" style="color:#64748b;">No hay datos para mostrar.</td>
          </tr>
        `;
      }

      html += `</tbody></table>`;
      container.innerHTML = html;
    },

    renderByCareer(containerId, payload) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const students = Array.isArray(payload?.students) ? payload.students : [];
      const focusReqKey = (payload?.focusReqKey || "").trim();

      if (students.length === 0) {
        container.innerHTML = `<div style="color:#64748b;">No hay datos para mostrar.</div>`;
        return;
      }

      const map = new Map();
      students.forEach(s => {
        const c = normCareer(s) || "SIN CARRERA";
        if (!map.has(c)) map.set(c, []);
        map.get(c).push(s);
      });

      const careers = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, "es"));

      if (focusReqKey) {
        const label = payload?.stats?.focusReqLabel || focusReqKey;

        // ===== NUEVO: orden por NO CUMPLE desc =====
        const rows = careers.map(c => {
          const list = map.get(c);
          let cumple = 0, noCumple = 0;

          list.forEach(st => {
            const stt = window.StatsLogic.getReqStatus(st, focusReqKey);
            if (stt === "CUMPLE") cumple++;
            else noCumple++;
          });

          const total = cumple + noCumple;
          return {
            career: c,
            cumple,
            noCumple,
            pc: Utils.toPercent(cumple, total)
          };
        });

        rows.sort((a, b) => {
          if (b.noCumple !== a.noCumple) return b.noCumple - a.noCumple;
          return a.career.localeCompare(b.career, "es");
        });

        let html = `
          <table class="stats-table">
            <thead>
              <tr>
                <th>Carrera</th>
                <th>Cumple</th>
                <th>No Cumple</th>
                <th>% Cumplimiento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
        `;

        rows.forEach(r => {
          html += `
            <tr>
              <td><strong>${esc(r.career)}</strong></td>
              <td>${r.cumple}</td>
              <td>${r.noCumple}</td>
              <td>${r.pc}</td>
              <td>${badge(r.noCumple, r.cumple)}</td>
            </tr>
          `;
        });

        html += `</tbody></table>`;
        container.innerHTML = `
          <div style="margin-bottom:10px; color:#475569;">
            Vista por carrera enfocada en: <strong>${esc(label)}</strong>
          </div>
          ${html}
        `;
        return;
      }

      let html = `
        <table class="stats-table">
          <thead>
            <tr>
              <th>Carrera</th>
              <th>Total</th>
              <th>Habilitados Artículo</th>
              <th>Titulación Completa</th>
              <th>Aprobados Finales</th>
              <th>% Aprobados</th>
            </tr>
          </thead>
          <tbody>
      `;

      careers.forEach(c => {
        const list = map.get(c);
        const st = window.StatsLogic.processStats(list, null);
        html += `
          <tr>
            <td><strong>${esc(c)}</strong></td>
            <td>${st.total}</td>
            <td>${st.habilitadosArticulo}</td>
            <td>${st.titulacionCompleta}</td>
            <td>${st.aprobadosFinales}</td>
            <td>${st.pcAprobados}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      container.innerHTML = html;
    },

    renderDetail(containerId, payload) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const students = Array.isArray(payload?.students) ? payload.students : [];
      const focusReqKey = (payload?.focusReqKey || "").trim();

      if (students.length === 0) {
        container.innerHTML = `<div style="color:#64748b;">No hay datos para mostrar.</div>`;
        return;
      }

      if (focusReqKey) {
        const label = payload?.stats?.focusReqLabel || focusReqKey;

        const rows = students.map(s => {
          const stt = window.StatsLogic.getReqStatus(s, focusReqKey);
          return {
            cedula: getStudentCedula(s),
            nombre: getStudentName(s),
            carrera: normCareer(s) || "SIN CARRERA",
            status: stt
          };
        });

        rows.sort((a, b) => {
          if (a.status !== b.status) return a.status === "NO CUMPLE" ? -1 : 1;
          const c = a.carrera.localeCompare(b.carrera, "es");
          if (c !== 0) return c;
          return a.nombre.localeCompare(b.nombre, "es");
        });

        let html = `
          <table class="stats-table">
            <thead>
              <tr>
                <th>Cédula</th>
                <th>Estudiante</th>
                <th>Carrera</th>
                <th>${esc(label)}</th>
              </tr>
            </thead>
            <tbody>
        `;

        rows.forEach(r => {
          html += `
            <tr>
              <td>${esc(r.cedula)}</td>
              <td><strong>${esc(r.nombre)}</strong></td>
              <td>${esc(r.carrera)}</td>
              <td>${statusBadge(r.status)}</td>
            </tr>
          `;
        });

        html += `</tbody></table>`;

        container.innerHTML = `
          <div style="margin-bottom:10px; color:#475569;">
            Detalle de estudiantes por requisito: <strong>${esc(label)}</strong>
          </div>
          ${html}
        `;
        return;
      }

      const reqList = window.StatsLogic.getRequirementsList();

      const rows = students.map(s => {
        const pendientes = [];

        reqList.forEach(r => {
          const stt = window.StatsLogic.getReqStatus(s, r.key);
          if (stt !== "CUMPLE") pendientes.push(r.label);
        });

        return {
          cedula: getStudentCedula(s),
          nombre: getStudentName(s),
          carrera: normCareer(s) || "SIN CARRERA",
          pendientes,
          nPend: pendientes.length
        };
      });

      rows.sort((a, b) => {
        if (b.nPend !== a.nPend) return b.nPend - a.nPend;
        const c = a.carrera.localeCompare(b.carrera, "es");
        if (c !== 0) return c;
        return a.nombre.localeCompare(b.nombre, "es");
      });

      let html = `
        <table class="stats-table">
          <thead>
            <tr>
              <th>Cédula</th>
              <th>Estudiante</th>
              <th>Carrera</th>
              <th># Pendientes</th>
              <th>Pendientes</th>
            </tr>
          </thead>
          <tbody>
      `;

      rows.forEach(r => {
        const pendText = r.pendientes.length ? r.pendientes.join(", ") : "—";
        html += `
          <tr>
            <td>${esc(r.cedula)}</td>
            <td><strong>${esc(r.nombre)}</strong></td>
            <td>${esc(r.carrera)}</td>
            <td>${r.nPend}</td>
            <td style="color:#475569;">${esc(pendText)}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      container.innerHTML = html;
    }
  };

  window.StatsUITables = StatsUITables;
})(window);
