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
