/* =========================================================
Archivo: firebase.init.js
Ruta - Ubicación: /defart/firebase.init.js
Función:
- Inicializar Firebase + Firestore
- Exponer Firestore como window.DefArtDB (requerido por defart.app.js)
IMPORTANTE:
- Este archivo NO toca DefArt; solo prepara la conexión.
- Debe cargarse ANTES de defart.data.js y defart.app.js
========================================================= */
(function (window) {
  "use strict";

  // ✅ CONFIG: pega aquí tu configuración real de Firebase (Firebase Console → Configuración web)
  // Esto corrige el problema: evita que window.DefArtDB sea undefined y que DefArt se detenga.
  // ✅ CONFIG REAL (UTET / Requisitos)
  // Esto corrige el problema: sin esta config, Firebase no puede inicializarse y DefArtDB nunca existe.
  var firebaseConfig = {
    apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
    authDomain: "utet-4387a.firebaseapp.com",
    projectId: "utet-4387a",
    storageBucket: "utet-4387a.firebasestorage.app",
    messagingSenderId: "902848131454",
    appId: "1:902848131454:web:47f515eb6480834724c32f"
  };

  // ✅ Validación: evita "no se comunica" por falta del SDK
  // IMPORTANTE: este init asume SDK COMPAT (firebase.* global), porque tu app usa db.collection(...).get()
  if (!window.firebase || !window.firebase.initializeApp) {
    console.error("[firebase.init] Falta Firebase SDK COMPAT en el HTML (firebase-app-compat.js).");
    return;
  }
  if (!window.firebase.firestore) {
    console.error("[firebase.init] Falta Firestore SDK COMPAT en el HTML (firebase-firestore-compat.js).");
    return;
  }

  // ✅ Inicializa UNA sola vez (evita error de app duplicada)
  if (!window.firebase.apps || window.firebase.apps.length === 0) {
    window.firebase.initializeApp(firebaseConfig);
  }

  // ✅ Exponer Firestore como DefArtDB (API compatible con .collection())
  try {
    window.DefArtDB = window.firebase.firestore();
    console.log("[firebase.init] Firestore listo: window.DefArtDB creado (COMPAT).");
  } catch (e) {
    console.error("[firebase.init] Error creando Firestore (COMPAT).", e);
  }


  // ✅ Validación: evita fallos silenciosos si no se cargaron los scripts de Firebase por CDN.
  if (!window.firebase) {
    console.error("[firebase.init] Firebase SDK no está cargado. Falta incluir los <script> CDN de Firebase.");
    return;
  }

  // ✅ Inicializa UNA sola vez (evita error 'Firebase App named '[DEFAULT]' already exists')
  if (!window.firebase.apps || window.firebase.apps.length === 0) {
    window.firebase.initializeApp(firebaseConfig);
  }

  // ✅ Crear Firestore y exponerlo como DefArtDB (esto es lo que DefArt espera)
  try {
    window.DefArtDB = window.firebase.firestore();

    // Comentario técnico: forzamos el "timestamp behavior" moderno si aplica (no rompe si no existe)
    if (window.DefArtDB && window.DefArtDB.settings) {
      // No cambiamos settings sensibles; solo dejamos el hook listo.
      // window.DefArtDB.settings({}); // (intencionalmente vacío)
    }

    console.log("[firebase.init] Firestore listo: window.DefArtDB creado.");
  } catch (e) {
    console.error("[firebase.init] No se pudo crear Firestore. Revisa que incluiste firebase-firestore.js.", e);
  }
})(window);
