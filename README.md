# FaroLocal Web

Sitio web de **FaroLocal**: una landing para captar negocios, un portal para que cada comercio encienda su Faro y un portal de administración para revisar solicitudes y avisos de la calle. Es un proyecto escolar (Universidad de Sonora), independiente de la app del peatón.

**Sitio publicado:** {URL}

> Es una **demostración**. No hay servidor ni base de datos: los datos de ejemplo viven en el navegador (ver [Cómo funciona la demo](#cómo-funciona-la-demo) y [Limitaciones](#limitaciones-honestas)).

## Cuentas de demostración

| Cuenta | Correo | Contraseña | Entra a |
|---|---|---|---|
| Administración | `admin@farolocal.mx` | `Admin123!` | `admin/index.html` |
| Comercio aprobado (Faro encendido) | `esquina@farolocal.mx`, `farmacia@farolocal.mx`, `taqueria@farolocal.mx`, `gasolinera@farolocal.mx`, `luna@farolocal.mx`, `donchuy@farolocal.mx` | `Comercio123` | `comercio/panel.html` |
| Comercio pendiente (En revisión) | `tere@farolocal.mx`, `sol@farolocal.mx` | `Comercio123` | `comercio/panel.html` |
| Comercio rechazado (Necesita cambios) | `compadres@farolocal.mx` | `Comercio123` | `comercio/panel.html` |

En `login.html` hay un cuadro «Cuentas de demostración» con un botón «Usar esta cuenta».

Para ver cómo se conectan los portales: entra como administración, enciende el Faro de `tere@` y luego entra como `tere@`; su panel dirá «Faro encendido» y podrá publicar cupones. Si en cambio lo devuelves con un motivo, `tere@` verá ese texto exacto.

## Probarlo en tu computadora

Necesitas Python 3. Desde la carpeta del repositorio:

```
python -m http.server 8000
```

Y abre <http://localhost:8000>. Hay que servirlo (no abrir los archivos con doble clic): el navegador necesita `http://` o `https://` para cargar los datos y calcular los hashes de contraseña.

Páginas útiles: `index.html` (landing), `login.html`, `registro.html`, `comercio/panel.html`, `admin/index.html` y `_componentes.html` (guía visual de los componentes, no enlazada).

Antes de publicar corre la revisión de enlaces:

```
python tools/revisar_enlaces.py
```

## Cómo funciona la demo

- **Datos:** `js/store.js` guarda todo en `localStorage` bajo la llave `farolocal.web.v1` (usuarios, negocios, cupones, canjes, reportes y resumen). La primera vez que se abre el sitio se siembra desde `data/seed.js` y `data/zona.json` (el mapa de la zona piloto: 48 cruces, 80 tramos y los Faros aprobados).
- **Sesión:** `js/auth.js` guarda un aviso de sesión en `sessionStorage` (o en `localStorage` si marcas «Mantener sesión»). Las páginas de `comercio/` y `admin/` redirigen a `login.html` si no hay sesión o si el rol no corresponde.
- **Contraseñas:** se guardan como SHA-256 (sal fija + contraseña), nunca en claro. Es solo para que no queden a la vista en el almacenamiento; no es seguridad real.
- **Reiniciar:** en el pie de los portales hay un enlace discreto «Reiniciar datos de demostración» (pide confirmación) que borra tus cambios y vuelve a sembrar los datos de ejemplo.
- Lo que cambias en una pantalla se ve en las otras, porque todas leen del mismo almacenamiento.

## Estructura de carpetas

```
index.html · login.html · registro.html · 404.html     páginas públicas
comercio/    panel · negocio · cupones · validar · sello        portal del comercio
admin/       index (resumen) · negocios (solicitudes) · reportes (avisos)
css/         tokens · base · componentes · landing · acceso · portal
js/          store · auth · mapa · ui · campos · form-negocio · portal · landing · login · registro · comercio-* · admin-*
data/        zona.json (mapa de la zona piloto) · seed.js (datos de ejemplo)
assets/      fonts (Montserrat y Nunito Sans, locales) · img (exportadas de Figma) · icons
tools/       revisar_enlaces.py
docs/        capturas e índice de la revisión visual
_componentes.html     guía visual de componentes (noindex)
```

Es HTML, CSS y JavaScript puros: sin dependencias, sin CDN y sin paso de compilación. Todas las rutas son relativas, así que el sitio funciona igual en `usuario.github.io/NOMBRE-DEL-REPO/`, en un dominio propio o en `localhost`.

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub (rama `main`).
2. En GitHub: **Settings → Pages**.
3. En «Build and deployment», **Source: Deploy from a branch**.
4. En «Branch», elige **`main`** y la carpeta **`/ (root)`**, y pulsa **Save**.
5. Espera uno o dos minutos. La dirección aparece arriba en esa misma pantalla: `https://USUARIO.github.io/NOMBRE-DEL-REPO/`. Pon esa dirección en el marcador `{URL}` de este README.

El archivo `.nojekyll` de la raíz le indica a Pages que sirva los archivos tal cual (sin procesarlos con Jekyll).

`404.html` es la única página que usa `<base>`: Pages la sirve en cualquier ruta que no exista y las rutas relativas se romperían, así que fija la raíz del sitio con un pequeño script (explicado en un comentario dentro del archivo).

## Limitaciones honestas

- **No hay servidor.** Nada de lo que se registra sale del navegador de quien lo hace; no hay correos, ni notificaciones, ni respaldo.
- **Los datos no se comparten con la app del peatón.** Los datos de ejemplo se parecen a los de la app (mismas cuentas, mismos negocios y mismo mapa) pero son una copia: si enciendes un Faro aquí, la app no se entera.
- **La autenticación es simulada.** Cualquiera con las herramientas del navegador puede leer o editar `localStorage`, cambiar de rol o saltarse las redirecciones. No uses contraseñas verdaderas.
- **Los datos son por navegador.** Cada navegador (y cada ventana privada) tiene su propia copia; borrar los datos del sitio los reinicia.
- **Sin recuperación de contraseña ni verificación de correo.**
- **El mapa es una vista plana** de la zona piloto dibujada con `data/zona.json`; no es un mapa real ni calcula rutas.
- **Aviso:** FaroLocal no garantiza seguridad: informa para decidir mejor un trayecto.
