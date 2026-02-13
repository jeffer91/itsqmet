// tabla-perfil-link.js
// Conecta el botón "Ver" de la tabla con la pantalla Ficha.

(function (window, document) {
  "use strict";

  var STORAGE_KEY = "ficha_context_utet";
  
  // CORRECCIÓN: Subimos 2 niveles (../../) porque Tabla está dentro de Gestion
  var FICHA_URL = "../../Ficha/ficha.html";

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[TablaPerfilLink]");
    console.log.apply(console, args);
  }

  function buildContextFromButton(btn) {
    if (!btn) return null;

    var cedula = btn.getAttribute("data-cedula") || "";
    var periodo = btn.getAttribute("data-periodo") || "";
    var nombre = btn.getAttribute("data-nombre") || "";
    var carrera = btn.getAttribute("data-carrera") || "";

    var row = btn.closest("tr");
    if (row) {
      cedula = cedula || row.getAttribute("data-cedula") || "";
      periodo = periodo || row.getAttribute("data-periodo") || "";
      nombre = nombre || row.getAttribute("data-nombre") || "";
      carrera = carrera || row.getAttribute("data-carrera") || "";
    }

    if (!cedula) {
      log("No se encontró cédula.");
      return null;
    }

    return {
      source: "tabla",
      numeroIdentificacion: cedula,
      periodoAsignado: periodo || null,
      nombre: nombre || null,
      carrera: carrera || null,
      ts: Date.now()
    };
  }

  function handleClick(event) {
    var btn = event.target.closest(".tabla-btn-perfil");
    if (!btn) return;

    event.preventDefault();

    var ctx = buildContextFromButton(btn);
    if (!ctx) {
      alert("No se pudo abrir la ficha.");
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
      log("Contexto guardado:", ctx);
      
      // Navegación
      window.location.href = FICHA_URL;
      
    } catch (e) {
      console.error("[TablaPerfilLink] Error:", e);
    }
  }

  function init() {
    document.addEventListener("click", handleClick);
    log("Escuchando clics en .tabla-btn-perfil");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})(window, document);