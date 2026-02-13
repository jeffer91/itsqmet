/* =========================================================
Archivo: repo_docx_style.js
Ruta: reportes/repo_docx_style.js
Función: APA y helpers DOCX (SIN cabecera institucional)
========================================================= */

const {
  Paragraph, TextRun, AlignmentType, HeadingLevel, ImageRun
} = docx;

export const REPO_ESTILO_BASE = {
  font: "Times New Roman",
  size: 24,
  color: "000000"
};

export const REPO_SANGRIA_APA = 720;

export function repoTitulo1(texto) {
  return new Paragraph({
    text: texto,
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 200 },
    run: { ...REPO_ESTILO_BASE, bold: true, size: 28 }
  });
}

export function repoTitulo2(texto) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text: texto, ...REPO_ESTILO_BASE, bold: true })]
  });
}

export function repoParrafo(texto) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: REPO_SANGRIA_APA },
    spacing: { after: 200 },
    children: [new TextRun({ text: texto, ...REPO_ESTILO_BASE })]
  });
}

export function repoTituloTabla(numero, descripcion) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: `Tabla ${numero}`, ...REPO_ESTILO_BASE, bold: true }),
      new TextRun({ text: `\n${descripcion}`, ...REPO_ESTILO_BASE, italics: true })
    ]
  });
}

export function repoNotaFigura(numero, titulo, nota) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 100, after: 300 },
    children: [
      new TextRun({ text: `Figura ${numero}. `, ...REPO_ESTILO_BASE, bold: true, size: 20 }),
      new TextRun({ text: `${titulo}. `, ...REPO_ESTILO_BASE, italics: true, size: 20 }),
      new TextRun({ text: nota, ...REPO_ESTILO_BASE, size: 20 })
    ]
  });
}

export function repoImagenSegura(bufferImagen, ancho = 450, alto = 300) {
  if (!bufferImagen) return null;
  try {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data: bufferImagen, transformation: { width: ancho, height: alto } })]
    });
  } catch (e) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "[Error: No se pudo renderizar la imagen]", color: "FF0000", bold: true })]
    });
  }
}

/*
  ✅ CAMBIO IMPORTANTE:
  - Se removió repoEncabezadoInstitucional(...) de este archivo.
  - Ahora vive en: reportes/repo_docx_header.js
  Motivo: cabecera única reutilizable en TODO el documento.
*/
