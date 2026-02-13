/* =========================================================
Archivo: repo_docx_core.js
Ruta: reportes/repo_docx_core.js
Función: orquestador Word completo
========================================================= */

import {
  REPO_ESTILO_BASE, repoTitulo1, repoTitulo2, repoParrafo,
  repoTituloTabla, repoNotaFigura, repoImagenSegura
} from "./repo_docx_style.js";

// ✅ CAMBIO: la cabecera DOCX se importa desde el archivo único de cabecera
import { repoEncabezadoInstitucional } from "./repo_docx_header.js";

import { repoGenerarPastelCumplimiento, repoGenerarBarrasCarreras } from "./repo_charts.js";

const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, PageNumber, Header, Footer
} = docx;

const REPO_REQUISITOS = [
  { id: "documentacion", titulo: "Documentación Académica", desc: "Validación de expediente legal (título bachiller, identidad)." },
  { id: "financiero", titulo: "Financiero", desc: "Verificación de obligaciones económicas (matrículas, aranceles)." },
  { id: "practicas", titulo: "Prácticas Preprofesionales", desc: "Certificación de horas de práctica en entornos reales." },
  { id: "vinculacion", titulo: "Vinculación con la Sociedad", desc: "Participación en proyectos de servicio comunitario." },
  { id: "seguimiento", titulo: "Seguimiento a Egresados", desc: "Actualización de contacto y situación laboral." },
  { id: "ingles", titulo: "Segunda Lengua", desc: "Validación de suficiencia en idioma extranjero." },
  { id: "datos", titulo: "Actualización de Datos", desc: "Consistencia de información en el sistema de gestión." },
  { id: "academico", titulo: "Requisito Académico", desc: "Aprobación total de la malla curricular." },
  { id: "titulacion", titulo: "Requisito de Titulación", desc: "Fase culminante del proceso académico." }
];

export function repoCodigoInforme(config) {
  // ✅ CAMBIO: Formato oficial solicitado:
  // UTET-RGI2-01-PRO-58-AÑO-MES (AÑO y MES salen de config.anio y config.mes)
  const mes = String(config?.mes || "01");
  const anio = String(config?.anio || new Date().getFullYear());
  return `UTET-RGI2-01-PRO-58-${anio}-${mes}`;
}

export async function repoGenerarDocxBlob({ stats, config, periodoLabel, anexos, analisisIA }) {
  const codigoFinal = repoCodigoInforme(config);
  const cont = { tablas: 1, figuras: 1 };

  // ✅ Cabecera institucional única (se repite por página vía Header)
  const headerTable = await repoEncabezadoInstitucional(periodoLabel, codigoFinal);

  const header = new Header({ children: [headerTable] });
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Página ", ...REPO_ESTILO_BASE }),
          new TextRun({ children: [PageNumber.CURRENT], ...REPO_ESTILO_BASE })
        ]
      })
    ]
  });

  const portada = repoCrearPortada(periodoLabel, codigoFinal);
  const cuerpo = await repoCrearCuerpo(stats, config, periodoLabel, analisisIA, cont);
  const anexosFinal = repoCrearAnexos(anexos || []);

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: { default: header },
        footers: { default: footer },
        children: [
          ...portada,
          new Paragraph({ text: "", pageBreakBefore: true }),
          ...cuerpo,
          ...anexosFinal
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

function repoCrearPortada(periodoLabel, codigoFinal) {
  const elems = [];

  elems.push(new Paragraph({ text: "", spacing: { after: 800 } }));

  elems.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    // ✅ CAMBIO: título oficial
    children: [new TextRun({ text: "Reporte Final de Requisitos", ...REPO_ESTILO_BASE, bold: true, size: 44 })]
  }));

  elems.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 500 },
    children: [new TextRun({ text: periodoLabel, ...REPO_ESTILO_BASE, bold: true, size: 32 })]
  }));

  elems.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text: `Código: ${codigoFinal}`, ...REPO_ESTILO_BASE, size: 24 })]
  }));

  elems.push(new Paragraph({ text: "", spacing: { after: 600 } }));

  elems.push(new Paragraph({
    children: [new TextRun({ text: "Elaborado por:", ...REPO_ESTILO_BASE, bold: true })]
  }));

  elems.push(repoTablaFirmas());
  return elems;
}

function repoTablaFirmas() {
  const c = (txt, bold = false) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: txt, ...REPO_ESTILO_BASE, bold })] })]
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [c("Nombres y apellidos", true), c("Cargo", true), c("Firma", true)] }),
      new TableRow({ children: [c("Msc. Jefferson Villarreal"), c("Gestor de Procesos Académicos"), c("_____________________")] })
    ]
  });
}

async function repoCrearCuerpo(stats, config, periodoLabel, analisisIA, contadores) {
  const elems = [];
  const activos = REPO_REQUISITOS.filter(r => (r.id === "titulacion" ? !!config.incluirTitulacion : true));

  elems.push(...repoIndiceManual(activos));
  elems.push(...repoIntroduccion(periodoLabel));
  elems.push(new Paragraph({ text: "", pageBreakBefore: true }));

  for (let i = 0; i < activos.length; i++) {
    const req = activos[i];
    const numSeccion = String(i + 2);
    const dataIA = analisisIA?.analisis ? analisisIA.analisis[req.id] : null;
    const bloque = await repoCrearSeccionRequisito(numSeccion, req.titulo, req.desc, req.id, stats, dataIA, contadores);
    elems.push(...bloque);
    elems.push(new Paragraph({ text: "", pageBreakBefore: true }));
  }

  elems.push(...repoResumenEjecutivo(analisisIA?.datosResumen, contadores));
  return elems;
}

function repoIndiceManual(requisitos) {
  const lista = [];
  lista.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: "Índice de Contenidos", bold: true, size: 32, font: "Times New Roman", color: "000000" })]
  }));

  lista.push(repoItemIndice("1. Introducción"));
  requisitos.forEach((r, idx) => lista.push(repoItemIndice(`${idx + 2}. ${r.titulo}`)));
  lista.push(repoItemIndice("4. Resumen Ejecutivo"));
  lista.push(repoItemIndice("5. Anexos"));
  lista.push(new Paragraph({ text: "", pageBreakBefore: true }));
  return lista;
}

function repoItemIndice(texto) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: texto, font: "Times New Roman", size: 24, color: "000000" })]
  });
}

function repoIntroduccion(periodoLabel) {
  const elems = [];
  elems.push(repoTitulo1("1. Introducción"));
  elems.push(repoParrafo(`El presente informe consolida el estado de cumplimiento de requisitos institucionales correspondientes al periodo ${periodoLabel}.`));

  elems.push(repoTitulo2("Responsables institucionales por requisito"));

  const filas = [
    ["Requisito", "Responsable"],
    ["Académico", "Coordinación General de Carreras"],
    ["Documentación", "Secretaría Académica"],
    ["Financiero", "Recaudación y Cartera"],
    ["Prácticas", "Prácticas Preprofesionales"],
    ["Vinculación", "Vinculación con la Sociedad"],
    ["Seguimiento", "Seguimiento a Graduados"],
    ["Inglés", "Coordinación de Idiomas"],
    ["Actualización de Datos", "Admisiones / Secretaría"],
    ["Titulación", "UTET"]
  ];

  elems.push(repoTablaDocx(filas));
  return elems;
}

async function repoCrearSeccionRequisito(num, titulo, descripcion, keyReq, stats, dataIA, contadores) {
  const elementos = [];

  elementos.push(new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: `${num}. ${titulo}`, ...REPO_ESTILO_BASE, bold: true, size: 28 })]
  }));

  elementos.push(repoParrafo(descripcion));

  let totalCumplen = 0, totalNo = 0;
  Object.values(stats.porCarrera).forEach(c => {
    totalCumplen += (c.cumplen[keyReq] || 0);
    totalNo += (c.noCumplen[keyReq] || 0);
  });

  const total = totalCumplen + totalNo;
  const pct = total > 0 ? ((totalCumplen / total) * 100).toFixed(1) : "0.0";

  elementos.push(repoTitulo2("Resultados Generales"));

  const t1 = contadores.tablas++;
  elementos.push(repoTituloTabla(t1, `Estado de cumplimiento: ${titulo}`));
  elementos.push(repoTablaDocx([
    ["Estado", "Cantidad", "Porcentaje"],
    ["Cumplen", String(totalCumplen), `${pct}%`],
    ["No Cumplen", String(totalNo), `${(100 - parseFloat(pct)).toFixed(1)}%`]
  ]));

  const imgPastel = await repoGenerarPastelCumplimiento(totalCumplen, totalNo);
  if (imgPastel) {
    elementos.push(repoImagenSegura(imgPastel, 300, 180));
    const f1 = contadores.figuras++;
    elementos.push(repoNotaFigura(f1, "Porcentaje global de cumplimiento", "Elaboración propia a partir de datos del sistema."));
  }

  if (dataIA?.parrafo1) {
    elementos.push(repoTitulo2("Análisis de Resultados Generales"));
    elementos.push(repoParrafo(dataIA.parrafo1));
  }

  const filasDetalle = [["Carrera", "Cumplen", "No Cumplen"]];
  Object.entries(stats.porCarrera).forEach(([carrera, s]) => {
    const c = s.cumplen[keyReq] || 0;
    const n = s.noCumplen[keyReq] || 0;
    if (c + n > 0) filasDetalle.push([carrera, String(c), String(n)]);
  });

  if (filasDetalle.length > 1) {
    elementos.push(repoTitulo2("Desglose por Carrera"));

    const t2 = contadores.tablas++;
    elementos.push(repoTituloTabla(t2, `Detalle por unidad académica: ${titulo}`));
    elementos.push(repoTablaDocx(filasDetalle));

    const imgBarras = await repoGenerarBarrasCarreras(stats.porCarrera, keyReq);
    if (imgBarras) {
      elementos.push(repoImagenSegura(imgBarras, 450, 250));
      const f2 = contadores.figuras++;
      elementos.push(repoNotaFigura(f2, "Comparativa de cumplimiento por carrera", "Datos obtenidos del módulo de validación."));
    }

    if (dataIA?.puntosClave || dataIA?.parrafo2) {
      elementos.push(repoTitulo2("Análisis por Unidad Académica"));
      if (Array.isArray(dataIA.puntosClave)) dataIA.puntosClave.forEach(p => elementos.push(repoVineta(p)));
      if (dataIA.parrafo2) elementos.push(repoParrafo(dataIA.parrafo2));
    }
  }

  return elementos;
}

function repoVineta(texto) {
  return new Paragraph({
    text: texto,
    bullet: { level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    run: { ...REPO_ESTILO_BASE }
  });
}

function repoTablaDocx(filas) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: filas.map((row, i) => new TableRow({
      children: row.map(cell => new TableCell({
        shading: i === 0 ? { fill: "F2F2F2" } : undefined,
        children: [new Paragraph({
          alignment: i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: cell, bold: i === 0, ...REPO_ESTILO_BASE, size: 22 })]
        })]
      }))
    }))
  });
}

function repoResumenEjecutivo(datosResumen, contadores) {
  const elems = [];
  elems.push(repoTitulo1("4. Resumen Ejecutivo: Estado de Requisitos"));
  elems.push(repoTitulo2("a) Propósito del Informe"));
  elems.push(repoParrafo("Este documento sintetiza el estado de cumplimiento de requisitos institucionales para estudiantes que finalizan su formación."));

  elems.push(repoTitulo2("b) Resultados Globales de Cumplimiento"));

  const t = contadores.tablas++;
  elems.push(repoTituloTabla(t, "Porcentaje de Cumplimiento por Requisito"));

  const filas = [["Requisito Institucional", "% Cumplimiento"]];
  if (datosResumen?.tablaGlobal?.length) {
    datosResumen.tablaGlobal.forEach(d => filas.push([d.nombre, d.porcentaje]));
  } else {
    filas.push(["Sin datos", "0%"]);
  }
  elems.push(repoTablaDocx(filas));

  elems.push(repoTitulo2("c) Análisis de Hallazgos Críticos"));
  if (Array.isArray(datosResumen?.hallazgos) && datosResumen.hallazgos.length) {
    datosResumen.hallazgos.forEach(h => elems.push(repoVineta(h)));
  } else {
    elems.push(repoVineta("No se identificaron hallazgos críticos para el periodo seleccionado."));
  }

  return elems;
}

function repoCrearAnexos(listaAnexos) {
  const { HeadingLevel } = docx;
  const elems = [];

  elems.push(new Paragraph({
    text: "5. ANEXOS",
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    pageBreakBefore: true,
    run: { font: "Times New Roman", size: 28, bold: true, color: "000000" }
  }));

  if (!listaAnexos || listaAnexos.length === 0) {
    elems.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300 },
      children: [new TextRun({ text: "No se han adjuntado evidencias gráficas en este reporte.", font: "Times New Roman", size: 24, italics: true })]
    }));
    return elems;
  }

  listaAnexos.forEach((anexo, index) => {
    elems.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({ text: `Anexo ${index + 1}. `, bold: true, font: "Times New Roman", size: 24 }),
        new TextRun({ text: anexo.titulo || "Sin título", font: "Times New Roman", size: 24 })
      ]
    }));

    if (anexo.data) {
      const p = repoImagenSegura(anexo.data, 500, 350);
      if (p) elems.push(p);
    }
  });

  return elems;
}
