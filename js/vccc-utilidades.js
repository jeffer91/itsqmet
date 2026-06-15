/*
=========================================================
Nombre completo: vccc-utilidades.js
Ruta o ubicación: /js/vccc-utilidades.js

Función o funciones:
1. Centralizar funciones reutilizables de limpieza, comparación y formato.
2. Normalizar textos, claves, tildes, espacios y numeraciones.
3. Crear identificadores únicos para validaciones y respaldos.
4. Agregar observaciones técnicas al reporte.
5. Descargar archivos generados desde el navegador.

Con qué se comunica:
- vccc-configuracion.js
- vccc-lector-excel.js
- vccc-normalizador-datos.js
- vccc-validador-ccc.js
- vccc-interfaz.js
- vccc-almacen-exportador.js
- vccc-aplicacion.js

Qué aporta:
- Evita repetir funciones en varios archivos.
- Reduce errores por diferencias de tildes, mayúsculas o espacios.
=========================================================
*/

(function (window) {
  "use strict";

  var VCCC = window.VCCC = window.VCCC || {};

  function texto(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor).replace(/\s+/g, " ").trim();
  }

  function quitarTildes(valor) {
    return texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function normalizarClave(valor) {
    return quitarTildes(valor).toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function normalizarTexto(valor) {
    return quitarTildes(valor)
      .toLowerCase()
      .replace(/[“”"']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function estaVacio(valor) {
    return texto(valor).length === 0;
  }

  function slug(valor) {
    return normalizarTexto(valor)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "sin-nombre";
  }

  function fechaHoraActual() {
    var d = new Date();
    var dos = function (n) { return String(n).padStart(2, "0"); };
    var fecha = d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate());
    var hora = dos(d.getHours()) + ":" + dos(d.getMinutes()) + ":" + dos(d.getSeconds());
    var sello = fecha + "_" + dos(d.getHours()) + "-" + dos(d.getMinutes()) + "-" + dos(d.getSeconds());
    return { fecha: fecha, hora: hora, sello: sello };
  }

  function crearId(prefijo) {
    var fh = fechaHoraActual();
    var aleatorio = Math.random().toString(36).slice(2, 8);
    return texto(prefijo || "vccc") + "-" + fh.sello + "-" + aleatorio;
  }

  function normalizarNumeracion(valor) {
    var t = texto(valor)
      .replace(/,/g, ".")
      .replace(/;/g, ".")
      .replace(/\s+/g, "")
      .replace(/^unidad/ig, "")
      .replace(/^u/ig, "");

    t = t.replace(/[^0-9.]/g, "");
    t = t.replace(/\.{2,}/g, ".");
    t = t.replace(/^\.+|\.+$/g, "");
    return t;
  }

  function parsearNumeracion(valor) {
    var limpia = normalizarNumeracion(valor);
    if (!limpia) return [];
    return limpia.split(".").map(function (parte) {
      return parseInt(parte, 10);
    }).filter(function (numero) {
      return Number.isFinite(numero);
    });
  }

  function esNumeracionValida(valor) {
    var limpia = normalizarNumeracion(valor);
    return /^\d+(\.\d+)*$/.test(limpia);
  }

  function compararNumeraciones(a, b) {
    var pa = parsearNumeracion(a);
    var pb = parsearNumeracion(b);
    var max = Math.max(pa.length, pb.length);

    for (var i = 0; i < max; i++) {
      var va = pa[i] || 0;
      var vb = pb[i] || 0;
      if (va !== vb) return va - vb;
    }
    return 0;
  }

  function obtenerVerboInicial(valor) {
    var t = texto(valor);
    if (!t) return "";
    var primeraParte = t.split(/[,.]/)[0] || t;
    var palabra = primeraParte.split(/\s+/)[0] || "";
    return palabra.replace(/[¿?¡!;:()]/g, "").trim();
  }

  function esInfinitivo(verbo) {
    var v = normalizarTexto(verbo);
    return /(ar|er|ir)$/.test(v);
  }

  function contarPalabras(valor) {
    var t = normalizarTexto(valor);
    if (!t) return 0;
    return t.split(" ").filter(Boolean).length;
  }

  function contarOraciones(valor) {
    var t = texto(valor);
    if (!t) return 0;
    return t.split(/[.!?]+/).filter(function (parte) {
      return texto(parte).length > 0;
    }).length;
  }

  function contieneAlguno(valor, lista) {
    var t = normalizarTexto(valor);
    return (lista || []).some(function (item) {
      return t.indexOf(normalizarTexto(item)) >= 0;
    });
  }

  function similitudSimple(a, b) {
    var palabrasA = normalizarTexto(a).split(" ").filter(function (x) { return x.length > 4; });
    var palabrasB = normalizarTexto(b).split(" ").filter(function (x) { return x.length > 4; });
    if (!palabrasA.length || !palabrasB.length) return 0;
    var setB = new Set(palabrasB);
    var comunes = palabrasA.filter(function (palabra) { return setB.has(palabra); });
    return comunes.length / Math.max(palabrasA.length, palabrasB.length);
  }

  function valoresUnicos(lista) {
    return Array.from(new Set((lista || []).map(function (x) {
      return texto(x);
    }).filter(Boolean)));
  }

  function agregarObservacion(lista, datos) {
    if (!Array.isArray(lista)) return;
    lista.push({
      id: crearId("obs"),
      seccion: texto(datos.seccion || "General"),
      severidad: texto(datos.severidad || "sugerencia"),
      titulo: texto(datos.titulo || "Observación"),
      mensaje: texto(datos.mensaje || ""),
      detalle: texto(datos.detalle || ""),
      referencia: texto(datos.referencia || ""),
      valor: datos.valor === undefined ? "" : datos.valor
    });
  }

  function descargarBlob(nombreArchivo, blob) {
    var url = URL.createObjectURL(blob);
    var enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function escapeHTML(valor) {
    return texto(valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function ordenarPorNumeracion(lista, campo) {
    return (lista || []).slice().sort(function (a, b) {
      return compararNumeraciones(a[campo], b[campo]);
    });
  }

  VCCC.Utilidades = {
    texto: texto,
    quitarTildes: quitarTildes,
    normalizarClave: normalizarClave,
    normalizarTexto: normalizarTexto,
    estaVacio: estaVacio,
    slug: slug,
    fechaHoraActual: fechaHoraActual,
    crearId: crearId,
    normalizarNumeracion: normalizarNumeracion,
    parsearNumeracion: parsearNumeracion,
    esNumeracionValida: esNumeracionValida,
    compararNumeraciones: compararNumeraciones,
    obtenerVerboInicial: obtenerVerboInicial,
    esInfinitivo: esInfinitivo,
    contarPalabras: contarPalabras,
    contarOraciones: contarOraciones,
    contieneAlguno: contieneAlguno,
    similitudSimple: similitudSimple,
    valoresUnicos: valoresUnicos,
    agregarObservacion: agregarObservacion,
    descargarBlob: descargarBlob,
    escapeHTML: escapeHTML,
    ordenarPorNumeracion: ordenarPorNumeracion
  };
})(window);
