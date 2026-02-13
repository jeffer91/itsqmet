/* =========================================================
Archivo: repo_pdf.js
Ruta: reportes/repo_pdf.js
Función: exportar PDF desde visor HTML
========================================================= */

export async function repoExportarPDFDesdeVisor(documentViewerEl, nombreArchivo = "reporte.pdf") {
  // ✅ Guardas explícitas para diagnosticar cuando “no descarga”
  if (!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error("jsPDF no está cargado (jspdf.umd.min.js).");
  }
  if (!window.html2canvas) {
    throw new Error("html2canvas no está cargado (requerido para exportar PDF).");
  }

  // ✅ Exportar SOLO la hoja visible para evitar capturar sidebar/toolbar
  const hoja = documentViewerEl?.querySelector(".hoja-word") || documentViewerEl;
  if (!hoja) throw new Error("No se encontró la hoja (.hoja-word) para exportar.");

  // ✅ Evitar que el zoom del preview afecte el PDF final
  const prevZoom = hoja.style.zoom;
  hoja.style.zoom = "1";

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    await doc.html(hoja, {
      x: 10,
      y: 10,
      width: 190,
      // ✅ ayuda a mantener proporciones
      windowWidth: hoja.scrollWidth || 1100
    });

    doc.save(nombreArchivo);
  } finally {
    hoja.style.zoom = prevZoom || "";
  }
}
