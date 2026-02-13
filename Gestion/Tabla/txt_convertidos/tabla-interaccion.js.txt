// tabla-interaccion.js
// ------------------------------------------------------
// UX + GUARDADO DE OBSERVACIONES
// ------------------------------------------------------
// - Maneja interacciones pequeñas de UX
// - Controla el botón "Guardar observaciones"
// - Llama a TablaBus.guardarObservaciones (Firebase)
// ------------------------------------------------------

(function (window, document) {
  "use strict";

  // ============================================================
  // Módulo de UX
  // ============================================================

  function mostrarPensando(idBoton) {
    const btn = document.getElementById(idBoton);
    if (!btn) return;

    btn.dataset.prev = btn.textContent;
    btn.textContent = "Procesando...";
    btn.disabled = true;
  }

  function restaurarBoton(idBoton) {
    const btn = document.getElementById(idBoton);
    if (!btn) return;

    btn.textContent = btn.dataset.prev || "Guardar";
    btn.disabled = false;
  }

  function alerta(msj) {
    alert(msj);
  }

  // ============================================================
  // Guardar observaciones
  // ============================================================

  async function handleGuardarObservaciones() {
    const BTN_ID = "tabla-save-observaciones";

    mostrarPensando(BTN_ID);

    try {
      const textareas = document.querySelectorAll(".obs-box[data-id]");
      if (!textareas.length) {
        alerta("No hay observaciones para guardar.");
        restaurarBoton(BTN_ID);
        return;
      }

      const payload = [];

      textareas.forEach(t => {
        const id = t.dataset.id;
        if (!id) return;

        let valor = t.value || "";

        // Elimina el mensaje automático si estuviera en el texto
        valor = valor.replace("⚠️ Estudiante removido del Excel anterior", "");
        valor = valor.trim();

        payload.push({
          id,
          observacion: valor
        });
      });

      if (!payload.length) {
        alerta("No hay observaciones válidas para guardar.");
        restaurarBoton(BTN_ID);
        return;
      }

      if (!window.TablaBus || !window.TablaBus.guardarObservaciones) {
        console.error("[tabla-interaccion] TablaBus.guardarObservaciones no está disponible.");
        alerta("No se pudo guardar. Falta configuración de TablaBus.");
        restaurarBoton(BTN_ID);
        return;
      }

      await window.TablaBus.guardarObservaciones(payload);

      alerta("Observaciones guardadas correctamente.");
    } catch (e) {
      console.error("[tabla-interaccion] Error guardando observaciones:", e);
      alerta("Ocurrió un error al guardar las observaciones.");
    }

    restaurarBoton(BTN_ID);
  }

  // ============================================================
  // INIT
  // ============================================================

  function init() {
    const btn = document.getElementById("tabla-save-observaciones");
    if (!btn) {
      console.warn("[tabla-interaccion] No se encontró el botón #tabla-save-observaciones.");
      return;
    }

    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      handleGuardarObservaciones();
    });

    console.log("[tabla-interaccion] Listo. Botón de guardar conectado.");
  }

  // Exportar UX básico
  window.TablaUX = {
    mostrarPensando,
    restaurarBoton,
    alerta
  };

  // Auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})(window, document);
