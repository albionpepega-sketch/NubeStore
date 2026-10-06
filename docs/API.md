<<<<<<< HEAD
# NubeStore - Documentación de la API

NubeStore no tiene un servidor propio ni endpoints REST. El backend es **Firebase** (plan Spark, gratuito) y la aplicación web se comunica con él mediante el SDK de JavaScript. Esta documentación describe ese "API": autenticación, colecciones de datos, operaciones, reglas de seguridad y lógica de negocio.

## 1. Arquitectura

| Componente | Servicio | Uso |
|---|---|---|
| Frontend | HTML, CSS y JavaScript (módulos ES) | Pantallas de login y panel |
| Hosting | Firebase Hosting | Publica la app en una URL pública |
| Autenticación | Firebase Authentication (correo y contraseña) | Registro e inicio de sesión |
| Base de datos | Cloud Firestore | Colecciones `productos` y `ventas` |
| Modo offline | Persistencia local de Firestore + Service Worker (`sw.js`) | Funciona sin internet y sincroniza al reconectar |

Flujo general: el usuario interactúa con la página, el SDK de Firebase envía la operación a Firestore (o la guarda localmente si no hay internet), y las reglas de seguridad deciden si se permite.

## 2. Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `index.html`, `js/auth.js` | Login y registro (HU-10) |
| `js/firebase.js` | Configuración de Firebase y activación del modo offline |
| `dashboard.html`, `js/productos.js` | Productos, venta, alertas, pedido sugerido, búsqueda y estado de conexión (HU-01 a HU-06, HU-08, HU-09) |
| `js/ventas.js` | Panel de ventas (HU-07) |
| `sw.js` | Service Worker que guarda la app para abrirla sin internet |
| `docs/firestore.rules` | Copia de las reglas de seguridad publicadas en Firebase |

## 3. Configuración

El archivo `js/firebase.js` contiene el objeto `firebaseConfig` con `apiKey`, `projectId`, etc. Estos valores **no son secretos**: están diseñados para ir en el código del frontend. La seguridad de los datos la dan las reglas de Firestore (sección 6) y no el ocultamiento de la clave.

Exporta dos objetos que usan los demás archivos:

- `auth`: autenticación.
- `db`: Firestore, inicializado con `persistentLocalCache` para habilitar el modo offline.

No se guardan claves de servicio ni credenciales privadas en el repositorio (`.gitignore` excluye `.env`).

## 4. Autenticación

Proveedor activo: **correo electrónico y contraseña**.

| Operación | Función del SDK | Archivo |
|---|---|---|
| Registrarse | `createUserWithEmailAndPassword(auth, email, password)` | `js/auth.js` |
| Iniciar sesión | `signInWithEmailAndPassword(auth, email, password)` | `js/auth.js` |
| Cerrar sesión | `signOut(auth)` | `js/productos.js` |
| Detectar sesión | `onAuthStateChanged(auth, callback)` | `js/auth.js`, `js/productos.js`, `js/ventas.js` |

**Control de acceso en el frontend:** `dashboard.html` redirige a `index.html` si no hay usuario autenticado, e `index.html` redirige al panel si ya existe una sesión.

**Validaciones antes de llamar a Firebase:** correo y contraseña no pueden estar vacíos.

### Mensajes de error

| Código de Firebase | Mensaje mostrado al usuario |
|---|---|
| `auth/invalid-email` | El correo no tiene un formato válido. |
| `auth/missing-password` | Escribe tu contraseña. |
| `auth/weak-password` | La contraseña debe tener al menos 6 caracteres. |
| `auth/email-already-in-use` | Ese correo ya está registrado. |
| `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password` | Correo o contraseña incorrectos. |
| `auth/too-many-requests` | Demasiados intentos. Espera un momento. |
| `auth/network-request-failed` | Sin conexión a internet. |
| Cualquier otro | Ocurrió un error. Intenta de nuevo. |

## 5. Colecciones de Firestore

### 5.1 Colección `productos`

Cada documento es un producto de la tienda de un usuario.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | Sí | Nombre del producto (máx. 60 caracteres en el formulario) |
| `categoria` | string | No | Categoría (máx. 40 caracteres) |
| `precio` | number | Sí | Precio de venta, 0 o mayor |
| `stock` | number (entero) | Sí | Unidades disponibles, 0 o mayor |
| `minimo` | number (entero) | Sí | Stock mínimo para activar la alerta |
| `uid` | string | Sí | ID del usuario dueño (`auth.currentUser.uid`) |
| `creado` | timestamp | Sí | Fecha de creación (`serverTimestamp()`) |

Ejemplo:

```json
{
  "nombre": "Coca-Cola 1.5L",
  "categoria": "Bebidas",
  "precio": 4500,
  "stock": 3,
  "minimo": 12,
  "uid": "q8Xk2...",
  "creado": "2026-10-05T14:30:00Z"
}
```

### 5.2 Colección `ventas`

Cada documento es una venta de una unidad. Se crea automáticamente al pulsar **Vender**. Se guarda el precio del momento, por lo que los cambios posteriores de precio no alteran las ventas antiguas.

| Campo | Tipo | Descripción |
|---|---|---|
| `uid` | string | ID del usuario dueño |
| `productoId` | string | ID del documento del producto vendido |
| `nombre` | string | Nombre del producto en el momento de la venta |
| `precio` | number | Precio unitario en el momento de la venta |
| `cantidad` | number | Unidades vendidas (actualmente siempre 1) |
| `total` | number | `precio * cantidad` |
| `fecha` | timestamp | Fecha y hora de la venta (`serverTimestamp()`) |

Ejemplo:

```json
{
  "uid": "q8Xk2...",
  "productoId": "aB3dE...",
  "nombre": "Coca-Cola 1.5L",
  "precio": 4500,
  "cantidad": 1,
  "total": 4500,
  "fecha": "2026-10-05T15:02:00Z"
}
```

## 6. Operaciones sobre los datos

Todas las consultas filtran por `uid == usuario actual`, por lo que solo se necesitan índices simples (no hay índices compuestos).

| Operación | Función del SDK | Descripción | Función en el código |
|---|---|---|---|
| Crear producto | `addDoc(collection(db, "productos"), datos)` | Agrega un producto con `uid` y `creado` | Manejador de `btnGuardar` en `productos.js` |
| Listar productos | `onSnapshot(query(..., where("uid", "==", uid)))` | Escucha los productos en tiempo real | `escucharProductos()` |
| Editar producto | `updateDoc(doc(db, "productos", id), datos)` | Actualiza nombre, categoría, precio, stock y mínimo | Manejador de `btnGuardar` (modo edición) |
| Eliminar producto | `deleteDoc(doc(db, "productos", id))` | Elimina tras confirmar con el usuario | `eliminarProducto()` |
| Vender | `writeBatch` con `increment(-1)` | Descuenta 1 de stock y crea la venta en una sola operación atómica | `venderProducto()` |
| Listar ventas | `onSnapshot(query(..., where("uid", "==", uid)))` | Escucha las ventas en tiempo real | `onAuthStateChanged` en `ventas.js` |

### Validaciones del formulario de productos

| Campo | Regla | Mensaje |
|---|---|---|
| Nombre | No vacío | El nombre es obligatorio. |
| Precio | Obligatorio, 0 o mayor | El precio debe ser 0 o mayor. |
| Stock | Obligatorio, entero, 0 o mayor | El stock debe ser un número entero, 0 o mayor. |
| Stock mínimo | Obligatorio, entero, 0 o mayor | El stock mínimo debe ser un número entero, 0 o mayor. |

La venta se bloquea si `stock <= 0` (mensaje: No hay stock de "producto") y el botón **Vender** se deshabilita cuando el stock es 0.

## 7. Reglas de seguridad de Firestore

Publicadas en la consola de Firebase (Firestore Database → Reglas) y copiadas en `docs/firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /productos/{id} {
      allow read, delete: if request.auth != null
                          && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null
                    && resource.data.uid == request.auth.uid
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.stock >= 0;
    }
    match /ventas/{id} {
      allow read: if request.auth != null
                  && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
    }
  }
}
```

Resumen de permisos:

| Colección | Leer | Crear | Actualizar | Eliminar |
|---|---|---|---|---|
| `productos` | Solo el dueño | Solo con su propio `uid` | Solo el dueño, sin cambiar el `uid` y con `stock >= 0` | Solo el dueño |
| `ventas` | Solo el dueño | Solo con su propio `uid` | No permitido | No permitido |

Consecuencias de las reglas:

- Un usuario autenticado **nunca ve ni modifica** los datos de otro usuario.
- Sin sesión iniciada no se puede leer ni escribir nada.
- El stock no puede quedar negativo, incluso si alguien se salta la validación de la pantalla.
- Las ventas son un registro histórico: no se editan ni se borran.

## 8. Lógica de negocio

### Estado del producto

| Condición | Estado |
|---|---|
| `stock == 0` | Agotado |
| `stock <= minimo` (y mayor a 0) | Stock bajo |
| `stock > minimo` | Disponible |

### Resumen del panel (HU-03)

- **Productos activos:** cantidad de productos.
- **Stock bajo:** productos con estado Stock bajo.
- **Agotados:** productos con estado Agotado.
- **Valor del inventario:** suma de `precio * stock` de todos los productos (valor aproximado al precio de venta).
- Los contadores y las alertas usan **todos** los productos, aunque haya un filtro de búsqueda activo.

### Pedido sugerido (HU-04)

Se incluyen los productos con `stock <= minimo`. La cantidad sugerida es:

```
cantidad = max(minimo * 2 - stock, 1)
```

Ejemplo: stock 3 y mínimo 12 sugiere pedir 21 unidades.

### Envío por WhatsApp (HU-05)

Se usa un enlace `wa.me` (sin API de pago):

```
https://wa.me/{numero}?text={pedido codificado}
```

Si el número tiene 10 dígitos y empieza por 3 (celular colombiano), se antepone el indicativo 57. Si no se escribe número, WhatsApp permite elegir el contacto.

### Búsqueda (HU-06)

Filtra en el navegador por nombre y categoría, ignorando mayúsculas y tildes. No genera lecturas adicionales a Firestore.

### Panel de ventas (HU-07)

- **Ventas de hoy:** ventas desde las 00:00 del día actual.
- **Total últimos 7 días:** suma de `total` de hoy y los 6 días anteriores.
- **Más vendidos:** top 5 por unidades vendidas en los últimos 7 días.
- **Últimas ventas:** las 10 más recientes.

## 9. Modo offline y sincronización (HU-08, HU-09)

- Firestore guarda una copia local de los datos (`persistentLocalCache` con `persistentMultipleTabManager`).
- Sin internet, las ventas, altas y ediciones se aplican localmente y se envían solas al volver la conexión. Por eso las escrituras no usan `await`: la promesa de Firestore no termina hasta sincronizar y la pantalla quedaría congelada.
- `sw.js` guarda en caché los archivos de la app (`nubestore-v1`) para poder abrirla sin internet. Con internet usa siempre la versión más reciente.
- La app muestra el estado de conexión: **Conectado** (verde), **Sincronizando** (amarillo) y **Sin conexión** (rojo).

Limitaciones conocidas:

- El primer inicio de sesión requiere internet; después la sesión queda guardada.
- Si dos dispositivos venden offline el mismo producto, los descuentos se suman al sincronizar. Si el stock fuera a quedar negativo, la regla `stock >= 0` rechaza el cambio.
- Si se borran los datos del navegador antes de sincronizar, los cambios pendientes se pierden.

## 10. Alcance y decisiones técnicas

Para mantener el proyecto dentro del plan gratuito de Firebase (Spark):

- **Login:** solo con correo y contraseña. El inicio de sesión por teléfono usa SMS, que se cobra.
- **Alertas de stock bajo:** se muestran dentro de la app. Las notificaciones push (FCM) requerirían Cloud Functions, que exige el plan Blaze.
- **Pedido por WhatsApp:** enlace `wa.me` en vez de la API de WhatsApp Business con Twilio, que requiere aprobación y tiene costo.
- **Fotos de productos:** no se incluyen, porque Cloud Storage requiere el plan Blaze.

## 11. Despliegue

La aplicación se publica con Firebase Hosting:

```
firebase deploy --only hosting
```

La URL pública se encuentra en la sección "App desplegada" del `README.md`.
=======
# NubeStore - Documentación de la API

NubeStore no tiene un servidor propio ni endpoints REST. El backend es **Firebase** (plan Spark, gratuito) y la aplicación web se comunica con él mediante el SDK de JavaScript. Esta documentación describe ese "API": autenticación, colecciones de datos, operaciones, reglas de seguridad y lógica de negocio.

## 1. Arquitectura

| Componente | Servicio | Uso |
|---|---|---|
| Frontend | HTML, CSS y JavaScript (módulos ES) | Pantallas de login y panel |
| Hosting | Firebase Hosting | Publica la app en una URL pública |
| Autenticación | Firebase Authentication (correo y contraseña) | Registro e inicio de sesión |
| Base de datos | Cloud Firestore | Colecciones `productos` y `ventas` |
| Modo offline | Persistencia local de Firestore + Service Worker (`sw.js`) | Funciona sin internet y sincroniza al reconectar |

Flujo general: el usuario interactúa con la página, el SDK de Firebase envía la operación a Firestore (o la guarda localmente si no hay internet), y las reglas de seguridad deciden si se permite.

## 2. Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `index.html`, `js/auth.js` | Login y registro (HU-10) |
| `js/firebase.js` | Configuración de Firebase y activación del modo offline |
| `dashboard.html`, `js/productos.js` | Productos, venta, alertas, pedido sugerido, búsqueda y estado de conexión (HU-01 a HU-06, HU-08, HU-09) |
| `js/ventas.js` | Panel de ventas (HU-07) |
| `sw.js` | Service Worker que guarda la app para abrirla sin internet |
| `docs/firestore.rules` | Copia de las reglas de seguridad publicadas en Firebase |

## 3. Configuración

El archivo `js/firebase.js` contiene el objeto `firebaseConfig` con `apiKey`, `projectId`, etc. Estos valores **no son secretos**: están diseñados para ir en el código del frontend. La seguridad de los datos la dan las reglas de Firestore (sección 6) y no el ocultamiento de la clave.

Exporta dos objetos que usan los demás archivos:

- `auth`: autenticación.
- `db`: Firestore, inicializado con `persistentLocalCache` para habilitar el modo offline.

No se guardan claves de servicio ni credenciales privadas en el repositorio (`.gitignore` excluye `.env`).

## 4. Autenticación

Proveedor activo: **correo electrónico y contraseña**.

| Operación | Función del SDK | Archivo |
|---|---|---|
| Registrarse | `createUserWithEmailAndPassword(auth, email, password)` | `js/auth.js` |
| Iniciar sesión | `signInWithEmailAndPassword(auth, email, password)` | `js/auth.js` |
| Cerrar sesión | `signOut(auth)` | `js/productos.js` |
| Detectar sesión | `onAuthStateChanged(auth, callback)` | `js/auth.js`, `js/productos.js`, `js/ventas.js` |

**Control de acceso en el frontend:** `dashboard.html` redirige a `index.html` si no hay usuario autenticado, e `index.html` redirige al panel si ya existe una sesión.

**Validaciones antes de llamar a Firebase:** correo y contraseña no pueden estar vacíos.

### Mensajes de error

| Código de Firebase | Mensaje mostrado al usuario |
|---|---|
| `auth/invalid-email` | El correo no tiene un formato válido. |
| `auth/missing-password` | Escribe tu contraseña. |
| `auth/weak-password` | La contraseña debe tener al menos 6 caracteres. |
| `auth/email-already-in-use` | Ese correo ya está registrado. |
| `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password` | Correo o contraseña incorrectos. |
| `auth/too-many-requests` | Demasiados intentos. Espera un momento. |
| `auth/network-request-failed` | Sin conexión a internet. |
| Cualquier otro | Ocurrió un error. Intenta de nuevo. |

## 5. Colecciones de Firestore

### 5.1 Colección `productos`

Cada documento es un producto de la tienda de un usuario.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | Sí | Nombre del producto (máx. 60 caracteres en el formulario) |
| `categoria` | string | No | Categoría (máx. 40 caracteres) |
| `precio` | number | Sí | Precio de venta, 0 o mayor |
| `stock` | number (entero) | Sí | Unidades disponibles, 0 o mayor |
| `minimo` | number (entero) | Sí | Stock mínimo para activar la alerta |
| `uid` | string | Sí | ID del usuario dueño (`auth.currentUser.uid`) |
| `creado` | timestamp | Sí | Fecha de creación (`serverTimestamp()`) |

Ejemplo:

```json
{
  "nombre": "Coca-Cola 1.5L",
  "categoria": "Bebidas",
  "precio": 4500,
  "stock": 3,
  "minimo": 12,
  "uid": "q8Xk2...",
  "creado": "2026-10-05T14:30:00Z"
}
```

### 5.2 Colección `ventas`

Cada documento es una venta de una unidad. Se crea automáticamente al pulsar **Vender**. Se guarda el precio del momento, por lo que los cambios posteriores de precio no alteran las ventas antiguas.

| Campo | Tipo | Descripción |
|---|---|---|
| `uid` | string | ID del usuario dueño |
| `productoId` | string | ID del documento del producto vendido |
| `nombre` | string | Nombre del producto en el momento de la venta |
| `precio` | number | Precio unitario en el momento de la venta |
| `cantidad` | number | Unidades vendidas (actualmente siempre 1) |
| `total` | number | `precio * cantidad` |
| `fecha` | timestamp | Fecha y hora de la venta (`serverTimestamp()`) |

Ejemplo:

```json
{
  "uid": "q8Xk2...",
  "productoId": "aB3dE...",
  "nombre": "Coca-Cola 1.5L",
  "precio": 4500,
  "cantidad": 1,
  "total": 4500,
  "fecha": "2026-10-05T15:02:00Z"
}
```

## 6. Operaciones sobre los datos

Todas las consultas filtran por `uid == usuario actual`, por lo que solo se necesitan índices simples (no hay índices compuestos).

| Operación | Función del SDK | Descripción | Función en el código |
|---|---|---|---|
| Crear producto | `addDoc(collection(db, "productos"), datos)` | Agrega un producto con `uid` y `creado` | Manejador de `btnGuardar` en `productos.js` |
| Listar productos | `onSnapshot(query(..., where("uid", "==", uid)))` | Escucha los productos en tiempo real | `escucharProductos()` |
| Editar producto | `updateDoc(doc(db, "productos", id), datos)` | Actualiza nombre, categoría, precio, stock y mínimo | Manejador de `btnGuardar` (modo edición) |
| Eliminar producto | `deleteDoc(doc(db, "productos", id))` | Elimina tras confirmar con el usuario | `eliminarProducto()` |
| Vender | `writeBatch` con `increment(-1)` | Descuenta 1 de stock y crea la venta en una sola operación atómica | `venderProducto()` |
| Listar ventas | `onSnapshot(query(..., where("uid", "==", uid)))` | Escucha las ventas en tiempo real | `onAuthStateChanged` en `ventas.js` |

### Validaciones del formulario de productos

| Campo | Regla | Mensaje |
|---|---|---|
| Nombre | No vacío | El nombre es obligatorio. |
| Precio | Obligatorio, 0 o mayor | El precio debe ser 0 o mayor. |
| Stock | Obligatorio, entero, 0 o mayor | El stock debe ser un número entero, 0 o mayor. |
| Stock mínimo | Obligatorio, entero, 0 o mayor | El stock mínimo debe ser un número entero, 0 o mayor. |

La venta se bloquea si `stock <= 0` (mensaje: No hay stock de "producto") y el botón **Vender** se deshabilita cuando el stock es 0.

## 7. Reglas de seguridad de Firestore

Publicadas en la consola de Firebase (Firestore Database → Reglas) y copiadas en `docs/firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /productos/{id} {
      allow read, delete: if request.auth != null
                          && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null
                    && resource.data.uid == request.auth.uid
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.stock >= 0;
    }
    match /ventas/{id} {
      allow read: if request.auth != null
                  && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
    }
  }
}
```

Resumen de permisos:

| Colección | Leer | Crear | Actualizar | Eliminar |
|---|---|---|---|---|
| `productos` | Solo el dueño | Solo con su propio `uid` | Solo el dueño, sin cambiar el `uid` y con `stock >= 0` | Solo el dueño |
| `ventas` | Solo el dueño | Solo con su propio `uid` | No permitido | No permitido |

Consecuencias de las reglas:

- Un usuario autenticado **nunca ve ni modifica** los datos de otro usuario.
- Sin sesión iniciada no se puede leer ni escribir nada.
- El stock no puede quedar negativo, incluso si alguien se salta la validación de la pantalla.
- Las ventas son un registro histórico: no se editan ni se borran.

## 8. Lógica de negocio

### Estado del producto

| Condición | Estado |
|---|---|
| `stock == 0` | Agotado |
| `stock <= minimo` (y mayor a 0) | Stock bajo |
| `stock > minimo` | Disponible |

### Resumen del panel (HU-03)

- **Productos activos:** cantidad de productos.
- **Stock bajo:** productos con estado Stock bajo.
- **Agotados:** productos con estado Agotado.
- **Valor del inventario:** suma de `precio * stock` de todos los productos (valor aproximado al precio de venta).
- Los contadores y las alertas usan **todos** los productos, aunque haya un filtro de búsqueda activo.

### Pedido sugerido (HU-04)

Se incluyen los productos con `stock <= minimo`. La cantidad sugerida es:

```
cantidad = max(minimo * 2 - stock, 1)
```

Ejemplo: stock 3 y mínimo 12 sugiere pedir 21 unidades.

### Envío por WhatsApp (HU-05)

Se usa un enlace `wa.me` (sin API de pago):

```
https://wa.me/{numero}?text={pedido codificado}
```

Si el número tiene 10 dígitos y empieza por 3 (celular colombiano), se antepone el indicativo 57. Si no se escribe número, WhatsApp permite elegir el contacto.

### Búsqueda (HU-06)

Filtra en el navegador por nombre y categoría, ignorando mayúsculas y tildes. No genera lecturas adicionales a Firestore.

### Panel de ventas (HU-07)

- **Ventas de hoy:** ventas desde las 00:00 del día actual.
- **Total últimos 7 días:** suma de `total` de hoy y los 6 días anteriores.
- **Más vendidos:** top 5 por unidades vendidas en los últimos 7 días.
- **Últimas ventas:** las 10 más recientes.

## 9. Modo offline y sincronización (HU-08, HU-09)

- Firestore guarda una copia local de los datos (`persistentLocalCache` con `persistentMultipleTabManager`).
- Sin internet, las ventas, altas y ediciones se aplican localmente y se envían solas al volver la conexión. Por eso las escrituras no usan `await`: la promesa de Firestore no termina hasta sincronizar y la pantalla quedaría congelada.
- `sw.js` guarda en caché los archivos de la app (`nubestore-v1`) para poder abrirla sin internet. Con internet usa siempre la versión más reciente.
- La app muestra el estado de conexión: **Conectado** (verde), **Sincronizando** (amarillo) y **Sin conexión** (rojo).

Limitaciones conocidas:

- El primer inicio de sesión requiere internet; después la sesión queda guardada.
- Si dos dispositivos venden offline el mismo producto, los descuentos se suman al sincronizar. Si el stock fuera a quedar negativo, la regla `stock >= 0` rechaza el cambio.
- Si se borran los datos del navegador antes de sincronizar, los cambios pendientes se pierden.

## 10. Alcance y decisiones técnicas

Para mantener el proyecto dentro del plan gratuito de Firebase (Spark):

- **Login:** solo con correo y contraseña. El inicio de sesión por teléfono usa SMS, que se cobra.
- **Alertas de stock bajo:** se muestran dentro de la app. Las notificaciones push (FCM) requerirían Cloud Functions, que exige el plan Blaze.
- **Pedido por WhatsApp:** enlace `wa.me` en vez de la API de WhatsApp Business con Twilio, que requiere aprobación y tiene costo.
- **Fotos de productos:** no se incluyen, porque Cloud Storage requiere el plan Blaze.

## 11. Despliegue

La aplicación se publica con Firebase Hosting:

```
firebase deploy --only hosting
```

La URL pública se encuentra en la sección "App desplegada" del `README.md`.
>>>>>>> cdb4b06 (css)
