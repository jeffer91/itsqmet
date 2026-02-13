function isObj(v){ return v && typeof v === "object" && !Array.isArray(v); }
function isStr(v){ return typeof v === "string" && v.trim().length > 0; }
function isNum(v){ return typeof v === "number" && Number.isFinite(v); }
function isBool(v){ return typeof v === "boolean"; }

export const FIN_ID = "fin-clases";
export const FIN_NOM = "Fecha de fin de clases";

export function actFinDefault(){
  return { id: FIN_ID, orden: 1, nombre: FIN_NOM, duracionDias: 1, esAdministrativo: false };
}

export function plantillaVacia(tipo){
  return { version: 1, tipo, actividades: [actFinDefault()] };
}

export function limpiarTexto(s){
  return String(s ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function genId(){
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
}

export function asegurarFin(p){
  if (!p || !Array.isArray(p.actividades)) return;

  const idxId = p.actividades.findIndex(a => limpiarTexto(a?.id).toLowerCase() === FIN_ID);
  if (idxId >= 0){
    p.actividades[idxId].id = FIN_ID;
    p.actividades[idxId].nombre = FIN_NOM;
    p.actividades[idxId].duracionDias = 1;
    p.actividades[idxId].esAdministrativo = false;
    return;
  }

  const idxNom = p.actividades.findIndex(a => {
    const n = limpiarTexto(a?.nombre).replace(/\(.*?\)/g, "").trim();
    return n === FIN_NOM;
  });

  if (idxNom >= 0){
    p.actividades[idxNom].id = FIN_ID;
    p.actividades[idxNom].nombre = FIN_NOM;
    p.actividades[idxNom].duracionDias = 1;
    p.actividades[idxNom].esAdministrativo = false;
    return;
  }

  p.actividades.unshift(actFinDefault());
}

export function reordenar(p){
  if (!p || !Array.isArray(p.actividades)) return;
  p.actividades
    .slice()
    .sort((a,b) => (a.orden ?? 0) - (b.orden ?? 0))
    .forEach((a,i) => { a.orden = i + 1; });
}

export function normalizarPlantilla(raw, tipo){
  const p = isObj(raw) ? JSON.parse(JSON.stringify(raw)) : {};
  p.version = isNum(p.version) ? p.version : 1;
  p.tipo = tipo || p.tipo || "articulo";

  if (!Array.isArray(p.actividades)) p.actividades = [];

  p.actividades = p.actividades
    .filter(a => isObj(a))
    .map((a) => {
      const nombre = limpiarTexto(a.nombre);
      const id = limpiarTexto(a.id) || "";
      const orden = Number(a.orden);
      const dur = Number(a.duracionDias);

      return {
        id,
        orden: Number.isFinite(orden) ? orden : 0,
        nombre,
        duracionDias: Number.isFinite(dur) && dur >= 1 ? dur : 1,
        esAdministrativo: isBool(a.esAdministrativo) ? a.esAdministrativo : false
      };
    });

  asegurarFin(p);
  reordenar(p);

  const fin = p.actividades.find(a => a.id === FIN_ID);
  if (fin) fin.esAdministrativo = false;

  return p;
}

export function validarPlantilla(p){
  const errores = [];

  if (!isObj(p)) return { ok:false, errores:["Plantilla inválida"] };
  if (!isNum(p.version)) errores.push("version debe ser número");
  if (!Array.isArray(p.actividades)) return { ok:false, errores:["actividades debe ser lista"] };

  const ids = new Set();

  p.actividades.forEach((a, i) => {
    const pref = `Actividad ${i+1}`;

    if (!isObj(a)) { errores.push(`${pref} inválida`); return; }

    if (!isStr(a.id)) errores.push(`${pref} id requerido`);
    if (isStr(a.id)){
      const key = a.id.trim();
      if (ids.has(key)) errores.push(`${pref} id repetido`);
      ids.add(key);
    }

    if (!isNum(a.orden)) errores.push(`${pref} orden inválido`);
    if (!isStr(a.nombre)) errores.push(`${pref} nombre requerido`);
    if (!isNum(a.duracionDias) || a.duracionDias < 1) errores.push(`${pref} días inválidos`);
    if (a.esAdministrativo !== undefined && !isBool(a.esAdministrativo)) errores.push(`${pref} grupo inválido`);
  });

  const hasFin = p.actividades.some(a => a && a.id === FIN_ID);
  if (!hasFin) errores.push(`Falta actividad obligatoria: ${FIN_NOM}`);

  return { ok: errores.length === 0, errores };
}
