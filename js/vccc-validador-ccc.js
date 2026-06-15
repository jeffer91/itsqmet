/*
=========================================================
Nombre completo: vccc-validador-ccc.js
Ruta o ubicación: /js/vccc-validador-ccc.js

Función o funciones:
1. Validar estructura obligatoria del CCC.
2. Validar numeración de unidades y componentes.
3. Validar competencias y resultados de aprendizaje.
4. Validar actividades obligatorias según tipo: materia o eje.
5. Calcular estado, puntajes, errores críticos, advertencias y sugerencias.

Con qué se comunica:
- vccc-utilidades.js
- vccc-configuracion.js
- vccc-normalizador-datos.js
- vccc-interfaz.js
- vccc-almacen-exportador.js
- vccc-aplicacion.js

Qué aporta:
- Es el motor central de validación.
- Convierte las reglas del CCC en observaciones claras para corregir.
=========================================================
*/

(function (window) {
  "use strict";

  var VCCC = window.VCCC = window.VCCC || {};
  var U = VCCC.Utilidades;
  var C = VCCC.Configuracion;

  function agregar(lista, datos) {
    U.agregarObservacion(lista, datos);
  }

  function obtenerSeccion(ctx, nombre) {
    if (!ctx || !ctx.secciones || !Array.isArray(ctx.secciones[nombre])) return [];
    return ctx.secciones[nombre];
  }

  function validarArchivos(ctx, obs) {
    if (!ctx.archivos.redesBase) {
      agregar(obs, {
        seccion: "Carga de archivos",
        severidad: "critico",
        titulo: "Falta Redes base",
        mensaje: "Se debe cargar el archivo Redes base para revisar descripción, objetivo, unidades, competencias y resultados."
      });
    }

    if (!ctx.archivos.peaUnidades) {
      agregar(obs, {
        seccion: "Carga de archivos",
        severidad: "critico",
        titulo: "Falta PEA unidades Logros",
        mensaje: "Se debe cargar el Excel de unidades para revisar componentes y numeración."
      });
    }

    if (!ctx.archivos.peaActividades) {
      agregar(obs, {
        seccion: "Carga de archivos",
        severidad: "critico",
        titulo: "Falta PEA actividades Logros",
        mensaje: "Se debe cargar el Excel de actividades para validar mecanismos, temas y descripciones."
      });
    }
  }

  function validarMetadatos(ctx, obs) {
    var m = ctx.metadatos || {};

    if (U.normalizarTexto(m.asignatura) === "asignatura no especificada") {
      agregar(obs, {
        seccion: "Datos generales",
        severidad: "advertencia",
        titulo: "Asignatura no especificada",
        mensaje: "Se recomienda ingresar el nombre de la asignatura antes de generar el respaldo."
      });
    }

    if (U.normalizarTexto(m.carrera) === "carrera no especificada") {
      agregar(obs, {
        seccion: "Datos generales",
        severidad: "advertencia",
        titulo: "Carrera no especificada",
        mensaje: "Se recomienda ingresar el nombre completo de la carrera antes de aprobar."
      });
    }
  }

  function validarDescripcion(ctx, obs) {
    var descripcion = obtenerSeccion(ctx, "descripcion").map(function (r) { return r.texto; }).join(" ");

    if (!descripcion) {
      agregar(obs, {
        seccion: "Estructura",
        severidad: "critico",
        titulo: "Falta descripción de la asignatura",
        mensaje: "Se recomienda incluir la descripción de la asignatura en Redes base con código principal 1."
      });
      return;
    }

    if (U.contarPalabras(descripcion) < 25) {
      agregar(obs, {
        seccion: "Descripción",
        severidad: "advertencia",
        titulo: "Descripción posiblemente incompleta",
        mensaje: "La descripción debería incluir campo disciplinar, contenidos clave, aplicación profesional y contexto.",
        detalle: "Palabras detectadas: " + U.contarPalabras(descripcion)
      });
    }
  }

  function validarObjetivo(ctx, obs) {
    var objetivo = obtenerSeccion(ctx, "objetivo").map(function (r) { return r.texto; }).join(" ");

    if (!objetivo) {
      agregar(obs, {
        seccion: "Estructura",
        severidad: "critico",
        titulo: "Falta objetivo general",
        mensaje: "Se recomienda incluir el objetivo general en Redes base con código principal 2."
      });
      return;
    }

    var verbo = U.obtenerVerboInicial(objetivo);

    if (verbo && !U.esInfinitivo(verbo)) {
      agregar(obs, {
        seccion: "Objetivo general",
        severidad: "advertencia",
        titulo: "El objetivo podría no iniciar con verbo en infinitivo",
        mensaje: "El objetivo general debe iniciar con un verbo en infinitivo.",
        detalle: "Verbo detectado: " + verbo
      });
    }

    if (!U.contieneAlguno(objetivo, C.redaccion.conectoresFinalidad)) {
      agregar(obs, {
        seccion: "Objetivo general",
        severidad: "sugerencia",
        titulo: "Objetivo sin finalidad explícita",
        mensaje: "Se recomienda que el objetivo indique con claridad para qué se desarrolla el aprendizaje."
      });
    }
  }

  function validarCantidades(ctx, obs) {
    var unidades = obtenerSeccion(ctx, "unidades");
    var competencias = obtenerSeccion(ctx, "competencias");
    var resultados = obtenerSeccion(ctx, "resultados");

    if (unidades.length !== C.estructura.cantidadUnidades) {
      agregar(obs, {
        seccion: "Estructura",
        severidad: "critico",
        titulo: "Cantidad incorrecta de unidades",
        mensaje: "El CCC debe tener exactamente " + C.estructura.cantidadUnidades + " unidades.",
        detalle: "Unidades detectadas: " + unidades.length
      });
    }

    if (competencias.length !== C.estructura.cantidadCompetencias) {
      agregar(obs, {
        seccion: "Estructura",
        severidad: "critico",
        titulo: "Cantidad incorrecta de competencias",
        mensaje: "Debe existir una competencia por unidad.",
        detalle: "Competencias detectadas: " + competencias.length
      });
    }

    if (resultados.length !== C.estructura.cantidadResultados) {
      agregar(obs, {
        seccion: "Estructura",
        severidad: "critico",
        titulo: "Cantidad incorrecta de resultados de aprendizaje",
        mensaje: "Debe existir un resultado de aprendizaje por unidad.",
        detalle: "Resultados detectados: " + resultados.length
      });
    }

    if (!ctx.componentes || ctx.componentes.length === 0) {
      agregar(obs, {
        seccion: "Componentes",
        severidad: "critico",
        titulo: "No se detectaron componentes por unidad",
        mensaje: "El Excel PEA unidades Logros debe contener componentes temáticos por unidad."
      });
    }

    if (!ctx.actividades || ctx.actividades.length === 0) {
      agregar(obs, {
        seccion: "Actividades",
        severidad: "critico",
        titulo: "No se detectaron actividades",
        mensaje: "El Excel PEA actividades Logros debe contener actividades con mecanismo, tema y descripción."
      });
    }
  }

  function validarBibliografia(ctx, obs) {
    if (obtenerSeccion(ctx, "bibliografia").length === 0) {
      agregar(obs, {
        seccion: "Bibliografía",
        severidad: "advertencia",
        titulo: "No se detectó bibliografía o recursos",
        mensaje: "Se recomienda verificar que el CCC incluya bibliografía, recursos o referencias."
      });
    }
  }

  function validarNumeracion(ctx, obs) {
    var componentes = ctx.componentes || [];
    if (!componentes.length) return;

    var vistos = {};
    var numerosValidos = [];

    componentes.forEach(function (item) {
      if (!item.numeracion) {
        agregar(obs, {
          seccion: "Numeración",
          severidad: "critico",
          titulo: "Componente sin numeración",
          mensaje: "Se detectó un componente sin numeración en el Excel de unidades.",
          referencia: "Fila aproximada: " + item.indiceExcel,
          detalle: item.texto
        });
        return;
      }

      if (!U.esNumeracionValida(item.numeracion)) {
        agregar(obs, {
          seccion: "Numeración",
          severidad: "critico",
          titulo: "Formato de numeración no válido",
          mensaje: "La numeración debe usar formato tipo 1, 1.1, 1.1.1, sin comas ni símbolos extraños.",
          referencia: "Fila aproximada: " + item.indiceExcel,
          detalle: "Valor detectado: " + item.numeracionOriginal
        });
        return;
      }

      var clave = U.normalizarNumeracion(item.numeracion);

      if (vistos[clave]) {
        agregar(obs, {
          seccion: "Numeración",
          severidad: "critico",
          titulo: "Numeración repetida",
          mensaje: "La numeración " + clave + " aparece más de una vez.",
          referencia: "Filas aproximadas: " + vistos[clave] + " y " + item.indiceExcel
        });
      } else {
        vistos[clave] = item.indiceExcel;
      }

      numerosValidos.push(clave);
    });

    validarUnidadesNumeradas(numerosValidos, obs);
    validarPadres(numerosValidos, obs);
    validarSaltosNumericos(numerosValidos, obs);
    validarOrdenArchivo(componentes, obs);
  }

  function validarUnidadesNumeradas(numeros, obs) {
    var unidadesDetectadas = new Set();

    numeros.forEach(function (num) {
      var partes = U.parsearNumeracion(num);
      if (!partes.length) return;

      var unidad = partes[0];
      unidadesDetectadas.add(String(unidad));

      if (unidad < 1 || unidad > 4) {
        agregar(obs, {
          seccion: "Numeración",
          severidad: "critico",
          titulo: "Componente fuera de las 4 unidades",
          mensaje: "La numeración " + num + " pertenece a una unidad no permitida.",
          detalle: "Solo se permiten unidades 1, 2, 3 y 4."
        });
      }
    });

    ["1", "2", "3", "4"].forEach(function (unidad) {
      if (!unidadesDetectadas.has(unidad)) {
        agregar(obs, {
          seccion: "Numeración",
          severidad: "critico",
          titulo: "Unidad sin componentes numerados",
          mensaje: "No se encontraron componentes pertenecientes a la Unidad " + unidad + "."
        });
      }
    });
  }

  function validarPadres(numeros, obs) {
    var setNumeros = new Set(numeros);

    numeros.forEach(function (num) {
      var partes = U.parsearNumeracion(num);
      if (partes.length <= 2) return;

      var padre = partes.slice(0, -1).join(".");

      if (!setNumeros.has(padre)) {
        agregar(obs, {
          seccion: "Numeración",
          severidad: "critico",
          titulo: "Subnumeración sin padre",
          mensaje: "Existe el componente " + num + ", pero no se encontró su componente padre " + padre + "."
        });
      }
    });
  }

  function validarSaltosNumericos(numeros, obs) {
    var hijosPorPadre = {};

    numeros.forEach(function (num) {
      var partes = U.parsearNumeracion(num);
      if (!partes.length) return;

      var padre = partes.length === 1 ? "raiz" : partes.slice(0, -1).join(".");
      var hijo = partes[partes.length - 1];

      if (!hijosPorPadre[padre]) hijosPorPadre[padre] = [];
      hijosPorPadre[padre].push(hijo);
    });

    Object.keys(hijosPorPadre).forEach(function (padre) {
      if (padre === "raiz") return;

      var hijos = Array.from(new Set(hijosPorPadre[padre])).sort(function (a, b) {
        return a - b;
      });

      for (var esperado = 1; esperado <= hijos[hijos.length - 1]; esperado++) {
        if (hijos.indexOf(esperado) === -1) {
          agregar(obs, {
            seccion: "Numeración",
            severidad: "critico",
            titulo: "Salto en la numeración",
            mensaje: "Dentro de " + padre + " falta el numeral " + padre + "." + esperado + ".",
            detalle: "Secuencia detectada: " + hijos.map(function (h) { return padre + "." + h; }).join(", ")
          });
        }
      }
    });
  }

  function validarOrdenArchivo(componentes, obs) {
    var conNumero = componentes.filter(function (x) {
      return x.numeracion && U.esNumeracionValida(x.numeracion);
    });

    var original = conNumero.map(function (x) {
      return U.normalizarNumeracion(x.numeracion);
    });

    var ordenado = original.slice().sort(U.compararNumeraciones);

    for (var i = 0; i < original.length; i++) {
      if (original[i] !== ordenado[i]) {
        agregar(obs, {
          seccion: "Numeración",
          severidad: "advertencia",
          titulo: "Orden de numeración posiblemente incorrecto",
          mensaje: "La numeración no aparece en orden secuencial dentro del Excel de unidades.",
          detalle: "Primer desorden detectado: aparece " + original[i] + " cuando se esperaba " + ordenado[i] + "."
        });
        break;
      }
    }
  }

  function validarCompetencias(ctx, obs) {
    obtenerSeccion(ctx, "competencias").forEach(function (item, index) {
      var texto = item.texto || "";
      var verbo = U.obtenerVerboInicial(texto);
      var verboNorm = U.normalizarTexto(verbo);

      if (U.contarPalabras(texto) < C.redaccion.minimoPalabrasCompetencia) {
        agregar(obs, {
          seccion: "Competencias",
          severidad: "advertencia",
          titulo: "Competencia posiblemente incompleta",
          mensaje: "La competencia de la Unidad " + (index + 1) + " parece demasiado corta.",
          detalle: texto
        });
      }

      if (C.redaccion.verbosNoRecomendados.indexOf(verboNorm) >= 0) {
        agregar(obs, {
          seccion: "Competencias",
          severidad: "advertencia",
          titulo: "Verbo poco recomendable en competencia",
          mensaje: "El verbo inicial podría ser ambiguo o pertenecer a una categoría general de Bloom.",
          detalle: "Verbo detectado: " + verbo
        });
      }

      if (!U.contieneAlguno(texto, C.redaccion.conectoresMetodo)) {
        agregar(obs, {
          seccion: "Competencias",
          severidad: "advertencia",
          titulo: "Competencia sin método claro",
          mensaje: "Se recomienda que la competencia indique cómo se ejecuta la acción.",
          detalle: "Unidad " + (index + 1)
        });
      }

      if (!U.contieneAlguno(texto, C.redaccion.conectoresFinalidad)) {
        agregar(obs, {
          seccion: "Competencias",
          severidad: "advertencia",
          titulo: "Competencia sin finalidad clara",
          mensaje: "Se recomienda que la competencia indique para qué se desarrolla la acción.",
          detalle: "Unidad " + (index + 1)
        });
      }
    });
  }

  function validarResultados(ctx, obs) {
    obtenerSeccion(ctx, "resultados").forEach(function (item, index) {
      var texto = item.texto || "";
      var verbo = U.obtenerVerboInicial(texto);
      var verboNorm = U.normalizarTexto(verbo);

      if (U.contarPalabras(texto) < C.redaccion.minimoPalabrasResultado) {
        agregar(obs, {
          seccion: "Resultados",
          severidad: "advertencia",
          titulo: "Resultado posiblemente incompleto",
          mensaje: "El resultado de aprendizaje de la Unidad " + (index + 1) + " parece demasiado corto.",
          detalle: texto
        });
      }

      if (U.esInfinitivo(verbo)) {
        agregar(obs, {
          seccion: "Resultados",
          severidad: "advertencia",
          titulo: "Resultado inicia con infinitivo",
          mensaje: "El resultado debería redactarse en presente y en tercera persona.",
          detalle: "Verbo detectado: " + verbo
        });
      }

      if (C.redaccion.verbosNoRecomendados.indexOf(verboNorm) >= 0) {
        agregar(obs, {
          seccion: "Resultados",
          severidad: "advertencia",
          titulo: "Verbo poco recomendable en resultado",
          mensaje: "El verbo inicial podría ser ambiguo o difícil de evaluar.",
          detalle: "Verbo detectado: " + verbo
        });
      }

      if (U.contarOraciones(texto) > C.redaccion.maximoOracionesResultado) {
        agregar(obs, {
          seccion: "Resultados",
          severidad: "advertencia",
          titulo: "Resultado demasiado extenso",
          mensaje: "Se recomienda redactar cada resultado en una sola oración breve y coherente.",
          detalle: "Unidad " + (index + 1)
        });
      }
    });
  }

  function validarActividades(ctx, obs) {
    var tipo = ctx.metadatos && ctx.metadatos.tipo === "eje" ? "eje" : "materia";
    var regla = C.actividades[tipo];
    var actividades = ctx.actividades || [];
    if (!actividades.length) return;

    var conteos = {};

    actividades.forEach(function (act) {
      var clave = U.normalizarTexto(act.mecanismo);
      conteos[clave] = (conteos[clave] || 0) + 1;

      if (U.estaVacio(act.tema)) {
        agregar(obs, {
          seccion: "Actividades",
          severidad: "advertencia",
          titulo: "Actividad sin tema",
          mensaje: "Se detectó una actividad sin tema.",
          referencia: "Fila aproximada: " + act.indiceExcel,
          detalle: act.mecanismo
        });
      }

      if (U.estaVacio(act.descripcion)) {
        agregar(obs, {
          seccion: "Actividades",
          severidad: "advertencia",
          titulo: "Actividad sin descripción",
          mensaje: "Se detectó una actividad sin descripción.",
          referencia: "Fila aproximada: " + act.indiceExcel,
          detalle: act.mecanismo
        });
      }
    });

    regla.principales.forEach(function (nombre) {
      var clave = U.normalizarTexto(nombre);
      if (!conteos[clave]) {
        agregar(obs, {
          seccion: "Actividades",
          severidad: "critico",
          titulo: "Falta actividad obligatoria",
          mensaje: "No se encontró la actividad obligatoria: " + nombre + ".",
          detalle: "Tipo de revisión: " + tipo
        });
      }
    });

    var claveDsea = U.normalizarTexto(regla.desarrolloSostenible);
    var totalDsea = conteos[claveDsea] || 0;

    if (totalDsea !== regla.cantidadDesarrolloSostenible) {
      agregar(obs, {
        seccion: "Actividades",
        severidad: "critico",
        titulo: "Cantidad incorrecta de Desarrollo Sostenible y Educación Ambiental",
        mensaje: "Deben existir exactamente " + regla.cantidadDesarrolloSostenible + " actividades de Desarrollo Sostenible y Educación Ambiental.",
        detalle: "Detectadas: " + totalDsea
      });
    }
  }

  function validarAlineacion(ctx, obs) {
    var unidades = obtenerSeccion(ctx, "unidades");
    var competencias = obtenerSeccion(ctx, "competencias");
    var resultados = obtenerSeccion(ctx, "resultados");
    var total = Math.min(unidades.length, competencias.length, resultados.length, 4);

    for (var i = 0; i < total; i++) {
      var unidad = unidades[i] ? unidades[i].texto : "";
      var competencia = competencias[i] ? competencias[i].texto : "";
      var resultado = resultados[i] ? resultados[i].texto : "";

      if (U.similitudSimple(competencia, resultado) < 0.08) {
        agregar(obs, {
          seccion: "Alineación",
          severidad: "advertencia",
          titulo: "Posible baja relación entre competencia y resultado",
          mensaje: "La competencia y el resultado de la Unidad " + (i + 1) + " podrían estar poco conectados.",
          detalle: "Se recomienda revisar la relación unidad–competencia–resultado."
        });
      }

      if (U.similitudSimple(unidad, resultado) < 0.05) {
        agregar(obs, {
          seccion: "Alineación",
          severidad: "sugerencia",
          titulo: "Revisar relación entre unidad y resultado",
          mensaje: "El resultado de la Unidad " + (i + 1) + " podría reforzar mejor el contenido de la unidad."
        });
      }
    }
  }

  function calcularResumen(observaciones) {
    var criticos = observaciones.filter(function (x) { return x.severidad === "critico"; }).length;
    var advertencias = observaciones.filter(function (x) { return x.severidad === "advertencia"; }).length;
    var sugerencias = observaciones.filter(function (x) { return x.severidad === "sugerencia"; }).length;
    var estado = "Aprobado";

    if (criticos > 0) estado = "Incompleto";
    else if (advertencias > 0 || sugerencias > 0) estado = "Revisar";

    return {
      criticos: criticos,
      advertencias: advertencias,
      sugerencias: sugerencias,
      total: observaciones.length,
      estado: estado,
      aprobable: criticos === 0
    };
  }

  function calcularPuntajes(observaciones) {
    var secciones = ["Estructura", "Numeración", "Competencias", "Resultados", "Actividades", "Alineación"];
    var puntajes = {};

    secciones.forEach(function (seccion) {
      var relacionadas = observaciones.filter(function (x) {
        return x.seccion === seccion ||
          (seccion === "Estructura" && ["Carga de archivos", "Datos generales", "Descripción", "Objetivo general", "Bibliografía", "Componentes"].indexOf(x.seccion) >= 0);
      });

      var puntos = C.puntajes.base;

      relacionadas.forEach(function (obs) {
        if (obs.severidad === "critico") puntos -= C.puntajes.descuentoCritico;
        if (obs.severidad === "advertencia") puntos -= C.puntajes.descuentoAdvertencia;
        if (obs.severidad === "sugerencia") puntos -= C.puntajes.descuentoSugerencia;
      });

      puntajes[seccion] = Math.max(0, puntos);
    });

    var valores = Object.keys(puntajes).map(function (k) { return puntajes[k]; });
    puntajes.general = Math.round(valores.reduce(function (a, b) { return a + b; }, 0) / valores.length);

    return puntajes;
  }

  function validar(ctx) {
    var observaciones = [];
    ctx = ctx || {};
    ctx.archivos = ctx.archivos || {};

    validarArchivos(ctx, observaciones);
    validarMetadatos(ctx, observaciones);
    validarDescripcion(ctx, observaciones);
    validarObjetivo(ctx, observaciones);
    validarCantidades(ctx, observaciones);
    validarBibliografia(ctx, observaciones);
    validarNumeracion(ctx, observaciones);
    validarCompetencias(ctx, observaciones);
    validarResultados(ctx, observaciones);
    validarActividades(ctx, observaciones);
    validarAlineacion(ctx, observaciones);

    var resumen = calcularResumen(observaciones);
    var puntajes = calcularPuntajes(observaciones);

    return {
      id: U.crearId("vccc-validacion"),
      fecha: U.fechaHoraActual(),
      metadatos: ctx.metadatos || {},
      observaciones: observaciones,
      resumen: resumen,
      puntajes: puntajes,
      estado: resumen.estado,
      aprobable: resumen.aprobable
    };
  }

  VCCC.ValidadorCCC = {
    validar: validar
  };
})(window);
