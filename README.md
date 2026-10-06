# NubeStore

Control de inventario simple para tiendas de barrio.
Proyecto de aula, Fase 2: construcción y despliegue del MVP.

## App desplegada

https://nubestore-eceeb.web.app

## Qué hace

NubeStore le permite al tendero registrar productos, vender con un toque, recibir alertas de stock bajo, armar pedidos por WhatsApp y seguir usando la app sin internet.

| Historia | Funcionalidad |
|---|---|
| HU-10 | Registro e inicio de sesión con correo y contraseña |
| HU-01 | Registro, edición y eliminación de productos |
| HU-02 | Venta en un toque con descuento de stock |
| HU-03 | Resumen y alertas de stock bajo |
| HU-04 y HU-05 | Pedido sugerido y envío por WhatsApp |
| HU-06 | Búsqueda rápida de productos |
| HU-07 | Panel de ventas simple |
| HU-08 y HU-09 | Modo offline y sincronización |

## Tecnologías

- HTML, CSS y JavaScript
- Firebase Authentication, Cloud Firestore y Firebase Hosting (plan gratuito Spark)
- Service Worker para abrir la app sin conexión

## Cómo ejecutarlo localmente

1. Clona el repositorio:
```
   git clone https://github.com/albionpepega-sketch/NubeStore.git
```
2. Abre la carpeta en VS Code.
3. Instala la extensión **Live Server**.
4. Clic derecho en `index.html` y **Open with Live Server**.

La configuración de Firebase está en `js/firebase.js`. Esos valores no son secretos: la seguridad de los datos la dan las reglas de Firestore.

## Estructura

```
index.html, js/auth.js        Login y registro
dashboard.html                Panel principal
js/productos.js               Productos, venta, alertas, pedido, búsqueda, offline
js/ventas.js                  Panel de ventas
js/firebase.js                Conexión con Firebase
sw.js                         Service Worker (modo offline)
docs/                         Documentación
```

## Documentación

- [Documentación de la API](docs/API.md)
- [Reglas de seguridad de Firestore](docs/firestore.rules)
- Plan de pruebas y reporte de bugs: (pega aquí el enlace de Google Sheets)
- Bugs: pestaña **Issues** de este repositorio

## Flujo de trabajo

- `main`: versión estable
- `develop`: integración
- `feature/...`, `fix/...`, `docs/...`: una rama por tarea, con Pull Request hacia `develop`

Convención de commits: `feat`, `fix`, `docs`, `test`, `chore`.

## Decisiones técnicas

Para mantener el proyecto gratuito:

- Login solo con correo (el SMS se cobra).
- Alertas de stock dentro de la app (las notificaciones push requieren Cloud Functions y el plan Blaze).
- Pedido por enlace `wa.me` en vez de la API de WhatsApp Business con Twilio.
- Sin fotos de productos (Cloud Storage requiere el plan Blaze).

## Autor

Tu Nombre - Los Libertadores, Proyecto de aula
