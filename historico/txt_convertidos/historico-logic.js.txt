const HistoricoLogic = {

  formatDate(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("es-EC");
  },

  // Regla: requisito = campo cuyo valor es exactamente "CUMPLE" o "NO CUMPLE"
  isRequisitoValue(v) {
    return v === "CUMPLE" || v === "NO CUMPLE";
  },

  // Extrae requisitos del registro del estudiante como { key: "CUMPLE/NO CUMPLE" }
  extractRequisitosFromStudent(student) {
    const out = {};
    if (!student || typeof student !== "object") return out;

    for (const [k, v] of Object.entries(student)) {
      if (this.isRequisitoValue(v)) out[k] = v;
    }
    return out;
  },

  // Normaliza nombre de carrera
  getCareerKey(student) {
    return (student?.NombreCarrera || "SIN_CARRERA").trim();
  },

  // Agrega macro por carrera + requisito
  // agg[carrera][requisito] = { cumple, noCumple, total }
  aggregateStudents(students = []) {
    const agg = {};
    const careersSet = new Set();
    const requisitosSet = new Set();

    let totalEstudiantes = 0;

    for (const s of students) {
      totalEstudiantes++;
      const carrera = this.getCareerKey(s);
      careersSet.add(carrera);

      const reqs = this.extractRequisitosFromStudent(s);
      for (const [req, val] of Object.entries(reqs)) {
        requisitosSet.add(req);

        if (!agg[carrera]) agg[carrera] = {};
        if (!agg[carrera][req]) {
          agg[carrera][req] = { cumple: 0, noCumple: 0, total: 0 };
        }

        if (val === "CUMPLE") agg[carrera][req].cumple += 1;
        else agg[carrera][req].noCumple += 1;

        agg[carrera][req].total += 1;
      }
    }

    return {
      agg,
      careers: Array.from(careersSet).sort(),
      requisitos: Array.from(requisitosSet).sort(),
      totalEstudiantes
    };
  },

  // Calcula delta B vs el último corte: solo guarda lo que cambió
  // delta[carrera][req] = { cumpleDelta, noCumpleDelta, totalDelta }
  diffAggregates(prevAgg, currAgg) {
    const prev = prevAgg || {};
    const curr = currAgg || {};

    const delta = {};
    let changedCells = 0;

    const carreras = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    for (const carrera of carreras) {
      const prevC = prev[carrera] || {};
      const currC = curr[carrera] || {};

      const reqs = new Set([...Object.keys(prevC), ...Object.keys(currC)]);
      for (const req of reqs) {
        const p = prevC[req] || { cumple: 0, noCumple: 0, total: 0 };
        const c = currC[req] || { cumple: 0, noCumple: 0, total: 0 };

        const cumpleDelta = (c.cumple || 0) - (p.cumple || 0);
        const noCumpleDelta = (c.noCumple || 0) - (p.noCumple || 0);
        const totalDelta = (c.total || 0) - (p.total || 0);

        // Solo si cambió algo
        if (cumpleDelta !== 0 || noCumpleDelta !== 0 || totalDelta !== 0) {
          if (!delta[carrera]) delta[carrera] = {};
          delta[carrera][req] = { cumpleDelta, noCumpleDelta, totalDelta };
          changedCells++;
        }
      }
    }

    return { delta, changedCells };
  },

  // Utilidad: obtiene el conteo para una carrera + requisito desde agg
  getCounts(agg, carrera, requisito) {
    const node = agg?.[carrera]?.[requisito];
    if (!node) return { cumple: 0, noCumple: 0, total: 0 };
    return {
      cumple: Number(node.cumple || 0),
      noCumple: Number(node.noCumple || 0),
      total: Number(node.total || 0)
    };
  },

  // Utilidad: obtiene delta para una carrera + requisito
  getDelta(delta, carrera, requisito) {
    const node = delta?.[carrera]?.[requisito];
    if (!node) return { cumpleDelta: 0, noCumpleDelta: 0, totalDelta: 0 };
    return {
      cumpleDelta: Number(node.cumpleDelta || 0),
      noCumpleDelta: Number(node.noCumpleDelta || 0),
      totalDelta: Number(node.totalDelta || 0)
    };
  }
};
