/* Comportamiento de la landing: menú móvil, sombra de la barra, enlace activo y entrada sutil. */
(function () {
  "use strict";

  var nav = document.getElementById("nav");
  var toggle = document.getElementById("nav-toggle");
  var panel = document.getElementById("nav-panel");
  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Sombra neutra muy sutil cuando la página ya no está arriba */
  function sombra() { nav.classList.toggle("con-sombra", window.scrollY > 4); }
  sombra();
  window.addEventListener("scroll", sombra, { passive: true });

  /* Menú hamburguesa accesible */
  function menu(abrir) {
    toggle.setAttribute("aria-expanded", abrir ? "true" : "false");
    toggle.setAttribute("aria-label", abrir ? "Cerrar el menú" : "Abrir el menú");
    panel.classList.toggle("abierto", abrir);
  }
  toggle.addEventListener("click", function () {
    menu(toggle.getAttribute("aria-expanded") !== "true");
  });
  panel.addEventListener("click", function (e) {
    if (e.target.closest("a")) menu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      menu(false);
      toggle.focus();
    }
  });
  window.matchMedia("(min-width: 768px)").addEventListener("change", function () { menu(false); });

  /* Scroll suave en los enlaces internos (respeta reduce-motion; el foco pasa a la sección) */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1);
      var destino = id && document.getElementById(id);
      if (!destino) return;
      e.preventDefault();
      destino.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
      if (history.replaceState) history.replaceState(null, "", "#" + id);
      destino.setAttribute("tabindex", "-1");
      destino.focus({ preventScroll: true });
    });
  });

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".revela").forEach(function (el) { el.classList.add("visible"); });
    return;
  }

  /* Enlace de la sección visible */
  var enlaces = {};
  document.querySelectorAll(".nav__links a").forEach(function (a) { enlaces[a.getAttribute("href").slice(1)] = a; });
  var ids = Object.keys(enlaces);
  var activo = null;
  function marcar(id) {
    if (activo === id) return;
    activo = id;
    ids.forEach(function (k) {
      if (k === id) enlaces[k].setAttribute("aria-current", "true");
      else enlaces[k].removeAttribute("aria-current");
    });
  }
  var visibles = {};
  var obsSecciones = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) { visibles[en.target.id] = en.isIntersecting; });
    var primero = null;
    ["inicio"].concat(ids).forEach(function (k) { if (!primero && visibles[k]) primero = k; });
    marcar(enlaces[primero] ? primero : null);
  }, { rootMargin: "-40% 0px -55% 0px" });
  ["inicio"].concat(ids).forEach(function (k) {
    var s = document.getElementById(k);
    if (s) obsSecciones.observe(s);
  });

  /* Entrada sutil: una sola vez, desactivada con prefers-reduced-motion */
  var revelar = document.querySelectorAll(".revela");
  if (reducido) {
    revelar.forEach(function (el) { el.classList.add("visible"); });
  } else {
    var obsEntrada = new IntersectionObserver(function (entradas, obs) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("visible"); obs.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    revelar.forEach(function (el) { obsEntrada.observe(el); });
  }
})();
