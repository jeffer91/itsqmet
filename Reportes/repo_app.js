/* =========================================================
Archivo: repo_app.js
Ruta: reportes/repo_app.js
Función: Controlador Dashboard "Todo en Uno"
========================================================= */

import { repoObtenerPeriodos, repoObtenerEstadisticas } from "./repo_data.js";
import { repoGenerarAnalisisIA } from "./repo_ia.js";
import { repoGenerarDocxBlob, repoCodigoInforme } from "./repo_docx_core.js";
import { repoExportarPDFDesdeVisor } from "./repo_pdf.js";

const State = {
  periodos: [],
  stats: null,
  periodoId: "",
  periodoLabel: "",
  anexos: [],
  config: { num: 1, anio: 2025, mes: "12", incluirTitulacion: true },
  analisisIA: null,
  previewPages: [],
  currentPageIndex: 0
};

const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupEventListeners();
  setupDropzone();
  await cargarPeriodosIniciales();

  // ✅ Mantener preview organizado al cambiar tamaño
  window.addEventListener("resize", () => ajustarZoomPreview());
}

function setupEventListeners() {
  // Inputs de configuración (Actualización reactiva)
  const inputs = ["cod-num", "cod-anio", "cod-mes", "check-titulacion"];
  inputs.forEach(id => {
    $(id).addEventListener("change", () => {
      actualizarConfigState();
      generarVistaPrevia();
    });
  });

  // Selector de Periodo
  $("selector-periodo").addEventListener("change", async (e) => {
    await seleccionarPeriodo(e.target.value);
  });

  // Descarga (sidebar)
  $("btn-download-word").addEventListener("click", descargarWord);
  $("btn-download-pdf").addEventListener("click", descargarPDF);

  // Descarga (toolbar)
  const btnWordTop = $("btn-download-word-top");
  const btnPdfTop = $("btn-download-pdf-top");
  if (btnWordTop) btnWordTop.addEventListener("click", descargarWord);
  if (btnPdfTop) btnPdfTop.addEventListener("click", descargarPDF);

  // Paginación
  $("btn-prev-page").addEventListener("click", () => cambiarPagina(-1));
  $("btn-next-page").addEventListener("click", () => cambiarPagina(1));

  // PEGADO GLOBAL
  document.addEventListener("paste", handlePaste);
}

// =========================================================
// 1. DROPZONE Y ANEXOS
// =========================================================

function setupDropzone() {
  const zone = $("dropzone");
  const input = $("anexo-file");

  zone.addEventListener("click", () => input.click());
  input.addEventListener("change", (e) => procesarArchivos(e.target.files));

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    procesarArchivos(e.dataTransfer.files);
  });
}

function handlePaste(e) {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  const files = [];
  for (let item of items) {
    if (item.type.indexOf("image") !== -1) files.push(item.getAsFile());
  }
  if (files.length > 0) {
    procesarArchivos(files);
    setStatus(`Se pegaron ${files.length} imagen(es) desde el portapapeles.`);
  }
}

async function procesarArchivos(fileList) {
  if (!fileList || fileList.length === 0) return;

  for (const file of Array.from(fileList)) {
    if (!file.type.startsWith("image/")) continue;

    try {
      const buffer = await file.arrayBuffer();
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);

      State.anexos.push({
        id: Date.now() + Math.random(),
        titulo: file.name.split(".")[0],
        data: buffer,
        url
      });
    } catch (e) {
      console.error("Error leyendo archivo", e);
    }
  }

  renderAnexosGrid();
  generarVistaPrevia();
}

function renderAnexosGrid() {
  const grid = $("anexos-grid");
  grid.innerHTML = "";

  State.anexos.forEach((anexo) => {
    const div = document.createElement("div");
    div.className = "anexo-thumb";
    div.innerHTML = `
      <img src="${anexo.url}" title="${anexo.titulo}">
      <button class="anexo-remove" data-id="${anexo.id}">×</button>
    `;
    div.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      eliminarAnexo(anexo.id);
    });
    grid.appendChild(div);
  });
}

function eliminarAnexo(id) {
  const eliminado = State.anexos.find(a => a.id === id);
  if (eliminado?.url) URL.revokeObjectURL(eliminado.url);

  State.anexos = State.anexos.filter(a => a.id !== id);
  renderAnexosGrid();
  generarVistaPrevia();
}

// =========================================================
// 2. DATOS Y ESTADO
// =========================================================

async function cargarPeriodosIniciales() {
  const sel = $("selector-periodo");
  try {
    State.periodos = await repoObtenerPeriodos();
    sel.innerHTML =
      `<option value="">Seleccione un periodo...</option>` +
      State.periodos.map(p => `<option value="${p.id}">${p.label}</option>`).join("");
  } catch (e) {
    sel.innerHTML = `<option>Error cargando datos</option>`;
    setStatus("Error de conexión con Firebase.", true);
  }
}

async function seleccionarPeriodo(id) {
  State.periodoId = id;
  const opt = $("selector-periodo").options[$("selector-periodo").selectedIndex];
  State.periodoLabel = opt ? opt.text : "";

  if (!id) {
    State.stats = null;
    $("document-viewer").innerHTML =
      `<div class="placeholder-state"><span class="material-icons-round">preview</span><p>Selecciona un periodo.</p></div>`;
    return;
  }

  setStatus("Cargando estadísticas...");
  $("loading-indicator").classList.remove("hidden");

  try {
    State.stats = await repoObtenerEstadisticas(id);
    if (!State.stats) throw new Error("Sin datos");
    actualizarConfigState();
    generarVistaPrevia();
    setStatus("Datos cargados correctamente.");
  } catch (e) {
    setStatus("No hay datos para este periodo.", true);
  } finally {
    $("loading-indicator").classList.add("hidden");
  }
}

function actualizarConfigState() {
  State.config = {
    num: parseInt($("cod-num").value) || 1,
    anio: parseInt($("cod-anio").value) || 2025,
    mes: $("cod-mes").value,
    incluirTitulacion: $("check-titulacion").checked
  };
}

// =========================================================
// 3. VISTA PREVIA
// =========================================================

function generarVistaPrevia() {
  if (!State.stats || !State.periodoId) return;

  State.analisisIA = repoGenerarAnalisisIA(State.stats, State.config);

  const viewer = $("document-viewer");
  viewer.innerHTML = "";

  const pages = [];

  // Portada
  pages.push(crearHojaHTML(`
    <div class="header-simulado">${repoHeaderHTML(State)}</div>
    <div style="text-align:center; margin-top:90px;">
      <h1>Reporte Final de Requisitos</h1>
      <h2>${State.periodoLabel}</h2>
      <p style="margin-top:45px;"><b>Código:</b> ${repoCodigoInforme(State.config)}</p>
      <p style="margin-top:140px;"><b>Elaborado por:</b><br>Msc. Jefferson Villarreal</p>
    </div>
  `));

  // Resumen
  const hallazgos = State.analisisIA.datosResumen.hallazgos.map(h => `<li>${h}</li>`).join("");
  pages.push(crearHojaHTML(`
    <div class="header-simulado">${repoHeaderHTML(State)}</div>
    <h3>Resumen Ejecutivo</h3>
    <ul>${hallazgos}</ul>
    <p><i>Nota: Las tablas detalladas y gráficos se generarán en el Word final.</i></p>
  `));

  // Anexos
  if (State.anexos.length > 0) {
    const imgs = State.anexos.map((a, i) => `
      <div style="margin-bottom:20px;">
        <p><b>Anexo ${i + 1}:</b> ${a.titulo}</p>
        <img src="${a.url}" style="max-width:100%; max-height:300px; border:1px solid #ccc;">
      </div>
    `).join("");
    pages.push(crearHojaHTML(`
      <div class="header-simulado">${repoHeaderHTML(State)}</div>
      <h3>Anexos</h3>
      ${imgs}
    `));
  } else {
    pages.push(crearHojaHTML(`
      <div class="header-simulado">${repoHeaderHTML(State)}</div>
      <h3>Anexos</h3>
      <p>No se han adjuntado evidencias.</p>
    `));
  }

  State.previewPages = pages;
  State.currentPageIndex = 0;

  viewer.appendChild(pages[0]);
  actualizarPaginacion();

  // ✅ Organiza: fit al ancho para que se vea legible
  ajustarZoomPreview();
}

function crearHojaHTML(contenido) {
  const div = document.createElement("div");
  div.className = "hoja-word";
  div.innerHTML = contenido;
  return div;
}

function repoHeaderHTML(state) {
  return `
    <table>
      <tr>
        <td width="20%" align="center"><b>ITSQMET</b></td>
        <td width="50%" align="center">Unidad Titulación</td>
        <td width="30%" align="center">${repoCodigoInforme(state.config)}</td>
      </tr>
    </table>
  `;
}

// ✅ Fit-to-width: legible, centrado, con scroll vertical natural
function ajustarZoomPreview() {
  const hoja = document.querySelector(".hoja-word");
  const cont = document.querySelector(".document-scroll");
  if (!hoja || !cont) return;

  hoja.style.zoom = "1";

  const margen = 16;
  const disponibleW = Math.max(0, cont.clientWidth - margen * 2);
  const w = hoja.offsetWidth || 1;

  const scale = Math.min(disponibleW / w, 1);
  hoja.style.zoom = String(Math.max(0.1, scale));
}

// =========================================================
// 4. UI
// =========================================================

function cambiarPagina(delta) {
  if (!State.previewPages.length) return;

  const nuevoIdx = State.currentPageIndex + delta;
  if (nuevoIdx >= 0 && nuevoIdx < State.previewPages.length) {
    State.currentPageIndex = nuevoIdx;

    const viewer = $("document-viewer");
    viewer.innerHTML = "";
    viewer.appendChild(State.previewPages[State.currentPageIndex]);

    actualizarPaginacion();
    ajustarZoomPreview();
  }
}

function actualizarPaginacion() {
  $("page-indicator").innerText =
    `Página ${State.currentPageIndex + 1} / ${Math.max(1, State.previewPages.length)}`;
}

function setStatus(msg, error = false) {
  const el = $("status-bar");
  el.innerText = msg;
  el.style.color = error ? "#e74c3c" : "#7f8c8d";
}

async function descargarWord() {
  if (!State.stats) return setStatus("Faltan datos para generar.", true);

  // ✅ Guard explícito: si no carga FileSaver, no descarga
  if (typeof window.saveAs !== "function") {
    return setStatus("No se pudo descargar Word: FileSaver (saveAs) no está cargado.", true);
  }

  setStatus("Generando Word...");
  try {
    const blob = await repoGenerarDocxBlob({
      stats: State.stats,
      config: State.config,
      periodoLabel: State.periodoLabel,
      anexos: State.anexos,
      analisisIA: State.analisisIA
    });

    window.saveAs(blob, `${repoCodigoInforme(State.config)}.docx`);
    setStatus("Descarga iniciada.");
  } catch (e) {
    console.error(e);
    setStatus("Error generando Word", true);
  }
}

async function descargarPDF() {
  if (!State.stats) return setStatus("Faltan datos.", true);

  setStatus("Generando PDF...");
  try {
    const viewer = $("document-viewer");
    await repoExportarPDFDesdeVisor(viewer, `${repoCodigoInforme(State.config)}.pdf`);
    setStatus("PDF descargado.");
  } catch (e) {
    console.error(e);
    setStatus(`Error generando PDF: ${e?.message || "desconocido"}`, true);
  }
}
