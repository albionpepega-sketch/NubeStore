// productos.js - Registro, consulta, edición y eliminación de productos (HU-01)
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, onSnapshot, serverTimestamp,
  writeBatch, increment
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const campos = {
  nombre: document.getElementById("nombre"),
  categoria: document.getElementById("categoria"),
  precio: document.getElementById("precio"),
  stock: document.getElementById("stock"),
  minimo: document.getElementById("minimo")
};
const btnGuardar = document.getElementById("btn-guardar");
const btnCancelar = document.getElementById("btn-cancelar");
const tituloForm = document.getElementById("titulo-form");
const mensaje = document.getElementById("mensaje");
const tabla = document.getElementById("tabla-productos");
const vacio = document.getElementById("vacio");

let usuarioActual = null;
let editandoId = null;
let productos = [];
let textoBusqueda = "";
let cancelarEscucha = null;

// ---- Sesión: si no hay usuario, vuelve al login ----
onAuthStateChanged(auth, (usuario) => {
  if (!usuario) {
    window.location.href = "index.html";
    return;
  }
  usuarioActual = usuario;
  document.getElementById("usuario").textContent = usuario.email;
  escucharProductos();
});

document.getElementById("btn-salir").addEventListener("click", async () => {
  if (cancelarEscucha) cancelarEscucha();
  await signOut(auth);
  window.location.href = "index.html";
});

// ---- Leer productos en tiempo real (solo los del usuario) ----
function escucharProductos() {
  const q = query(collection(db, "productos"), where("uid", "==", usuarioActual.uid));
  cancelarEscucha = onSnapshot(q, (snapshot) => {
    productos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    productos.sort((a, b) => a.nombre.localeCompare(b.nombre));
    dibujarTabla();
    actualizarResumen();
  }, () => {
    mostrarMensaje("No se pudo cargar el inventario.");
  });
}

// ---- Estado según el stock ----
function calcularEstado(p) {
  if (p.stock === 0) return { texto: "Agotado", clase: "estado-agotado" };
  if (p.stock <= p.minimo) return { texto: "Stock bajo", clase: "estado-bajo" };
  return { texto: "Disponible", clase: "estado-ok" };
}

function celda(texto) {
  const td = document.createElement("td");
  td.textContent = texto;
  return td;
}

function dibujarTabla() {
  tabla.innerHTML = "";

  const visibles = productos.filter(coincideConBusqueda);

  if (productos.length === 0) {
    vacio.textContent = "Aún no tienes productos registrados.";
    vacio.style.display = "block";
  } else if (visibles.length === 0) {
    vacio.textContent = `No se encontraron productos para "${textoBusqueda}".`;
    vacio.style.display = "block";
  } else {
    vacio.style.display = "none";
  }

  visibles.forEach((p) => {
    const tr = document.createElement("tr");
    tr.appendChild(celda(p.nombre));
    tr.appendChild(celda(p.categoria || "-"));
    tr.appendChild(celda("$" + p.precio.toLocaleString("es-CO")));
    tr.appendChild(celda(p.stock));
    tr.appendChild(celda(p.minimo));

    const estado = calcularEstado(p);
    const tdEstado = document.createElement("td");
    const etiqueta = document.createElement("span");
    etiqueta.textContent = estado.texto;
    etiqueta.className = "etiqueta " + estado.clase;
    tdEstado.appendChild(etiqueta);
    tr.appendChild(tdEstado);

    const tdAcciones = document.createElement("td");
    const btnEditar = document.createElement("button");
    btnEditar.textContent = "Editar";
    btnEditar.className = "btn-mini";
    btnEditar.addEventListener("click", () => cargarParaEditar(p));
    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "Eliminar";
    btnEliminar.className = "btn-mini peligro";
    btnEliminar.addEventListener("click", () => eliminarProducto(p));
    const btnVender = document.createElement("button");
    btnVender.textContent = "Vender";
    btnVender.className = "btn-mini vender";
    btnVender.disabled = p.stock === 0;
    btnVender.addEventListener("click", () => venderProducto(p));
    tdAcciones.append(btnVender, btnEditar, btnEliminar);
    tr.appendChild(tdAcciones);

    tabla.appendChild(tr);
  });
}

// ---- Validaciones ----
function validar() {
  const nombre = campos.nombre.value.trim();
  const precio = Number(campos.precio.value);
  const stock = Number(campos.stock.value);
  const minimo = Number(campos.minimo.value);

  if (!nombre) return "El nombre es obligatorio.";
  if (campos.precio.value === "" || precio < 0) return "El precio debe ser 0 o mayor.";
  if (campos.stock.value === "" || !Number.isInteger(stock) || stock < 0)
    return "El stock debe ser un número entero, 0 o mayor.";
  if (campos.minimo.value === "" || !Number.isInteger(minimo) || minimo < 0)
    return "El stock mínimo debe ser un número entero, 0 o mayor.";
  return null;
}

function mostrarMensaje(texto, ok = false) {
  mensaje.textContent = texto;
  mensaje.style.color = ok ? "#166534" : "#b91c1c";
}

function limpiarFormulario() {
  Object.values(campos).forEach((c) => (c.value = ""));
  editandoId = null;
  tituloForm.textContent = "Agregar producto";
  btnGuardar.textContent = "Guardar producto";
  btnCancelar.classList.add("oculto");
}

// ---- Crear o actualizar ----
btnGuardar.addEventListener("click", async () => {
  const error = validar();
  if (error) {
    mostrarMensaje(error);
    return;
  }

  const datos = {
    nombre: campos.nombre.value.trim(),
    categoria: campos.categoria.value.trim(),
    precio: Number(campos.precio.value),
    stock: Number(campos.stock.value),
    minimo: Number(campos.minimo.value)
  };

  btnGuardar.disabled = true;
  try {
    if (editandoId) {
      await updateDoc(doc(db, "productos", editandoId), datos);
      mostrarMensaje("Producto actualizado.", true);
    } else {
      await addDoc(collection(db, "productos"), {
        ...datos,
        uid: usuarioActual.uid,
        creado: serverTimestamp()
      });
      mostrarMensaje("Producto guardado.", true);
    }
    limpiarFormulario();
  } catch (e) {
    mostrarMensaje("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
  } finally {
    btnGuardar.disabled = false;
  }
});

// ---- Editar ----
function cargarParaEditar(p) {
  editandoId = p.id;
  campos.nombre.value = p.nombre;
  campos.categoria.value = p.categoria || "";
  campos.precio.value = p.precio;
  campos.stock.value = p.stock;
  campos.minimo.value = p.minimo;
  tituloForm.textContent = "Editar producto";
  btnGuardar.textContent = "Guardar cambios";
  btnCancelar.classList.remove("oculto");
  mensaje.textContent = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

btnCancelar.addEventListener("click", () => {
  limpiarFormulario();
  mensaje.textContent = "";
});

// ---- Eliminar ----
async function eliminarProducto(p) {
  if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
  try {
    await deleteDoc(doc(db, "productos", p.id));
  } catch (e) {
    mostrarMensaje("No se pudo eliminar el producto.");
  }
}
function venderProducto(p) {
  if (p.stock <= 0) {
      const quedan = p.stock - 1;
  if (quedan === 0) {
    mostrarMensaje(`Venta registrada. ¡${p.nombre} se agotó!`, true);
  } else if (quedan <= p.minimo) {
    mostrarMensaje(`Venta registrada. Atención: quedan ${quedan} de ${p.nombre}.`, true);
  } else {
    mostrarMensaje(`Venta registrada: ${p.nombre}`, true);
  }
    return;
  }

  const batch = writeBatch(db);
  batch.update(doc(db, "productos", p.id), { stock: increment(-1) });
  batch.set(doc(collection(db, "ventas")), {
    uid: usuarioActual.uid,
    productoId: p.id,
    nombre: p.nombre,
    precio: p.precio,
    cantidad: 1,
    total: p.precio,
    fecha: serverTimestamp()
  });

  batch.commit().catch(() => {
    mostrarMensaje("No se pudo registrar la venta.");
  });

  mostrarMensaje(`Venta registrada: ${p.nombre}`, true);
}
function actualizarResumen() {
  const agotados = productos.filter((p) => p.stock === 0);
  const bajos = productos.filter((p) => p.stock > 0 && p.stock <= p.minimo);
  const valor = productos.reduce((suma, p) => suma + p.precio * p.stock, 0);

  document.getElementById("total-productos").textContent = productos.length;
  document.getElementById("total-bajo").textContent = bajos.length;
  document.getElementById("total-agotados").textContent = agotados.length;
  document.getElementById("valor-inventario").textContent =
    "$" + valor.toLocaleString("es-CO");

  const lista = document.getElementById("lista-alertas");
  lista.innerHTML = "";
  agotados.forEach((p) =>
    agregarAlerta(lista, `${p.nombre} está agotado.`, "estado-agotado"));
  bajos.forEach((p) =>
    agregarAlerta(
      lista,
      `${p.nombre} tiene stock bajo: quedan ${p.stock} y tu mínimo es ${p.minimo}.`,
      "estado-bajo"
    ));

  document.getElementById("sin-alertas").style.display =
    agotados.length + bajos.length === 0 ? "block" : "none";
    actualizarPedido();
}

function agregarAlerta(lista, texto, clase) {
  const li = document.createElement("li");
  li.textContent = texto;
  li.className = "alerta " + clase;
  lista.appendChild(li);
}
function calcularPedido() {
  return productos
    .filter((p) => p.stock <= p.minimo)
    .map((p) => ({
      nombre: p.nombre,
      cantidad: Math.max(p.minimo * 2 - p.stock, 1)
    }));
}

function actualizarPedido() {
  const pedido = calcularPedido();
  const lista = document.getElementById("lista-pedido");
  lista.innerHTML = "";
  pedido.forEach((item) =>
    agregarAlerta(lista, `${item.nombre}: pedir ${item.cantidad} unidades`, "estado-bajo"));
  document.getElementById("sin-pedido").style.display =
    pedido.length === 0 ? "block" : "none";
  document.getElementById("btn-whatsapp").disabled = pedido.length === 0;
}

document.getElementById("btn-whatsapp").addEventListener("click", () => {
  const pedido = calcularPedido();
  if (pedido.length === 0) return;

  const lineas = pedido.map((i) => `- ${i.nombre}: ${i.cantidad} unidades`);
  const texto = "Hola, quisiera hacer este pedido:\n" + lineas.join("\n") + "\nGracias.";

  // Deja solo los dígitos; si es un celular colombiano de 10 dígitos, agrega el 57
  let numero = document.getElementById("telefono").value.replace(/\D/g, "");
  if (numero.length === 10 && numero.startsWith("3")) numero = "57" + numero;

  const url = "https://wa.me/" + numero + "?text=" + encodeURIComponent(texto);
  window.open(url, "_blank");
});
function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function coincideConBusqueda(p) {
  const buscado = normalizar(textoBusqueda.trim());
  if (!buscado) return true;
  return normalizar(p.nombre).includes(buscado) ||
         normalizar(p.categoria).includes(buscado);
}

document.getElementById("buscador").addEventListener("input", (e) => {
  textoBusqueda = e.target.value;
  dibujarTabla();
});