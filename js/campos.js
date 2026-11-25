/* Ayudas de formulario accesibles: mensajes de error por campo con icono y texto. JS puro. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var SPRITE = "assets/icons/iconos.svg";

  function icono(id) {
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "icono");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS(NS, "use");
    use.setAttribute("href", SPRITE + "#" + id);
    svg.appendChild(use);
    return svg;
  }

  function contenedor(el) { return el.closest(".campo") || el.parentNode; }

  function mensaje(el, tipo) {
    var cont = contenedor(el);
    var id = (el.id || el.name || "campo") + "-" + tipo;
    var m = document.getElementById(id);
    if (!m) {
      m = document.createElement("span");
      m.id = id;
      m.className = "campo__mensaje campo__mensaje--" + tipo;
      m.appendChild(icono(tipo === "error" ? "i-error" : "i-check"));
      var t = document.createElement("span");
      t.className = "campo__texto";
      m.appendChild(t);
      cont.appendChild(m);
    }
    return m;
  }

  function enlazar(el, id, si) {
    var actual = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean).filter(function (x) { return x !== id; });
    if (si) actual.push(id);
    if (actual.length) el.setAttribute("aria-describedby", actual.join(" ")); else el.removeAttribute("aria-describedby");
  }

  /* Marca un campo (input, select, textarea o fieldset) con error */
  function error(el, texto) {
    var cont = contenedor(el);
    cont.classList.remove("campo--valido");
    cont.classList.add("campo--error");
    var m = mensaje(el, "error");
    m.querySelector(".campo__texto").textContent = texto;
    if (el.tagName !== "FIELDSET") el.setAttribute("aria-invalid", "true");
    enlazar(el, m.id, true);
  }

  function limpiar(el) {
    var cont = contenedor(el);
    cont.classList.remove("campo--error", "campo--valido");
    el.removeAttribute("aria-invalid");
    var m = document.getElementById((el.id || el.name || "campo") + "-error");
    if (m) enlazar(el, m.id, false);
  }

  function valido(el, texto) {
    limpiar(el);
    if (!texto) return;
    var cont = contenedor(el);
    cont.classList.add("campo--valido");
    var m = mensaje(el, "valido");
    m.querySelector(".campo__texto").textContent = texto;
    enlazar(el, m.id, true);
  }

  window.FaroCampos = { error: error, limpiar: limpiar, valido: valido };
})();
