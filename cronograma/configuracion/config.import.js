import { limpiarTexto, FIN_NOM, FIN_ID, genId, normalizarPlantilla } from "./config.schema.js";

function normKey(s){
  return limpiarTexto(s).toLowerCase();
}

function readFileAsArrayBuffer(file){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(fr.error || new Error("No se pudo leer el archivo"));
    fr.readAsArrayBuffer(file);
  });
}

function pickHeaderMap(headers){
  const map = {};
  for (const h of headers){
    const k = normKey(h);
    if (k === "orden" || k === "#" || k.includes("orden")) map.orden = h;
    if (k === "nombre" || k.includes("actividad")) map.nombre = h;
    if (k === "días" || k === "dias" || k.includes("día") || k.includes("duracion")) map.dias = h;
    if (k === "grupo" || k.includes("administrativo")) map.grupo = h;
  }
  return map;
}

function parseBoolish(v){
  const s = normKey(v);
  if (!s) return null;
  if (["si","sí","true","1","admin","administrativo"].includes(s)) return true;
  if (["no","false","0","estudiante","estudiantes"].includes(s)) return false;
  return null;
}

export async function importXlsx(file, tipo){
  if (!file) return { ok:false, error:"No hay archivo" };
  if (!window.XLSX) return { ok:false, error:"No se encontró XLSX" };

  const buf = await readFileAsArrayBuffer(file);
  const wb = window.XLSX.read(buf, { type:"array" });

  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) return { ok:false, error:"El Excel no tiene hojas" };

  const ws = wb.Sheets[sheetName];
  const rows = window.XLSX.utils.sheet_to_json(ws, { defval:"", raw:false });
  if (!rows.length) return { ok:false, error:"La hoja está vacía" };

  const headers = Object.keys(rows[0] || {});
  const map = pickHeaderMap(headers);

  if (!map.nombre || !map.dias){
    return {
      ok:false,
      error:`Faltan columnas. Requiere al menos Nombre y Días. Encontré: ${headers.join(", ")}`
    };
  }

  const fixes = [];
  const actividades = [];

  for (let i = 0; i < rows.length; i++){
    const r = rows[i];
    const nombreRaw = limpiarTexto(r[map.nombre]);
    if (!nombreRaw) continue;

    let nombre = nombreRaw.replace(/\(.*?\)/g, "").trim();

    const orden = map.orden ? Number(String(r[map.orden]).replace(/[^\d]/g,"")) : (i+1);
    const dias = Number(String(r[map.dias]).replace(/[^\d]/g,"")) || 1;

    let esAdministrativo = false;
    if (map.grupo){
      const b = parseBoolish(r[map.grupo]);
      if (b != null) esAdministrativo = b;
    }

    if (nombre === FIN_NOM){
      actividades.push({
        id: FIN_ID,
        orden: Number.isFinite(orden) ? orden : 1,
        nombre: FIN_NOM,
        duracionDias: 1,
        esAdministrativo: false
      });
      if (nombreRaw !== FIN_NOM) fixes.push(`Fila ${i+1}: se limpió el nombre de fin-clases.`);
      continue;
    }

    actividades.push({
      id: genId(),
      orden: Number.isFinite(orden) ? orden : (i+1),
      nombre,
      duracionDias: Math.max(1, Number.isFinite(dias) ? dias : 1),
      esAdministrativo: !!esAdministrativo
    });
  }

  const plantilla = normalizarPlantilla({ version:1, tipo, actividades }, tipo);

  if (!plantilla.actividades.some(a => a.id === FIN_ID)){
    fixes.push(`Se añadió ${FIN_NOM} porque no estaba en el Excel.`);
  } else {
    fixes.push(`${FIN_NOM} verificada.`);
  }

  return { ok:true, sheet: sheetName, plantilla, fixes };
}
