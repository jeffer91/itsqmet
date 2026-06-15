/*
=========================================================
Nombre completo: vccc-configuracion.js
Ruta o ubicación: /js/vccc-configuracion.js

Función o funciones:
1. Guardar reglas institucionales y técnicas del Validador CCC.
2. Definir secciones obligatorias del CCC.
3. Definir columnas esperadas y alias posibles de los Excel.
4. Definir actividades obligatorias para materia y eje.
5. Definir verbos no recomendados, conectores y parámetros de puntaje.

Con qué se comunica:
- vccc-utilidades.js
- vccc-normalizador-datos.js
- vccc-validador-ccc.js
- vccc-interfaz.js
- vccc-aplicacion.js

Qué aporta:
- Permite cambiar reglas sin tocar la lógica principal.
- Centraliza criterios de validación en un solo archivo.
=========================================================
*/

(function (window) {
  "use strict";

  var VCCC = window.VCCC = window.VCCC || {};

  VCCC.Configuracion = {
    app: {
      nombre: "VCCC - Validador CCC",
      version: "1.0.0",
      almacenamiento: "vccc_validaciones_locales"
    },

    archivos: {
      redesBase: "Redes base",
      peaUnidades: "PEA unidades Logros",
      peaActividades: "PEA actividades Logros"
    },

    estructura: {
      cantidadUnidades: 4,
      cantidadCompetencias: 4,
      cantidadResultados: 4,
      seccionesObligatorias: [
        { codigo: "1", nombre: "Descripción de la asignatura" },
        { codigo: "2", nombre: "Objetivo general" },
        { codigo: "3", nombre: "Unidades" },
        { codigo: "4", nombre: "Competencias" },
        { codigo: "5", nombre: "Resultados de aprendizaje" }
      ],
      seccionesRecomendadas: [
        { codigo: "8", nombre: "Bibliografía o recursos" }
      ]
    },

    columnas: {
      codigo: [
        "codigo", "código", "cod", "numero", "número", "numeracion", "numeración",
        "codigo componente", "código componente", "codigocomponente", "codigo_componente",
        "orden", "orden componente", "ordencomponente"
      ],
      unidad: [
        "unidad", "orden unidad", "ordenunidad", "numero unidad", "número unidad",
        "unidad numero", "unidad número"
      ],
      seccion: [
        "seccion", "sección", "apartado", "elemento", "tipo", "componente"
      ],
      texto: [
        "texto", "contenido", "descripcion", "descripción", "detalle", "logro", "logros",
        "resultado", "competencia", "objetivo", "nombre", "titulo", "título", "tema"
      ],
      mecanismo: [
        "mecanismo", "tipo actividad", "tipo de actividad", "actividad", "nombre actividad",
        "nombre de actividad"
      ],
      tema: [
        "tema", "tema actividad", "tema de actividad", "titulo", "título", "contenido"
      ],
      descripcion: [
        "descripcion", "descripción", "detalle", "desarrollo", "instruccion", "instrucción",
        "actividad descripcion", "actividad descripción"
      ]
    },

    actividades: {
      materia: {
        principales: [
          "Actividad Contacto Docente 1",
          "Actividad Autónoma 1",
          "Actividad Proyecto Final",
          "Taller Práctico 1",
          "Taller Práctico 2"
        ],
        desarrolloSostenible: "Desarrollo Sostenible y Educación Ambiental",
        cantidadDesarrolloSostenible: 5
      },
      eje: {
        principales: [
          "Actividad Contacto Docente 1",
          "Actividad Autónoma 1",
          "Actividad Proyecto Final",
          "Taller Práctico 1",
          "Taller Práctico 2"
        ],
        desarrolloSostenible: "Desarrollo Sostenible y Educación Ambiental",
        cantidadDesarrolloSostenible: 5
      }
    },

    redaccion: {
      verbosNoRecomendados: [
        "reconocer", "comprender", "aplicar", "analizar", "evaluar", "crear",
        "conocer", "saber", "entender", "formar"
      ],
      conectoresMetodo: [
        "mediante", "a través de", "a partir de", "utilizando", "empleando",
        "con base en", "según", "por medio de", "a partir del", "con el uso de"
      ],
      conectoresFinalidad: [
        "para", "con el fin de", "a fin de", "con la finalidad de", "orientado a", "destinado a"
      ],
      verbosObservables: [
        "identifica", "distingue", "describe", "explica", "interpreta", "clasifica",
        "calcula", "ejecuta", "utiliza", "desarrolla", "resuelve", "compara",
        "diagnostica", "organiza", "selecciona", "verifica", "comprueba", "valora",
        "diseña", "formula", "produce", "elabora", "determina", "integra",
        "aplica", "analiza", "evalúa", "propone", "implementa", "argumenta"
      ],
      minimoPalabrasCompetencia: 12,
      minimoPalabrasResultado: 12,
      maximoOracionesResultado: 1
    },

    puntajes: {
      base: 100,
      descuentoCritico: 18,
      descuentoAdvertencia: 7,
      descuentoSugerencia: 3
    },

    severidades: {
      critico: "critico",
      advertencia: "advertencia",
      sugerencia: "sugerencia",
      correcto: "correcto"
    }
  };
})(window);
