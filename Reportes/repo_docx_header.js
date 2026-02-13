/* =========================================================
Archivo: repo_docx_header.js
Ruta: reportes/repo_docx_header.js
Función: Cabecera institucional DOCX (se repite en todo el documento)
========================================================= */

const {
  Paragraph, TextRun, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, VerticalAlign, HeightRule
} = docx;

/**
 * Construye la cabecera institucional (logo + unidad + código + título + periodo)
 * - Fuente: Arial 9,5 (docx usa half-points → 9,5pt = 19)
 * - Logo: ./logo.png (en la misma carpeta que este módulo)
 */
export async function repoEncabezadoInstitucional(periodoTexto, codigoFinal) {
  // 9,5 pt => 19 (half-points en docx)
  const FONT_SIZE = 19;
  const FONT_FAMILY = "Arial";

  // Fallback si no hay logo
  let logoRun = new TextRun({
    text: "ITSQMET",
    bold: true,
    font: FONT_FAMILY,
    size: FONT_SIZE
  });

  async function loadLogoAsImageRun() {
    try {
      // ✅ Ruta robusta: siempre relativa al archivo repo_docx_header.js
      const logoUrl = new URL("./logo.png", import.meta.url);
      const res = await fetch(logoUrl);
      if (!res.ok) return null;

      const bytes = new Uint8Array(await res.arrayBuffer());
      return new ImageRun({
        data: bytes,
        transformation: { width: 130, height: 50 }
      });
    } catch {
      return null;
    }
  }

  const img = await loadLogoAsImageRun();
  if (img) logoRun = img;

  const periodoLinea = `Periodo: ${String(periodoTexto || "").trim()}`;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: { value: 400, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            rowSpan: 2,
            width: { size: 20, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [logoRun]
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Unidad de Titulación y Eficiencia Terminal",
                    font: FONT_FAMILY,
                    size: FONT_SIZE
                  })
                ]
              })
            ]
          }),
          new TableCell({
            rowSpan: 2,
            width: { size: 30, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Código:", font: FONT_FAMILY, size: FONT_SIZE }),
                  new TextRun({
                    break: 1,
                    text: String(codigoFinal || "").trim(),
                    font: FONT_FAMILY,
                    size: FONT_SIZE
                  })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        height: { value: 400, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Reporte Final de Requisitos",
                    bold: true,
                    font: FONT_FAMILY,
                    size: FONT_SIZE
                  }),
                  new TextRun({
                    break: 1,
                    text: periodoLinea,
                    bold: true,
                    font: FONT_FAMILY,
                    size: FONT_SIZE
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}
