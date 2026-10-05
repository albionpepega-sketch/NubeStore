// firebase.js - Configuración y conexión con Firebase
// firebase.js - Configuración y conexión con Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Datos de tu proyecto (cópialos de la consola de Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyAz9MCYp9aDrAVr7NJehs8lRDv7Oy6ZS74",
  authDomain: "nubestore-eceeb.firebaseapp.com",
  projectId: "nubestore-eceeb",
  storageBucket: "nubestore-eceeb.firebasestorage.app",
  messagingSenderId: "426890426905",
  appId: "1:426890426905:web:91daf4bc13a1ecede20888"
};

const app = initializeApp(firebaseConfig);

// Autenticación
export const auth = getAuth(app);

// Base de datos con modo offline activado (HU-08 y HU-09)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});