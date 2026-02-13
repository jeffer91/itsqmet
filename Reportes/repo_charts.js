/* =========================================================
Archivo: repo_charts.js
Ruta: reportes/repo_charts.js
Función: generación de gráficos QuickChart para Word
========================================================= */

async function repoFetchChart(config) {
  const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=500&h=300`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error generando gráfico");
    return await res.arrayBuffer();
  } catch (e) {
    console.error("[repo_charts] fallo:", e);
    return null;
  }
}

export async function repoGenerarPastelCumplimiento(cumplen, noCumplen) {
  const total = cumplen + noCumplen;
  if (total === 0) return null;

  const config = {
    type: "pie",
    // ✅ QuickChart requiere declarar el plugin para que "datalabels" funcione y no falle la renderización.
    plugins: ["chartjs-plugin-datalabels"],
    data: {
      labels: [`Cumplen (${cumplen})`, `No Cumplen (${noCumplen})`],
      datasets: [{ data: [cumplen, noCumplen], backgroundColor: ["#27ae60", "#c0392b"] }]
    },
    options: {
      plugins: {
        datalabels: {
          color: "#fff",
          font: { weight: "bold", size: 14 },
          formatter: (val) => ((val / total) * 100).toFixed(1) + "%"
        }
      }
    }
  };
  return await repoFetchChart(config);
}

export async function repoGenerarBarrasCarreras(datosCarreras, keyReq) {
  const labels = [];
  const dataCumplen = [];
  const dataNoCumplen = [];

  Object.entries(datosCarreras).forEach(([nombre, stats]) => {
    let n = nombre
      .replace("TECNOLOGÍA SUPERIOR EN ", "")
      .replace("ADMINISTRACIÓN", "ADMIN")
      .replace("DESARROLLO DE SOFTWARE", "SOFTWARE")
      .replace("SEGURIDAD CIUDADANA Y ORDEN PÚBLICO", "SEGURIDAD");

    if (n.length > 15) n = n.substring(0, 15) + ".";
    labels.push(n);
    dataCumplen.push(stats.cumplen[keyReq] || 0);
    dataNoCumplen.push(stats.noCumplen[keyReq] || 0);
  });

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Cumplen", data: dataCumplen, backgroundColor: "#1F4E79" },
        { label: "No Cumplen", data: dataNoCumplen, backgroundColor: "#c0392b" }
      ]
    },
    options: {
      scales: { x: { stacked: true }, y: { stacked: true } },
      legend: { display: true }
    }
  };

  return await repoFetchChart(config);
}
