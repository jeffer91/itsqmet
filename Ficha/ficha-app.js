// =========================================================
// ARCHIVO: ficha-app.js
// Archivo de integración de la Ficha
// - Inicializa la UI
// - Carga estudiantes desde el servicio
// - ACTUALIZADO: Verifica si venimos de la Tabla para abrir un perfil automáticamente
// =========================================================

(function (window, document) {
  "use strict";

  var StudentService = window.FichaStudentService;
  var UI = window.FichaUI;
  var STORAGE_KEY = "ficha_context_utet"; // La misma clave que usa tabla-perfil-link.js

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[FichaApp]");
    console.log.apply(console, args);
  }

  // Función para revisar si la Tabla nos mandó a abrir a alguien
  function verificarContextoPendiente(listaEstudiantes) {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return; // No hay encargos pendientes

      var ctx = JSON.parse(raw);
      if (!ctx || !ctx.numeroIdentificacion) {
        // Datos inválidos, limpiamos y salimos
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }

      log("Detectado contexto pendiente para cédula:", ctx.numeroIdentificacion);

      // Buscamos al estudiante en la lista cargada
      // Nota: Comparamos como string para evitar errores de tipo
      var encontrado = listaEstudiantes.find(function (s) {
        return (s.numeroIdentificacion || "").toString() === (ctx.numeroIdentificacion || "").toString();
      });

      if (encontrado) {
        log("Estudiante encontrado:", encontrado.Nombres, "ID:", encontrado.id);
        
        // Simulamos la selección automática
        UI.seleccionarEstudiante(encontrado.id);
        
        // Opcional: Si quieres llenar el buscador con su nombre para que se vea bonito
        var inputSearch = document.getElementById("ficha-search-input");
        if(inputSearch) {
             inputSearch.value = encontrado.numeroIdentificacion;
             // Disparamos evento input para que el buscador filtre visualmente también
             var event = new Event('input', { bubbles: true });
             inputSearch.dispatchEvent(event);
        }

      } else {
        console.warn("[FichaApp] No se encontró al estudiante con cédula:", ctx.numeroIdentificacion);
        var status = document.getElementById("ficha-search-status");
        if (status) {
            status.textContent = "No se encontró el estudiante solicitado (Cédula: " + ctx.numeroIdentificacion + ").";
            status.style.color = "#ef4444"; // Un color rojo suave para avisar
        }
      }

      // IMPORTANTE: Borramos el encargo para que si refresca la página (F5) no se vuelva a abrir solo.
      window.localStorage.removeItem(STORAGE_KEY);

    } catch (e) {
      console.error("[FichaApp] Error procesando contexto pendiente:", e);
      window.localStorage.removeItem(STORAGE_KEY); // Limpiar por seguridad
    }
  }

  function init() {
    log("Iniciando Ficha de estudiante…");

    UI.init();

    StudentService
      .loadAll()
      .then(function (lista) {
        UI.setStudents(lista);
        
        // AQUÍ ESTÁ LA MAGIA: Una vez cargados, revisamos si hay que abrir a alguien
        verificarContextoPendiente(lista);
      })
      .catch(function (err) {
        console.error("[FichaApp] Error al cargar estudiantes:", err);
        var status = document.getElementById("ficha-search-status");
        if (status) {
          status.textContent =
            "Error al cargar estudiantes: " + err.message;
        }
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})(window, document);