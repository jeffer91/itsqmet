/*
=========================================================
Nombre completo: vccc-lector-excel.js
Ruta o ubicación: /js/vccc-lector-excel.js

Función o funciones:
1. Leer archivos Excel .xlsx o .xls desde el navegador.
2. Convertir cada hoja en filas tipo objeto y matriz.
3. Detectar hojas con contenido real.
4. Entregar datos crudos al normalizador.
5. Validar que la librería XLSX esté disponible antes de leer.

Con qué se comunica:
- vccc-utilidades.js
- vccc-configuracion.js
- vccc-normalizador-datos.js
- vccc-aplicacion.js
- Librería SheetJS XLSX.

Qué aporta:
- Permite que VCCC trabaje directamente con archivos Excel cargados por el usuario.
- Evita depender de un backend para leer Excel.
=========================================================
*/

(function (window) {
  "use strict";

  var VCCC = window.VCCC = window.VCCC || {};
  var U = VCCC.Utilidades;

  function validarLibreriaExcel() {
    if (!window.XLSX) {
      throw new Error(
        "No se encontró la librería XLSX. Revisa tu conexión o agrega la librería local vccc-libreria-xlsx.js."
      );
    }
  }

  function validarArchivoExcel(archivo) {
    if (!archivo) {
      throw new Error("No se seleccionó archivo Excel.");
    }

    var nombre = U.texto(archivo.name).toLowerCase();
    var esExcel = nombre.endsWith(".xlsx") || nombre.endsWith(".xls");

    if (!esExcel) {
      throw new Error("El archivo " + archivo.name + " no es un Excel válido.");
    }

    if (archivo.size <= 0) {
      throw new Error("El archivo " + archivo.name + " está vacío.");
    }
  }

  function leerComoArrayBuffer(archivo) {
    return new Promise(function (resolve, reject) {
      validarArchivoExcel(archivo);

      var lector = new FileReader();

      lector.onload = function (evento) {
        resolve(evento.target.result);
      };

      lector.onerror = function () {
        reject(new Error("No se pudo leer el archivo: " + archivo.name));
      };

      lector.readAsArrayBuffer(archivo);
    });
  }

  function hojaTieneDatos(matriz) {
    return Array.isArray(matriz) && matriz.some(function (fila) {
      return Array.isArray(fila) && fila.some(function (celda) {
        return !U.estaVacio(celda);
      });
    });
  }

  function contarFilasUtiles(matriz) {
    if (!Array.isArray(matriz)) return 0;

    return matriz.filter(function (fila) {
      return Array.isArray(fila) && fila.some(function (celda) {
        return !U.estaVacio(celda);
      });
    }).length;
  }

  function convertirHoja(libro, nombreHoja) {
    var hoja = libro.Sheets[nombreHoja];

    var filas = window.XLSX.utils.sheet_to_json(hoja, {
      defval: "",
      raw: false
    });

    var matriz = window.XLSX.utils.sheet_to_json(hoja, {
      header: 1,
      defval: "",
      raw: false
    });

    return {
      nombre: nombreHoja,
      filas: filas,
      matriz: matriz,
      tieneDatos: hojaTieneDatos(matriz),
      totalFilasObjeto: filas.length,
      totalFilasUtiles: contarFilasUtiles(matriz)
    };
  }

  function seleccionarHojaActiva(hojas) {
    if (!Array.isArray(hojas) || hojas.length === 0) return null;

    var conFilasObjeto = hojas.find(function (hoja) {
      return hoja.tieneDatos && hoja.totalFilasObjeto > 0;
    });

    if (conFilasObjeto) return conFilasObjeto;

    var conDatos = hojas.find(function (hoja) {
      return hoja.tieneDatos;
    });

    return conDatos || hojas[0];
  }

  async function leerArchivoExcel(archivo, tipoInterno) {
    validarLibreriaExcel();

    var buffer = await leerComoArrayBuffer(archivo);

    var libro = window.XLSX.read(buffer, {
      type: "array",
      cellDates: false
    });

    var hojas = libro.SheetNames.map(function (nombreHoja) {
      return convertirHoja(libro, nombreHoja);
    });

    return {
      tipoInterno: tipoInterno,
      nombreArchivo: archivo.name,
      tamano: archivo.size,
      totalHojas: hojas.length,
      hojas: hojas,
      hojaActiva: seleccionarHojaActiva(hojas)
    };
  }

  async function leerArchivos(archivos) {
    var salida = {
      redesBase: null,
      peaUnidades: null,
      peaActividades: null
    };

    if (archivos.redesBase) {
      salida.redesBase = await leerArchivoExcel(archivos.redesBase, "redesBase");
    }

    if (archivos.peaUnidades) {
      salida.peaUnidades = await leerArchivoExcel(archivos.peaUnidades, "peaUnidades");
    }

    if (archivos.peaActividades) {
      salida.peaActividades = await leerArchivoExcel(archivos.peaActividades, "peaActividades");
    }

    return salida;
  }

  VCCC.LectorExcel = {
    leerArchivoExcel: leerArchivoExcel,
    leerArchivos: leerArchivos
  };
})(window);
