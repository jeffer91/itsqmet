/*
=========================================================
Nombre completo: vccc-normalizador-datos.js
Ruta o ubicación: /js/vccc-normalizador-datos.js

Función o funciones:
1. Recibir los datos crudos leídos desde Excel.
2. Normalizar nombres de columnas, textos, códigos y numeraciones.
3. Separar información de Redes base, PEA unidades y PEA actividades.
4. Preparar un contexto único para que el validador trabaje con datos ordenados.
5. Inferir datos faltantes básicos sin romper la validación.

Con qué se comunica:
- vccc-utilidades.js
- vccc-configuracion.js
- vccc-lector-excel.js
- vccc-validador-ccc.js
- vccc-aplicacion.js

Qué aporta:
- Reduce errores por tildes, espacios, mayúsculas o columnas con nombres diferentes.
- Permite revisar Excel con formatos parecidos sin romper la validación.
=========================================================
*/

(function (window) {
  "use strict";

  var VCCC = window.VCCC = window.VCCC || {};
  var U = VCCC.Utilidades;
  var C = VCCC.Configuracion;

  function obtenerFilas(archivoLeido) {
    if (!archivoLeido || !archivoLeido.hojaActiva) return [];
    return Array.isArray(archivoLeido.hojaActiva.filas) ? archivoLeido.hojaActiva.filas : [];
  }

  function obtenerMatriz(archivoLeido) {
    if (!archivoLeido || !archivoLeido.hojaActiva) return [];
    return Array.isArray(archivoLeido.hojaActiva.matriz) ? archivoLeido.hojaActiva.matriz : [];
  }

  function normalizarFila(fila) {
    var salida = {};

    Object.keys(fila || {}).forEach(function (claveOriginal) {
      var clave = U.normalizarClave(claveOriginal);
      salida[clave] = fila[claveOriginal];
    });

    return salida;
  }

  function buscarValorPorAlias(filaNormalizada, alias) {
    var clavesAlias = (alias || []).map(U.normalizarClave);

    for (var i = 0; i < clavesAlias.length; i++) {
      var clave = clavesAlias[i];

      if (Object.prototype.hasOwnProperty.call(filaNormalizada, clave)) {
        var valor = filaNormalizada[clave];
        if (!U.estaVacio(valor)) return U.texto(valor);
      }
    }

    return "";
  }

  function valoresFila(filaOriginal) {
    return Object.keys(filaOriginal || {}).map(function (clave) {
      return filaOriginal[clave];
    }).filter(function (valor) {
      return !U.estaVacio(valor);
    }).map(U.texto);
  }

  function encontrarNumeracionEnValores(valores) {
    for (var i = 0; i < valores.length; i++) {
      var posible = U.normalizarNumeracion(valores[i]);
      if (posible && /^\d+(\.\d+)*$/.test(posible)) {
        return posible;
      }
    }

    return "";
  }

  function encontrarNumeracionEnFila(filaOriginal) {
    return encontrarNumeracionEnValores(valoresFila(filaOriginal));
  }

  function textoPrincipal(filaOriginal, filaNormalizada) {
    var directo = buscarValorPorAlias(filaNormalizada, C.columnas.texto);
    if (directo) return directo;

    return valoresFila(filaOriginal).join(" | ");
  }

  function filaObjetoDesdeMatriz(filaMatriz, indice) {
    var objeto = {};
    (filaMatriz || []).forEach(function (valor, columna) {
      objeto["columna_" + (columna + 1)] = valor;
    });
    objeto.__indiceMatriz = indice;
    return objeto;
  }

  function construirFilasFlexibles(archivoLeido) {
    var filas = obtenerFilas(archivoLeido);

    if (filas.length > 0) {
      return filas;
    }

    return obtenerMatriz(archivoLeido).map(filaObjetoDesdeMatriz);
  }

  function construirRedesBase(archivoLeido) {
    var filas = construirFilasFlexibles(archivoLeido);
    var registros = [];

    filas.forEach(function (filaOriginal, indice) {
      var fila = normalizarFila(filaOriginal);
      var codigo = buscarValorPorAlias(fila, C.columnas.codigo);

      if (!codigo) codigo = encontrarNumeracionEnFila(filaOriginal);

      var codigoLimpio = U.normalizarNumeracion(codigo);
      var principal = codigoLimpio ? codigoLimpio.split(".")[0] : "";
      var texto = textoPrincipal(filaOriginal, fila);

      if (!codigoLimpio && !texto) return;

      registros.push({
        indiceExcel: indice + 2,
        codigo: codigoLimpio,
        codigoOriginal: U.texto(codigo),
        seccionPrincipal: principal,
        texto: texto,
        filaOriginal: filaOriginal,
        filaNormalizada: fila
      });
    });

    return {
      registros: registros,
      secciones: {
        descripcion: registros.filter(function (r) { return r.seccionPrincipal === "1"; }),
        objetivo: registros.filter(function (r) { return r.seccionPrincipal === "2"; }),
        unidades: registros.filter(function (r) { return r.seccionPrincipal === "3"; }),
        competencias: registros.filter(function (r) { return r.seccionPrincipal === "4"; }),
        resultados: registros.filter(function (r) { return r.seccionPrincipal === "5"; }),
        bibliografia: registros.filter(function (r) { return r.seccionPrincipal === "8"; })
      }
    };
  }

  function construirComponentes(archivoLeido) {
    var filas = construirFilasFlexibles(archivoLeido);
    var componentes = [];

    filas.forEach(function (filaOriginal, indice) {
      var fila = normalizarFila(filaOriginal);
      var numeracion = buscarValorPorAlias(fila, C.columnas.codigo);

      if (!numeracion) numeracion = buscarValorPorAlias(fila, C.columnas.unidad);
      if (!numeracion) numeracion = encontrarNumeracionEnFila(filaOriginal);

      var numeracionLimpia = U.normalizarNumeracion(numeracion);
      var partes = U.parsearNumeracion(numeracionLimpia);
      var unidad = partes.length ? String(partes[0]) : buscarValorPorAlias(fila, C.columnas.unidad);
      var texto = textoPrincipal(filaOriginal, fila);

      if (!numeracionLimpia && !texto) return;

      componentes.push({
        indiceExcel: indice + 2,
        numeracion: numeracionLimpia,
        numeracionOriginal: U.texto(numeracion),
        unidad: U.texto(unidad),
        nivel: partes.length,
        texto: texto,
        filaOriginal: filaOriginal,
        filaNormalizada: fila
      });
    });

    return componentes;
  }

  function construirActividades(archivoLeido) {
    var filas = construirFilasFlexibles(archivoLeido);
    var actividades = [];

    filas.forEach(function (filaOriginal, indice) {
      var fila = normalizarFila(filaOriginal);
      var mecanismo = buscarValorPorAlias(fila, C.columnas.mecanismo);
      var tema = buscarValorPorAlias(fila, C.columnas.tema);
      var descripcion = buscarValorPorAlias(fila, C.columnas.descripcion);
      var valores = valoresFila(filaOriginal);

      if (!mecanismo) mecanismo = valores[0] || "";
      if (!tema) tema = valores[1] || "";
      if (!descripcion) descripcion = valores.slice(2).join(" | ") || valores.join(" | ");

      if (!mecanismo && !tema && !descripcion) return;

      actividades.push({
        indiceExcel: indice + 2,
        mecanismo: U.texto(mecanismo),
        mecanismoNormalizado: U.normalizarTexto(mecanismo),
        tema: U.texto(tema),
        descripcion: U.texto(descripcion),
        filaOriginal: filaOriginal,
        filaNormalizada: fila
      });
    });

    return actividades;
  }

  function completarMetadatos(datosUsuario, archivosLeidos) {
    var redes = archivosLeidos && archivosLeidos.redesBase ? archivosLeidos.redesBase.nombreArchivo : "";
    var nombreInferido = redes
      .replace(/redes\s*base/ig, "")
      .replace(/[-_]/g, " ")
      .replace(/\.xlsx|\.xls/ig, "")
      .trim();

    return {
      asignatura: U.texto(datosUsuario.asignatura || nombreInferido || "Asignatura no especificada"),
      carrera: U.texto(datosUsuario.carrera || "Carrera no especificada"),
      nivel: U.texto(datosUsuario.nivel || "Nivel no especificado"),
      tipo: U.texto(datosUsuario.tipo || "materia").toLowerCase()
    };
  }

  function prepararContexto(archivosLeidos, datosUsuario) {
    archivosLeidos = archivosLeidos || {};
    datosUsuario = datosUsuario || {};

    var redes = construirRedesBase(archivosLeidos.redesBase);

    return {
      creadoEn: U.fechaHoraActual(),
      metadatos: completarMetadatos(datosUsuario, archivosLeidos),
      archivos: {
        redesBase: archivosLeidos.redesBase || null,
        peaUnidades: archivosLeidos.peaUnidades || null,
        peaActividades: archivosLeidos.peaActividades || null
      },
      redesBase: redes.registros,
      secciones: redes.secciones,
      componentes: construirComponentes(archivosLeidos.peaUnidades),
      actividades: construirActividades(archivosLeidos.peaActividades)
    };
  }

  VCCC.NormalizadorDatos = {
    prepararContexto: prepararContexto,
    normalizarFila: normalizarFila,
    buscarValorPorAlias: buscarValorPorAlias
  };
})(window);
