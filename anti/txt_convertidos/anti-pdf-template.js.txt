/* Archivo: anti-pdf-template.js
Ubicación: anti/anti-pdf-template.js
Función: Plantilla de memorando + cuerpo (informe) + firma
         - Cuerpo inicia con "A quien corresponda:"
========================================================= */

(function (window) {
  "use strict";

  const AntiPDFTemplate = {
    buildMemoModel({
      estudianteNombre,
      estudianteCedula,
      estudianteCarrera,
      periodoLabel,
      memoDateISO,
      memoDateHumanLong,

      sistemaAntiplagio,
      versionSistema,
      porcentajeOriginalidad,
      porcentajePlagio,
      resultadoIA,
      resultadoAntitrampa,
      accionRequerida,
      estadoDocumento,
      resultadoFinal
    }) {
      const PARA = String(estudianteNombre || "").trim();
      const CED = String(estudianteCedula || "").trim();
      const CARRERA = String(estudianteCarrera || "").trim();
      const PERIODO = String(periodoLabel || "").trim();

      const SISTEMA = String(sistemaAntiplagio || "").trim();
      const VERSION = String(versionSistema || "").trim();

      const PORC_ORIG = String(porcentajeOriginalidad ?? "").trim();
      const PORC_PLAG = String(porcentajePlagio ?? "").trim();

      const RES_IA = String(resultadoIA || "").trim();
      const RES_ANTI = String(resultadoAntitrampa || "").trim();

      const ACCION = String(accionRequerida || "").trim();
      const ESTADO = String(estadoDocumento || "").trim();
      const FINAL = String(resultadoFinal || "").trim();

      return {
        header: {
          // ====== NO TOCAR: ENCABEZADO (como tu imagen) ======
          memoLine: `Memorando No.: MEM-ITSQMET-UTET-${memoDateISO}`,
          fields: [
            { label: "PARA:", value: (PARA || "—").toUpperCase() },
            { label: "DE:", value: "MAGÍSTER JEFFERSON VILLARREAL\nCOORDINADOR DE TITULACIÓN" },
            {
              label: "ASUNTO:",
              value: `ELABORACIÓN Y PRESENTACIÓN DEL INFORME DE ORIGINALIDAD (ANTIPLAGIO) DEL PROCESO DE TITULACIÓN CORRESPONDIENTE AL PERÍODO ${PERIODO}`.toUpperCase()
            },
            { label: "FECHA:", value: String(memoDateHumanLong || "").toUpperCase() }
          ]
        },

        // ====== CUERPO NUEVO ======
        body: [
          { type: "p", text: "A quien corresponda:" },
          {
            type: "p",
            text:
              `El presente informe de originalidad (antiplagio) corresponde al documento académico presentado por el/la estudiante ${PARA}, ` +
              `portador/a de la cédula de identidad ${CED}, dentro del proceso de titulación de la carrera ${CARRERA} ` +
              `del Instituto Tecnológico Superior Quito Metropolitano, correspondiente al período ${PERIODO}.`
          },
          {
            type: "p",
            text:
              `El análisis fue realizado mediante el sistema de detección de similitud ${SISTEMA}, versión ${VERSION}, ` +
              `evidenciando un porcentaje de originalidad del ${PORC_ORIG}% y un porcentaje de coincidencia del ${PORC_PLAG}%, ` +
              `valores que se encuentran dentro de los rangos permitidos por la normativa institucional vigente. Asimismo, ${RES_IA} y ${RES_ANTI}.`
          },
          {
            type: "p",
            text:
              `De acuerdo con los resultados obtenidos, ${ACCION}, determinándose que el documento ${ESTADO} ` +
              `con los criterios de integridad académica y uso adecuado de fuentes bibliográficas, por lo que ${FINAL} ` +
              `para la continuidad del proceso de titulación.`
          }
        ],

        // Firma: el espacio DESPUÉS de "Atentamente:" se mantiene
        signature: [
          { type: "line", text: "Atentamente:" },
          { type: "spacer", n: 5 },
          { type: "line", text: "Magíster Jefferson Villarreal" },
          { type: "line", text: "Coordinador de Titulación" }
        ]
      };
    }
  };

  window.AntiPDFTemplate = AntiPDFTemplate;
})(window);
