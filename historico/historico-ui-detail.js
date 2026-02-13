const HistoricoUIDetail = {
  clear(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="historico-empty">Selecciona un corte del timeline.</div>`;
  },

  render(containerId, ctx) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const cut = ctx?.cut;
    const career = ctx?.career || "";
    const requisito = ctx?.requisito || "";

    if (!cut) {
      el.innerHTML = `<div class="historico-empty">Sin corte seleccionado.</div>`;
      return;
    }

    const dateTxt = HistoricoLogic.formatDate(cut.createdAt) || "(sin fecha)";
    const totalEst = cut?.meta?.totalEstudiantes ?? "-";
    const changed = cut?.meta?.changedCells ?? 0;

    let counts = { cumple: 0, noCumple: 0, total: 0 };
    let deltas = { cumpleDelta: 0, noCumpleDelta: 0, totalDelta: 0 };

    if (requisito) {
      if (career) {
        counts = HistoricoLogic.getCounts(cut.agg, career, requisito);
        deltas = HistoricoLogic.getDelta(cut.delta, career, requisito);
      } else {
        // suma todas las carreras para ese requisito
        let cumple = 0, noCumple = 0, total = 0;
        for (const c of Object.keys(cut.agg || {})) {
          const cc = HistoricoLogic.getCounts(cut.agg, c, requisito);
          cumple += cc.cumple; noCumple += cc.noCumple; total += cc.total;
        }
        counts = { cumple, noCumple, total };

        let cumpleDelta = 0, noCumpleDelta = 0, totalDelta = 0;
        for (const c of Object.keys(cut.delta || {})) {
          const dd = HistoricoLogic.getDelta(cut.delta, c, requisito);
          cumpleDelta += dd.cumpleDelta; noCumpleDelta += dd.noCumpleDelta; totalDelta += dd.totalDelta;
        }
        deltas = { cumpleDelta, noCumpleDelta, totalDelta };
      }
    }

    el.innerHTML = `
      <h2>Detalle macro</h2>
      <p><strong>Corte:</strong> ${HistoricoUtils.esc(dateTxt)}</p>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
        <span class="badge blue">Total estudiantes ${HistoricoUtils.esc(totalEst)}</span>
        <span class="badge gray">Celdas cambiadas Δ ${HistoricoUtils.esc(changed)}</span>
        ${career ? `<span class="badge gray">Carrera: ${HistoricoUtils.esc(career)}</span>` : `<span class="badge gray">Carrera: Todas</span>`}
        ${requisito ? `<span class="badge gray">Requisito: ${HistoricoUtils.esc(requisito)}</span>` : `<span class="badge gray">Requisito: (selecciona uno)</span>`}
      </div>

      ${requisito ? this.renderCountsTable(counts, deltas) : `<div class="historico-empty">Selecciona un requisito para ver conteos y delta.</div>`}

      <div id="historico-charts"></div>
    `;
  },

  renderCountsTable(counts, deltas) {
    const sign = (n) => (n > 0 ? `+${n}` : `${n}`);

    return `
      <h3 style="margin-top:16px;">Conteos y delta</h3>
      <table>
        <thead>
          <tr>
            <th>Estado</th>
            <th>Conteo</th>
            <th>Δ vs corte anterior</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>CUMPLE</b></td>
            <td>${counts.cumple}</td>
            <td>${sign(deltas.cumpleDelta)}</td>
          </tr>
          <tr>
            <td><b>NO CUMPLE</b></td>
            <td>${counts.noCumple}</td>
            <td>${sign(deltas.noCumpleDelta)}</td>
          </tr>
          <tr>
            <td><b>Total</b></td>
            <td>${counts.total}</td>
            <td>${sign(deltas.totalDelta)}</td>
          </tr>
        </tbody>
      </table>
    `;
  }
};
