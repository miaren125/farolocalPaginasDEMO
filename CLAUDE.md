# FaroLocal Web (landing + portales) — contexto
Sitio web estático para GitHub Pages. Landing para captar negocios + portal de comercio + portal de administración. Proyecto escolar (Universidad de Sonora). Es independiente de la app del peatón (otro repo). Los portales son una DEMOSTRACIÓN: los datos viven en localStorage del navegador (js/store.js) con datos de ejemplo; no hay servidor.
## Reglas técnicas
- HTML/CSS/JS puro, sin dependencias externas ni CDN (fuentes locales en assets/fonts). Rutas relativas siempre. lang="es". Accesible (contraste AA, foco visible, alt en imágenes, landmarks, enlace "Saltar al contenido").
- Responsive: diseño base 1440 px; debe verse bien en 1024, 768 y 390 px. Sin scroll horizontal.
- Cada página: <title> propio, meta description, favicon, meta viewport.
- Prohibido: dibujar o rehacer logos/ilustraciones, efectos de brillo/glow/blur, gradientes llamativos, sombras de color, animaciones que parpadeen o pulsen. Permitido: transiciones suaves de 150–250 ms y entrada con fade/slide sutil que respete prefers-reduced-motion.
## Identidad
Colores: Marino #091D36 · Medianoche #010242 · Pizarra #203759 · Cobalto #1E4482 · Dorado #E7BA67 · Miel #FAD680 · Marfil #FDFDF1 · Crema #FFF7D0 · Mantequilla #FEEB9C (si Figma difiere, manda Figma; el azul medio de "Cómo funciona" sale de Figma). Fuentes: Montserrat (títulos, botones, números) y Nunito Sans (texto). Proporción 60 % azules oscuros, 30 % marfil/crema, 10 % dorado/miel.
## Lenguaje de la landing (la referencia)
Antetítulo en mayúsculas pequeñas Dorado + título grande Montserrat; tarjetas con esquinas muy redondeadas (16–24 px); botones pastilla suave en Dorado (principal) o Cobalto (sobre fondo Dorado); secciones que alternan Marino / azul medio / Marfil / Dorado; ilustración plana de tienda y linternas.
## Dirección creativa de los portales (que NO parezcan software genérico)
- Nada de barra lateral oscura tipo plantilla SaaS ni tablas grises. Cabecera superior Marino (logo, navegación, icono de cuenta, "Salir") y bajo ella una banda de título con antetítulo dorado, título y una línea de texto cálida, con una ilustración existente (linternas/tienda) a la derecha.
- Metáfora central: LA LUZ. El negocio "enciende" su Faro. Estados con TEXTO + icono + color, nunca solo color: "Faro encendido" (aprobado), "En revisión" (pendiente), "Necesita cambios" (rechazado), "Abierto ahora / Cerrado ahora".
- Cupones = tarjetas tipo BOLETO (muescas semicirculares en los costados y línea punteada divisoria) en Crema; el código FARO-XXXXXX en Montserrat grande.
- Separadores = línea punteada Dorado como la marca vial de una calle.
- Mapas: minimapa plano de la zona piloto dibujado en SVG con data/zona.json: fondo Marino, calles como trazos redondeados gris azulado, Faros como círculos planos (abierto = Miel, cerrado = Pizarra con borde Dorado), sin halos.
- Voz: de vecino, cercana, sin jerga corporativa. Nada de "Dashboard", "Gestión de entidades", "CRUD". Usa "Mi Faro", "Mis cupones", "Cobrar un cupón", "Mi sello", "Solicitudes de Faro", "Avisos de la calle".
- Estados vacíos: con una de las linternas (recortada, a baja opacidad) y una frase amable que diga qué hacer.
- Iconos: un solo juego de iconos de línea (trazo 1.75 px, redondeados) hechos como SVG inline en assets/icons/ — nunca emojis.
## Datos de demostración
Las cuentas y datos de ejemplo están en data/seed.js y deben coincidir con la app del peatón: admin@farolocal.mx / Admin123! · esquina@farolocal.mx, farmacia@farolocal.mx, tere@farolocal.mx (pendiente), compadres@farolocal.mx (rechazado) con contraseña Comercio123.
## Aviso obligatorio en el pie
"FaroLocal no garantiza seguridad: informa para decidir mejor un trayecto."
