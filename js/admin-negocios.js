/* Solicitudes de Faro: cola a la izquierda, detalle a la derecha, una decisión a la vez. */
(async function () {
  "use strict";
  var ses = Auth.require("admin", "../");
  if (!ses) return;
  await Store.init();
  var h = Portal.h;
  var $ = function (id) { return document.getElementById(id); };

  Portal.montar({
    rol: "admin", actual: "solicitudes", ante: "Mesa de revisión", titulo: "Solicitudes de Faro", linterna: "izq",
    frase: "Revisa con calma: enciende el Faro o devuélvelo diciendo qué falta."
  });
  var main = document.getElementById("contenido");
  var movil = window.matchMedia("(max-width: 899px)");

  var TABS = [["pendiente", "Por revisar"], ["aprobado", "Encendidos"], ["rechazado", "Devueltos"]];
  var tab = "pendiente";
  var seleccionado = null;

  var tabs = h("div", { class: "filtros", role: "tablist", "aria-label": "Estado de las solicitudes" });
  var cola = h("ul", { class: "cola", role: "list" });
  var detalle = h("div", { class: "mesa__detalle", id: "detalle", "aria-live": "polite" });
  var mesa = h("div", { class: "mesa" },
    h("div", { class: "mesa__cola", role: "tabpanel", id: "panel-cola", "aria-labelledby": "tab-pendiente" }, cola), detalle);
  main.appendChild(tabs);
  main.appendChild(mesa);

  function lista(estado) { return Store.listarNegocios({ estado: estado || tab }); }
  function horario(n) { return n.abre === n.cierra ? "24 horas" : "Abre " + n.abre + " · cierra " + n.cierra; }

  /* ---- pestañas ---- */
  function dibujarTabs() {
    Portal.vaciar(tabs);
    TABS.forEach(function (t, i) {
      tabs.appendChild(h("button", {
        class: "filtros__tab", role: "tab", type: "button", id: "tab-" + t[0], "aria-controls": "panel-cola",
        "aria-selected": t[0] === tab ? "true" : "false", tabindex: t[0] === tab ? "0" : "-1",
        onclick: function () { cambiarTab(t[0], true); },
        onkeydown: function (e) {
          var j = null;
          if (e.key === "ArrowRight") j = (i + 1) % TABS.length; else if (e.key === "ArrowLeft") j = (i - 1 + TABS.length) % TABS.length;
          else if (e.key === "Home") j = 0; else if (e.key === "End") j = TABS.length - 1;
          if (j === null) return;
          e.preventDefault(); cambiarTab(TABS[j][0], true);
        }
      }, t[1], h("span", { text: "(" + lista(t[0]).length + ")" })));
    });
    $("panel-cola").setAttribute("aria-labelledby", "tab-" + tab);
  }

  function cambiarTab(nuevo, enfocarTab) {
    tab = nuevo;
    mesa.classList.remove("mesa--detalle");
    var l = lista();
    seleccionado = l.length && !movil.matches ? l[0].id : null;
    dibujar();
    if (enfocarTab) $("tab-" + tab).focus();
  }

  /* ---- cola ---- */
  function dibujarCola() {
    Portal.vaciar(cola);
    var l = lista();
    if (!l.length) {
      cola.appendChild(h("li", {}, h("div", { class: "vacio vacio--compacto" }, Portal.imagen("linterna-izq.png", { width: 48, height: 75 }),
        h("p", { text: tab === "pendiente" ? "No hay solicitudes por revisar. Todo en orden." : (tab === "aprobado" ? "Todavía no hay Faros encendidos." : "No hay solicitudes devueltas.") }))));
      return;
    }
    l.forEach(function (n) {
      var sel = n.id === seleccionado;
      var cuando = tab === "pendiente" ? "Solicitó el " + Portal.fechaHora(n.creado) : (n.revisado_en ? "Revisado el " + Portal.fechaHora(n.revisado_en) : "");
      cola.appendChild(h("li", {}, h("button", {
        class: "cola__item" + (sel ? " cola__item--activo" : ""), type: "button", "data-id": String(n.id), "aria-current": sel ? "true" : false,
        onclick: function () { elegir(n.id, true); }
      },
        h("span", { class: "cola__nombre", text: n.nombre }),
        h("span", { class: "cola__detalle", text: n.giro + " · " + n.titular }),
        h("span", { class: "cola__detalle", text: cuando }))));
    });
  }

  /* ---- detalle ---- */
  function dibujarDetalle() {
    Portal.vaciar(detalle);
    var n = seleccionado ? Store.obtenerNegocio(seleccionado) : null;
    if (!n) {
      detalle.appendChild(h("div", { class: "vacio" }, Portal.imagen("linterna-izq.png", { width: 77, height: 120 }),
        h("p", { text: tab === "pendiente" ? "Cuando haya una solicitud por revisar, aquí verás todo lo que necesitas para decidir." : "Elige un negocio de la lista para ver su detalle." })));
      return;
    }
    var cruce = Store.nodo(n.nodo_id);
    var titular = Store.usuarioPorCorreo(n.titular_correo);
    var cajaMapa = h("div", {});
    var servicios = n.servicios.length
      ? h("ul", { class: "chips-servicios", role: "list" }, n.servicios.map(function (s) { return h("li", { class: "chip-servicio", text: s }); }))
      : h("p", { class: "texto-suave", text: "Sin servicios de apoyo registrados." });

    var historial = null;
    if (n.estado !== "pendiente") {
      historial = h("section", { class: "historial", "aria-labelledby": "t-hist" },
        h("h3", { id: "t-hist", text: "Historial de revisión" }),
        h("p", {}, n.estado === "aprobado" ? "Faro encendido por " : "Devuelto por ", h("strong", { text: Portal.nombreDe(n.revisado_por) }), n.revisado_en ? " el " + Portal.fechaHora(n.revisado_en) + "." : "."),
        n.estado === "rechazado" && n.motivo_rechazo ? h("div", { class: "caja-motivo" }, h("strong", { text: "Motivo que vio el titular:" }), h("p", { text: n.motivo_rechazo })) : null);
    }

    var acciones = n.estado === "pendiente"
      ? h("div", { class: "detalle__acciones" },
          h("button", { class: "boton boton--primario", type: "button", id: "encender", onclick: function (e) { pedirEncender(n, e.currentTarget); } }, Portal.icono("i-encendido"), "Encender Faro"),
          h("button", { class: "boton boton--secundario", type: "button", id: "devolver", onclick: function (e) { pedirDevolver(n, e.currentTarget); } }, "Devolver con motivo"))
      : null;

    detalle.appendChild(h("article", { class: "detalle", "aria-labelledby": "detalle-titulo" },
      h("button", { class: "boton boton--secundario boton--chico detalle__volver", type: "button", id: "volver", onclick: volver }, Portal.icono("i-flecha", "icono--atras"), "Volver a la lista"),
      h("div", { class: "detalle__cabeza" },
        h("h2", { id: "detalle-titulo", tabindex: "-1", text: n.nombre }),
        h("div", { class: "estado__chips" }, Portal.chipNegocio(n.estado))),
      h("dl", { class: "datos" },
        h("div", {}, h("dt", { text: "Giro" }), h("dd", { text: n.giro })),
        h("div", {}, h("dt", { text: "Titular" }), h("dd", { text: (titular ? titular.nombre : n.titular) + " · " + n.titular_correo })),
        h("div", {}, h("dt", { text: "Dirección" }), h("dd", { text: n.direccion })),
        h("div", {}, h("dt", { text: "Horario" }), h("dd", { text: horario(n) })),
        h("div", {}, h("dt", { text: "Solicitud" }), h("dd", { text: Portal.fechaHora(n.creado) }))),
      h("section", { "aria-labelledby": "t-serv" }, h("h3", { id: "t-serv", text: "Servicios para peatones" }), servicios),
      h("section", { "aria-labelledby": "t-ubi" }, h("h3", { id: "t-ubi", text: "Ubicación" }), cajaMapa,
        h("p", { class: "texto-suave", text: "Cruce más cercano: " + (cruce ? cruce.nombre : "—") })),
      historial, acciones));

    Mapa.render(cajaMapa, {
      zona: Store.zona(), faros: Portal.farosMapa(), resaltarNodo: n.nodo_id, radioFaro: 5.5, leyenda: false,
      etiqueta: "Mapa de la zona piloto. " + n.nombre + " está en " + (cruce ? cruce.nombre : "la zona") + "."
    });
  }

  function dibujar() { dibujarTabs(); dibujarCola(); dibujarDetalle(); }

  function elegir(id, usuario) {
    seleccionado = id;
    dibujarCola(); dibujarDetalle();
    if (movil.matches) mesa.classList.add("mesa--detalle");
    if (usuario) { var t = $("detalle-titulo"); if (t) t.focus({ preventScroll: !movil.matches }); }
  }

  function volver() {
    mesa.classList.remove("mesa--detalle");
    var item = cola.querySelector('[data-id="' + seleccionado + '"]');
    if (item) item.focus();
  }

  /* ---- decisiones ---- */
  function siguiente(idAnterior, indice) {
    var l = lista();
    seleccionado = l.length && !movil.matches ? l[Math.min(indice, l.length - 1)].id : null;
    if (movil.matches) mesa.classList.remove("mesa--detalle");
    dibujar();
    var t = $("detalle-titulo");
    if (t) t.focus({ preventScroll: true });
    else { var primero = cola.querySelector(".cola__item"); if (primero) primero.focus({ preventScroll: true }); else $("tab-" + tab).focus(); }
  }

  function resolver(r, textoOk) {
    if (!r.ok) {
      FaroUI.aviso(r.error === "Este elemento ya fue revisado." ? "Esa solicitud ya fue revisada. Actualizamos la lista." : r.error, { base: "../", tipo: "error" });
      var l = lista(); seleccionado = l.length && !movil.matches ? l[0].id : null; dibujar();
      return false;
    }
    FaroUI.aviso(textoOk, { base: "../" });
    return true;
  }

  var porDecidir = null;
  function indiceActual() { return lista().map(function (x) { return x.id; }).indexOf(seleccionado); }

  function pedirEncender(n, disparador) {
    porDecidir = n;
    $("encender-texto").textContent = "¿Encender el Faro de " + n.nombre + "? Aparecerá en el mapa de la app.";
    FaroUI.abrirDialogo("dlg-encender", disparador);
  }
  $("encender-confirmar").addEventListener("click", function () {
    if (!porDecidir) return;
    var i = indiceActual();
    var r = Store.aprobarNegocio(porDecidir.id, ses.correo);
    FaroUI.cerrarDialogo("dlg-encender");
    if (resolver(r, "Faro encendido")) siguiente(porDecidir.id, i);
    porDecidir = null;
  });

  function pedirDevolver(n, disparador) {
    porDecidir = n;
    $("devolver-intro").textContent = "Cuéntale a " + n.nombre + " qué falta para encender su Faro.";
    $("d-motivo").value = ""; FaroCampos.limpiar($("d-motivo")); contar();
    FaroUI.abrirDialogo("dlg-devolver", disparador);
    $("d-motivo").focus();
  }
  function contar() { $("d-contador").textContent = $("d-motivo").value.length + " de 300 caracteres. El titular verá este texto tal cual."; }
  $("d-motivo").addEventListener("input", function () { contar(); if ($("d-motivo").value.trim().length >= 5) FaroCampos.limpiar($("d-motivo")); });
  $("form-devolver").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!porDecidir) return;
    var motivo = $("d-motivo").value;
    if (motivo.trim().length < 5) {
      FaroCampos.error($("d-motivo"), "Escribe el motivo del rechazo (se lo mostraremos al titular).");
      $("d-motivo").focus();
      return;
    }
    var i = indiceActual();
    var r = Store.rechazarNegocio(porDecidir.id, motivo, ses.correo);
    FaroUI.cerrarDialogo("dlg-devolver");
    if (resolver(r, "Solicitud devuelta")) siguiente(porDecidir.id, i);
    porDecidir = null;
  });

  /* ---- arranque: ?id= abre directo esa solicitud ---- */
  var param = new URLSearchParams(window.location.search).get("id");
  var directo = param ? Store.obtenerNegocio(param) : null;
  if (directo) { tab = directo.estado; seleccionado = directo.id; }
  else { var l0 = lista(); seleccionado = l0.length && !movil.matches ? l0[0].id : null; }
  dibujar();
  if (directo && movil.matches) mesa.classList.add("mesa--detalle");
  movil.addEventListener("change", function () {
    if (!movil.matches) { mesa.classList.remove("mesa--detalle"); if (!seleccionado) { var l = lista(); seleccionado = l.length ? l[0].id : null; dibujar(); } }
  });
})();
