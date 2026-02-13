/* =========================================================
Archivo: repo_data.js
Ruta: reportes/repo_data.js
Función: conexión Firestore y cálculo de estadísticas por periodo y carrera
========================================================= */

export const repoFirebaseConfig = {
  apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
  authDomain: "utet-4387a.firebaseapp.com",
  projectId: "utet-4387a",
  storageBucket: "utet-4387a.firebasestorage.app",
  messagingSenderId: "902848131454",
  appId: "1:902848131454:web:47f515eb6480834724c32f"
};

let _db = null;

export function repoGetDb() {
  if (_db) return _db;
  if (!window.firebase) throw new Error("Firebase SDK no cargado.");
  if (!firebase.apps.length) firebase.initializeApp(repoFirebaseConfig);
  _db = firebase.firestore();
  return _db;
}

function repoFormatearPeriodo(rawId) {
  if (!rawId || !rawId.includes("_")) return rawId;
  const meses = {
    "01":"Enero","02":"Febrero","03":"Marzo","04":"Abril",
    "05":"Mayo","06":"Junio","07":"Julio","08":"Agosto",
    "09":"Septiembre","10":"Octubre","11":"Noviembre","12":"Diciembre"
  };
  const [inicio, fin] = rawId.split("_");
  const [anioI, mesI] = inicio.split("-");
  const [anioF, mesF] = fin.split("-");
  return `${meses[mesI] || mesI} ${anioI} - ${meses[mesF] || mesF} ${anioF}`;
}

export async function repoObtenerPeriodos() {
  const db = repoGetDb();

  // ✅ CORRECCIÓN: Los labels viven en la colección "periodos", no en "Estudiantes".
  // Evita que el select muestre IDs crudos o se quede en "Cargando periodos...".
  const snapshot = await db.collection("periodos").get();

  return snapshot.docs
    .map(d => {
      const data = d.data() || {};
      return {
        id: d.id,
        // Si no hay label, usamos fallback formateado para no romper la UI
        label: data.label || repoFormatearPeriodo(d.id)
      };
    })
    .sort((a, b) => String(a.label).localeCompare(String(b.label), "es"));
}

export async function repoObtenerEstadisticas(periodoId) {
  const db = repoGetDb();
  const snapshot = await db.collection("Estudiantes")
    .where("ultimoPeriodoId", "==", periodoId)
    .get();

  if (snapshot.empty) return null;

  const estudiantes = snapshot.docs.map(d => d.data());
  const stats = { totalGlobal: estudiantes.length, porCarrera: {} };

  estudiantes.forEach(est => {
    const data = {
      academico: est.academico || "PENDIENTE",
      financiero: est.financiero || "PENDIENTE",
      vinculacion: est.vinculacion || "PENDIENTE",
      ingles: est.ingles || "PENDIENTE",
      documentacion: est.documentacion || "PENDIENTE",
      practicas: est["prᣴicasvinculacion"] || est.practicas || "PENDIENTE",
      seguimiento: est.seguimientograduados || est.seguimiento || "PENDIENTE",
      titulacion: est.titulacion || "PENDIENTE",
      datos: est["actualizaci󮄡tos"] || est.actualizaciondatos || "PENDIENTE"
    };

    const carrera = est.nombrecarrera || est.nombreCarrera || est.NombreCarrera || "SIN CARRERA";

    if (!stats.porCarrera[carrera]) {
      stats.porCarrera[carrera] = { total: 0, cumplen: {}, noCumplen: {} };
    }
    stats.porCarrera[carrera].total++;

    Object.keys(data).forEach(key => {
      const cumple = data[key] === "CUMPLE";
      if (cumple) {
        stats.porCarrera[carrera].cumplen[key] = (stats.porCarrera[carrera].cumplen[key] || 0) + 1;
      } else {
        stats.porCarrera[carrera].noCumplen[key] = (stats.porCarrera[carrera].noCumplen[key] || 0) + 1;
      }
    });
  });

  return stats;
}
