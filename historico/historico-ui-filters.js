// Archivo: historico-ui-filters.js
// Ubicación: /historico/historico-ui-filters.js
// Función: UI de filtros + estado. Muestra link “Crear índice” cuando falta índice en Firestore.
const HistoricoUIFilters = {
  render(containerId, model, handlers) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const periods = model.periods || [];
    const careers = model.careers || [];
    const requisitos = model.requisitos || [];

    const current = model.current || {
      periodId: "",
      career: "",
      requisito: ""
    };

    const statusText = model.statusText || "Listo";
    const indexUrl = String(model.indexUrl || "");

    el.innerHTML = `
      <div class="filters-row">
        <select id="historico-period">
          <option value="">Selecciona período</option>
          ${periods.map(p => `
            <option value="${p.id}" ${p.id === current.periodId ? "selected" : ""}>${HistoricoUtils.esc(p.label || p.id)}</option>
          `).join("")}
        </select>

        <select id="historico-career" ${!current.periodId ? "disabled" : ""}>
          <option value="">Todas las carreras</option>
          ${careers.map(c => `
            <option value="${HistoricoUtils.esc(c)}" ${c === current.career ? "selected" : ""}>${HistoricoUtils.esc(c)}</option>
          `).join("")}
        </select>

        <select id="historico-requisito" ${!current.periodId ? "disabled" : ""}>
          <option value="">Selecciona requisito</option>
          ${requisitos.map(r => `
            <option value="${HistoricoUtils.esc(r)}" ${r === current.requisito ? "selected" : ""}>${HistoricoUtils.esc(r)}</option>
          `).join("")}
        </select>

        <button id="historico-generate" ${!current.periodId ? "disabled" : ""} title="Genera un corte macro y guarda solo deltas en historial">
          <i class="fa-solid fa-floppy-disk"></i> Generar corte
        </button>

        <span class="status" id="historico-status">${HistoricoUtils.esc(statusText)}</span>

        ${indexUrl ? `
          <a class="status" id="historico-index-link"
             href="${HistoricoUtils.esc(indexUrl)}"
             target="_blank"
             rel="noopener noreferrer"
             title="Firestore requiere un índice compuesto para ordenar por createdAt. Haz clic para crearlo.">
            <i class="fa-solid fa-link"></i> Crear índice
          </a>
        ` : ``}
      </div>
    `;

    el.querySelector("#historico-period").addEventListener("change", e => handlers.onPeriodChange?.(e.target.value));
    el.querySelector("#historico-career").addEventListener("change", e => handlers.onCareerChange?.(e.target.value));
    el.querySelector("#historico-requisito").addEventListener("change", e => handlers.onRequisitoChange?.(e.target.value));
    el.querySelector("#historico-generate").addEventListener("click", () => handlers.onGenerateCut?.());
  }
};
