/*
=========================================================
Nombre completo: vccc-almacen-exportador.js
Ruta o ubicación: /js/vccc-almacen-exportador.js

Función o funciones:
1. Guardar validaciones aprobadas en IndexedDB.
2. Generar respaldo individual en JSON.
3. Generar respaldo individual en Excel.
4. Generar respaldo global histórico en JSON.
5. Generar respaldo global histórico en Excel.
6. Guardar en carpeta local si el navegador lo permite o descargar como respaldo.

Con qué se comunica:
- vccc-utilidades.js
- vccc-configuracion.js
- vccc-validador-ccc.js
- vccc-interfaz.js
- vccc-aplicacion.js
- Librería SheetJS XLSX.

Qué aporta:
- Conserva historial local.
- Genera respaldos automáticos al aprobar una validación.
=========================================================
*/

(function (window) {
  "use strict";

  var VCCC = window.VCCC = window.VCCC || {};
  var U = VCCC.Utilidades;
  var C = VCCC.Configuracion;

  var nombreBD = C.app.almacenamiento;
  var versionBD = 1;
  var nombreTabla = "validaciones";
  var carpetaSeleccionada = null;

  function abrirBD() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("El navegador no permite almacenamiento local IndexedDB."));
        return;
      }

      var solicitud = indexedDB.open(nombreBD, versionBD);

      solicitud.onupgradeneeded = function (evento) {
        var db = evento.target.result;

        if (!db.objectStoreNames.contains(nombreTabla)) {
          var tabla = db.createObjectStore(nombreTabla, { keyPath: "id" });
          tabla.createIndex("fecha", "fecha", { unique: false });
          tabla.createIndex("asignatura", "asignatura", { unique: false });
        }
      };

      solicitud.onsuccess = function () {
        resolve(solicitud.result);
      };

      solicitud.onerror = function () {
        reject(new Error("No se pudo abrir el almacenamiento local."));
      };
    });
  }

  async function guardarRegistro(registro) {
    var db = await abrirBD();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(nombreTabla, "readwrite");
      var tabla = tx.objectStore(nombreTabla);

      tabla.put(registro);

      tx.oncomplete = function () {
        db.close();
        resolve(registro);
      };

      tx.onerror = function () {
        db.close();
        reject(new Error("No se pudo guardar el registro local."));
      };
    });
  }

  async function listarRegistros() {
    var db = await abrirBD();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(nombreTabla, "readonly");
      var tabla = tx.objectStore(nombreTabla);
      var solicitud = tabla.getAll();

      solicitud.onsuccess = function () {
        db.close();
        resolve(solicitud.result || []);
      };

      solicitud.onerror = function () {
        db.close();
        reject(new Error("No se pudo leer el historial local."));
      };
    });
  }

  async function seleccionarCarpeta() {
    if (!window.showDirectoryPicker) {
      return {
        ok: false,
        mensaje: "Tu navegador no permite seleccionar carpeta local. Se usará descarga automática al aprobar."
      };
    }

    carpetaSeleccionada = await window.showDirectoryPicker({ mode: "readwrite" });

    return {
      ok: true,
      mensaje: "Carpeta de respaldo seleccionada correctamente."
    };
  }

  function crearRegistro(ctx, resultado) {
    var fh = U.fechaHoraActual();
    var asignaturaSlug = U.slug(ctx.metadatos.asignatura);

    return {
      id: U.crearId("vccc-aprobado"),
      fecha: fh.fecha,
      hora: fh.hora,
      sello: fh.sello,
      asignatura: ctx.metadatos.asignatura,
      carrera: ctx.metadatos.carrera,
      nivel: ctx.metadatos.nivel,
      tipo: ctx.metadatos.tipo,
      estado: "Aprobado",
      puntajeGeneral: resultado.puntajes.general,
      erroresCriticos: resultado.resumen.criticos,
      advertencias: resultado.resumen.advertencias,
      sugerencias: resultado.resumen.sugerencias,
      archivoRedesBase: ctx.archivos.redesBase ? ctx.archivos.redesBase.nombreArchivo : "",
      archivoPeaUnidades: ctx.archivos.peaUnidades ? ctx.archivos.peaUnidades.nombreArchivo : "",
      archivoPeaActividades: ctx.archivos.peaActividades ? ctx.archivos.peaActividades.nombreArchivo : "",
      puntajes: resultado.puntajes,
      observaciones: resultado.observaciones,
      nombreBaseArchivo: "vccc-validacion-" + asignaturaSlug + "-" + fh.sello
    };
  }

  function crearBlobJSON(datos) {
    return new Blob([JSON.stringify(datos, null, 2)], {
      type: "application/json;charset=utf-8"
    });
  }

  function validarXLSX() {
    if (!window.XLSX) {
      throw new Error("No se encontró la librería XLSX para generar Excel.");
    }
  }

  function crearBlobExcelRegistro(registro) {
    validarXLSX();

    var libro = window.XLSX.utils.book_new();

    var resumen = [{
      ID: registro.id,
      Fecha: registro.fecha,
      Hora: registro.hora,
      Asignatura: registro.asignatura,
      Carrera: registro.carrera,
      Nivel: registro.nivel,
      Tipo: registro.tipo,
      Estado: registro.estado,
      "Puntaje general": registro.puntajeGeneral,
      "Errores críticos": registro.erroresCriticos,
      Advertencias: registro.advertencias,
      Sugerencias: registro.sugerencias,
      "Archivo Redes base": registro.archivoRedesBase,
      "Archivo PEA unidades": registro.archivoPeaUnidades,
      "Archivo PEA actividades": registro.archivoPeaActividades
    }];

    var puntajes = Object.keys(registro.puntajes || {}).map(function (k) {
      return { Seccion: k, Puntaje: registro.puntajes[k] };
    });

    var observaciones = (registro.observaciones || []).map(function (obs) {
      return {
        Seccion: obs.seccion,
        Severidad: obs.severidad,
        Titulo: obs.titulo,
        Mensaje: obs.mensaje,
        Detalle: obs.detalle,
        Referencia: obs.referencia
      };
    });

    window.XLSX.utils.book_append_sheet(libro, window.XLSX.utils.json_to_sheet(resumen), "Resumen");
    window.XLSX.utils.book_append_sheet(libro, window.XLSX.utils.json_to_sheet(puntajes), "Puntajes");
    window.XLSX.utils.book_append_sheet(libro, window.XLSX.utils.json_to_sheet(observaciones), "Observaciones");

    var arrayBuffer = window.XLSX.write(libro, { bookType: "xlsx", type: "array" });

    return new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
  }

  function crearBlobExcelGlobal(registros) {
    validarXLSX();

    var libro = window.XLSX.utils.book_new();
    var filas = (registros || []).map(function (r) {
      return {
        ID: r.id,
        Fecha: r.fecha,
        Hora: r.hora,
        Asignatura: r.asignatura,
        Carrera: r.carrera,
        Nivel: r.nivel,
        Tipo: r.tipo,
        Estado: r.estado,
        "Puntaje general": r.puntajeGeneral,
        "Errores críticos": r.erroresCriticos,
        Advertencias: r.advertencias,
        Sugerencias: r.sugerencias,
        "Archivo Redes base": r.archivoRedesBase,
        "Archivo PEA unidades": r.archivoPeaUnidades,
        "Archivo PEA actividades": r.archivoPeaActividades
      };
    });

    window.XLSX.utils.book_append_sheet(libro, window.XLSX.utils.json_to_sheet(filas), "Historial");

    var arrayBuffer = window.XLSX.write(libro, { bookType: "xlsx", type: "array" });

    return new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
  }

  async function guardarArchivo(nombre, blob) {
    if (carpetaSeleccionada) {
      var archivo = await carpetaSeleccionada.getFileHandle(nombre, { create: true });
      var escritor = await archivo.createWritable();
      await escritor.write(blob);
      await escritor.close();
      return;
    }

    U.descargarBlob(nombre, blob);
  }

  async function aprobarYRespaldar(ctx, resultado) {
    var registro = crearRegistro(ctx, resultado);

    await guardarRegistro(registro);

    var historial = await listarRegistros();
    var nombreJsonIndividual = registro.nombreBaseArchivo + ".json";
    var nombreExcelIndividual = registro.nombreBaseArchivo + ".xlsx";
    var nombreJsonGlobal = "vccc-respaldo-global.json";
    var nombreExcelGlobal = "vccc-respaldo-global.xlsx";

    await guardarArchivo(nombreJsonIndividual, crearBlobJSON(registro));
    await guardarArchivo(nombreExcelIndividual, crearBlobExcelRegistro(registro));
    await guardarArchivo(nombreJsonGlobal, crearBlobJSON(historial));
    await guardarArchivo(nombreExcelGlobal, crearBlobExcelGlobal(historial));

    return {
      registro: registro,
      historial: historial,
      archivos: [
        nombreJsonIndividual,
        nombreExcelIndividual,
        nombreJsonGlobal,
        nombreExcelGlobal
      ]
    };
  }

  VCCC.AlmacenExportador = {
    seleccionarCarpeta: seleccionarCarpeta,
    guardarRegistro: guardarRegistro,
    listarRegistros: listarRegistros,
    aprobarYRespaldar: aprobarYRespaldar
  };
})(window);
