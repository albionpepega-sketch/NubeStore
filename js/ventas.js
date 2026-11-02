// ventas.js - Panel de ventas simple (HU-07)
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

function dinero(valor) {
  return "$" + valor.toLocaleString("es-CO");
}

function agregarItem(lista, texto) {
  const li = document.createElement("li");
  li.textContent = texto;
  li.className = "alerta neutro";
  lista.appendChild(li);
}

// Escucha las ventas del usuario en tiempo real
onAuthStateChanged(auth, (usuario) => {
  if (!usuario) return;

  const q = query(collection(db, "ventas"), where("uid", "==", usuario.uid));
  onSnapshot(q, (snapshot) => {
    const ventas = snapshot.docs.map((d) => {
      // "estimate": si la venta aún no se sincroniza (offline), usa la hora local
      const datos = d.data({ serverTimestamps: "estimate" });
      return { ...datos, fecha: datos.fecha ? datos.fecha.toDate() : new Date() };
    });
    dibujarVentas(ventas);
  });
});

function dibujarVentas(ventas) {
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const inicioSemana = new Date(inicioHoy);
  inicioSemana.setDate(inicioSemana.getDate() - 6);

  const deHoy = ventas.filter((v) => v.fecha >= inicioHoy);
  const deSemana = ventas.filter((v) => v.fecha >= inicioSemana);

  const suma = (lista) => lista.reduce((t, v) => t + v.total, 0);

  document.getElementById("ventas-hoy").textContent = deHoy.length;
  document.getElementById("total-hoy").textContent = dinero(suma(deHoy));
  document.getElementById("total-semana").textContent = dinero(suma(deSemana));

  dibujarTop(deSemana);
  dibujarUltimas(ventas);
}

// Productos más vendidos: agrupa por nombre y suma unidades y dinero
function dibujarTop(ventas) {
  const porProducto = {};
  ventas.forEach((v) => {
    if (!porProducto[v.nombre]) porProducto[v.nombre] = { unidades: 0, total: 0 };
    porProducto[v.nombre].unidades += v.cantidad;
    porProducto[v.nombre].total += v.total;
  });

  const top = Object.entries(porProducto)
    .sort((a, b) => b[1].unidades - a[1].unidades)
    .slice(0, 5);

  const lista = document.getElementById("lista-top");
  lista.innerHTML = "";
  top.forEach(([nombre, d], i) =>
    agregarItem(lista, `${i + 1}. ${nombre}: ${d.unidades} unidades (${dinero(d.total)})`));
  document.getElementById("sin-top").style.display = top.length === 0 ? "block" : "none";
}

// Las 10 ventas más recientes
function dibujarUltimas(ventas) {
  const recientes = [...ventas].sort((a, b) => b.fecha - a.fecha).slice(0, 10);

  const lista = document.getElementById("lista-ultimas");
  lista.innerHTML = "";
  recientes.forEach((v) => {
    const cuando = v.fecha.toLocaleString("es-CO", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    });
    agregarItem(lista, `${cuando} - ${v.nombre}: ${dinero(v.total)}`);
  });
  document.getElementById("sin-ultimas").style.display = recientes.length === 0 ? "block" : "none";
}