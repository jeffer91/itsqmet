// =========================================================
// Archivo: excel-ui.borrado.js
// Ruta: /Gestion/Excel/excel-ui.borrado.js
// Función: UI Sección Borrado (solo alumnos / periodo completo)
// - Muestra selector de período dentro de Borrado
// - Muestra cantidad de alumnos del período
// - Habilita botones solo si hay período seleccionado
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

  function ensureDb() {
    if (!window.db || typeof window.db.collection !== "function") {
      throw new Error("Firestore no inicializado: window.db no existe.");
    }
    return window.db;
  }

  function getEstudiantesCol() {
    // Preferir constantes si existen
    if (window.ExcelConstants && window.ExcelConstants.COL && window.ExcelConstants.COL.ESTUDIANTES) {
      return window.ExcelConstants.COL.ESTUDIANTES;
    }
    return "Estudiantes";
  }

  function lock(locked) {
    if (els.periodSelect) els.periodSelect.disabled = !!locked;
    if (els.delAlumnosBtn) els.delAlumnosBtn.disabled = !!locked || !els.periodSelect?.value;
    if (els.delCompletoBtn) els.delCompletoBtn.disabled = !!locked || !els.periodSelect?.value;
  }

  function labelPeriodoFromSelect() {
    const pid = els.periodSelect?.value || "";
    if (!pid) return "";
    const opt = els.periodSelect.options[els.periodSelect.selectedIndex];
    return (opt && opt.textContent) ? opt.textContent : pid;
  }

  async function contarAlumnos(periodoId) {
    const db = ensureDb();
    const col = getEstudiantesCol();

    // Compat con datos antiguos: ultimoPeriodoId y/o periodoId
    const s1 = await db.collection(col).where("ultimoPeriodoId", "==", periodoId).get();
    const s2 = await db.collection(col).where("periodoId", "==", periodoId).get();

    const ids = new Set();
    s1.forEach(d => ids.add(d.id));
    s2.forEach(d => ids.add(d.id));
    return ids.size;
  }

  async function refreshCount() {
    if (!els.countBox) return;

    const pid = els.periodSelect?.value || "";
    if (!pid) {
      els.countBox.textContent = "—";
      lock(false);
      return;
    }

    els.countBox.textContent = "…";
    lock(false);
    try {
      const n = await contarAlumnos(pid);
      els.countBox.textContent = String(n);
    } catch (e) {
      console.error("[excel-ui.borrado] contar alumnos", e);
      els.countBox.textContent = "ERR";
    } finally {
      lock(false);
    }
  }

  async function fillPeriods(selectedId) {
    must("ExcelPeriodos");
    const periods = await window.ExcelPeriodos.listarTodos();

    els.periodSelect.innerHTML = "";

    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Selecciona un período";
    els.periodSelect.appendChild(opt0);

    (periods || []).forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.label || p.id;
      els.periodSelect.appendChild(opt);
    });

    if (selectedId) {
      const idx = Array.from(els.periodSelect.options).findIndex(o => o.value === selectedId);
      if (idx >= 0) els.periodSelect.selectedIndex = idx;
    }
  }

  async function refreshPeriods(keepStateSelection = true) {
    must("ExcelState");
    lock(true);
    try {
      const st = window.ExcelState.get();
      const selectedId = keepStateSelection ? (st.periodoId || "") : "";

      await fillPeriods(selectedId);

      // Si el state tenía periodoId pero ya no existe, limpiar
      if (keepStateSelection && st.periodoId) {
        const exists = Array.from(els.periodSelect.options).some(o => o.value === st.periodoId);
        if (!exists) {
          window.ExcelState.set({ periodoId: "", periodoLabel: "" });
          window.ExcelState.emit("period:changed", { periodoId: "", periodoLabel: "" });
          els.periodSelect.value = "";
        }
      }

      lock(false);
      await refreshCount();
    } catch (e) {
      console.error("[excel-ui.borrado] refreshPeriods", e);
      // No rompemos UI, solo deshabilitamos
      lock(true);
    } finally {
      lock(false);
    }
  }

  function onPeriodChange() {
    must("ExcelState");
    const pid = els.periodSelect.value || "";
    const label = pid ? labelPeriodoFromSelect() : "";

    // Sincroniza el período global del módulo
    window.ExcelState.set({ periodoId: pid, periodoLabel: label });
    window.ExcelState.emit("period:changed", { periodoId: pid, periodoLabel: label });

    lock(false);
    refreshCount();
  }

  async function borrarAlumnos() {
    must("ExcelState"); must("ExcelDeleteService");

    const pid = els.periodSelect?.value || "";
    if (!pid) return alert("Selecciona un período.");

    const label = labelPeriodoFromSelect();
    const cantidad = els.countBox ? (els.countBox.textContent || "—") : "—";

    const ok = confirm(
      "⚠️ Borrar SOLO alumnos del período:\n\n" +
      `${label}\n` +
      `Alumnos detectados: ${cantidad}\n\n` +
      "Esto eliminará en Firestore los estudiantes cuyo ultimoPeriodoId/períodoId coincide.\n" +
      "El período y el historial NO se borran.\n\n¿Continuar?"
    );
    if (!ok) return;

    lock(true);
    try {
      const res = await window.ExcelDeleteService.borrarSoloAlumnos(pid);
      alert(`Eliminación completada.\nEliminados: ${res.eliminados}`);
      window.ExcelState.emit("delete:done", { tipo: "alumnos", ...res });

      // refrescar contador
      await refreshCount();
    } catch (e) {
      console.error("[excel-ui.borrado] borrar alumnos", e);
      alert(e.message || "No se pudo borrar.");
    } finally {
      lock(false);
    }
  }

  async function borrarCompleto() {
    must("ExcelState"); must("ExcelDeleteService"); must("ExcelUICargar");

    const pid = els.periodSelect?.value || "";
    if (!pid) return alert("Selecciona un período.");

    const label = labelPeriodoFromSelect();
    const cantidad = els.countBox ? (els.countBox.textContent || "—") : "—";

    const ok = confirm(
      "⛔ BORRADO COMPLETO:\n\n" +
      `${label}\n` +
      `Alumnos detectados: ${cantidad}\n\n` +
      "Esto borrará:\n" +
      "1) Alumnos del período\n" +
      "2) Historial del período\n" +
      "3) El documento del período\n\n" +
      "¿Deseas continuar?"
    );
    if (!ok) return;

    const ok2 = confirm("CONFIRMACIÓN FINAL: ¿Seguro que deseas borrar el período COMPLETO?");
    if (!ok2) return;

    lock(true);
    try {
      const res = await window.ExcelDeleteService.borrarPeriodoCompleto(pid);
      alert(
        "Borrado completo OK.\n\n" +
        `Alumnos eliminados: ${res.eliminadosAlumnos}\n` +
        `Historial eliminado: ${res.eliminadosHistorial}\n` +
        `Período eliminado: ${res.periodoEliminado ? "Sí" : "No"}`
      );

      // refrescar lista períodos (selector principal de Cargar) y el selector local
      await window.ExcelUICargar.refreshPeriods(true);
      await refreshPeriods(false);

      // limpiar estado actual (periodoId queda vacío al no existir)
      window.ExcelState.set({
        periodoId: "",
        periodoLabel: "",
        fileName: "",
        headers: [],
        rows: [],
        schema: null,
        analisis: null,
        consolidado: null,
        resumenRobusto: null,
      });

      window.ExcelState.emit("delete:done", { tipo: "completo", ...res });
    } catch (e) {
      console.error("[excel-ui.borrado] borrar completo", e);
      alert(e.message || "No se pudo borrar el período.");
    } finally {
      lock(false);
    }
  }

  function injectUIIfMissing() {
    const sec = byId("sec-borrado");
    if (!sec) return;

    // Si ya existe, no duplicar
    if (byId("excel-delete-period-select") && byId("excel-delete-students-count")) return;

    // Insertar un bloque "row" antes de los botones (en la sección de borrado)
    const row = document.createElement("div");
    row.className = "row";
    row.style.alignItems = "flex-end";

    const field = document.createElement("div");
    field.className = "field medium";

    const label = document.createElement("label");
    label.textContent = "Período a borrar";

    const select = document.createElement("select");
    select.id = "excel-delete-period-select";

    field.appendChild(label);
    field.appendChild(select);

    const field2 = document.createElement("div");
    field2.className = "field small";

    const label2 = document.createElement("label");
    label2.textContent = "Alumnos del período";

    const pill = document.createElement("div");
    pill.className = "period-pill";
    pill.style.justifyContent = "space-between";
    pill.style.gap = "10px";

    const left = document.createElement("span");
    left.textContent = "Total";

    const right = document.createElement("span");
    right.id = "excel-delete-students-count";
    right.textContent = "—";
    right.style.fontWeight = "900";

    pill.appendChild(left);
    pill.appendChild(right);

    field2.appendChild(label2);
    field2.appendChild(pill);

    row.appendChild(field);
    row.appendChild(field2);

    // Insertar al inicio del bloque de Borrado, después del header
    const head = sec.querySelector(".block-head");
    if (head && head.nextSibling) sec.insertBefore(row, head.nextSibling);
    else sec.appendChild(row);
  }

function boot() {
  if (booted) return;

  // Si el DOM aún no está listo, reintentar cuando cargue
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
    return;
  }

  injectUIIfMissing();

  els = {
    periodSelect: byId("excel-delete-period-select"),
    countBox: byId("excel-delete-students-count"),
    delAlumnosBtn: byId("excel-delete-students-btn"),
    delCompletoBtn: byId("excel-delete-period-full-btn"),
  };

  // Si la sección/IDs no existen todavía, reintentar en el siguiente tick
  if (!els.periodSelect) {
    setTimeout(boot, 0);
    return;
  }

  booted = true;

  if (els.periodSelect) els.periodSelect.addEventListener("change", onPeriodChange);
  if (els.delAlumnosBtn) els.delAlumnosBtn.addEventListener("click", borrarAlumnos);
  if (els.delCompletoBtn) els.delCompletoBtn.addEventListener("click", borrarCompleto);

  // Estado inicial
  lock(false);
  refreshPeriods(true);

  // Si cambia el período en otra sección, reflejarlo aquí
  must("ExcelState");
  window.ExcelState.on("period:changed", () => {
    const st = window.ExcelState.get();
    if (els.periodSelect && st.periodoId && els.periodSelect.value !== st.periodoId) {
      els.periodSelect.value = st.periodoId;
    }
    refreshCount();
    lock(false);
  });

  // Luego de borrados, refrescar conteo
  window.ExcelState.on("delete:done", () => {
    refreshPeriods(true);
  });
}


  window.ExcelUIBorrado = { boot };
})(window, document);
