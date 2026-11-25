/* Mis cupones: publicar, editar, desactivar/activar y eliminar, con filtros por pestañas. */
(async function () {
  "use strict";
  var ses = Auth.require("comercio", "../");
  if (!ses) return;
  await Store.init();
  var h = Portal.h;
  var $ = function (id) { return document.getElementById(id); };

  var neg = Store.negocioDeTitular(ses.correo);
  var aprobado = !!neg && neg.estado === "aprobado";
  Portal.montar({
    rol: "comercio", actual: "cupones", ante: "Portal de comercios", titulo: "Mis cupones", linterna: "der", apagada: !aprobado,
    frase: "Un buen cupón es una razón más para que te elijan en su ruta."
  });
  var main = document.getElementById("contenido");

  if (!neg) {
    main.appendChild(h("div", { class: "vacio" },
      Portal.imagen("linterna-der.png", { width: 77, height: 120 }),
      h("p", { text: "Todavía no registras tu negocio. Cuéntanos de él y enciende tu Faro." }),
      h("a", { class: "boton boton--primario", href: "../registro.html?paso=2", text: "Registrar mi negocio" })));
    return;
  }

  /* ---- encabezado con el botón de publicar ---- */
  var btnPublicar = h("button", {
    class: "boton boton--primario", type: "button", id: "publicar", disabled: !aprobado, "aria-describedby": aprobado ? false : "publicar-ayuda",
    onclick: function (e) { abrirForm(null, e.currentTarget); }
  }, Portal.icono("i-mas"), "Publicar cupón");
  main.appendChild(h("div", { class: "seccion-cabeza" },
    h("h2", { text: "Tus cupones" }),
    h("div", {}, btnPublicar, aprobado ? null : h("p", { id: "publicar-ayuda", class: "texto-suave", style: "margin: 8px 0 0", text: "Solo un Faro encendido puede publicar cupones." }))));

  /* ---- pestañas de filtro ---- */
  var FILTROS = [["todos", "Todos"], ["activo", "Activos"], ["vencido", "Vencidos"], ["desactivado", "Desactivados"]];
  var filtro = "todos";
  var lista = h("div", { role: "tabpanel", id: "panel-cupones", "aria-labelledby": "tab-todos", tabindex: "0" });
  var tabs = h("div", { class: "filtros", role: "tablist", "aria-label": "Filtrar cupones" });
  main.appendChild(tabs);
  main.appendChild(lista);

  function cupones() { return Store.listarCupones(neg.id); }
  function cuenta(f, todos) { return f === "todos" ? todos.length : todos.filter(function (c) { return Store.estadoCupon(c) === f; }).length; }

  function dibujarTabs(todos) {
    Portal.vaciar(tabs);
    FILTROS.forEach(function (f) {
      tabs.appendChild(h("button", {
        class: "filtros__tab", role: "tab", type: "button", id: "tab-" + f[0], "aria-controls": "panel-cupones",
        "aria-selected": f[0] === filtro ? "true" : "false", tabindex: f[0] === filtro ? "0" : "-1",
        onclick: function () { filtro = f[0]; dibujar(); $("tab-" + filtro).focus(); },
        onkeydown: function (e) {
          var i = FILTROS.map(function (x) { return x[0]; }).indexOf(f[0]), j = null;
          if (e.key === "ArrowRight") j = (i + 1) % FILTROS.length;
          else if (e.key === "ArrowLeft") j = (i - 1 + FILTROS.length) % FILTROS.length;
          else if (e.key === "Home") j = 0; else if (e.key === "End") j = FILTROS.length - 1;
          if (j === null) return;
          e.preventDefault(); filtro = FILTROS[j][0]; dibujar(); $("tab-" + filtro).focus();
        }
      }, f[1], h("span", { text: "(" + cuenta(f[0], todos) + ")" })));
    });
    lista.setAttribute("aria-labelledby", "tab-" + filtro);
  }

  function accion(texto, clase, etiqueta, fn) {
    return h("button", { class: "boton boton--chico " + clase, type: "button", "aria-label": etiqueta, text: texto, onclick: function (e) { fn(e.currentTarget); } });
  }

  function dibujar() {
    var todos = cupones();
    dibujarTabs(todos);
    Portal.vaciar(lista);
    var visibles = todos.filter(function (c) { return filtro === "todos" || Store.estadoCupon(c) === filtro; });
    if (!visibles.length) {
      var vacio = !todos.length
        ? [h("p", { text: aprobado ? "Publica tu primer cupón. Es la forma más simple de que te elijan en su ruta." : "Cuando tu Faro esté encendido podrás publicar tu primer cupón." }),
           aprobado ? h("button", { class: "boton boton--primario boton--chico", type: "button", onclick: function (e) { abrirForm(null, e.currentTarget); } }, "Publica tu primer cupón") : null]
        : [h("p", { text: "No hay cupones en esta pestaña." })];
      lista.appendChild(h("div", { class: "vacio" }, Portal.imagen("linterna-der.png", { width: 77, height: 120 }), vacio));
      return;
    }
    lista.appendChild(h("ul", { class: "rejilla-boletos", role: "list" }, visibles.map(function (c) {
      var activo = !!c.activo;
      return h("li", { class: "cupon" }, Portal.boleto(c),
        h("div", { class: "cupon__acciones" },
          accion("Editar", "boton--secundario", "Editar el cupón " + c.titulo, function (b) { abrirForm(c, b); }),
          accion(activo ? "Desactivar" : "Activar", "boton--secundario", (activo ? "Desactivar" : "Activar") + " el cupón " + c.titulo, function () {
            var r = Store.alternarCupon(c.id, neg.id);
            if (r.ok) { FaroUI.aviso(r.activo ? "Activaste «" + c.titulo + "»." : "Desactivaste «" + c.titulo + "». Ya no se puede cobrar.", { base: "../" }); dibujar(); lista.focus({ preventScroll: true }); }
          }),
          accion("Eliminar", "boton--peligro", "Eliminar el cupón " + c.titulo, function (b) { pedirBorrar(c, b); })));
    })));
  }

  /* ---- publicar / editar ---- */
  var editando = null;
  var IDS = { titulo: "c-titulo", descripcion: "c-descripcion", inicio: "c-inicio", fin: "c-fin" };

  function abrirForm(c, disparador) {
    editando = c;
    $("dlg-cupon-t").textContent = c ? "Editar cupón" : "Publicar cupón";
    $("cupon-guardar").textContent = c ? "Guardar cambios" : "Publicar cupón";
    $("cupon-error").hidden = true;
    Object.keys(IDS).forEach(function (k) { FaroCampos.limpiar($(IDS[k])); });
    $("c-titulo").value = c ? c.titulo : "";
    $("c-descripcion").value = c ? c.descripcion : "";
    $("c-inicio").value = c ? c.inicio : Store.hoyISO();
    $("c-fin").value = c ? c.fin : Store.sumarDias(30);
    FaroUI.abrirDialogo("dlg-cupon", disparador);
    $("c-titulo").focus();
  }

  $("form-cupon").addEventListener("submit", function (e) {
    e.preventDefault();
    $("cupon-error").hidden = true;
    var datos = { titulo: $("c-titulo").value, descripcion: $("c-descripcion").value, inicio: $("c-inicio").value, fin: $("c-fin").value };
    var r = editando ? Store.editarCupon(editando.id, datos, neg.id) : Store.crearCupon(neg.id, datos);
    if (!r.ok) {
      var primero = null;
      Object.keys(IDS).forEach(function (k) {
        var el = $(IDS[k]);
        if (r.errores && r.errores[k]) { FaroCampos.error(el, r.errores[k]); if (!primero) primero = el; } else FaroCampos.limpiar(el);
      });
      if (primero) primero.focus();
      else { $("cupon-error-texto").textContent = r.error; $("cupon-error").hidden = false; }
      return;
    }
    FaroUI.cerrarDialogo("dlg-cupon");
    FaroUI.aviso(editando ? "Guardamos los cambios de «" + r.cupon.titulo + "»." : "Publicamos «" + r.cupon.titulo + "». Ya lo pueden ver tus vecinos.", { base: "../" });
    dibujar();
  });

  /* ---- eliminar con confirmación ---- */
  var porBorrar = null;
  function pedirBorrar(c, disparador) {
    porBorrar = c;
    $("borrar-texto").textContent = "Vas a eliminar el cupón «" + c.titulo + "». Esto no se puede deshacer.";
    FaroUI.abrirDialogo("dlg-borrar", disparador);
  }
  $("borrar-confirmar").addEventListener("click", function () {
    if (!porBorrar) return;
    var r = Store.borrarCupon(porBorrar.id, neg.id);
    FaroUI.cerrarDialogo("dlg-borrar");
    if (r.ok) FaroUI.aviso("Eliminamos «" + porBorrar.titulo + "».", { base: "../" });
    porBorrar = null;
    dibujar();
    lista.focus({ preventScroll: true });
  });

  dibujar();
})();
