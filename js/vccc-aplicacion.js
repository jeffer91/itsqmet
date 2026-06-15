/*
=========================================================
Nombre completo: vccc-aplicacion.js
Ruta o ubicación: /js/vccc-aplicacion.js

Función o funciones:
1. Controlar el flujo principal de la aplicación VCCC.
2. Tomar archivos y datos generales desde la pantalla.
3. Ejecutar lectura, normalización y validación.
4. Activar aprobación solo si no existen errores críticos.
5. Coordinar respaldo local en JSON y Excel.
6. Actualizar historial y mensajes de interfaz.

Con qué se comunica:
- vccc-index.html
- vccc-menu-superior.js
- vccc-utilidades.js
- vccc-configuracion.js
- vccc-lector-excel.js
- vccc-normalizador-datos.js
- vccc-validador-ccc.js
- vccc-interfaz.js
- vccc-almacen-exportador.js

Qué aporta:
- Une todos los módulos de la app.
- Evita que cada archivo haga tareas que no le corresponden.
=========================================================
*/

(function (window, document) {
  "use strict";

  var VCCC = window.VCCC = window.VCCC || {};
  var U = VCCC.Utilidades;
  var Lector = VCCC.LectorExcel;
  var Normalizador = VCCC.NormalizadorDatos;
  var Validador = VCCC.ValidadorCCC;
  var UI = VCCC.Interfaz;
  var Almacen = VCCC.AlmacenExportador;
  var Menu = VCCC.MenuSuperior;

  var estado = {
    archivos: {
      redesBase: null,
      peaUnidades: null,
      peaActividades: null
    },
    contexto: null,
    resultado: null
  };

  function obtener(id) {
    return document.getElementById(id);
  }

  function archivoDe(id) {
    var input = obtener(id);
    if (!input || !input.files || !input.files.length) return null;
    return input.files[0];
  }

  function textoInput(id) {
    var input = obtener(id);
    return input ? U.texto(input.value) : "";
  }

  function valorInput(id) {
    var input = obtener(id);
    return input ? input.value : "";
  }

  function actualizarNombreArchivo(inputId, etiquetaId) {
    var archivo = archivoDe(inputId);
    var etiqueta = obtener(etiquetaId);

    if (!etiqueta) return;

    etiqueta.textContent = archivo ? archivo.name : "Ningún archivo seleccionado";
  }

  function capturarArchivos() {
    estado.archivos.redesBase = archivoDe("vccc-archivo-redes");
    estado.archivos.peaUnidades = archivoDe("vccc-archivo-unidades");
    estado.archivos.peaActividades = archivoDe("vccc-archivo-actividades");

    return estado.archivos;
  }

  function capturarDatosUsuario() {
    return {
      asignatura: textoInput("vccc-asignatura"),
      carrera: textoInput("vccc-carrera"),
      nivel: textoInput("vccc-nivel"),
      tipo: valorInput("vccc-tipo") || "materia"
    };
  }

  function activarBotonAprobar(activar) {
    var boton = obtener("vccc-btn-aprobar");
    if (boton) boton.disabled = !activar;
  }

  function validarCargaBasica(archivos) {
    if (!archivos.redesBase || !archivos.peaUnidades || !archivos.peaActividades) {
      throw new Error("Debes cargar los 3 archivos: Redes base, PEA unidades Logros y PEA actividades Logros.");
    }
  }

  async function ejecutarValidacion() {
    try {
      UI.limpiarAlerta();
      activarBotonAprobar(false);

      var archivos = capturarArchivos();
      validarCargaBasica(archivos);

      UI.mostrarAlerta("info", "Leyendo archivos Excel. Espera un momento...");

      var archivosLeidos = await Lector.leerArchivos(archivos);
      var datosUsuario = capturarDatosUsuario();

      estado.contexto = Normalizador.prepararContexto(archivosLeidos, datosUsuario);
      estado.resultado = Validador.validar(estado.contexto);

      UI.pintarResultado(estado.resultado);

      if (Menu && typeof Menu.mostrarVista === "function") {
        Menu.mostrarVista("resultados");
      }

      if (estado.resultado.aprobable) {
        activarBotonAprobar(true);

        if (estado.resultado.estado === "Aprobado") {
          UI.mostrarAlerta("ok", "Validación finalizada. El CCC no presenta errores críticos.");
        } else {
          UI.mostrarAlerta("aviso", "Validación finalizada. No hay errores críticos, pero existen advertencias o sugerencias para revisar.");
        }
      } else {
        activarBotonAprobar(false);
        UI.mostrarAlerta("error", "Validación finalizada. Existen errores críticos que deben corregirse antes de aprobar.");
      }
    } catch (error) {
      console.error(error);
      activarBotonAprobar(false);
      UI.mostrarAlerta("error", error.message || "Ocurrió un error durante la validación.");
    }
  }

  async function aprobarValidacion() {
    try {
      if (!estado.contexto || !estado.resultado) {
        UI.mostrarAlerta("error", "Primero debes ejecutar una validación.");
        return;
      }

      if (!estado.resultado.aprobable) {
        UI.mostrarAlerta("error", "No se puede aprobar porque existen errores críticos.");
        return;
      }

      var confirmar = window.confirm("¿Confirmas que deseas aprobar este CCC y generar respaldo local en JSON y Excel?");
      if (!confirmar) return;

      UI.mostrarAlerta("info", "Guardando respaldo local. Espera un momento...");

      var salida = await Almacen.aprobarYRespaldar(estado.contexto, estado.resultado);

      UI.pintarHistorial(salida.historial);

      if (Menu && typeof Menu.mostrarVista === "function") {
        Menu.mostrarVista("historial");
      }

      UI.mostrarAlerta("ok", "CCC aprobado y respaldado correctamente. Archivos generados: " + salida.archivos.join(", "));
    } catch (error) {
      console.error(error);
      UI.mostrarAlerta("error", error.message || "No se pudo guardar el respaldo.");
    }
  }

  async function seleccionarCarpeta() {
    try {
      var salida = await Almacen.seleccionarCarpeta();
      UI.mostrarAlerta(salida.ok ? "ok" : "aviso", salida.mensaje);
    } catch (error) {
      console.warn(error);
      UI.mostrarAlerta("aviso", "No se seleccionó carpeta. Se usará descarga automática al aprobar.");
    }
  }

  function limpiarFormulario() {
    ["vccc-archivo-redes", "vccc-archivo-unidades", "vccc-archivo-actividades"].forEach(function (id) {
      var input = obtener(id);
      if (input) input.value = "";
    });

    ["vccc-asignatura", "vccc-carrera", "vccc-nivel"].forEach(function (id) {
      var input = obtener(id);
      if (input) input.value = "";
    });

    var tipo = obtener("vccc-tipo");
    if (tipo) tipo.value = "materia";

    actualizarNombreArchivo("vccc-archivo-redes", "vccc-nombre-redes");
    actualizarNombreArchivo("vccc-archivo-unidades", "vccc-nombre-unidades");
    actualizarNombreArchivo("vccc-archivo-actividades", "vccc-nombre-actividades");

    estado.archivos = {
      redesBase: null,
      peaUnidades: null,
      peaActividades: null
    };
    estado.contexto = null;
    estado.resultado = null;

    activarBotonAprobar(false);
    UI.limpiarResultado();
  }

  async function cargarHistorialInicial() {
    try {
      var registros = await Almacen.listarRegistros();
      UI.pintarHistorial(registros);
    } catch (error) {
      console.warn("No se pudo cargar historial inicial:", error);
    }
  }

  function enlazarCargaArchivos() {
    var archivoRedes = obtener("vccc-archivo-redes");
    var archivoUnidades = obtener("vccc-archivo-unidades");
    var archivoActividades = obtener("vccc-archivo-actividades");

    if (archivoRedes) {
      archivoRedes.addEventListener("change", function () {
        actualizarNombreArchivo("vccc-archivo-redes", "vccc-nombre-redes");
      });
    }

    if (archivoUnidades) {
      archivoUnidades.addEventListener("change", function () {
        actualizarNombreArchivo("vccc-archivo-unidades", "vccc-nombre-unidades");
      });
    }

    if (archivoActividades) {
      archivoActividades.addEventListener("change", function () {
        actualizarNombreArchivo("vccc-archivo-actividades", "vccc-nombre-actividades");
      });
    }
  }

  function enlazarBotones() {
    var btnValidar = obtener("vccc-btn-validar");
    var btnAprobar = obtener("vccc-btn-aprobar");
    var btnLimpiar = obtener("vccc-btn-limpiar");
    var btnCarpeta = obtener("vccc-btn-seleccionar-carpeta");

    if (btnValidar) btnValidar.addEventListener("click", ejecutarValidacion);
    if (btnAprobar) btnAprobar.addEventListener("click", aprobarValidacion);
    if (btnLimpiar) btnLimpiar.addEventListener("click", limpiarFormulario);
    if (btnCarpeta) btnCarpeta.addEventListener("click", seleccionarCarpeta);
  }

  function iniciar() {
    enlazarCargaArchivos();
    enlazarBotones();
    cargarHistorialInicial();
    activarBotonAprobar(false);
  }

  document.addEventListener("DOMContentLoaded", iniciar);

  VCCC.Aplicacion = {
    ejecutarValidacion: ejecutarValidacion,
    aprobarValidacion: aprobarValidacion,
    limpiarFormulario: limpiarFormulario
  };
})(window, document);
