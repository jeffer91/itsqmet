/* =========================================================
Archivo: repo_ia.js
Ruta: reportes/repo_ia.js
Función: análisis automático estructurado
========================================================= */

// ✅ NOTA: se mantiene repoDiasHasta por compatibilidad, pero ya no se usa
// porque se eliminó "Fecha Tentativa Defensa" del sistema.
function repoDiasHasta(fechaISO) {
  try {
    const hoy = new Date();
    const f = new Date(fechaISO + "T00:00:00");
    const diff = f.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function repoPct(c, t) {
  if (!t || t <= 0) return "0.0%";
  return ((c / t) * 100).toFixed(1) + "%";
}

const REQ_LABELS = {
  academico: "Académico",
  documentacion: "Documentación",
  financiero: "Financiero",
  practicas: "Prácticas",
  vinculacion: "Vinculación",
  seguimiento: "Seguimiento",
  ingles: "Inglés",
  datos: "Actualización de Datos",
  titulacion: "Titulación"
};

export function repoGenerarAnalisisIA(stats, config) {
  // ✅ CAMBIO: se elimina dependencia de config.fechaDefensa (campo removido del UI).
  const tablaGlobal = [];
  const hallazgos = [];

  const reqKeys = Object.keys(REQ_LABELS).filter(k => (k !== "titulacion" ? true : !!config?.incluirTitulacion));

  reqKeys.forEach(key => {
    let cumplen = 0, no = 0;
    Object.values(stats.porCarrera).forEach(c => {
      cumplen += (c.cumplen[key] || 0);
      no += (c.noCumplen[key] || 0);
    });
    const total = cumplen + no;
    const porcentaje = repoPct(cumplen, total);
    tablaGlobal.push({ id: key, nombre: REQ_LABELS[key], porcentaje });

    if (total > 0) {
      const pctNum = parseFloat(porcentaje.replace("%", ""));
      if (pctNum < 80) hallazgos.push(`El requisito "${REQ_LABELS[key]}" presenta un cumplimiento bajo (${porcentaje}).`);
    }
  });

  const ranking = Object.entries(stats.porCarrera).map(([carrera, s]) => {
    let pendientes = 0;
    reqKeys.forEach(key => pendientes += (s.noCumplen[key] || 0));
    return { carrera, pendientes };
  }).sort((a, b) => b.pendientes - a.pendientes).slice(0, 5);

  const analisis = {};
  reqKeys.forEach(key => {
    let cumplen = 0, no = 0;
    Object.values(stats.porCarrera).forEach(c => {
      cumplen += (c.cumplen[key] || 0);
      no += (c.noCumplen[key] || 0);
    });
    const total = cumplen + no;
    const pct = repoPct(cumplen, total);

    const p1 = `El requisito ${REQ_LABELS[key]} registra un cumplimiento global de ${pct}, con ${cumplen} estudiantes que cumplen y ${no} que presentan pendientes.`;
    const puntosClave = ranking.map(r => `Prioridad: ${r.carrera} concentra ${r.pendientes} pendientes acumulados en el periodo.`);
    // ✅ CAMBIO: se elimina texto condicionado por fecha de defensa.
    const p2 = `Se recomienda mantener control continuo y focalizado por carrera para reducir pendientes.`;

    analisis[key] = { parrafo1: p1, puntosClave, parrafo2: p2 };
  });

  return {
    analisis,
    datosResumen: {
      tablaGlobal,
      rankingCarreras: ranking,
      hallazgos
    }
  };
}
