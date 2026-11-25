/* Avisos de la calle: mapa con los avisos a la izquierda; lista y detalle a la derecha. */
(async function () {
  "use strict";
  var ses = Auth.require("admin", "../");
  if (!ses) return;
  await Store.init();
  var h = Portal.h;
  var $ = function (id) { return document.getElementById(id); };

  Portal.montar({
    rol: "admin", actual: "avisos", ante: "Mesa de revisión", titulo: "Avisos de la calle", linterna: "der",
    frase: "Lo que cuentan los vecinos sobre sus calles. Tú decides qué tramos se evitan."
  });
  var main = document.getElementById("contenido");

  var TABS = [["pendiente", "Por revisar"], ["aprobado", "Aprobados"], ["rechazado", "Descartados"]];
  var ESTILO = { pendiente: "pendiente", aprobado: "aprobado", rechazado: "descartado" };
  var TEXTO = { pendiente: "por revisar", aprobado: "aprobado", rechazado: "descartado" };
  var tab = "pendiente";
  var seleccionado = null;
  var mapa = null;

  function todos() { return Store.listarReportes(); }
  function lista(estado) { return Store.listarReportes({ estado: estado || tab }); }
  function tramo(rep) {
    var a = Store.nodo(rep.a), b = Store.nodo(rep.b);
    return { a: a ? a.nombre : "?", b: b ? b.nombre : "?" };
  }

  var tabs = h("div", { class: "filtros", role: "tablist", "aria-label": "Estado de los avisos" });
  var cajaMapa = h("div", {});
  var cola = h("ul", { class: "cola", role: "list" });
  var detalle = h("div", { class: "detalle-aviso", "aria-live": "polite" });
  main.appendChild(h("div", { class: "avisos-layout" },
    h("div", { class: "avisos-layout__mapa" }, cajaMapa,
      h("p", { class: "nota-mapa" }, Portal.icono("i-info"), "Solo los avisos aprobados hacen que la Ruta Faro evite ese tramo.")),
    h("div", { class: "avisos-layout__lado" }, tabs, h("div", { role: "tabpanel", id: "panel-avisos", "aria-labelledby": "tab-pendiente" }, cola), detalle)));

  /* ---- pestañas ---- */
  function dibujarTabs() {
    Portal.vaciar(tabs);
    TABS.forEach(function (t, i) {
      tabs.appendChild(h("button", {
        class: "filtros__tab", role: "tab", type: "button", id: "tab-" + t[0], "aria-controls": "panel-avisos",
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
    $("panel-avisos").setAttribute("aria-labelledby", "tab-" + tab);
  }
  function cambiarTab(nuevo, enfocar) {
    tab = nuevo;
    var l = lista();
    seleccionado = l.length ? l[0].id : null;
    dibujar();
    if (enfocar) $("tab-" + tab).focus();
  }

  /* ---- mapa ---- */
  function marcadores() {
    return todos().map(function (r) {
      var t = tramo(r);
      return { id: r.id, arista_id: r.arista_id, estilo: ESTILO[r.estado], titulo: r.tipo,
        etiqueta: "Aviso: " + r.tipo + ", " + TEXTO[r.estado] + ", entre " + t.a + " y " + t.b };
    });
  }
  function opcionesMapa() {
    var rep = seleccionado ? todos().filter(function (r) { return r.id === seleccionado; })[0] : null;
    return {
      zona: Store.zona(), marcadores: marcadores(), radioAviso: 10, leyenda: true, leyendaAvisos: true,
      resaltarArista: rep ? rep.arista_id : null, marcadorSeleccionado: seleccionado,
      etiqueta: "Mapa de la zona piloto con " + todos().length + " avisos de la calle.",
      onMarcador: function (m) {
        var r = todos().filter(function (x) { return x.id === m.id; })[0];
        if (!r) return;
        tab = r.estado;
        elegir(r.id, false); // el foco se queda en el aviso del mapa
      }
    };
  }
  function dibujarMapa() {
    if (!mapa) mapa = Mapa.render(cajaMapa, opcionesMapa());
    else mapa.actualizar(opcionesMapa());
  }

  /* ---- lista ---- */
  function dibujarCola() {
    Portal.vaciar(cola);
    var l = lista();
    if (!l.length) {
      cola.appendChild(h("li", {}, h("div", { class: "vacio vacio--compacto" }, Portal.imagen("linterna-der.png", { width: 48, height: 75 }),
        h("p", { text: tab === "pendiente" ? "No hay avisos por revisar. Las calles están tranquilas." : "No hay avisos en esta pestaña." }))));
      return;
    }
    l.forEach(function (r) {
      var sel = r.id === seleccionado, t = tramo(r);
      cola.appendChild(h("li", {}, h("button", {
        class: "cola__item" + (sel ? " cola__item--activo" : ""), type: "button", "data-id": String(r.id), "aria-current": sel ? "true" : false,
        onclick: function () { elegir(r.id, true); }
      },
        h("span", { class: "cola__nombre", text: r.tipo }),
        h("span", { class: "cola__detalle", text: t.a + " ↔ " + t.b }),
        h("span", { class: "cola__detalle", text: Portal.fechaHora(r.creado) }))));
    });
  }

  /* ---- detalle ---- */
  var CHIPS = {
    pendiente: ["chip--revision", "i-revision", "Por revisar"],
    aprobado: ["chip--abierto", "i-check", "Aprobado"],
    rechazado: ["chip--desactivado", "i-cerrar", "Descartado"]
  };
  function dibujarDetalle() {
    Portal.vaciar(detalle);
    var r = seleccionado ? todos().filter(function (x) { return x.id === seleccionado; })[0] : null;
    if (!r) {
      detalle.appendChild(h("div", { class: "vacio vacio--compacto" }, Portal.imagen("linterna-der.png", { width: 48, height: 75 }),
        h("p", { text: "Elige un aviso en la lista o en el mapa para ver su detalle." })));
      return;
    }
    var t = tramo(r), c = CHIPS[r.estado];
    var tr = Store.arista(r.arista_id);
    detalle.appendChild(h("article", { class: "detalle", "aria-labelledby": "aviso-titulo" },
      h("div", { class: "detalle__cabeza" },
        h("h2", { id: "aviso-titulo", tabindex: "-1", text: r.tipo }),
        h("div", { class: "estado__chips" }, h("span", { class: "chip " + c[0] }, Portal.icono(c[1]), c[2]))),
      h("p", { class: "detalle__texto", text: r.descripcion }),
      h("dl", { class: "datos" },
        h("div", {}, h("dt", { text: "Quién avisó" }), h("dd", { text: r.autor })),
        h("div", {}, h("dt", { text: "Cuándo" }), h("dd", { text: Portal.fechaHora(r.creado) })),
        h("div", {}, h("dt", { text: "Tramo" }), h("dd", { text: "Entre " + t.a + " y " + t.b })),
        h("div", {}, h("dt", { text: "Iluminación del tramo" }), h("dd", { text: tr ? ["", "Poca luz", "Luz regular", "Bien iluminado"][tr.luz] : "—" }))),
      r.estado !== "pendiente"
        ? h("p", { class: "texto-suave" }, (r.estado === "aprobado" ? "Aprobado por " : "Descartado por "), h("strong", { text: Portal.nombreDe(r.revisado_por) }), r.revisado_en ? " el " + Portal.fechaHora(r.revisado_en) + "." : ".")
        : h("div", { class: "detalle__acciones" },
            h("button", { class: "boton boton--primario", type: "button", id: "aprobar", onclick: function () { decidir(r, true); } }, Portal.icono("i-check"), "Aprobar aviso"),
            h("button", { class: "boton boton--secundario", type: "button", id: "descartar", onclick: function () { decidir(r, false); } }, "Descartar"))));
  }

  function dibujar() { dibujarTabs(); dibujarCola(); dibujarDetalle(); dibujarMapa(); }

  function elegir(id, usuario) {
    seleccionado = id;
    dibujar();
    if (usuario) { var t = $("aviso-titulo"); if (t) t.focus({ preventScroll: true }); }
  }

  /* ---- decisiones ---- */
  function decidir(r, aprobar) {
    var l = lista(), i = l.map(function (x) { return x.id; }).indexOf(r.id);
    var res = aprobar ? Store.aprobarReporte(r.id, ses.correo) : Store.descartarReporte(r.id, ses.correo);
    if (!res.ok) {
      FaroUI.aviso(res.error === "Este elemento ya fue revisado." ? "Ese aviso ya fue revisado. Actualizamos la lista." : res.error, { base: "../", tipo: "error" });
    } else {
      FaroUI.aviso(aprobar ? "Aviso aprobado" : "Aviso descartado", { base: "../" });
    }
    var restantes = lista();
    seleccionado = restantes.length ? restantes[Math.min(i, restantes.length - 1)].id : null;
    dibujar();
    var t = $("aviso-titulo");
    if (t) t.focus({ preventScroll: true }); else $("tab-" + tab).focus();
  }

  /* ---- arranque: ?id= abre directo ese aviso ---- */
  var param = new URLSearchParams(window.location.search).get("id");
  var directo = param ? todos().filter(function (x) { return String(x.id) === param; })[0] : null;
  if (directo) { tab = directo.estado; seleccionado = directo.id; }
  else { var l0 = lista(); seleccionado = l0.length ? l0[0].id : null; }
  dibujar();
})();
