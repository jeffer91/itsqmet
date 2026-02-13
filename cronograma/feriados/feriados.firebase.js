/**
 * Archivo: feriados.firebase.js
 * Función: Inicialización de Firebase y helpers Firestore
 * Módulo: Feriados
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* 🔐 Configuración Firebase (UTET) */
const firebaseConfig = {
  apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
  authDomain: "utet-4387a.firebaseapp.com",
  projectId: "utet-4387a",
  storageBucket: "utet-4387a.firebasestorage.app",
  messagingSenderId: "902848131454",
  appId: "1:902848131454:web:47f515eb6480834724c32f"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/* 📁 Colección principal del módulo */
export const FERIADOS_COLLECTION = "feriados";

/* 🔗 Helpers de referencias */
export function feriadosCollectionRef() {
  return collection(db, FERIADOS_COLLECTION);
}

export function feriadosYearDocRef(year) {
  return doc(db, FERIADOS_COLLECTION, String(year));
}
