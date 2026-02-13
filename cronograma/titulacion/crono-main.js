/* Archivo: crono-main.js 
Función: Controlador principal. Auto-carga y manejo de edición manual.
- Ajuste: Migración automática de feriados legacy (strings) => [{dateISO, nombre}]
*/

(function(window) {
  "use strict";

  window.State = {
    periodos: [],
    plantillas: [],
    selectedPlantilla: null,
    schedule: [],
    holidaysMap: new Map()
  };

  async function init() {
    console.log("Iniciando Generador de Cronogramas...");

    window.State.periodos = await window.CronoBus.getPeriodos();
    window.State.plantillas = await window.CronoBus.getPlantillas();

    populatePeriodos();
    window.CronoUI.renderTipos(window.State.plantillas, handleTipoChange);

    document.getElementById("btn-generar").addEventListener("click", handleGenerar);
    document.getElementById("btn-save").addEventListener("click", handleGuardar);

    document.getElementById("sel-periodo").addEventListener("change", checkAndLoadExisting);
  }

  function populatePeriodos() {
    const sel = document.getElementById("sel-periodo");
    sel.innerHTML = `<option value="">-- Selecciona Periodo --</option>` + 
      window.State.periodos.map(p => `<option value="${p.id}">${p.label || p.id}</option>`).join("");
  }

  function handleTipoChange(plantillaId) {
    window.State.selectedPlantilla = window.State.plantillas.find(p => p.id === plantillaId);
    checkAndLoadExisting();
  }

  // ✅ MIGRACIÓN: reconstruye feriados con fechas reales desde holidaysMap
  function rebuildHolidaysForItem(item, holidaysMap) {
    if (!item || !item.fechaInicio || !item.fechaFin) return item;

    const start = new Date(item.fechaInicio + "T00:00:00");
    const end = new Date(item.fechaFin + "T00:00:00");

    const found = [];
    const d = new Date(start);

    while (d <= end) {
      const iso = d.toISOString().split("T")[0];
      if (holidaysMap && holidaysMap.has(iso)) {
        const val = holidaysMap.get(iso);
        // val puede ser objeto {nombre, nombreOriginal} o string
        const nombre = (val && typeof val === "object") ? (val.nombre || val.nombreOriginal || "Feriado") : String(val || "Feriado");
        found.push({ dateISO: iso, nombre: nombre });
      }
      d.setDate(d.getDate() + 1);
    }

    // único por fecha
    const uniq = new Map();
    found.forEach(h => uniq.set(h.dateISO, h));

    return {
      ...item,
      feriadosAtravesados: Array.from(uniq.values())
    };
  }

  function migrateLegacyHolidays(items, holidaysMap) {
    if (!Array.isArray(items) || items.length === 0) return items;
    return items.map(it => {
      // Si ya tiene objetos con dateISO, no hace falta; igual lo reconstruimos para asegurar consistencia
      return rebuildHolidaysForItem(it, holidaysMap);
    });
  }

  function handleManualDateChange(id, field, newValue) {
    const item = window.State.schedule.find(i => i.id === id);
    if (item) {
      if (field === 'start') item.fechaInicio = newValue;
      if (field === 'end') item.fechaFin = newValue;

      // Si cambian fechas, reconstruimos feriados de ese item (para mantener fechas correctas)
      item.feriadosAtravesados = rebuildHolidaysForItem(item, window.State.holidaysMap).feriadosAtravesados;

      const stats = window.CronoLogic.calculateStats(window.State.schedule);
      window.CronoUI.renderStats(stats);
    }
  }

  async function checkAndLoadExisting() {
    const periodoId = document.getElementById("sel-periodo").value;
    const plantilla = window.State.selectedPlantilla;

    if (!periodoId || !plantilla) {
      window.State.schedule = [];
      window.CronoUI.clearTable();
      window.CronoUI.renderStats(null);
      return;
    }

    const tipo = plantilla.meta?.tipo || "general";
    console.log(`Buscando cronograma guardado: ${periodoId} - ${tipo}`);

    const savedData = await window.CronoBus.getCronograma(periodoId, tipo);

    if (savedData && savedData.items && savedData.items.length > 0) {
      console.log("Cronograma encontrado. Cargando...");

      if (savedData.fechaInput) {
        document.getElementById("date-inicio").value = savedData.fechaInput;

        // ✅ Cargar feriados ANTES de renderizar (para migración)
        const year = parseInt(savedData.fechaInput.split("-")[0]);
        window.State.holidaysMap = await window.CronoBus.getFeriadosMap(year, year + 1);
      } else {
        // fallback: intenta por el primer item
        const y = parseInt((savedData.items[0]?.fechaInicio || "").split("-")[0]);
        if (!isNaN(y)) window.State.holidaysMap = await window.CronoBus.getFeriadosMap(y, y + 1);
      }

      // ✅ Migración automática: ahora tendrás fechas de feriados aunque antes se guardó “Good Friday”
      const migrated = migrateLegacyHolidays(savedData.items, window.State.holidaysMap);

      window.State.schedule = migrated;

      const stats = window.CronoLogic.calculateStats(migrated);
      window.CronoUI.renderTable(migrated, handleManualDateChange);
      window.CronoUI.renderStats(stats);

    } else {
      console.log("No existe cronograma previo.");
      window.State.schedule = [];
      window.CronoUI.clearTable();
      window.CronoUI.renderStats(null);
    }
  }

  async function handleGenerar() {
    const dateInput = document.getElementById("date-inicio").value;
    const plantilla = window.State.selectedPlantilla;

    if (!dateInput) return alert("Selecciona una fecha de finalización de clases.");
    if (!plantilla) return alert("Error: No hay plantilla seleccionada.");

    const year = parseInt(dateInput.split("-")[0]);
    window.State.holidaysMap = await window.CronoBus.getFeriadosMap(year, year + 1);

    const actividades = plantilla.plantilla?.actividades || [];
    if (actividades.length === 0) return alert("La plantilla seleccionada no tiene actividades.");

    const schedule = window.CronoLogic.generateSchedule(dateInput, actividades, window.State.holidaysMap);
    window.State.schedule = schedule;

    const stats = window.CronoLogic.calculateStats(schedule);
    window.CronoUI.renderTable(schedule, handleManualDateChange);
    window.CronoUI.renderStats(stats);
  }

  async function handleGuardar() {
    const periodoId = document.getElementById("sel-periodo").value;
    const dateInput = document.getElementById("date-inicio").value;

    if (!periodoId) return alert("Selecciona un período para guardar.");
    if (window.State.schedule.length === 0) return alert("Primero genera el cronograma.");

    const btn = document.getElementById("btn-save");
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Guardando...`;
    btn.disabled = true;

    const inputsInicio = document.querySelectorAll(`input[data-field="start"]`);
    inputsInicio.forEach((inp, i) => { window.State.schedule[i].fechaInicio = inp.value; });
    const inputsFin = document.querySelectorAll(`input[data-field="end"]`);
    inputsFin.forEach((inp, i) => { window.State.schedule[i].fechaFin = inp.value; });

    // ✅ asegurar feriados reconstruidos antes de guardar
    window.State.schedule = migrateLegacyHolidays(window.State.schedule, window.State.holidaysMap);

    const payload = {
      items: window.State.schedule,
      fechaInput: dateInput
    };

    const success = await window.CronoBus.saveCronograma(
      periodoId,
      window.State.selectedPlantilla.meta?.tipo || "general",
      payload
    );

    if (success) alert("Cronograma guardado exitosamente.");
    else alert("Error al guardar.");

    btn.innerHTML = originalText;
    btn.disabled = false;
  }

  document.addEventListener("DOMContentLoaded", init);

})(window);
