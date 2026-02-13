/* Archivo: crono-ui.js */
(function(window) {
  "use strict";

  const CronoUI = {

    formatDate(dateStr) {
      if(!dateStr) return "";
      const [y, m, d] = dateStr.split("-");
      const date = new Date(y, m - 1, d);
      const dayName = date.toLocaleDateString("es-ES", { weekday: "short" }).replace(".","").toUpperCase();
      const shortDate = `${d}/${m}`;
      return `<span class="badge-day">${dayName}</span> ${shortDate}`;
    },

    shortDateFromISO(iso) {
      if (!iso) return "";
      const parts = String(iso).split("-");
      if (parts.length !== 3) return iso;
      return `${parts[2]}/${parts[1]}`;
    },

    // ✅ SOLO fechas, SIN nombres (ni español ni inglés)
    // Soporta objetos {dateISO, nombre} y también strings legacy (si no hay dateISO, no muestra)
    renderHolidayDatesOnly(feriadosAtravesados) {
      if (!Array.isArray(feriadosAtravesados) || feriadosAtravesados.length === 0) return "";

      const dates = feriadosAtravesados
        .map(h => {
          if (h && typeof h === "object" && h.dateISO) return h.dateISO;
          // legacy string: no tiene fecha; no mostramos porque tú quieres días/fechas exactas
          return null;
        })
        .filter(Boolean);

      if (dates.length === 0) return "";

      // ordenar fechas
      dates.sort();

      // compacto
      const maxShow = 3;
      const show = dates.slice(0, maxShow);
      const remaining = dates.length - show.length;

      let html = show.map(iso => {
        const dmy = this.shortDateFromISO(iso);
        return `<div class="badge-holiday"><i class="fas fa-umbrella-beach"></i> ${dmy}</div>`;
      }).join("");

      if (remaining > 0) {
        html += `<div class="badge-warning"><i class="fas fa-ellipsis-h"></i> +${remaining} feriado(s)</div>`;
      }

      return html;
    },

    renderTipos(plantillas, onSelect) {
      const sel = document.getElementById("sel-tipo");

      if (!plantillas || plantillas.length === 0) {
        sel.innerHTML = `<option value="">No hay plantillas</option>`;
        sel.disabled = true;
        return;
      }

      const optionsHtml = plantillas.map(p => {
        const meta = p.meta || {};
        const nombre = meta.nombre || p.nombre || "Sin Nombre";
        const tipo = (meta.tipo || "general").toLowerCase();
        return `<option value="${p.id}" data-tipo="${tipo}">${nombre}</option>`;
      }).join("");

      sel.innerHTML = optionsHtml;

      const updateColor = () => {
        const selectedOption = sel.options[sel.selectedIndex];
        const tipo = selectedOption ? selectedOption.getAttribute("data-tipo") : "general";

        sel.classList.remove("type-articulo", "type-complexivo", "type-trabajo", "type-general");
        if (tipo.includes("articulo")) sel.classList.add("type-articulo");
        else if (tipo.includes("complexivo")) sel.classList.add("type-complexivo");
        else if (tipo.includes("trabajo")) sel.classList.add("type-trabajo");
        else sel.classList.add("type-general");
      };

      sel.addEventListener("change", (e) => {
        updateColor();
        onSelect(e.target.value);
      });

      if (plantillas.length > 0) {
        sel.value = plantillas[0].id;
        updateColor();
        onSelect(plantillas[0].id);
      }
    },

    clearTable() {
      const tbody = document.getElementById("crono-tbody");
      tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:#64748b; padding:30px;">
        <i class="fas fa-calendar-plus" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.3"></i>
        Configura los parámetros o genera un nuevo cronograma
      </td></tr>`;
    },

    renderStats(stats) {
      const container = document.getElementById("crono-stats");
      if (!stats) {
        container.style.display = "none";
        return;
      }

      container.style.display = "grid";
      container.innerHTML = `
        <div class="crono-stat-card" style="border-color: var(--primary);">
          <div class="crono-stat-label">Ventana de Titulación</div>
          <div class="crono-stat-value">${stats.graduationWindow}</div>
          <div class="crono-stat-sub">Fin Clases <i class="fas fa-arrow-right"></i> Defensa</div>
        </div>
        <div class="crono-stat-card" style="border-color: var(--complex);">
          <div class="crono-stat-label">Duración Total</div>
          <div class="crono-stat-value">${stats.totalProcessDays} días</div>
          <div class="crono-stat-sub">Todo el proceso</div>
        </div>
        <div class="crono-stat-card" style="border-color: var(--danger);">
          <div class="crono-stat-label">Impacto No Laborable</div>
          <div class="crono-stat-value">${stats.totalNonWorkingImpact} días</div>
          <div class="crono-stat-sub">Fines de semana + ${stats.uniqueHolidays} Feriados</div>
        </div>
      `;
    },

    renderTable(schedule, onDateChange) {
      const tbody = document.getElementById("crono-tbody");
      tbody.innerHTML = "";

      if (!schedule || schedule.length === 0) {
        this.clearTable();
        return;
      }

      schedule.forEach(row => {
        let obsHtml = "";

        // ✅ Feriados: solo fecha(s) con sombrilla
        obsHtml += this.renderHolidayDatesOnly(row.feriadosAtravesados);

        // ✅ Impacto: corto
        if ((row.extraDays || 0) > 0) {
          obsHtml += `<div class="badge-warning"><i class="fas fa-clock"></i> Impacto: +${row.extraDays} día(s) no laborable(s)</div>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="text-center"><strong>${row.orden}</strong></td>
          <td>${row.nombre}</td>
          <td class="text-center">${row.duracionDias}</td>
          <td>
             <span class="crono-date-display">${this.formatDate(row.fechaInicio)}</span>
             <input type="date" value="${row.fechaInicio}" class="crono-cell-date" 
                    style="opacity: 0; width: 1px; height: 1px; position:absolute;" 
                    data-id="${row.id}" data-field="start">
             <i class="fas fa-edit" style="font-size:0.7rem; color:#cbd5e1; cursor:pointer;" 
                onclick="this.previousElementSibling.showPicker()"></i>
          </td>
          <td>
             <span class="crono-date-display">${this.formatDate(row.fechaFin)}</span>
             <input type="date" value="${row.fechaFin}" class="crono-cell-date" 
                    style="opacity: 0; width: 1px; height: 1px; position:absolute;"
                    data-id="${row.id}" data-field="end">
             <i class="fas fa-edit" style="font-size:0.7rem; color:#cbd5e1; cursor:pointer;" 
                onclick="this.previousElementSibling.showPicker()"></i>
          </td>
          <td>${obsHtml}</td>
        `;
        tbody.appendChild(tr);
      });

      const inputs = tbody.querySelectorAll('.crono-cell-date');
      inputs.forEach(input => {
        input.addEventListener('change', (e) => {
          const val = e.target.value;
          const id = e.target.dataset.id;
          const field = e.target.dataset.field;

          const parentTd = e.target.closest('td');
          const displaySpan = parentTd.querySelector('.crono-date-display');
          if (displaySpan) {
            displaySpan.innerHTML = this.formatDate(val);
          }

          if (onDateChange) {
            onDateChange(id, field, val);
          }
        });
      });
    },

    getScheduleFromTable() {
      return window.State ? window.State.schedule : [];
    },

    async export(type) {
      const schedule = this.getScheduleFromTable();
      if (!schedule || schedule.length === 0) return alert("Genera un cronograma primero.");

      if (type === 'excel') {
        const notesDatesOnly = (feriadosAtravesados) => {
          if (!Array.isArray(feriadosAtravesados) || feriadosAtravesados.length === 0) return "";
          const dates = feriadosAtravesados
            .map(h => (h && typeof h === "object" && h.dateISO) ? this.shortDateFromISO(h.dateISO) : null)
            .filter(Boolean);
          return dates.join(" | ");
        };

        const ws = XLSX.utils.json_to_sheet(schedule.map(s => ({
          Orden: s.orden,
          Actividad: s.nombre,
          Duracion_Habiles: s.duracionDias,
          Dias_Calendario: s.calendarDays,
          Inicio: s.fechaInicio,
          Fin: s.fechaFin,
          Feriados: notesDatesOnly(s.feriadosAtravesados),
          Impacto_No_Laborable: (s.extraDays || 0)
        })));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cronograma");
        XLSX.writeFile(wb, "Cronograma_UTET.xlsx");
      }

      if (type === 'pdf') {
        const selPeriodo = document.getElementById("sel-periodo");
        const periodoLabel = selPeriodo.options[selPeriodo.selectedIndex]?.text || "Período Desconocido";

        if (window.CronoPDF) {
          const btn = document.querySelector(".crono-export-tools button[title='PDF']");
          const originalIcon = btn.innerHTML;
          btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
          btn.disabled = true;

          try {
            await window.CronoPDF.generate(schedule, periodoLabel);
          } catch (e) {
            console.error(e);
            alert("Error generando PDF");
          }

          btn.innerHTML = originalIcon;
          btn.disabled = false;
        } else {
          alert("El módulo de PDF no está cargado.");
        }
      }

      if (type === 'image') {
        const table = document.getElementById("crono-table-wrapper");
        const canvas = await html2canvas(table);
        const link = document.createElement('a');
        link.download = 'cronograma_screenshot.png';
        link.href = canvas.toDataURL();
        link.click();
      }
    }
  };

  window.CronoUI = CronoUI;
})(window);
