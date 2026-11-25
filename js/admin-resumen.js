/* Resumen de la mesa de revisión: números, lo que espera revisión y el mapa de todos los Faros. */
(async function () {
  "use strict";
  var ses = Auth.require("admin", "../");
  if (!ses) return;
  await Store.init();
  var h = Portal.h;

  var hora = new Date().getHours();
  var saludo = hora >= 5 && hora < 12 ? "Buenos días" : (hora < 20 ? "Buenas tardes" : "Buenas noches");
  Portal.montar({
    rol: "admin", actual: "resumen", ante: "Mesa de revisión", titulo: saludo + ", " + ses.nombre, linterna: "central",
    frase: "Una cosa a la vez: esto es lo que espera tu revisión."
  });
  var main = document.getElementById("contenido");
  var r = Store.resumenAdmin();

  /* ---- números ---- */
  var cont = function (n, etiqueta) { return h("div", { class: "contador" }, h("span", { class: "contador__numero", text: String(n) }), h("span", { class: "contador__etiqueta", text: etiqueta })); };
  main.appendChild(h("section", { "aria-labelledby": "t-numeros" },
    h("h2", { id: "t-numeros", class: "solo-lectores", text: "Los números de hoy" }),
    h("div", { class: "contadores" },
      cont(r.negocios_pendientes, "Solicitudes por revisar"), cont(r.negocios_aprobados, "Faros encendidos"),
      cont(r.reportes_pendientes, "Avisos de la calle por revisar"), cont(r.usuarios, "Peatones registrados"))));

  main.appendChild(h("hr", { class: "separador" }));

  /* ---- lo que espera tu revisión ---- */
  function vacio(texto) {
    return h("div", { class: "vacio vacio--compacto" }, Portal.imagen("linterna-central.png", { width: 48, height: 75 }), h("p", { text: texto }));
  }
  function nombreTramo(rep) {
    var a = Store.nodo(rep.a), b = Store.nodo(rep.b);
    return (a ? a.nombre : "?") + " ↔ " + (b ? b.nombre : "?");
  }

  var solicitudes = Store.listarNegocios({ estado: "pendiente" });
  var avisos = Store.listarReportes({ estado: "pendiente" });

  var bloqueSol = h("div", { class: "espera__bloque" },
    h("h3", { text: "Solicitudes de Faro" }),
    solicitudes.length
      ? h("ul", { class: "espera__lista", role: "list" }, solicitudes.slice(0, 3).map(function (n) {
          return h("li", {}, h("a", { class: "espera__item", href: "negocios.html?id=" + n.id },
            h("span", { class: "espera__titulo", text: n.nombre }),
            h("span", { class: "espera__detalle", text: n.giro + " · " + n.titular }),
            h("span", { class: "espera__detalle", text: "Solicitó el " + Portal.fechaHora(n.creado) }),
            h("span", { class: "espera__ir" }, "Revisar", Portal.icono("i-flecha"))));
        }))
      : vacio("No hay solicitudes por revisar. Todo en orden."));
  var bloqueAv = h("div", { class: "espera__bloque" },
    h("h3", { text: "Avisos de la calle" }),
    avisos.length
      ? h("ul", { class: "espera__lista", role: "list" }, avisos.slice(0, 3).map(function (a) {
          return h("li", {}, h("a", { class: "espera__item", href: "reportes.html?id=" + a.id },
            h("span", { class: "espera__titulo", text: a.tipo }),
            h("span", { class: "espera__detalle", text: a.descripcion }),
            h("span", { class: "espera__detalle", text: nombreTramo(a) }),
            h("span", { class: "espera__ir" }, "Revisar", Portal.icono("i-flecha"))));
        }))
      : vacio("No hay avisos por revisar. Las calles están tranquilas."));
  main.appendChild(h("section", { "aria-labelledby": "t-espera" },
    h("h2", { id: "t-espera", text: "Lo que espera tu revisión", style: "margin-bottom: 24px" }),
    h("div", { class: "espera" }, bloqueSol, bloqueAv)));

  main.appendChild(h("hr", { class: "separador" }));

  /* ---- mapa de todos los Faros ---- */
  var negocios = Store.listarNegocios();
  var cuenta = function (e) { return negocios.filter(function (n) { return n.estado === e; }).length; };
  var cajaMapa = h("div", {});
  main.appendChild(h("section", { "aria-labelledby": "t-mapa" },
    h("h2", { id: "t-mapa", text: "Los Faros de la zona piloto", style: "margin-bottom: 16px" }),
    h("div", { class: "tarjeta tarjeta--marfil mapa-tarjeta" },
      cajaMapa,
      h("div", { class: "mapa-tarjeta__texto" },
        h("p", {}, Portal.chipNegocio("aprobado"), " ", h("strong", { text: String(cuenta("aprobado")) })),
        h("p", {}, Portal.chipNegocio("pendiente"), " ", h("strong", { text: String(cuenta("pendiente")) })),
        h("p", {}, Portal.chipNegocio("rechazado"), " ", h("strong", { text: String(cuenta("rechazado")) })),
        h("p", { class: "texto-suave", text: "Cada círculo es un negocio. Solo los Faros encendidos aparecen en el mapa de la app." })))));
  Mapa.render(cajaMapa, {
    zona: Store.zona(), faros: Portal.farosMapa(), radioFaro: 6, leyenda: true,
    etiqueta: "Mapa de la zona piloto con " + negocios.length + " negocios: " + cuenta("aprobado") + " Faros encendidos, " + cuenta("pendiente") + " en revisión y " + cuenta("rechazado") + " devueltos."
  });
})();
