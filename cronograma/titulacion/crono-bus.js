/* Archivo: crono-bus.js
Función: Capa de transporte. Lee plantillas y guarda en colección RAÍZ 'cronogramas'.
*/

(function(window) {
  "use strict";
  
  const db = firebase.firestore();

  const CronoBus = {

    async getPeriodos() {
      try {
        const snap = await db.collection("periodos").get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error("Error cargando periodos:", e);
        return [];
      }
    },

    async getPlantillas() {
      try {
        const snap = await db.collection("plantillasCronograma").get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error("Error cargando plantillas:", e);
        return [];
      }
    },

    // Map: dateISO -> {nombre, nombreOriginal} o string si viniera así
    async getFeriadosMap(yearStart, yearEnd) {
      const holidaysMap = new Map();
      const years = [];
      for (let y = yearStart; y <= yearEnd; y++) years.push(y);

      for (const year of years) {
        try {
          const docRef = db.collection("feriados").doc(String(year));
          const docSnap = await docRef.get();

          if (docSnap.exists) {
            const data = docSnap.data();
            const items = Array.isArray(data.items) ? data.items : [];
            items.forEach(h => {
              if (h.dateISO && h.nombre) {
                holidaysMap.set(h.dateISO, {
                  nombre: String(h.nombre).trim(),
                  nombreOriginal: String(h.nombre).trim()
                });
              }
            });
          }
        } catch (e) {
          console.warn(`No se pudieron cargar feriados del ${year}`, e);
        }
      }

      return holidaysMap;
    },

    async getCronograma(periodoId, tipo) {
      try {
        const docId = `${periodoId}_${tipo}`;
        const docSnap = await db.collection("cronogramas").doc(docId).get();
        if (docSnap.exists) return docSnap.data();
        return null;
      } catch (e) {
        console.error("Error obteniendo cronograma:", e);
        return null;
      }
    },

    async saveCronograma(periodoId, tipo, cronogramaData) {
      try {
        const docId = `${periodoId}_${tipo}`;
        await db.collection("cronogramas").doc(docId).set({
          ...cronogramaData,
          periodoId: periodoId,
          tipo: tipo,
          updatedAt: new Date()
        });

        console.log(`Cronograma guardado en colección 'cronogramas' con ID: ${docId}`);
        return true;
      } catch (e) {
        console.error("Error guardando cronograma:", e);
        return false;
      }
    }
  };

  window.CronoBus = CronoBus;
})(window);
