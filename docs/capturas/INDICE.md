# Índice de capturas

Revisión visual final del sitio con Playwright (Chromium). Cada pantalla se guardó a **1440 px** y a **390 px** de ancho, con el nombre `NN-pantalla-ANCHO.png`. Las páginas largas son de página completa; los diálogos y el 404 son de la ventana visible.

Cuentas usadas: `esquina@` (Faro encendido), `tere@` (en revisión), `compadres@` (devuelto) y `admin@`. Todas con los datos de ejemplo recién sembrados.

| N.º | Pantalla | Archivos | ¿Se ve bien? | Pendiente / nota |
|---|---|---|---|---|
| 01 | Landing | `01-landing-1440` · `01-landing-390` | Sí. Alturas de sección iguales a Figma (115 / 695 / 483 / 531 px). | El antetítulo «Cómo funciona» va en Mantequilla, no Dorado (Dorado sobre el azul medio no llega a AA). El pie es más alto que en Figma por los dos enlaces añadidos. |
| 02 | Iniciar sesión | `02-login-1440` · `02-login-390` | Sí, igual a Figma 1005:119 (la referencia está en `figma-login-1440.png`). | — |
| 03 | Registro, paso 1 | `03-registro-paso1-*` | Sí. | En la captura de página completa el panel izquierdo (con `position: sticky`) aparece a media altura; es un efecto de la captura, no pasa al navegar. |
| 04 | Registro, paso 2 | `04-registro-paso2-*` | Sí, con el minimapa seleccionable. | Igual que la 03. |
| 05 | Mi Faro, Faro encendido | `05-comercio-panel-aprobado-*` | Sí. | El texto junto al minimapa es pequeño y deja aire a la derecha en 1440. |
| 06 | Mi Faro, en revisión | `06-comercio-panel-pendiente-*` | Sí, linterna en gris al 45 %. | — |
| 07 | Mi Faro, devuelto | `07-comercio-panel-rechazado-*` | Sí, motivo en caja Crema con botón «Corregir y reenviar». | — |
| 08 | Los datos de mi negocio | `08-comercio-negocio-*` | Sí. | — |
| 09 | Mis cupones | `09-comercio-cupones-*` | Sí. | Con un solo cupón queda mucho espacio libre a la derecha. |
| 10 | Publicar cupón (diálogo con errores) | `10-comercio-cupones-dialogo-*` | Sí, centrado. | — |
| 11 | Cobrar un cupón (resultado) | `11-comercio-validar-resultado-*` | Sí. | — |
| 12 | Mi sello, Faro encendido | `12-comercio-sello-aprobado-*` | Sí. | — |
| 13 | Mi sello, aún no disponible | `13-comercio-sello-pendiente-*` | Sí, en gris con botones deshabilitados. | — |
| 14 | Admin: Resumen | `14-admin-resumen-*` | Sí, con mucho aire. | — |
| 15 | Admin: Solicitudes de Faro | `15-admin-solicitudes-*` | Sí. En 1440 cola + detalle; en 390 solo la lista. | — |
| 16 | Admin: detalle de una solicitud (móvil) | `16-admin-solicitudes-detalle-390` | Sí, pantalla completa con «Volver a la lista». | Solo existe a 390 px. |
| 17 | Admin: devolver con motivo (diálogo con error) | `17-admin-devolver-dialogo-*` | Sí. | — |
| 18 | Admin: Avisos de la calle | `18-admin-avisos-*` | Sí, aviso seleccionado con aro blanco y tramo resaltado. | — |
| 19 | Página no encontrada | `19-404-*` | Sí. | — |
| 20 | Menú desplegable del portal | `20-menu-movil-390` | Sí. | Solo existe a 390 px. |

Referencias que se conservan: `figma-landing-1440.png`, `figma-login-1440.png` (capturas del diseño) y `componentes-1440.png` / `componentes-390.png` (guía de componentes).
