// =========================================================
// ARCHIVO: ficha-firebase-init.js
// Inicializa Firebase para la carpeta Ficha usando el
// proyecto UTET y expone window.FichaDB
// =========================================================

(function (window) {
  "use strict";

  if (window.FichaDB) {
    console.log("[FichaFirebaseInit] FichaDB ya estaba inicializado.");
    return;
  }

  if (!window.firebase || !window.firebase.apps) {
    console.error("[FichaFirebaseInit] La librería Firebase no está cargada. Revisa los <script> de Firebase en el HTML.");
    return;
  }

  // Configuración REAL del proyecto UTET
  var fichaFirebaseConfig = {
    apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
    authDomain: "utet-4387a.firebaseapp.com",
    projectId: "utet-4387a",
    storageBucket: "utet-4387a.firebasestorage.app",
    messagingSenderId: "902848131454",
    appId: "1:902848131454:web:47f515eb6480834724c32f"
  };

  var app;
  if (firebase.apps.length === 0) {
    app = firebase.initializeApp(fichaFirebaseConfig);
    console.log("[FichaFirebaseInit] Firebase inicializado por primera vez para UTET/Ficha.");
  } else {
    app = firebase.app();
    console.log("[FichaFirebaseInit] Reutilizando app Firebase existente para UTET/Ficha.");
  }

  try {
    var db = firebase.firestore(app);
    window.FichaDB = db;
    console.log("[FichaFirebaseInit] Firestore listo. FichaDB disponible.");
  } catch (err) {
    console.error("[FichaFirebaseInit] Error al inicializar Firestore para Ficha:", err);
  }
})(window);
