// auth.js - Registro e inicio de sesión (HU-10)
import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const tabLogin = document.getElementById("tab-login");
const tabRegistro = document.getElementById("tab-registro");
const btnEnviar = document.getElementById("btn-enviar");
const mensaje = document.getElementById("mensaje");
const inputEmail = document.getElementById("email");
const inputPassword = document.getElementById("password");

let modo = "login"; // "login" o "registro"

// Cambia entre las pestañas de login y registro
function cambiarModo(nuevoModo) {
  modo = nuevoModo;
  tabLogin.classList.toggle("activa", modo === "login");
  tabRegistro.classList.toggle("activa", modo === "registro");
  btnEnviar.textContent = modo === "login" ? "Entrar" : "Crear cuenta";
  mensaje.textContent = "";
}

tabLogin.addEventListener("click", () => cambiarModo("login"));
tabRegistro.addEventListener("click", () => cambiarModo("registro"));

// Convierte los errores de Firebase en mensajes claros
function traducirError(codigo) {
  const errores = {
    "auth/invalid-email": "El correo no tiene un formato válido.",
    "auth/missing-password": "Escribe tu contraseña.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/email-already-in-use": "Ese correo ya está registrado.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento.",
    "auth/network-request-failed": "Sin conexión a internet."
  };
  return errores[codigo] || "Ocurrió un error. Intenta de nuevo.";
}

btnEnviar.addEventListener("click", async () => {
  const email = inputEmail.value.trim();
  const password = inputPassword.value;

  // Validaciones básicas
  if (!email || !password) {
    mensaje.textContent = "Completa el correo y la contraseña.";
    return;
  }

  btnEnviar.disabled = true;
  mensaje.textContent = "";

  try {
    if (modo === "login") {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
    window.location.href = "dashboard.html";
  } catch (error) {
    mensaje.textContent = traducirError(error.code);
  } finally {
    btnEnviar.disabled = false;
  }
});

// Si ya hay una sesión abierta, pasa directo al panel
onAuthStateChanged(auth, (usuario) => {
  if (usuario) window.location.href = "dashboard.html";
});