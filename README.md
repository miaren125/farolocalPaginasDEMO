# FaroLocal Web

Sitio estático de FaroLocal: landing para captar negocios, portal de comercios y portal de administración. Pensado para GitHub Pages (HTML, CSS y JavaScript puros, sin build). Los portales son una demostración: los datos viven en `localStorage` con ejemplos de `data/seed.js`.

## Ver el sitio en local

```
python -m http.server 8000
```

Abre http://localhost:8000/ y la guía de componentes en http://localhost:8000/_componentes.html

## Estructura

- `index.html`, `login.html`, `registro.html`, `404.html`
- `comercio/` portal de comercio · `admin/` portal de administración
- `css/` tokens, base, componentes, landing y portal · `js/` scripts · `data/` zona piloto y datos de ejemplo
- `assets/` fuentes, imágenes (exportadas de Figma) e iconos

Todas las rutas son relativas para funcionar en `usuario.github.io/NOMBRE-DEL-REPO/`.

Reglas de diseño y voz en `CLAUDE.md`.

## Cuentas de demostración

| Cuenta | Correo | Contraseña |
|---|---|---|
| Administración | admin@farolocal.mx | Admin123! |
| Comercio aprobado | esquina@farolocal.mx · farmacia@ · taqueria@ · gasolinera@ · luna@ · donchuy@ | Comercio123 |
| Comercio pendiente | tere@farolocal.mx · sol@farolocal.mx | Comercio123 |
| Comercio rechazado | compadres@farolocal.mx | Comercio123 |

Los datos viven en `localStorage` (`farolocal.web.v1`) y se siembran desde `data/seed.js` y `data/zona.json`. Las contraseñas se guardan como hash SHA-256 con sal fija: es solo una demostración, no un esquema de autenticación real. En el pie de los portales hay un botón para reiniciar los datos de ejemplo.
