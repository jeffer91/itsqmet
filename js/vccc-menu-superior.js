/*
=========================================================
Nombre completo: vccc-menu-superior.js
Ruta o ubicación: /js/vccc-menu-superior.js

Función o funciones:
1. Controlar el menú superior independiente de VCCC.
2. Cambiar entre vistas internas sin recargar la página.
3. Marcar visualmente la opción activa del menú.
4. Permitir navegación desde botones internos con data-vccc-ir.
5. Emitir un evento interno cuando cambia la vista.

Con qué se comunica:
- /vccc-index.html
- /css/vccc-estilos-principales.css
- /js/vccc-aplicacion.js

Qué aporta:
- Separa la navegación del resto de la lógica.
- Permite modificar el menú sin tocar validadores, Excel ni almacenamiento.
=========================================================
*/

(function (window, document) {
  "use strict";

  var VCCC = window.VCCC = window.VCCC || {};
  var vistaActual = "inicio";

  function obtenerVistaId(nombreVista) {
    return "vccc-vista-" + nombreVista;
  }

  function obtenerBotonesMenu() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-vccc-vista]"));
  }

  function obtenerBotonesIr() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-vccc-ir]"));
  }

  function ocultarTodasLasVistas() {
    document.querySelectorAll(".vccc-vista").forEach(function (vista) {
      vista.classList.remove("activa");
    });
  }

  function desactivarBotones() {
    obtenerBotonesMenu().forEach(function (boton) {
      boton.classList.remove("activo");
    });
  }

  function activarBoton(nombreVista) {
    obtenerBotonesMenu().forEach(function (boton) {
      if (boton.getAttribute("data-vccc-vista") === nombreVista) {
        boton.classList.add("activo");
      }
    });
  }

  function emitirCambioVista(nombreVista) {
    var evento = new CustomEvent("vccc:cambio-vista", {
      detail: { vista: nombreVista }
    });
    document.dispatchEvent(evento);
  }

  function mostrarVista(nombreVista) {
    var vista = document.getElementById(obtenerVistaId(nombreVista));

    if (!vista) {
      console.warn("VCCC: no existe la vista solicitada:", nombreVista);
      return false;
    }

    ocultarTodasLasVistas();
    desactivarBotones();
    vista.classList.add("activa");
    activarBoton(nombreVista);
    vistaActual = nombreVista;
    emitirCambioVista(nombreVista);

    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function enlazarMenuSuperior() {
    obtenerBotonesMenu().forEach(function (boton) {
      boton.addEventListener("click", function () {
        mostrarVista(boton.getAttribute("data-vccc-vista"));
      });
    });
  }

  function enlazarBotonesInternos() {
    obtenerBotonesIr().forEach(function (boton) {
      boton.addEventListener("click", function () {
        mostrarVista(boton.getAttribute("data-vccc-ir"));
      });
    });
  }

  function iniciar() {
    enlazarMenuSuperior();
    enlazarBotonesInternos();

    if (document.getElementById(obtenerVistaId(vistaActual))) {
      mostrarVista(vistaActual);
    }
  }

  document.addEventListener("DOMContentLoaded", iniciar);

  VCCC.MenuSuperior = {
    mostrarVista: mostrarVista,
    obtenerVistaActual: function () {
      return vistaActual;
    }
  };
})(window, document);
