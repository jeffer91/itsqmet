// excel-reader.js
// Lector Híbrido: Detecta si es Excel Real o Falso Excel (HTML)
// y fuerza la codificación correcta para cada caso.

(function (window) {
  "use strict";

function limpiarHeader(h) {
  const raw = String(h || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();

  // Normalización puntual para que coincida con los keys que usa el sistema
  // (ExcelConstants / mapRowToFirestore)
  const map = {
    // Si el Excel viene sin tildes, lo llevamos al key esperado
    "practicasvinculacion": "prácticasvinculacion",
    "practicasvinculación": "prácticasvinculacion",
    "actualizaciondatos": "actualizacióndatos",
    "actualizacióndatos": "actualizacióndatos",
  };

  return map[raw] || raw;
}

  function filaVacia(row) {
    return (row || []).every(c => !c || String(c).trim() === "");
  }

  async function readFile(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();

      fr.onload = function (e) {
        try {
          const buffer = e.target.result;
          const view = new Uint8Array(buffer);

          let wb;

          // Caso 1: Excel Binario Viejo (.xls)
          if (view[0] === 0xD0 && view[1] === 0xCF) {
            console.log("[ExcelReader] Detectado: Excel Binario (.xls real)");
            wb = XLSX.read(buffer, { type: "array", codepage: 1252 });
          }
          // Caso 2: Excel Moderno (.xlsx)
          else if (view[0] === 0x50 && view[1] === 0x4B) {
            console.log("[ExcelReader] Detectado: Excel Moderno (.xlsx)");
            wb = XLSX.read(buffer, { type: "array" });
          }
          // Caso 3: Falso Excel (HTML/XML)
          else {
            console.log("[ExcelReader] Detectado: Falso Excel (HTML/Texto). Decodificando como Texto…");
            const decoder = new TextDecoder("windows-1252");
            const texto = decoder.decode(buffer);
            wb = XLSX.read(texto, { type: "string" });
          }

          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

          if (!json || json.length === 0) {
            resolve({ sheets: [{ headers: [], rows: [] }] });
            return;
          }

          const headers = (json[0] || []).map(h => limpiarHeader(h));
          const rows = [];

          json.slice(1).forEach(r => {
            if (filaVacia(r)) return;

            const obj = {};
            headers.forEach((h, idx) => {
              let val = (r[idx] !== undefined && r[idx] !== null) ? String(r[idx]).trim() : "";

              // Parche de seguridad final por si acaso
              if (val.includes("х") || val.includes("Ã")) {
                val = val
                  .replace(/х/g, "Ñ")
                  .replace(/Ã±/g, "ñ")
                  .replace(/Ã³/g, "ó")
                  .replace(/Ã¡/g, "á")
                  .replace(/Ã©/g, "é")
                  .replace(/Ã­/g, "í")
                  .replace(/Ãº/g, "ú");
              }

              obj[h] = val;
            });

            rows.push(obj);
          });

          console.log("[ExcelReader] Lectura exitosa. Filas:", rows.length);
          resolve({ sheets: [{ headers, rows }] });

        } catch (err) {
          console.error("[ExcelReader] Error crítico:", err);
          alert("Error leyendo el archivo. Revisa el formato.");
          reject(err);
        }
      };

      fr.onerror = reject;
      fr.readAsArrayBuffer(file);
    });
  }

  window.ExcelReader = { readFile };

})(window);
