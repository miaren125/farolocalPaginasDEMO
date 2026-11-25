/* Utilidades de interfaz: avisos, diálogos y pestañas accesibles. JS puro, sin dependencias. */
(function () {
  "use strict";

  /* ---- Avisos (toast) con role="status" ---- */
  function contenedorAvisos() {
    var c = document.getElementById("avisos");
    if (!c) {
      c = document.createElement("div");
      c.id = "avisos";
      c.className = "avisos";
      c.setAttribute("role", "status");
      c.setAttribute("aria-live", "polite");
      document.body.appendChild(c);
    }
    return c;
  }

  var NS = "http://www.w3.org/2000/svg";
  function icono(base, id) {
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "icono");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS(NS, "use");
    use.setAttribute("href", base + "assets/icons/iconos.svg#" + id);
    svg.appendChild(use);
    return svg;
  }

  function aviso(texto, opciones) {
    opciones = opciones || {};
    var base = opciones.base || "";
    var el = document.createElement("div");
    el.className = "aviso" + (opciones.tipo === "error" ? " aviso--error" : "");
    var texto_el = document.createElement("span");
    texto_el.className = "aviso__texto";
    texto_el.textContent = texto;
    var cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "aviso__cerrar";
    cerrar.setAttribute("aria-label", "Cerrar aviso");
    cerrar.appendChild(icono(base, "i-cerrar"));
    el.appendChild(icono(base, opciones.tipo === "error" ? "i-error" : "i-check"));
    el.appendChild(texto_el);
    el.appendChild(cerrar);
    var quitar = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    cerrar.addEventListener("click", quitar);
    contenedorAvisos().appendChild(el);
    setTimeout(quitar, opciones.duracion || 6000);
    return el;
  }

  /* ---- Diálogo modal: <dialog> nativo atrapa el foco y cierra con Esc.
          Aquí devolvemos el foco al disparador y cerramos al pulsar el fondo. ---- */
  function abrirDialogo(dialogo, disparador) {
    if (typeof dialogo === "string") dialogo = document.getElementById(dialogo);
    if (!dialogo) return;
    dialogo._disparador = disparador || document.activeElement;
    dialogo.showModal();
  }
  function cerrarDialogo(dialogo) {
    if (typeof dialogo === "string") dialogo = document.getElementById(dialogo);
    if (dialogo && dialogo.open) dialogo.close();
  }
  function iniciarDialogos(raiz) {
    (raiz || document).querySelectorAll("dialog.dialogo").forEach(function (d) {
      d.addEventListener("close", function () {
        var t = d._disparador;
        if (t && typeof t.focus === "function") t.focus();
      });
      d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
      d.querySelectorAll("[data-cerrar]").forEach(function (b) {
        b.addEventListener("click", function () { d.close(); });
      });
    });
    (raiz || document).querySelectorAll("[data-abre-dialogo]").forEach(function (b) {
      b.addEventListener("click", function () { abrirDialogo(b.getAttribute("data-abre-dialogo"), b); });
    });
  }

  /* ---- Pestañas (role=tablist): flechas, Inicio y Fin ---- */
  function iniciarPestanas(raiz) {
    (raiz || document).querySelectorAll("[data-pestanas]").forEach(function (grupo) {
      var tabs = Array.prototype.slice.call(grupo.querySelectorAll('[role="tab"]'));
      function activar(tab, enfocar) {
        tabs.forEach(function (t) {
          var activa = t === tab;
          t.setAttribute("aria-selected", activa ? "true" : "false");
          t.tabIndex = activa ? 0 : -1;
          var panel = document.getElementById(t.getAttribute("aria-controls"));
          if (panel) panel.hidden = !activa;
        });
        if (enfocar) tab.focus();
      }
      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () { activar(tab, false); });
        tab.addEventListener("keydown", function (e) {
          var j = null;
          if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
          else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === "Home") j = 0;
          else if (e.key === "End") j = tabs.length - 1;
          if (j !== null) { e.preventDefault(); activar(tabs[j], true); }
        });
      });
      var inicial = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0];
      if (inicial) activar(inicial, false);
    });
  }

  function iniciar() { iniciarDialogos(); iniciarPestanas(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  window.FaroUI = { aviso: aviso, abrirDialogo: abrirDialogo, cerrarDialogo: cerrarDialogo, iniciarDialogos: iniciarDialogos, iniciarPestanas: iniciarPestanas };
})();
