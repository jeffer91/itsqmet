/* Archivo: anti-utils.js
Ubicación: anti/anti-utils.js
Función: Utilidades + assets (detector) + helpers:
         - iniciales en mayúsculas
         - filename estándar de PDF
         - descarga segura de blobs (ZIP/PDF)
         - carga de imágenes del detector desde /anti/img
========================================================= */

(function (window) {
  "use strict";

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      try {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ""));
        fr.onerror = () => reject(fr.error || new Error("No se pudo leer el archivo"));
        fr.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      try {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ""));
        fr.onerror = () => reject(fr.error || new Error("No se pudo leer el blob"));
        fr.readAsDataURL(blob);
      } catch (e) {
        reject(e);
      }
    });
  }

  function downloadBlob(blob, filename) {
    const name = String(filename || "archivo").trim() || "archivo";

    // FileSaver (si está cargado)
    if (typeof window.saveAs === "function") {
      window.saveAs(blob, name);
      return;
    }

    // Fallback: link temporal
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("[AntiUtils] No se pudo descargar blob:", e);
      alert("No se pudo descargar el archivo. Revisa permisos del navegador.");
    }
  }

  const STOPWORDS_INICIALES = new Set([
    "DE", "DEL", "LA", "LAS", "LO", "LOS", "Y", "E",
    "DA", "DAS", "DO", "DOS",
    "VON", "VAN"
  ]);

  function initialsFromNameES(fullName) {
    const raw = String(fullName || "").trim();
    if (!raw) return "XX";

    const clean = AntiUtils.normalizeText(raw).replace(/[^\p{L}\p{N}\s]/gu, " ");
    const parts = clean.split(/\s+/).map(x => x.trim()).filter(Boolean);

    const letters = [];
    for (const p of parts) {
      const up = String(p).toUpperCase();
      if (STOPWORDS_INICIALES.has(up)) continue;
      if (/^\d+$/.test(up)) continue;

      letters.push(up[0]);
      if (letters.length >= 6) break;
    }

    return (letters.join("") || "XX").toUpperCase();
  }

  function sanitizeForFilename(str) {
    return String(str || "")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .trim();
  }

  // Sanitiza un nombre “humano” para filename (mantiene espacios)
  function sanitizeHumanFilename(str) {
    // 1) normaliza (quita tildes) y recorta
    let s = AntiUtils.normalizeText(String(str || "")).trim();

    // 2) reemplaza caracteres inválidos en Windows: \ / : * ? " < > |
    s = s.replace(/[\\\/:*?"<>|]/g, " ");

    // 3) quita caracteres raros, pero permite letras/números/espacios/._-
    s = s.replace(/[^\p{L}\p{N}\s._-]/gu, " ");

    // 4) colapsa espacios
    s = s.replace(/\s+/g, " ").trim();

    return s;
  }

  const AntiUtils = {
    normalizeText(str) {
      if (!str) return "";
      return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    },

    normalizeKey(str) {
      if (!str) return "";
      const t = this.normalizeText(str);
      return t.toLowerCase().replace(/[^a-z0-9]/g, "");
    },

    normalizeCareer(str) {
      if (!str) return "";
      return this.normalizeText(str).replace(/\s+/g, " ").toUpperCase();
    },

    safe(str) {
      if (str === undefined || str === null) return "";
      return String(str).trim();
    },

    todayParts() {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");

      const meses = [
        "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
        "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
      ];
      const humanLong = `${dd} DE ${meses[d.getMonth()]} DE ${yyyy}`;

      return {
        yyyy, mm, dd,
        memo: `${yyyy}-${mm}-${dd}`, // YYYY-MM-DD
        human: `${dd}/${mm}/${yyyy}`,
        humanLong
      };
    },

    randomBetween(min, max, decimals = 2) {
      const r = min + Math.random() * (max - min);
      return Number(r.toFixed(decimals));
    },

    formatPctES(n, decimals = 2) {
      const v = Number(n);
      if (!Number.isFinite(v)) return "0,00%";
      return v.toFixed(decimals).replace(".", ",") + "%";
    },

    initialsFromNameES,

    // ✅ NUEVO FORMATO:
    // MEM-ITSQMET-UTET-YYYY-MM-DD-Apellidos Nombres.pdf
    buildPdfFilename({ memoDateISO, estudianteNombre /* , estudianteCedula */ }) {
      const datePart = String(memoDateISO || "").trim() || this.todayParts().memo;

      const humanName = sanitizeHumanFilename(estudianteNombre);
      const safeName = humanName || "SIN NOMBRE";

      return `MEM-ITSQMET-UTET-${datePart}-${safeName}.pdf`;
    },

    downloadBlob,

    DETECTOR_COLORS: {
      plagio: { r: 255, g: 0, b: 0 },
      original: { r: 0, g: 128, b: 0 },
      citas: { r: 0, g: 0, b: 255 },
      ai: { r: 255, g: 165, b: 0 },
      okGreen: { r: 0, g: 128, b: 0 },
      violet: { r: 148, g: 0, b: 211 },
      text: { r: 20, g: 20, b: 20 },
      lightBorder: { r: 210, g: 210, b: 210 }
    },

    // Assets por defecto (se llenan con loadDetectorAssets)
    DETECTOR_NOTE_ASSETS: {
      wikipedia: "",
      googlebooks: "",
      ghostwriting: "",
      antitrap: ""
    },

    fileToDataURL,

    async loadImageDataURL(url) {
      const u = String(url || "").trim();
      if (!u) return "";
      const resp = await fetch(u, { cache: "no-store" });
      if (!resp.ok) throw new Error(`No se pudo cargar imagen: ${u}`);
      const blob = await resp.blob();
      return await blobToDataURL(blob);
    },

    /**
     * Carga las imágenes del detector desde la carpeta /anti/img
     * Requiere que existan:
     * - anti/img/wiki.png
     * - anti/img/google.png
     * - anti/img/fantasma.png
     * - anti/img/mano.png
     */
    async loadDetectorAssets() {
      const base = "img/";
      const map = {
        wikipedia: base + "wiki.png",
        googlebooks: base + "google.png",
        ghostwriting: base + "fantasma.png",
        antitrap: base + "mano.png"
      };

      const out = {};
      for (const k of Object.keys(map)) {
        try {
          out[k] = await this.loadImageDataURL(map[k]);
        } catch (e) {
          console.warn(`[AntiUtils] No se pudo cargar ${map[k]}:`, e);
          out[k] = "";
        }
      }

      this.DETECTOR_NOTE_ASSETS = out;
      return out;
    },

    sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
  };

  window.AntiUtils = AntiUtils;
})(window);
