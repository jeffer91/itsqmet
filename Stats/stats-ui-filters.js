/* =========================================================
Archivo: stats-ui-filters.js
Función: Renderiza y maneja la barra de filtros.
========================================================= */

(function (window) {
  "use strict";

  const StatsUIFilters = {
    render(containerId, periodos, onFilterChange, onSaveDate) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = `
        <div class="stats-input-group">
          <label>Período</label>
          <select id="filter-period" class="stats-select">
            <option value="">-- Selecciona --</option>
            ${periodos.map(p => `<option value="${p.id}">${p.label}</option>`).join('')}
          </select>
        </div>

        <div class="stats-input-group">
          <label>Carrera</label>
          <select id="filter-career" class="stats-select" disabled>
            <option value="">Todas las Carreras</option>
          </select>
        </div>

        <div class="stats-input-group">
          <label>Requisito</label>
          <select id="filter-req" class="stats-select">
            <option value="">Todos</option>
            ${window.StatsLogic.getRequirementsList().map(r => `<option value="${r.key}">${r.label}</option>`).join('')}
          </select>
        </div>

        <div class="stats-input-group" style="flex: 0 0 auto;">
          <label>Fecha Límite</label>
          <div style="display:flex; gap:5px;">
             <input type="date" id="input-deadline" class="stats-date-input">
             <button id="btn-save-date" class="stats-btn-primary"><i class="fas fa-save"></i></button>
          </div>
        </div>
      `;

      // Event Listeners
      document.getElementById("filter-period").addEventListener("change", (e) => onFilterChange("period", e.target.value));
      document.getElementById("filter-career").addEventListener("change", (e) => onFilterChange("career", e.target.value));
      document.getElementById("filter-req").addEventListener("change", (e) => onFilterChange("req", e.target.value));
      document.getElementById("btn-save-date").addEventListener("click", () => {
        const date = document.getElementById("input-deadline").value;
        onSaveDate(date);
      });
    },

    updateCareers(careersList) {
      const sel = document.getElementById("filter-career");
      if(!sel) return;
      const current = sel.value;
      sel.innerHTML = `<option value="">Todas las Carreras</option>` + 
        careersList.map(c => `<option value="${c}">${c}</option>`).join('');
      sel.value = current;
      sel.disabled = false;
    },

    setDeadline(dateString) {
      const inp = document.getElementById("input-deadline");
      if(inp) inp.value = dateString || "";
    }
  };

  window.StatsUIFilters = StatsUIFilters;
})(window);