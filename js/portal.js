/* Estructura común de los portales (comercio y administración): cabecera con navegación y cuenta,
   banda de título con una linterna, pie con el aviso obligatorio. También trae ayudas para armar el DOM
   y los componentes de cupón (boleto y chip) que comparten varias páginas. JS puro, sin dependencias. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var NAV = {
    comercio: [["panel.html", "Mi Faro", "panel"], ["cupones.html", "Mis cupones", "cupones"], ["validar.html", "Cobrar un cupón", "validar"], ["sello.html", "Mi sello", "sello"]],
    admin: [["index.html", "Resumen", "resumen"], ["negocios.html", "Solicitudes de Faro", "solicitudes"], ["reportes.html", "Avisos de la calle", "avisos"]]
  };
  var LINTERNAS = { izq: "linterna-izq.png", central: "linterna-central.png", der: "linterna-der.png" };
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  /* h("div", { class: "x", "aria-label": "y" }, hijo1, "texto", [lista]) */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v === null || v === undefined) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) añadir(el, arguments[i]);
    return el;
  }
  function añadir(el, hijo) {
    if (hijo === null || hijo === undefined || hijo === false) return;
    if (Array.isArray(hijo)) { hijo.forEach(function (x) { añadir(el, x); }); return; }
    el.appendChild(typeof hijo === "string" || typeof hijo === "number" ? document.createTextNode(String(hijo)) : hijo);
  }
  function vaciar(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  var baseActual = "../";
  function icono(id, clase) {
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "icono" + (clase ? " " + clase : ""));
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS(NS, "use");
    use.setAttribute("href", baseActual + "assets/icons/iconos.svg#" + id);
    svg.appendChild(use);
    return svg;
  }
  function imagen(nombre, atributos) {
    return h("img", Object.assign({ src: baseActual + "assets/img/" + nombre, alt: "" }, atributos || {}));
  }

  /* ---------------- fechas ---------------- */
  function fechaCorta(iso) {
    var p = String(iso).split("-");
    return Number(p[2]) + " " + MESES[Number(p[1]) - 1] + " " + p[0];
  }
  function fechaHora(iso) {
    if (!iso) return "";
    var d = String(iso).split("T");
    return fechaCorta(d[0]) + (d[1] ? " · " + d[1].slice(0, 5) : "");
  }
  function vigencia(c) { return "Del " + fechaCorta(c.inicio) + " al " + fechaCorta(c.fin); }

  /* ---------------- estados (siempre texto + icono + color) ---------------- */
  var ESTADOS_NEGOCIO = {
    aprobado: { clase: "chip--encendido", icono: "i-encendido", texto: "Faro encendido" },
    pendiente: { clase: "chip--revision", icono: "i-revision", texto: "En revisión" },
    rechazado: { clase: "chip--cambios", icono: "i-cambios", texto: "Necesita cambios" }
  };
  function chipNegocio(estado) {
    var e = ESTADOS_NEGOCIO[estado] || ESTADOS_NEGOCIO.pendiente;
    return h("span", { class: "chip " + e.clase }, icono(e.icono), e.texto);
  }
  function chipAbierto(abierto) {
    return abierto
      ? h("span", { class: "chip chip--abierto" }, icono("i-abierto"), "Abierto ahora")
      : h("span", { class: "chip chip--cerrado" }, icono("i-cerrado"), "Cerrado ahora");
  }
  var ESTADOS_CUPON = {
    activo: { clase: "chip--encendido", icono: "i-encendido", texto: "Activo" },
    vencido: { clase: "chip--vencido", icono: "i-revision", texto: "Vencido" },
    desactivado: { clase: "chip--desactivado", icono: "i-cerrar", texto: "Desactivado" }
  };
  function chipCupon(estado) {
    var e = ESTADOS_CUPON[estado] || ESTADOS_CUPON.activo;
    return h("span", { class: "chip " + e.clase }, icono(e.icono), e.texto);
  }

  /* Boleto de un cupón: muescas, línea punteada, canjes en el talón */
  function boleto(c, opciones) {
    opciones = opciones || {};
    var estado = window.Store.estadoCupon(c);
    var inicia = c.inicio > window.Store.hoyISO() && estado === "activo";
    return h("div", { class: "boleto" + (estado !== "activo" ? " boleto--apagado" : "") },
      h("div", { class: "boleto__cuerpo" },
        h("div", { class: "boleto__fila" }, chipCupon(estado), inicia ? h("span", { class: "boleto__detalle", text: "Aún no inicia" }) : null),
        h("span", { class: "boleto__titulo", text: c.titulo }),
        h("span", { class: "boleto__detalle", text: c.descripcion }),
        h("span", { class: "boleto__detalle boleto__vigencia" }, icono("i-revision"), vigencia(c))),
      h("div", { class: "boleto__lado" },
        h("span", { class: "boleto__codigo", text: String(c.canjes || 0) }),
        h("span", { class: "boleto__nota", text: (c.canjes === 1 ? "canje" : "canjes") })));
  }

  /* ---------------- estructura de página ---------------- */
  function montar(cfg) {
    baseActual = cfg.base === undefined ? "../" : cfg.base;
    window.FaroCampos && (window.FaroCampos.base = baseActual);
    var sesion = window.Auth.actual();
    var items = NAV[cfg.rol] || [];
    var main = document.getElementById("contenido");
    var primero = main;

    var enlaces = items.map(function (it) {
      return h("a", { href: it[0], "aria-current": it[2] === cfg.actual ? "page" : false, text: it[1] });
    });
    var nav = h("nav", { class: "cabecera__nav", id: "menu-portal", "aria-label": "Principal" }, enlaces);
    var menu = h("button", {
      class: "cabecera__menu", type: "button", "aria-expanded": "false", "aria-controls": "menu-portal",
      onclick: function () {
        var abrir = menu.getAttribute("aria-expanded") !== "true";
        menu.setAttribute("aria-expanded", abrir ? "true" : "false");
        nav.classList.toggle("abierto", abrir);
      }
    }, icono("i-menu", "icono--grande"), h("span", { class: "solo-lectores", text: "Menú" }));
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.getAttribute("aria-expanded") === "true") { menu.click(); menu.focus(); }
    });

    var cabecera = h("header", { class: "cabecera" },
      h("div", { class: "contenedor cabecera__fila" },
        h("a", { class: "cabecera__logo", href: items[0][0], "aria-label": "FaroLocal, ir al inicio del portal" }, imagen("logo-nav.png", { alt: "FaroLocal", width: 120, height: 59 })),
        menu, nav,
        h("div", { class: "cabecera__cuenta" },
          h("span", { class: "cabecera__usuario" }, h("img", { src: baseActual + "assets/icons/cuenta.svg", alt: "", width: 32, height: 32 }), h("span", { "data-usuario": "", text: sesion ? sesion.nombre : "" }), cfg.rol === "admin" ? h("span", { class: "chip-admin", text: "Administración" }) : null),
          h("a", { class: "boton boton--claro boton--chico", href: baseActual + "login.html", "data-salir": "" }, icono("i-salir"), "Salir"))));

    var linterna = LINTERNAS[cfg.linterna] || LINTERNAS.central;
    var banda = h("div", { class: "banda" },
      h("div", { class: "contenedor banda__fila" },
        h("div", {},
          h("p", { class: "antetitulo", text: cfg.ante || "" }),
          h("h1", { id: "titulo-pagina", text: cfg.titulo || "" }),
          cfg.frase ? h("p", { class: "banda__texto", id: "frase-pagina", text: cfg.frase }) : null),
        h("div", { class: "banda__arte" + (cfg.apagada ? " banda__arte--apagada" : ""), "aria-hidden": "true" }, imagen(linterna, { width: 122, height: 190 }))));

    var pie = h("footer", { class: "pie" },
      h("div", { class: "contenedor" },
        h("p", { text: "FaroLocal no garantiza seguridad: informa para decidir mejor un trayecto." }),
        h("p", { text: "© 2026 FaroLocal · Proyecto del Concurso de Innovación Tecnológica" })));

    document.body.insertBefore(cabecera, primero);
    document.body.insertBefore(banda, primero);
    main.classList.add("portal-cuerpo");
    document.body.appendChild(pie);
    window.Auth.montarCabecera(baseActual);
    if (window.Store && window.Store.montarBotonReinicio) window.Store.montarBotonReinicio();
    return sesion;
  }

  /* Faros de todos los negocios con su estado, para el mapa de administración */
  function farosMapa() {
    var mapa = { aprobado: "encendido", pendiente: "revision", rechazado: "devuelto" };
    return window.Store.listarNegocios().map(function (n) { return { nodo_id: n.nodo_id, nombre: n.nombre, estado: mapa[n.estado] || "revision" }; });
  }
  function nombreDe(correo) {
    var u = correo && window.Store.usuarioPorCorreo(correo);
    return u ? u.nombre : (correo || "");
  }

  /* Cambia la linterna de la banda (a color o apagada) cuando cambia el estado del Faro */
  function linternaBanda(apagada) {
    var a = document.querySelector(".banda__arte");
    if (a) a.classList.toggle("banda__arte--apagada", !!apagada);
  }

  /* Copiar al portapapeles con respaldo */
  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); return true; } catch (e) { /* sin permiso: se prueba el respaldo */ }
    try {
      var t = h("textarea", { "aria-hidden": "true", style: "position:fixed;opacity:0;top:0;left:0" });
      t.value = texto; document.body.appendChild(t); t.select();
      var ok = document.execCommand("copy"); document.body.removeChild(t); return ok;
    } catch (e2) { return false; }
  }

  window.Portal = {
    montar: montar, h: h, vaciar: vaciar, icono: icono, imagen: imagen, copiar: copiar, linternaBanda: linternaBanda,
    chipNegocio: chipNegocio, chipAbierto: chipAbierto, chipCupon: chipCupon, boleto: boleto, fechaCorta: fechaCorta, fechaHora: fechaHora, vigencia: vigencia, farosMapa: farosMapa, nombreDe: nombreDe,
    base: function () { return baseActual; }
  };
})();
