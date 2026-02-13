/* Archivo: crono-logic.js
Ajuste: feriadosAtravesados ahora es un array de objetos:
[{ dateISO: "YYYY-MM-DD", nombre: "Viernes Santo" }, ...]
*/

(function(window) {
  "use strict";

  const CronoLogic = {

    diffDays(startStr, endStr) {
      const d1 = new Date(startStr + "T00:00:00");
      const d2 = new Date(endStr + "T00:00:00");
      return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    },

    // Devuelve {dateISO, nombre} o null
    getHolidayInfo(iso, holidaysMap) {
      if (!holidaysMap || !holidaysMap.has(iso)) return null;
      const val = holidaysMap.get(iso);

      // Nuevo formato desde CronoBus: objeto
      if (val && typeof val === "object") {
        return {
          dateISO: iso,
          nombre: val.nombre || val.nombreOriginal || "Feriado"
        };
      }

      // Compatibilidad si alguna vez llega string
      return {
        dateISO: iso,
        nombre: String(val || "Feriado")
      };
    },

    addWorkingDays(startDateStr, daysDuration, holidaysMap) {
      let current = new Date(startDateStr + "T00:00:00");
      let added = 0;

      // Guardamos feriados con fecha + nombre
      let holidaysEncountered = [];

      // Validar inicio: mover al siguiente laborable
      while (!this.isWorkingDay(current, holidaysMap)) {
        current.setDate(current.getDate() + 1);
      }
      const realStartDate = new Date(current);

      const targetSteps = Math.max(0, daysDuration - 1);

      while (added < targetSteps) {
        current.setDate(current.getDate() + 1);
        const iso = current.toISOString().split("T")[0];

        const holidayInfo = this.getHolidayInfo(iso, holidaysMap);
        if (holidayInfo) holidaysEncountered.push(holidayInfo);

        if (this.isWorkingDay(current, holidaysMap)) added++;
      }

      const endDateStr = current.toISOString().split("T")[0];
      const startDateStrFinal = realStartDate.toISOString().split("T")[0];

      const totalCalendarDays = this.diffDays(startDateStrFinal, endDateStr);
      const extraDays = totalCalendarDays - daysDuration;

      // Unificar por fecha (dateISO)
      const uniqByDate = new Map();
      holidaysEncountered.forEach(h => {
        if (h && h.dateISO) uniqByDate.set(h.dateISO, h);
      });

      return {
        startDate: startDateStrFinal,
        endDate: endDateStr,
        holidays: Array.from(uniqByDate.values()),
        calendarDays: totalCalendarDays,
        extraDays: extraDays
      };
    },

    subtractWorkingDays(endDateStr, daysDuration, holidaysMap) {
      let current = new Date(endDateStr + "T00:00:00");
      let subtracted = 0;

      let holidaysEncountered = [];

      while (!this.isWorkingDay(current, holidaysMap)) {
        current.setDate(current.getDate() - 1);
      }
      const realEndDate = new Date(current);

      const targetSteps = Math.max(0, daysDuration - 1);

      while (subtracted < targetSteps) {
        current.setDate(current.getDate() - 1);
        const iso = current.toISOString().split("T")[0];

        const holidayInfo = this.getHolidayInfo(iso, holidaysMap);
        if (holidayInfo) holidaysEncountered.push(holidayInfo);

        if (this.isWorkingDay(current, holidaysMap)) subtracted++;
      }

      const startDateStr = current.toISOString().split("T")[0];
      const endDateStrFinal = realEndDate.toISOString().split("T")[0];

      const totalCalendarDays = this.diffDays(startDateStr, endDateStrFinal);
      const extraDays = totalCalendarDays - daysDuration;

      const uniqByDate = new Map();
      holidaysEncountered.forEach(h => {
        if (h && h.dateISO) uniqByDate.set(h.dateISO, h);
      });

      return {
        startDate: startDateStr,
        endDate: endDateStrFinal,
        holidays: Array.from(uniqByDate.values()),
        calendarDays: totalCalendarDays,
        extraDays: extraDays
      };
    },

    getPreviousWorkingDay(dateStr, holidaysMap) {
      let d = new Date(dateStr + "T00:00:00");
      d.setDate(d.getDate() - 1);
      while (!this.isWorkingDay(d, holidaysMap)) {
        d.setDate(d.getDate() - 1);
      }
      return d.toISOString().split("T")[0];
    },

    getNextWorkingDay(dateStr, holidaysMap) {
      let d = new Date(dateStr + "T00:00:00");
      d.setDate(d.getDate() + 1);
      while (!this.isWorkingDay(d, holidaysMap)) {
        d.setDate(d.getDate() + 1);
      }
      return d.toISOString().split("T")[0];
    },

    isWorkingDay(dateObj, holidaysMap) {
      const day = dateObj.getDay();
      const iso = dateObj.toISOString().split("T")[0];
      if (day === 0 || day === 6) return false;
      if (holidaysMap && holidaysMap.has(iso)) return false;
      return true;
    },

    // --- Estadísticas Globales ---
    calculateStats(schedule) {
      if (!schedule || schedule.length === 0) return null;

      const first = schedule[0];
      const last = schedule[schedule.length - 1];
      const totalDays = this.diffDays(first.fechaInicio, last.fechaFin);

      const endClasses = schedule.find(a => a.id === "fin-clases" || a.nombre.toLowerCase().includes("fin de clases"));
      const defense = schedule.find(a => a.nombre.toLowerCase().includes("defensa") || a.nombre.toLowerCase().includes("sustentación"));

      let windowText = "N/A";
      let windowValue = 0;

      if (endClasses && defense) {
        const days = this.diffDays(endClasses.fechaFin, defense.fechaInicio);
        windowValue = days;
        windowText = `${days} días`;
      }

      // Impacto: contar feriados únicos por fecha (cuando existan)
      const allHolidayDates = new Set();
      let totalExtraDays = 0;

      schedule.forEach(s => {
        if (Array.isArray(s.feriadosAtravesados)) {
          s.feriadosAtravesados.forEach(h => {
            if (h && typeof h === "object" && h.dateISO) allHolidayDates.add(h.dateISO);
            // compat si quedara string
            if (typeof h === "string") allHolidayDates.add(h);
          });
        }
        if (s.extraDays) totalExtraDays += s.extraDays;
      });

      return {
        totalProcessDays: totalDays,
        graduationWindow: windowText,
        graduationWindowVal: windowValue,
        uniqueHolidays: allHolidayDates.size,
        totalNonWorkingImpact: totalExtraDays
      };
    },

    generateSchedule(anchorDateInput, activities, holidaysMap) {
      const schedule = [...activities].sort((a, b) => a.orden - b.orden);

      let anchorIndex = schedule.findIndex(a =>
        (a.id === "fin-clases") ||
        (a.nombre && a.nombre.toLowerCase().includes("fin de clases"))
      );
      if (anchorIndex === -1) anchorIndex = 0;

      const anchorAct = schedule[anchorIndex];
      const duration = parseInt(anchorAct.duracionDias) || 1;
      const anchorRes = this.addWorkingDays(anchorDateInput, duration, holidaysMap);

      schedule[anchorIndex] = {
        ...anchorAct,
        fechaInicio: anchorRes.startDate,
        fechaFin: anchorRes.endDate,
        feriadosAtravesados: anchorRes.holidays,
        calendarDays: anchorRes.calendarDays,
        extraDays: anchorRes.extraDays
      };

      let prevEndDate = schedule[anchorIndex].fechaFin;
      for (let i = anchorIndex + 1; i < schedule.length; i++) {
        const act = schedule[i];
        const start = this.getNextWorkingDay(prevEndDate, holidaysMap);
        const dur = parseInt(act.duracionDias) || 1;

        const res = this.addWorkingDays(start, dur, holidaysMap);

        schedule[i] = {
          ...act,
          fechaInicio: res.startDate,
          fechaFin: res.endDate,
          feriadosAtravesados: res.holidays,
          calendarDays: res.calendarDays,
          extraDays: res.extraDays
        };
        prevEndDate = res.endDate;
      }

      let nextStartDate = schedule[anchorIndex].fechaInicio;
      for (let i = anchorIndex - 1; i >= 0; i--) {
        const act = schedule[i];
        const end = this.getPreviousWorkingDay(nextStartDate, holidaysMap);
        const dur = parseInt(act.duracionDias) || 1;

        const res = this.subtractWorkingDays(end, dur, holidaysMap);

        schedule[i] = {
          ...act,
          fechaInicio: res.startDate,
          fechaFin: res.endDate,
          feriadosAtravesados: res.holidays,
          calendarDays: res.calendarDays,
          extraDays: res.extraDays
        };
        nextStartDate = res.startDate;
      }

      return schedule;
    }
  };

  window.CronoLogic = CronoLogic;
})(window);
