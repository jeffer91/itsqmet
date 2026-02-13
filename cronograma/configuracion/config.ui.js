import { listByTipo, getTpl, createTpl, updateTpl, delTpl, saveVer, listVer, getVer, delVer } from "./config.db.js";
import { plantillaVacia, normalizarPlantilla, validarPlantilla, FIN_ID, FIN_NOM, genId, reordenar, limpiarTexto } from "./config.schema.js";
import { importXlsx } from "./config.import.js";

function el(id){ return document.getElementById(id); }

function tsToText(ts){
  try{
    if (!ts) return "";
    const d = (typeof ts.toDate === "function") ? ts.toDate() : new Date(ts);
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    return d.toLocaleString("es-EC");
  }catch{ return ""; }
}

function safeHtml(s){
  return String(s ?? "").replace(/[<>&"]/g, c => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : "&quot;"));
}

/* Estado */
function setStatus(txt, kind=""){
  const p = el("cfg-status");
  if (!p) return;
  p.textContent = txt;
  p.style.borderColor = kind === "err" ? "#fecdd3" : "";
  p.style.background = kind === "err" ? "#fff1f2" : "";
  p.style.color = kind === "err" ? "#b42318" : "";
}
function setMsg(msg){
  const m = el("cfg-msg");
  if (m) m.textContent = msg || "";
}

function logLine(msg){
  const box = el("cfg-log");
  if (!box) return;
  const t = box.textContent ? (box.textContent + "\n") : "";
  box.textContent = (t + msg).slice(-6000);
}

/* Modal */
function openModal(title, html){
  el("cfg-mtitle").textContent = title || "Modal";
  el("cfg-mbody").innerHTML = html || "";
  el("cfg-m").classList.remove("hidden");
  el("cfg-m").setAttribute("aria-hidden","false");
}
function closeModal(){
  el("cfg-mbody").innerHTML = "";
  el("cfg-m").classList.add("hidden");
  el("cfg-m").setAttribute("aria-hidden","true");
}
function bindModal(){
  el("cfg-mx").addEventListener("click", closeModal);
  el("cfg-m").addEventListener("click", (e) => { if (e.target === el("cfg-m")) closeModal(); }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}

function errResumen(e){
  const s = String(e?.message || e || "");
  if (s.toLowerCase().includes("requires an index")) return "Falta índice en Firestore. Crea el índice y recarga.";
  if (s.toLowerCase().includes("permission")) return "Sin permisos en Firestore Rules.";
  return "Error en Firestore.";
}

export const ConfigApp = {
  state: {
    tipo: "articulo",
    tplId: null,
    tplMeta: null,
    plantilla: null,
    list: [],
    xfile: null,
    lastErr: ""
  },

  async boot(){
    bindModal();
    this.bind();
    await this.loadTipo(this.state.tipo);
    setStatus("Listo");
    setMsg("Listo.");
  },

  bind(){
    el("cfg-tipo").addEventListener("change", async (e) => {
      await this.loadTipo(e.target.value);
    });

    el("cfg-plant").addEventListener("change", async (e) => {
      const id = e.target.value;
      if (id) await this.loadTpl(id);
    });

    el("cfg-add").addEventListener("click", () => this.modalAct());

    el("cfg-new").addEventListener("click", () => this.nuevoEnPantalla());
    el("cfg-saveas").addEventListener("click", () => this.saveAsNew());
    el("cfg-save").addEventListener("click", () => this.saveUpdate());
    el("cfg-del").addEventListener("click", () => this.removeTpl());

    el("cfg-xfile").addEventListener("change", (e) => {
      this.state.xfile = e.target.files?.[0] || null;
    });
    el("cfg-xload").addEventListener("click", () => this.loadExcelDirect());

    el("cfg-hist").addEventListener("click", () => this.openHist());

    el("cfg-copyerr").addEventListener("click", async () => {
      const txt = this.state.lastErr || el("cfg-log").textContent || "";
      try{
        await navigator.clipboard.writeText(txt);
        setMsg("Detalle copiado.");
      }catch{
        alert(txt);
      }
    });
  },

  labelTipo(t){
    if (t === "articulo") return "Artículo";
    if (t === "complexivo") return "Complexivo";
    if (t === "trabajo") return "Trabajo";
    return t;
  },

  async loadTipo(tipo){
    this.state.tipo = tipo;
    setStatus("Cargando...");
    setMsg(`Tipo: ${this.labelTipo(tipo)}.`);
    logLine(`Tipo seleccionado: ${tipo}`);

    try{
      this.state.list = await listByTipo(tipo);
      await this.renderList();
      this.state.lastErr = "";
    }catch(err){
      const resumen = errResumen(err);
      setStatus("Error", "err");
      setMsg(resumen);
      this.state.lastErr = String(err?.message || err);
      logLine(`ERROR listByTipo: ${this.state.lastErr}`);
      this.state.list = [];
      await this.renderList();
      this.state.tplId = null;
      this.state.tplMeta = null;
      this.state.plantilla = plantillaVacia(tipo);
      this.renderActs();
      this.renderInfo();
      return;
    }

    const keep = this.state.tplId && this.state.list.some(x => x.id === this.state.tplId);
    const target = keep ? this.state.tplId : (this.state.list[0]?.id || null);

    if (target) await this.loadTpl(target);
    else {
      this.state.tplId = null;
      this.state.tplMeta = null;
      this.state.plantilla = plantillaVacia(tipo);
      this.renderActs();
      this.renderInfo();
      setStatus("Listo");
      setMsg("Sin plantillas. Crea una o importa Excel.");
    }
  },

  async renderList(){
    const sel = el("cfg-plant");
    sel.innerHTML = "";

    if (!this.state.list.length){
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No hay plantillas";
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }

    sel.disabled = false;
    for (const it of this.state.list){
      const opt = document.createElement("option");
      opt.value = it.id;
      const nombre = limpiarTexto(it?.meta?.nombre) || it.id;
      opt.textContent = `${nombre} · ${it.id}`;
      sel.appendChild(opt);
    }
  },

  renderInfo(){
    const box = el("cfg-plantinfo");
    if (!box) return;

    if (!this.state.tplId){
      box.textContent = "Crea una plantilla o importa desde Excel.";
      return;
    }

    const c = tsToText(this.state.tplMeta?.createdAt);
    const u = tsToText(this.state.tplMeta?.updatedAt);

    box.textContent = [
      `ID: ${this.state.tplId}`,
      c ? `Creada: ${c}` : "",
      u ? `Actualizada: ${u}` : ""
    ].filter(Boolean).join(" · ");
  },

  async loadTpl(id){
    setStatus("Cargando...");
    setMsg(`Cargando ${id}.`);

    try{
      const data = await getTpl(id);
      if (!data){
        setStatus("Error", "err");
        setMsg("No se pudo leer la plantilla.");
        logLine(`No existe: ${id}`);
        return;
      }

      this.state.tplId = data.id;
      this.state.tplMeta = data.meta || null;
      this.state.plantilla = normalizarPlantilla(data.plantilla || plantillaVacia(this.state.tipo), this.state.tipo);

      const sel = el("cfg-plant");
      if (sel && sel.value !== id) sel.value = id;

      this.renderInfo();
      this.renderActs();

      setStatus("Listo");
      setMsg("Listo.");
      logLine(`Plantilla cargada: ${id}`);
    }catch(err){
      const resumen = errResumen(err);
      setStatus("Error", "err");
      setMsg(resumen);
      this.state.lastErr = String(err?.message || err);
      logLine(`ERROR getTpl: ${this.state.lastErr}`);
    }
  },

  nuevoEnPantalla(){
    const ok = confirm("Esto reemplaza lo que tienes en pantalla. No guarda. ¿Continuar?");
    if (!ok) return;

    this.state.tplId = null;
    this.state.tplMeta = null;
    this.state.plantilla = plantillaVacia(this.state.tipo);

    this.renderActs();
    this.renderInfo();

    setMsg("Plantilla nueva en pantalla.");
    logLine("Plantilla nueva en pantalla.");
  },

  renderActs(){
    const tb = el("cfg-act");
    tb.innerHTML = "";

    const p = this.state.plantilla;
    if (!p || !Array.isArray(p.actividades)) {
      tb.innerHTML = `<tr><td colspan="5" class="muted center">Sin actividades</td></tr>`;
      return;
    }

    reordenar(p);

    const sorted = p.actividades.slice().sort((a,b) => (a.orden ?? 0) - (b.orden ?? 0));
    if (!sorted.length){
      tb.innerHTML = `<tr><td colspan="5" class="muted center">Sin actividades</td></tr>`;
      return;
    }

    for (let i = 0; i < sorted.length; i++){
      const a = sorted[i];
      const isFin = a.id === FIN_ID;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a.orden}</td>
        <td>${safeHtml(a.nombre)}${isFin ? " <span class='muted'>obligatoria</span>" : ""}</td>
        <td>${a.duracionDias}</td>
        <td>
          <span class="tag ${a.esAdministrativo ? "on" : "off"}" data-act="${a.id}" data-k="tog" ${isFin ? "data-dis='1'" : ""}>
            🧑‍💼 ${a.esAdministrativo ? "Administrativo" : "Estudiantes"}
          </span>
        </td>
        <td>
          <div class="actions">
            <button class="ibtn" data-act="${a.id}" data-k="up" ${i===0 ? "disabled" : ""}>↑</button>
            <button class="ibtn" data-act="${a.id}" data-k="dn" ${i===sorted.length-1 ? "disabled" : ""}>↓</button>
            <button class="ibtn" data-act="${a.id}" data-k="ed">Editar</button>
            <button class="ibtn" data-act="${a.id}" data-k="rm" ${isFin ? "disabled" : ""}>Eliminar</button>
          </div>
        </td>
      `;
      tb.appendChild(tr);
    }

    tb.onclick = (e) => {
      const k = e.target?.dataset?.k;
      const id = e.target?.dataset?.act;
      if (!k || !id) return;

      if (k === "tog"){
        if (id === FIN_ID) return;
        const act = this.state.plantilla.actividades.find(x => x.id === id);
        if (act){
          act.esAdministrativo = !act.esAdministrativo;
          this.renderActs();
        }
        return;
      }

      if (k === "up" || k === "dn"){
        this.move(id, k === "up" ? -1 : 1);
        return;
      }

      if (k === "ed"){
        this.modalAct(id);
        return;
      }

      if (k === "rm"){
        if (id === FIN_ID) return;
        const ok = confirm("¿Eliminar actividad?");
        if (!ok) return;
        this.state.plantilla.actividades = this.state.plantilla.actividades.filter(x => x.id !== id);
        reordenar(this.state.plantilla);
        this.renderActs();
      }
    };
  },

  move(id, dir){
    const sorted = this.state.plantilla.actividades.slice().sort((a,b) => (a.orden ?? 0) - (b.orden ?? 0));
    const idx = sorted.findIndex(x => x.id === id);
    if (idx < 0) return;

    const j = idx + dir;
    if (j < 0 || j >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[j];

    const tmp = a.orden;
    a.orden = b.orden;
    b.orden = tmp;

    reordenar(this.state.plantilla);
    this.renderActs();
  },

  modalAct(id){
    const p = this.state.plantilla;
    if (!Array.isArray(p.actividades)) p.actividades = [];

    const act = id ? (p.actividades.find(x => x.id === id) || null) : null;
    const isFin = act?.id === FIN_ID;

    const html = `
      <div class="fg">
        <label>Nombre</label>
        <input class="in" id="m-nom" value="${safeHtml(act?.nombre || "")}" ${isFin ? "disabled" : ""} />
        <div class="mini">${isFin ? "Este nombre es fijo." : ""}</div>
      </div>

      <div class="fg">
        <label>Días</label>
        <input class="in" id="m-dias" type="number" min="1" step="1" value="${Number(act?.duracionDias || 1)}" />
      </div>

      <div class="fg">
        <label>Grupo</label>
        <select class="in" id="m-grp" ${isFin ? "disabled" : ""}>
          <option value="0">Estudiantes</option>
          <option value="1">Administrativo</option>
        </select>
      </div>

      <div class="row" style="justify-content:flex-end; margin-top:12px;">
        <button class="btn sec" id="m-c" type="button">Cancelar</button>
        <button class="btn pri" id="m-s" type="button">Guardar</button>
      </div>
    `;

    openModal(act ? "Editar actividad" : "Nueva actividad", html);

    const grp = el("m-grp");
    if (grp) grp.value = act?.esAdministrativo ? "1" : "0";

    el("m-c").onclick = closeModal;

    el("m-s").onclick = () => {
      const nombre = isFin ? FIN_NOM : limpiarTexto(el("m-nom").value);
      const dias = Math.max(1, Number(el("m-dias").value || 1));
      const esAdministrativo = isFin ? false : (el("m-grp").value === "1");

      if (!nombre){
        alert("Nombre requerido");
        return;
      }

      if (act){
        act.nombre = isFin ? FIN_NOM : nombre;
        act.duracionDias = isFin ? 1 : dias;
        act.esAdministrativo = isFin ? false : esAdministrativo;
      } else {
        p.actividades.push({
          id: genId(),
          orden: (p.actividades.length + 1),
          nombre,
          duracionDias: dias,
          esAdministrativo
        });
      }

      this.state.plantilla = normalizarPlantilla(p, this.state.tipo);
      this.renderActs();
      closeModal();
    };
  },

  async saveAsNew(){
    try{
      const p = normalizarPlantilla(this.state.plantilla, this.state.tipo);
      const valid = validarPlantilla(p);
      if (!valid.ok){
        alert("Errores:\n" + valid.errores.join("\n"));
        return;
      }

      const sugerido = `${this.labelTipo(this.state.tipo)} ${new Date().toLocaleDateString("es-EC")}`;
      const nombre = prompt("Nombre visible, opcional:", sugerido) ?? "";

      setStatus("Guardando...");
      setMsg("Guardando como nueva...");
      const res = await createTpl(this.state.tipo, p, { nombre });
      logLine(`Plantilla creada: ${res.id}`);

      await this.loadTipo(this.state.tipo);
      await this.loadTpl(res.id);

      setStatus("Listo");
      setMsg("Listo.");
    }catch(err){
      const resumen = errResumen(err);
      setStatus("Error", "err");
      setMsg(resumen);
      this.state.lastErr = String(err?.message || err);
      logLine(`ERROR saveAsNew: ${this.state.lastErr}`);
      alert("No se pudo guardar. Revisa el detalle.");
    }
  },

  async saveUpdate(){
    if (!this.state.tplId){
      alert("Selecciona una plantilla para guardar.");
      return;
    }

    try{
      const p = normalizarPlantilla(this.state.plantilla, this.state.tipo);
      const valid = validarPlantilla(p);
      if (!valid.ok){
        alert("Errores:\n" + valid.errores.join("\n"));
        return;
      }

      const ok = confirm(`¿Guardar cambios en ${this.state.tplId}?`);
      if (!ok) return;

      const nomActual = this.state.tplMeta?.nombre || this.state.tplId;
      const nombre = prompt("Nombre visible, opcional:", String(nomActual)) ?? "";

      setStatus("Guardando...");
      setMsg("Guardando cambios...");
      await updateTpl(this.state.tplId, p, { nombre });
      logLine(`Plantilla guardada: ${this.state.tplId}`);

      await this.loadTipo(this.state.tipo);
      await this.loadTpl(this.state.tplId);

      setStatus("Listo");
      setMsg("Listo.");
    }catch(err){
      const resumen = errResumen(err);
      setStatus("Error", "err");
      setMsg(resumen);
      this.state.lastErr = String(err?.message || err);
      logLine(`ERROR saveUpdate: ${this.state.lastErr}`);
      alert("No se pudo guardar. Revisa el detalle.");
    }
  },

  async removeTpl(){
    if (!this.state.tplId){
      alert("Selecciona una plantilla.");
      return;
    }

    const ok = confirm(`¿Eliminar ${this.state.tplId}?`);
    if (!ok) return;

    try{
      setStatus("Eliminando...");
      setMsg("Eliminando...");
      await delTpl(this.state.tplId);
      logLine(`Plantilla eliminada: ${this.state.tplId}`);

      this.state.tplId = null;
      this.state.tplMeta = null;
      this.state.plantilla = plantillaVacia(this.state.tipo);

      await this.loadTipo(this.state.tipo);

      setStatus("Listo");
      setMsg("Listo.");
    }catch(err){
      const resumen = errResumen(err);
      setStatus("Error", "err");
      setMsg(resumen);
      this.state.lastErr = String(err?.message || err);
      logLine(`ERROR removeTpl: ${this.state.lastErr}`);
      alert("No se pudo eliminar. Revisa el detalle.");
    }
  },

  async loadExcelDirect(){
    const file = this.state.xfile;
    if (!file){
      alert("Selecciona un Excel.");
      return;
    }

    setStatus("Leyendo...");
    setMsg("Leyendo Excel...");
    try{
      const res = await importXlsx(file, this.state.tipo);
      if (!res.ok){
        setStatus("Error", "err");
        setMsg("Error al leer Excel.");
        this.state.lastErr = res.error || "";
        logLine(`ERROR Excel: ${this.state.lastErr}`);
        alert(res.error);
        return;
      }

      const ok = confirm("Cargar Excel en pantalla. No guarda. ¿Continuar?");
      if (!ok){
        setStatus("Listo");
        setMsg("Cancelado.");
        return;
      }

      this.state.plantilla = res.plantilla;
      this.state.tplId = this.state.tplId;
      this.renderActs();

      setStatus("Listo");
      setMsg("Excel cargado en pantalla.");
      logLine(`Excel cargado. Hoja: ${res.sheet}. Ajustes: ${res.fixes?.length || 0}`);
      if (res.fixes?.length){
        for (const f of res.fixes) logLine(`Excel: ${f}`);
      }
    }catch(err){
      setStatus("Error", "err");
      setMsg("Error al leer Excel.");
      this.state.lastErr = String(err?.message || err);
      logLine(`ERROR loadExcelDirect: ${this.state.lastErr}`);
      alert("No se pudo cargar el Excel. Revisa el detalle.");
    }
  },

  async openHist(){
    if (!this.state.tplId){
      alert("Primero selecciona una plantilla guardada.");
      return;
    }

    const html = `
      <div class="mini">Plantilla: <b>${safeHtml(this.state.tplId)}</b></div>

      <div class="hr"></div>

      <div class="row" style="justify-content:flex-end;">
        <button class="btn sec" id="h-ref" type="button">Refrescar</button>
        <button class="btn sec" id="h-save" type="button">Guardar versión</button>
      </div>

      <div class="vbox" id="h-box">
        <div class="muted center" id="h-empty">Cargando...</div>
        <div id="h-list"></div>
      </div>
    `;

    openModal("Historial", html);

    el("h-ref").onclick = () => this.renderHist();
    el("h-save").onclick = () => this.saveVersion();

    await this.renderHist();
  },

  async renderHist(){
    const empty = el("h-empty");
    const list = el("h-list");
    if (!empty || !list) return;

    list.innerHTML = "";
    empty.style.display = "block";
    empty.textContent = "Cargando...";

    try{
      const vers = await listVer(this.state.tplId);
      if (!vers.length){
        empty.textContent = "Sin versiones.";
        return;
      }

      empty.style.display = "none";

      for (const v of vers){
        const nombre = safeHtml(v?.nombre || "Versión");
        const nota = safeHtml(v?.nota || "");
        const fecha = tsToText(v?.createdAt) || "Sin fecha";
        const nActs = Array.isArray(v?.plantilla?.actividades) ? v.plantilla.actividades.length : 0;

        const div = document.createElement("div");
        div.className = "vitem";
        div.innerHTML = `
          <div>
            <div class="vt">${nombre}</div>
            <div class="vm">${safeHtml(fecha)} · Actividades: ${nActs}</div>
            ${nota ? `<div class="vn">${nota}</div>` : ""}
          </div>
          <div class="actions">
            <button class="ibtn" data-vid="${v.id}" data-k="rs">Restaurar</button>
            <button class="ibtn" data-vid="${v.id}" data-k="rm">Eliminar</button>
          </div>
        `;
        list.appendChild(div);
      }

      list.onclick = async (e) => {
        const k = e.target?.dataset?.k;
        const vid = e.target?.dataset?.vid;
        if (!k || !vid) return;

        if (k === "rs"){
          const ok = confirm("Restaurar versión en pantalla. No guarda. ¿Continuar?");
          if (!ok) return;

          try{
            const ver = await getVer(this.state.tplId, vid);
            if (!ver?.plantilla){
              alert("No se pudo leer la versión.");
              return;
            }
            this.state.plantilla = normalizarPlantilla(ver.plantilla, this.state.tipo);
            this.renderActs();
            logLine(`Versión restaurada: ${vid}`);
            setMsg("Versión restaurada en pantalla. Si quieres, guarda.");
          }catch(err){
            this.state.lastErr = String(err?.message || err);
            logLine(`ERROR restore: ${this.state.lastErr}`);
            alert("No se pudo restaurar.");
          }
          return;
        }

        if (k === "rm"){
          const ok = confirm("Eliminar versión. ¿Continuar?");
          if (!ok) return;

          try{
            await delVer(this.state.tplId, vid);
            await this.renderHist();
            logLine(`Versión eliminada: ${vid}`);
          }catch(err){
            this.state.lastErr = String(err?.message || err);
            logLine(`ERROR delVer: ${this.state.lastErr}`);
            alert("No se pudo eliminar.");
          }
        }
      };
    }catch(err){
      empty.textContent = "Error al cargar versiones.";
      this.state.lastErr = String(err?.message || err);
      logLine(`ERROR listVer: ${this.state.lastErr}`);
    }
  },

  async saveVersion(){
    if (!this.state.tplId){
      alert("Selecciona una plantilla.");
      return;
    }

    try{
      const p = normalizarPlantilla(this.state.plantilla, this.state.tipo);
      const valid = validarPlantilla(p);
      if (!valid.ok){
        alert("Errores:\n" + valid.errores.join("\n"));
        return;
      }

      const nombre = prompt("Nombre de versión, opcional:", `Versión ${new Date().toLocaleString("es-EC")}`) ?? "";
      const nota = prompt("Nota, opcional:", "") ?? "";

      setMsg("Guardando versión...");
      await saveVer(this.state.tplId, p, { nombre, nota });
      logLine("Versión guardada.");
      setMsg("Versión guardada.");

      await this.renderHist();
    }catch(err){
      const resumen = errResumen(err);
      setMsg(resumen);
      this.state.lastErr = String(err?.message || err);
      logLine(`ERROR saveVer: ${this.state.lastErr}`);
      alert("No se pudo guardar versión.");
    }
  }
};
