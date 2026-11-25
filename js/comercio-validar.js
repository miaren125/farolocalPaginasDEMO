/* Cobrar un cupón: valida el código que muestra el cliente. Incluye una caja de demostración para generar códigos de prueba. */
(async function () {
  "use strict";
  var ses = Auth.require("comercio", "../");
  if (!ses) return;
  await Store.init();
  var h = Portal.h;

  var neg = Store.negocioDeTitular(ses.correo);
  Portal.montar({
    rol: "comercio", actual: "validar", ante: "Portal de comercios", titulo: "Cobrar un cupón", linterna: "central",
    apagada: !neg || neg.estado !== "aprobado",
    frase: "Pídele a tu vecino el código de su cupón y escríbelo aquí."
  });
  var main = document.getElementById("contenido");

  if (!neg) {
    main.appendChild(h("div", { class: "vacio" },
      Portal.imagen("linterna-central.png", { width: 77, height: 120 }),
      h("p", { text: "Todavía no registras tu negocio. Cuando tu Faro esté encendido podrás cobrar cupones." }),
      h("a", { class: "boton boton--primario", href: "../registro.html?paso=2", text: "Registrar mi negocio" })));
    return;
  }

  /* "FARO-" se agrega solo cuando escriben únicamente los 6 caracteres */
  function normalizar(v) {
    v = String(v).trim().toUpperCase().replace(/\s+/g, "");
    if (/^[A-Z0-9]{6}$/.test(v)) return "FARO-" + v;
    if (/^FARO[A-Z0-9]{6}$/.test(v)) return "FARO-" + v.slice(4);
    return v;
  }

  /* ---- formulario de cobro ---- */
  var campo = h("div", { class: "campo" },
    h("label", { class: "campo__etiqueta", for: "codigo", text: "Código del cupón" }),
    h("input", { class: "campo__control codigo-campo", id: "codigo", type: "text", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", placeholder: "FARO-XXXXXX", "aria-describedby": "codigo-ayuda" }),
    h("span", { class: "campo__ayuda", id: "codigo-ayuda", text: "Si solo escribes los 6 caracteres, agregamos «FARO-» por ti." }));
  var resultado = h("div", { id: "resultado", role: "status", "aria-live": "polite" });
  var form = h("form", { id: "form-cobro", novalidate: true, class: "cobro__fila" }, campo, h("button", { class: "boton boton--cobalto", type: "submit", id: "validar", text: "Validar" }));
  var cobrados = h("ul", { class: "lista-cobrados", role: "list", id: "lista-cobrados" });

  main.appendChild(h("section", { class: "cobro", "aria-labelledby": "t-cobro" }, h("h2", { id: "t-cobro", text: "Escribe el código" }), form, resultado));
  main.appendChild(h("hr", { class: "separador" }));
  main.appendChild(h("section", { class: "cobro", "aria-labelledby": "t-cobrados" }, h("h2", { id: "t-cobrados", text: "Últimos cupones cobrados" }), cobrados));

  var input = campo.querySelector("input");
  input.addEventListener("input", function () {
    var pos = input.selectionStart;
    input.value = input.value.toUpperCase();
    try { input.setSelectionRange(pos, pos); } catch (e) { /* tipo sin selección */ }
    FaroCampos.limpiar(input);
  });
  input.addEventListener("blur", function () { if (input.value.trim()) input.value = normalizar(input.value); });

  function pintarResultado(r) {
    Portal.vaciar(resultado);
    var ok = r.valido;
    resultado.appendChild(h("div", { class: "resultado " + (ok ? "resultado--ok" : "resultado--mal") },
      Portal.icono(ok ? "i-check" : "i-cerrar"),
      h("p", { text: ok ? "Cupón válido: " + r.titulo + ". Entrégalo al cliente." : r.motivo })));
  }

  function pintarCobrados() {
    Portal.vaciar(cobrados);
    var lista = Store.ultimosCanjes(neg.id, 5);
    if (!lista.length) {
      cobrados.appendChild(h("li", {}, h("span", { class: "texto-suave", text: "Todavía no has cobrado ningún cupón." })));
      return;
    }
    lista.forEach(function (c) {
      var fecha = c.canjeado_en.replace("T", " ").slice(0, 16);
      cobrados.appendChild(h("li", {}, h("code", { text: c.codigo }), h("span", { text: c.titulo }), h("time", { datetime: c.canjeado_en, text: Portal.fechaCorta(c.canjeado_en.slice(0, 10)) + " · " + fecha.slice(11) })));
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var codigo = normalizar(input.value);
    input.value = codigo;
    if (!codigo) {
      Portal.vaciar(resultado);
      FaroCampos.error(input, "Escribe el código del cupón.");
      input.focus();
      return;
    }
    FaroCampos.limpiar(input);
    var r = Store.validarCodigo(codigo, neg.id);
    pintarResultado(r);
    if (r.valido) { input.value = ""; pintarCobrados(); }
    input.focus();
  });

  pintarCobrados();

  /* ---- solo demostración: generar un código de prueba ---- */
  var mis = Store.listarCupones(neg.id);
  var demo = h("section", { class: "demo-caja", "aria-labelledby": "t-demo" }, h("span", { class: "demo-caja__titulo", id: "t-demo", text: "Solo demostración" }));
  if (!mis.length) {
    demo.appendChild(h("p", { class: "texto-suave", style: "margin: 0", text: "Para probar el cobro, primero publica un cupón." }));
  } else {
    var etiquetas = { activo: "activo", vencido: "vencido", desactivado: "desactivado" };
    var selector = h("select", { class: "campo__control", id: "demo-cupon" }, mis.map(function (c) { return h("option", { value: String(c.id), text: c.titulo + " (" + etiquetas[Store.estadoCupon(c)] + ")" }); }));
    var codigoGen = h("code", { id: "codigo-generado" });
    var cajaCodigo = h("div", { class: "demo-caja__codigo", hidden: true }, h("span", { class: "texto-suave", text: "Código de prueba:" }), codigoGen,
      h("button", { class: "boton boton--secundario boton--chico", type: "button", id: "copiar", text: "Copiar", onclick: async function () {
        var ok = await Portal.copiar(codigoGen.textContent);
        FaroUI.aviso(ok ? "Copiamos el código." : "No pudimos copiarlo. Selecciónalo y cópialo a mano.", { base: "../", tipo: ok ? undefined : "error" });
      } }));
    demo.appendChild(h("p", { class: "texto-suave", style: "margin: 0", text: "En la vida real el código lo trae tu vecino desde la app. Aquí puedes crear uno para probar." }));
    demo.appendChild(h("div", { class: "campo" }, h("label", { class: "campo__etiqueta", for: "demo-cupon", text: "Cupón" }), selector));
    demo.appendChild(h("button", { class: "boton boton--secundario boton--chico", type: "button", id: "generar", style: "align-self: flex-start", text: "Generar un código de prueba", onclick: function () {
      var cod = Store.generarCodigoPrueba(Number(selector.value));
      if (!cod) return;
      codigoGen.textContent = cod;
      cajaCodigo.hidden = false;
    } }));
    demo.appendChild(cajaCodigo);
  }
  main.appendChild(demo);
})();
