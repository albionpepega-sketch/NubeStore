# NubeStore

Sistema de control de inventario en la nube para tiendas de barrio.

## Enlaces

| Recurso | Enlace |
|---|---|
| Aplicación desplegada | https://nubestore-eceeb.web.app |
| Video de demostración final | _pendiente: agregar el enlace de YouTube o Loom_ |
| Presentación ejecutiva | _pendiente: agregar el enlace de Canva, Genially o PDF_ |
| Documentación de la API | [docs/API.md](docs/API.md) |
| Plan de pruebas y reporte de bugs | [Google Sheets](https://docs.google.com/spreadsheets/d/1x1MdTt-rKaCApRB9TdClwaalWfcY59Ci/edit?usp=sharing&ouid=116810631968834151595&rtpof=true&sd=true) |
| Issues del repositorio | [Pestaña Issues](../../issues?q=is%3Aissue) |

## Qué hace

NubeStore permite al tendero registrar productos, vender con un toque, recibir alertas de stock bajo, armar pedidos por WhatsApp y seguir usando la aplicación sin internet. Los datos de cada usuario están aislados mediante reglas de seguridad de Firestore.

| Historia | Funcionalidad |
|---|---|
| HU-10 | Registro e inicio de sesión con correo y contraseña |
| HU-01 | Registro, edición y eliminación de productos |
| HU-02 | Venta en un toque con descuento de stock |
| HU-03 | Resumen y alertas de stock bajo |
| HU-04 y HU-05 | Pedido sugerido y envío por WhatsApp |
| HU-06 | Búsqueda rápida de productos |
| HU-07 | Panel de ventas simple |
| HU-08 y HU-09 | Modo offline y sincronización automática |

## Tecnologías

- HTML, CSS y JavaScript (módulos ES)
- Firebase Authentication, Cloud Firestore y Firebase Hosting (plan gratuito Spark)
- Service Worker y persistencia local de Firestore para el modo offline
- Node.js (ejecutor de pruebas nativo) para las pruebas unitarias
- GitHub Actions para integración y despliegue continuos

## Arquitectura

Modelo serverless / BaaS: el navegador ejecuta la aplicación web, que se comunica directamente con Firebase Authentication y Cloud Firestore. Firebase Hosting entrega los archivos con HTTPS y un Service Worker permite abrir la aplicación sin conexión. No hay servidor propio.

## Ejecución local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/albionpepega-sketch/NubeStore.git
   ```
2. Abrir la carpeta en VS Code.
3. Instalar la extensión **Live Server**.
4. Clic derecho en `index.html` y **Open with Live Server**.

No se requiere instalar dependencias para ejecutar la aplicación.

## Pruebas

- **Unitarias (32):** validan la lógica de negocio (stock, estados, pedido sugerido). Requieren Node.js 18 o superior.
  ```bash
  node --test
  ```
- **Integración (38 casos):** documentadas y ejecutadas en el plan de pruebas de Google Sheets, con historia de usuario, pasos, resultado esperado y estado.
- **Aceptación:** recorrido completo en el video de demostración.

## CI/CD

El flujo de trabajo `.github/workflows/ci-cd.yml` define dos etapas:

1. **Pruebas:** en cada Pull Request hacia `develop` o `main` y en cada push a `main`, se ejecutan las pruebas unitarias.
2. **Despliegue:** en cada push a `main` con las pruebas aprobadas, se publica en Firebase Hosting.

## Configuración y secretos

| Elemento | Naturaleza | Ubicación |
|---|---|---|
| Configuración web de Firebase | Pública por diseño | `js/firebase.js` |
| Reglas de seguridad de Firestore | Control de acceso a datos | `docs/firestore.rules` |
| Cuenta de servicio para el despliegue | Secreto | GitHub Secrets (`FIREBASE_SERVICE_ACCOUNT_NUBESTORE_ECEEB`) |
| Archivos `.env` | Secreto | Local, excluidos con `.gitignore` |

Los valores de `js/firebase.js` no son secretos: la seguridad de los datos la determinan las reglas de Firestore. Las credenciales con capacidad de modificar la infraestructura nunca se guardan en el repositorio.

## Base de datos

Cloud Firestore, con dos colecciones. Cada documento guarda el `uid` de su dueño y solo este puede leerlo o escribirlo.

| Colección | Contenido |
|---|---|
| `productos` | `uid`, nombre, categoría, precio, stock, mínimo y fecha de creación |
| `ventas` | `uid`, nombre del producto, precio, total y fecha |

## Estructura

```
index.html, js/auth.js        Inicio de sesión y registro
dashboard.html                Panel principal
js/productos.js               Productos, venta, alertas, pedido, búsqueda y estado de conexión
js/ventas.js                  Panel de ventas
js/firebase.js                Conexión con Firebase y modo offline
sw.js                         Service Worker (modo offline)
tests/                        Pruebas unitarias
.github/workflows/            Pipeline de CI/CD
docs/                         Documentación, plan de pruebas y reglas de Firestore
firebase.json, .firebaserc    Configuración de Firebase Hosting
```

## Manual de usuario (resumen)

1. Registrarse en la pestaña **Registrarme** o entrar en **Iniciar sesión**.
2. Pulsar **Agregar producto** y completar nombre, categoría, precio, stock y mínimo.
3. Pulsar **Vender** en la fila del producto: el stock baja en una unidad y la venta queda registrada.
4. Revisar las alertas y el **Pedido sugerido**, y enviarlo con **Enviar pedido por WhatsApp**.
5. Si se cae la conexión, la aplicación sigue funcionando y sincroniza al volver la señal.

## Flujo de trabajo

- `main`: versión estable, de la que se despliega.
- `develop`: integración.
- `feature/...`, `fix/...`, `docs/...`: una rama por tarea, con Pull Request hacia `develop`.

Convención de commits: `feat`, `fix`, `docs`, `test`, `chore`.

## Decisiones técnicas

Para mantener el proyecto dentro del plan gratuito:

- Inicio de sesión solo con correo (el SMS tiene costo).
- Alertas de stock dentro de la aplicación (las notificaciones push requieren Cloud Functions y el plan Blaze).
- Pedido por enlace `wa.me` en lugar de la API de WhatsApp Business con Twilio.
- Sin fotos de productos (Cloud Storage requiere el plan Blaze).

## Trabajo futuro

- Plan Blaze con alertas de presupuesto, Cloud Functions y notificaciones push.
- Entornos separados de desarrollo y producción, con el emulador de Firebase.
- Restricción de la clave de API y Firebase App Check.
- Consulta de ventas acotada y totales diarios agregados.
- Fotos de productos y exportación de datos.

## Autor

Camilo Andrés Rodríguez Herrera.

