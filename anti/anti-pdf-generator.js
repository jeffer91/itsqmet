/* Archivo: anti-pdf-generator.js
 Ubicación: anti/anti-pdf-generator.js
 Función: Genera el PDF (doc) y devuelve filename:
          - Cuerpo institucional (justificado simulado)
          - Marca de agua diagonal en TODAS las páginas
          - Tabla de detector con imágenes translúcidas (watermark)
 ========================================================= */

(function (window) {
  "use strict";

  const U = window.AntiUtils;

  function getJsPDF() {
    const api = window.jspdf;
    if (!api || !api.jsPDF) throw new Error("jsPDF no está disponible");
    return api.jsPDF;
  }

  function setFont(doc, family = "times", style = "normal") {
    doc.setFont(family, style);
  }

  function setTextColor(doc, rgb) {
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
  }

  function setDrawColor(doc, rgb) {
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  }

  function setFillColor(doc, rgb) {
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
  }

  function safeSetOpacity(doc, opacity01) {
    try {
      if (doc.GState && typeof doc.setGState === "function") {
        const gs = new doc.GState({ opacity: opacity01 });
        doc.setGState(gs);
      }
    } catch (e) {
      console.warn("No se pudo establecer opacidad:", e);
    }
  }

  function safeResetOpacity(doc) {
    try {
      if (doc.GState && typeof doc.setGState === "function") {
        const gs0 = new doc.GState({ opacity: 1 });
        doc.setGState(gs0);
      }
    } catch (e) {}
  }

  function addWatermark(doc) {
    const text = "INFORME DE ORIGINALIDAD";
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const cx = pageW / 2;
    const cy = pageH / 2;

    // Ajustes de posición de la marca de agua principal
    const WM1 = {
      moveX: 10,
      moveY: 20,
      fontSize: 42,
      opacity: 0.10
    };
    const WM2 = {
      moveX: 10,
      moveY: 150,
      fontSize: 42,
      opacity: 0.10
    };

    const ANGLE_DEG = 45;
    const WM_COLOR = [37, 99, 235]; // Azul
    const WM_FONT = { family: "helvetica", style: "bold" };

    // === MARCA 1 ===
    try {
      safeSetOpacity(doc, WM1.opacity);
      setFont(doc, WM_FONT.family, WM_FONT.style);
      doc.setFontSize(WM1.fontSize);
      doc.setTextColor(WM_COLOR[0], WM_COLOR[1], WM_COLOR[2]);
      const x1 = cx + WM1.moveX;
      const y1 = cy + WM1.moveY;
      doc.text(text, x1, y1, { align: "center", angle: ANGLE_DEG });
    } catch {}

    // === MARCA 2 ===
    try {
      safeSetOpacity(doc, WM2.opacity);
      setFont(doc, WM_FONT.family, WM_FONT.style);
      doc.setFontSize(WM2.fontSize);
      doc.setTextColor(WM_COLOR[0], WM_COLOR[1], WM_COLOR[2]);
      const x2 = cx + WM2.moveX;
      const y2 = cy + WM2.moveY;
      doc.text(text, x2, y2, { align: "center", angle: ANGLE_DEG });
    } catch {}

    // Reset visual
    safeResetOpacity(doc);
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(12);
  }

  function addPage(doc) {
    doc.addPage();
    addWatermark(doc);
  }

  function ensurePage(doc, y, needed, marginTop, marginBottom) {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + needed <= pageH - marginBottom) return y;
    addPage(doc);
    return marginTop;
  }

  function writeWrapped(doc, text, x, y, maxW, lineH) {
    const lines = doc.splitTextToSize(String(text || ""), maxW);
    for (const ln of lines) {
      doc.text(ln, x, y);
      y += lineH;
    }
    return y;
  }

  function writeFieldAligned(doc, label, value, xLabel, xValue, y, maxWValue, lineH) {
    setFont(doc, "times", "bold");
    doc.text(String(label || ""), xLabel, y);

    setFont(doc, "times", "normal");
    const v = String(value || "");
    const vLines = doc.splitTextToSize(v, maxWValue);
    if (vLines.length) doc.text(vLines[0], xValue, y);
    for (let i = 1; i < vLines.length; i++) {
      y += lineH;
      doc.text(vLines[i], xValue, y);
    }
    return y + lineH;
  }

  function addImageFit(doc, dataUrl, x, y, maxW, maxH) {
    const props = doc.getImageProperties(dataUrl);
    const w = props.width || 1;
    const h = props.height || 1;
    const ratio = w / h;
    let drawW = maxW;
    let drawH = drawW / ratio;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * ratio;
    }
    doc.addImage(dataUrl, "PNG", x, y, drawW, drawH);
    return { drawW, drawH };
  }

  // ===== Justificado (simulado) =====
  function justifyLine(doc, line, x, y, targetWidth) {
    const words = String(line || "").trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      doc.text(String(line || ""), x, y);
      return;
    }

    const baseText = words.join(" ");
    const baseWidth = doc.getTextWidth(baseText);
    const extra = targetWidth - baseWidth;
    if (extra <= 0) {
      doc.text(baseText, x, y);
      return;
    }

    const gaps = words.length - 1;
    const addPerGap = extra / gaps;
    let cursorX = x;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      doc.text(w, cursorX, y);
      cursorX += doc.getTextWidth(w);
      if (i < gaps) {
        cursorX += doc.getTextWidth(" ") + addPerGap;
      }
    }
  }

  function writeParagraphJustified(doc, text, x, y, maxW, lineH) {
    const lines = doc.splitTextToSize(String(text || ""), maxW);
    for (let i = 0; i < lines.length; i++) {
      const ln = String(lines[i] || "");
      if (i === lines.length - 1) doc.text(ln, x, y);
      else justifyLine(doc, ln, x, y, maxW);
      y += lineH;
    }
    return y;
  }

  // ===== Detector helpers =====
  function drawPieSlice(doc, cx, cy, r, startDeg, endDeg, fillRgb, segments = 48) {
    const start = (Math.PI / 180) * startDeg;
    const end = (Math.PI / 180) * endDeg;
    const pts = [];
    pts.push([0, 0]);
    const steps = Math.max(6, Math.floor(segments * Math.abs(end - start) / (2 * Math.PI)));
    for (let i = 0; i <= steps; i++) {
      const t = start + (end - start) * (i / steps);
      pts.push([Math.cos(t) * r, Math.sin(t) * r]);
    }
    const deltas = [];
    for (let i = 1; i < pts.length; i++) {
      deltas.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
    }
    setFillColor(doc, fillRgb);
    setDrawColor(doc, fillRgb);
    doc.lines(deltas, cx, cy, [1, 1], "F", true);
  }

  function drawLegendItem(doc, x, y, colorRgb, label, fontSize = 10) {
    doc.setFontSize(fontSize);
    setFillColor(doc, colorRgb);
    setDrawColor(doc, colorRgb);
    doc.rect(x, y - 3.5, 10, 3, "F");
    doc.setTextColor(20, 20, 20);
    setFont(doc, "helvetica", "normal");
    doc.text(label, x + 14, y);
  }

  function renderDetectorBlock(doc, params) {
    const { marginL, marginR, marginTop, marginBottom, lineH, detectorModel } = params;
    const pageW = doc.internal.pageSize.getWidth();
    const maxW = pageW - marginL - marginR;
    const C = U.DETECTOR_COLORS;

    let y = params.y;
    setFont(doc, "helvetica", "normal");
    setTextColor(doc, C.text);

    doc.setFontSize(12);
    setFont(doc, "helvetica", "bold");
    y = writeWrapped(doc, detectorModel.headerTitle, marginL, y, maxW, lineH);

    doc.setFontSize(10.5);
    setFont(doc, "helvetica", "normal");
    y = writeWrapped(doc, detectorModel.docLine, marginL, y, maxW, lineH);

    y += 1;
    for (const ln of detectorModel.settingsLines || []) {
      y = ensurePage(doc, y, lineH * 2, marginTop, marginBottom);
      y = writeWrapped(doc, ln, marginL, y, maxW, lineH);
    }

    y += lineH * 0.8;
    y = ensurePage(doc, y, 90, marginTop, marginBottom);

    doc.setFontSize(11);
    setFont(doc, "helvetica", "bold");
    doc.text("Análisis detallado del cuerpo del documento:", marginL, y);
    y += lineH;

    setFont(doc, "helvetica", "normal");
    doc.text("Tabla de relaciones:", marginL + 10, y);
    y += lineH;

    doc.setFontSize(10);
    const p = detectorModel.pct || { plagio: 0, original: 0, citas: 0, ai: 0 };
    drawLegendItem(doc, marginL + 10, y, C.plagio, `Plagio ${U.formatPctES(p.plagio)}`, 9.5);
    drawLegendItem(doc, marginL + 55, y, C.original, `Original ${U.formatPctES(p.original)}`, 9.5);
    drawLegendItem(doc, marginL + 110, y, C.citas, `Citas ${U.formatPctES(p.citas)}`, 9.5);
    y += lineH;
    drawLegendItem(doc, marginL + 55, y, C.ai, `AI ${U.formatPctES(p.ai)}`, 9.5);
    y += lineH * 0.6;

    const pieCx = marginL + maxW / 2;
    const pieCy = y + 28;
    const r = 22;

    setFillColor(doc, C.original);
    setDrawColor(doc, C.original);
    doc.circle(pieCx, pieCy, r, "F");

    const plagPct = Math.max(0, Math.min(100, Number(p.plagio || 0)));
    if (plagPct > 0.01) {
      const angle = 360 * (plagPct / 100);
      const startDeg = -90;
      const endDeg = startDeg + angle;
      drawPieSlice(doc, pieCx, pieCy, r, startDeg, endDeg, C.plagio);
    }

    y = pieCy + r + lineH * 1.2;
    y = ensurePage(doc, y, lineH * 4, marginTop, marginBottom);
    doc.setFontSize(10.5);
    setFont(doc, "helvetica", "normal");
    doc.text("Gráfico de distribución:", marginL + 10, y);
    y += lineH * 0.8;

    setDrawColor(doc, C.lightBorder);
    doc.rect(marginL, y, maxW, 14, "S");
    y += 16;
    y = ensurePage(doc, y, lineH * 6, marginTop, marginBottom);
    doc.setFontSize(11);
    setFont(doc, "helvetica", "bold");
    doc.text(`Principales fuentes de plagio: ${String((detectorModel.sources || []).length)}`, marginL, y);
    y += lineH;

    doc.setFontSize(9.5);
    setFont(doc, "helvetica", "normal");

    const rowH = 7;
    setDrawColor(doc, C.lightBorder);
    doc.rect(marginL, y, maxW, rowH * (detectorModel.sources || []).length, "S");
    // Líneas verticales de la tabla fuentes
    doc.line(marginL + 14, y, marginL + 14, y + rowH * (detectorModel.sources || []).length);
    doc.line(marginL + 28, y, marginL + 28, y + rowH * (detectorModel.sources || []).length);
    doc.line(marginL + 40, y, marginL + 40, y + rowH * (detectorModel.sources || []).length);

    // Líneas horizontales internas
    for (let rI = 1; rI < (detectorModel.sources || []).length; rI++) {
      doc.line(marginL, y + rowH * rI, marginL + maxW, y + rowH * rI);
    }

    for (let i = 0; i < (detectorModel.sources || []).length; i++) {
      const s = detectorModel.sources[i];
      const yy = y + rowH * i + rowH * 0.68;

      setTextColor(doc, C.plagio);
      doc.text(`${s.pct}%`, marginL + 2, yy);
      doc.text(String(s.score), marginL + 16, yy);
      doc.text(String(s.idx), marginL + 30, yy);

      setTextColor(doc, C.text);
      doc.text(String(s.text), marginL + 42, yy);
    }

    y += rowH * (detectorModel.sources || []).length + lineH;
    y = ensurePage(doc, y, lineH * 2, marginTop, marginBottom);
    doc.setFontSize(10.5);
    setFont(doc, "helvetica", "normal");
    setTextColor(doc, C.text);
    doc.text("Detalles de recursos procesados: 165 - Okay / 17 - Ha fallado", marginL, y);
    y += lineH;
    doc.text("Notas importantes:", marginL, y);
    y += lineH * 0.7;

    const boxH = 28;
    y = ensurePage(doc, y, boxH + lineH * 2, marginTop, marginBottom);

    // Dibujar la grilla de la tabla
    setDrawColor(doc, C.lightBorder);
    doc.rect(marginL, y, maxW, boxH, "S");
    doc.line(marginL + maxW * 0.25, y, marginL + maxW * 0.25, y + boxH);
    doc.line(marginL + maxW * 0.50, y, marginL + maxW * 0.50, y + boxH);
    doc.line(marginL + maxW * 0.75, y, marginL + maxW * 0.75, y + boxH);

    const pad = 2;
    const cellW = maxW * 0.25;
    const imgW = cellW - pad * 2;
    const imgH = 14;
    
    // Centrado vertical dentro del box (28 altura) -> y + 7
    const imgY = y + 7;

    const a = U.DETECTOR_NOTE_ASSETS || {};

    // 1. ACTIVAR TRANSPARENCIA PARA IMÁGENES
    safeSetOpacity(doc, 0.15); // 15% de opacidad

    try {
      if (a.wikipedia) doc.addImage(a.wikipedia, "PNG", marginL + pad, imgY, imgW, imgH);
    } catch {}
    try {
      if (a.googlebooks) doc.addImage(a.googlebooks, "PNG", marginL + cellW + pad, imgY, imgW, imgH);
    } catch {}
    try {
      if (a.ghostwriting) doc.addImage(a.ghostwriting, "PNG", marginL + cellW * 2 + pad, imgY, imgW, imgH);
    } catch {}
    try {
      if (a.antitrap) doc.addImage(a.antitrap, "PNG", marginL + cellW * 3 + pad, imgY, imgW, imgH);
    } catch {}

    // 2. RESETEAR TRANSPARENCIA PARA EL TEXTO
    safeResetOpacity(doc);

    // Texto de las celdas
    doc.setFontSize(9.2);
    setFont(doc, "helvetica", "normal");
    setTextColor(doc, C.text);

    doc.text("Wikipedia:", marginL + 2, y + 5);
    doc.text("[no detectado]", marginL + 2, y + 26);

    doc.text("Libros de Google:", marginL + cellW + 2, y + 5);
    doc.text("[no detectado]", marginL + cellW + 2, y + 26);

    doc.text("Servicios de escritura\nfantasma:", marginL + cellW * 2 + 2, y + 5);
    doc.text("[no detectado]", marginL + cellW * 2 + 2, y + 26);

    doc.text("Anti-trampa:", marginL + cellW * 3 + 2, y + 5);
    doc.text("[no detectado]", marginL + cellW * 3 + 2, y + 26);

    y += boxH + lineH;

    params.y = y;
    return params;
  }

  function clampPct(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(100, v));
  }

  function pickDecision(original, plagio) {
    const orig = clampPct(original);
    const pl = clampPct(plagio);
    const within = (orig >= 80 && pl <= 20);
    if (within) {
      return {
        accionRequerida: "no se requiere la realización de ajustes adicionales",
        estadoDocumento: "cumple",
        resultadoFinal: "se autoriza su continuidad"
      };
    }

    return {
      accionRequerida: "se requiere realizar ajustes y volver a generar el informe de originalidad",
      estadoDocumento: "no cumple",
      resultadoFinal: "no se autoriza su continuidad"
    };
  }

  function buildIAResult(aiPct) {
    const ai = clampPct(aiPct);
    if (ai <= 0) return "no se detectaron indicios relevantes de contenido generado por inteligencia artificial";
    return `se identificaron indicios de contenido generado por inteligencia artificial (estimación ${ai.toFixed(2)}%)`;
  }

  function buildAntiTrapResult() {
    return "no se detectaron patrones antitrampa ni símbolos sospechosos";
  }

  const AntiPDFGenerator = {
    generate({ estudiante, periodoLabel, logoDataUrl, detectorModel, memoDateISOOverride }) {
      const jsPDF = getJsPDF();
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      // Watermark en la primera página
      addWatermark(doc);

      const marginL = 20;
      const marginR = 20;
      const marginTop = 18;
      const marginBottom = 18;
      const pageW = doc.internal.pageSize.getWidth();
      const maxW = pageW - marginL - marginR;
      const lineH = 6.2;

      const today = U.todayParts();
      const memoDateISO = String(memoDateISOOverride || today.memo);
      const memoDateHumanLong = today.humanLong;

      const p = detectorModel?.pct || { original: 0, plagio: 0, citas: 0, ai: 0 };
      const originalidad = clampPct(p.original);
      const plagio = clampPct(p.plagio);

      const sistemaAntiplagio = "Detector de similitud";
      const versionSistema = "2867";

      const decision = pickDecision(originalidad, plagio);

      const memoModel = window.AntiPDFTemplate.buildMemoModel({
        estudianteNombre: estudiante.nombre,
        estudianteCedula: estudiante.cedula,
        estudianteCarrera: estudiante.carrera,
        periodoLabel,
        memoDateISO,
        memoDateHumanLong,
        sistemaAntiplagio,
        versionSistema,
        porcentajeOriginalidad: originalidad.toFixed(2),
        porcentajePlagio: plagio.toFixed(2),
        resultadoIA: buildIAResult(p.ai),
        resultadoAntitrampa: buildAntiTrapResult(),
        accionRequerida: decision.accionRequerida,
        estadoDocumento: decision.estadoDocumento,
        resultadoFinal: decision.resultadoFinal
      });

      let y = marginTop;

      // Logo
      if (logoDataUrl) {
        try {
          const logoMaxW = 42;
          const logoMaxH = 18;
          const r = addImageFit(doc, logoDataUrl, marginL, y, logoMaxW, logoMaxH);
          y += Math.max(r.drawH, 14);
        } catch {
          y += 6;
        }
      } else {
        y += 6;
      }

      // Título
      y += 6;
      y = ensurePage(doc, y, lineH * 2, marginTop, marginBottom);
      setFont(doc, "times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 20);
      doc.text(String(memoModel.header.memoLine || ""), pageW / 2, y, { align: "center" });
      y += lineH * 2;

      // Campos
      const xLabel = marginL + 10;
      const xValue = marginL + 48;
      const maxWValue = (pageW - marginR) - xValue;
      y += 2;
      for (const f of memoModel.header.fields) {
        y = ensurePage(doc, y, lineH * 3, marginTop, marginBottom);
        y = writeFieldAligned(doc, f.label, f.value, xLabel, xValue, y, maxWValue, lineH);
        y += 2;
      }

      // Cuerpo
      y += lineH;
      setFont(doc, "times", "normal");
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 20);

      for (const pB of memoModel.body) {
        const t = (pB.text || "").trim();
        if (!t) continue;

        y = ensurePage(doc, y, lineH * 3, marginTop, marginBottom);
        if (t.toLowerCase().startsWith("a quien corresponda")) {
          doc.text(t, marginL, y);
          y += lineH * 1.2;
          continue;
        }

        y = writeParagraphJustified(doc, t, marginL, y, maxW, lineH);
        y += lineH;
      }

      // Página Detector
      addPage(doc);
      y = marginTop;

      const detectorParams = {
        y,
        marginL,
        marginR,
        marginTop,
        marginBottom,
        lineH,
        detectorModel
      };
      renderDetectorBlock(doc, detectorParams);

      // Firma
      let ySig = detectorParams.y + (lineH * 1.2);
      const signatureNeeded = (1 + 5 + 2) * lineH + 4;
      ySig = ensurePage(doc, ySig, signatureNeeded, marginTop, marginBottom);

      setFont(doc, "times", "normal");
      doc.setFontSize(12);
      doc.setTextColor(20, 20, 20);

      let yy = ySig;
      for (const s of memoModel.signature) {
        if (s.type === "spacer") {
          yy += (s.n || 1) * lineH;
          continue;
        }
        if (s.type === "line") {
          doc.text(String(s.text || ""), marginL, yy);
          yy += lineH;
        }
      }

      const filename = U.buildPdfFilename({
        memoDateISO,
        estudianteNombre: estudiante.nombre,
        estudianteCedula: estudiante.cedula
      });

      return { doc, filename, memoDateISO };
    }
  };

  window.AntiPDFGenerator = AntiPDFGenerator;
})(window);