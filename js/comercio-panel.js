/* Mi Faro: estado de la luz, contadores, cupones activos y tu puerta en el mapa. Todo sale de Store. */
(async function () {
  "use strict";
  var ses = Auth.require("comercio", "../");
  if (!ses) return;
  await Store.init();
  var h = Portal.h;

  var neg = Store.negocioDeTitular(ses.correo);
  var aprobado = !!neg && neg.estado === "aprobado";
  var nombrePila = ses.nombre.split(" ")[0];
  Portal.montar({
    rol: "comercio", actual: "panel", ante: "Portal de comercios", titulo: "Mi Faro", linterna: "central", apagada: !aprobado,
    frase: neg ? "Así se ve tu luz esta noche, " + nombrePila + "." : "Aquí vas a ver cómo está tu Faro."
  });
  var main = document.getElementById("contenido");

  /* ---- sin negocio: estado vacío ---- */
  if (!neg) {
    main.appendChild(h("div", { class: "vacio" },
      Portal.imagen("linterna-central.png", { width: 77, height: 120 }),
      h("p", { text: "Todavía no registras tu negocio. Cuéntanos de él y enciende tu Faro." }),
      h("a", { class: "boton boton--primario", href: "../registro.html?paso=2", text: "Registrar mi negocio" })));
    return;
  }

  var datos = Store.panelNegocio(neg.id);
  var horario = neg.abre === neg.cierra ? "las 24 horas" : neg.abre + "–" + neg.cierra;

  /* ---- tarjeta de estado ---- */
  var texto;
  if (neg.estado === "aprobado") {
    texto = [h("h2", { text: "Tu Faro está encendido." }), h("p", { text: "Apareces en el mapa durante tu horario: " + horario + "." })];
  } else if (neg.estado === "pendiente") {
    texto = [h("h2", { text: "Estamos revisando tu solicitud." }), h("p", { text: "Tu Faro se encenderá cuando un administrador la apruebe." })];
  } else {
    texto = [h("h2", { text: "Tu solicitud necesita cambios." }),
      h("div", { class: "caja-motivo" },
        h("strong", { text: "Esto nos dijo la persona que la revisó:" }),
        h("p", { text: neg.motivo_rechazo || "Revisa los datos de tu negocio y vuelve a enviarlos." }),
        h("a", { class: "boton boton--primario boton--chico", href: "negocio.html", text: "Corregir y reenviar" }))];
  }
  var ahora = Store.estaAbierto(neg.abre, neg.cierra);
  main.appendChild(h("section", { "aria-label": "Estado de tu Faro" },
    h("div", { class: "tarjeta tarjeta--marfil estado" + (aprobado ? "" : " estado--apagado") },
      h("div", { class: "estado__faro", "aria-hidden": "true" }, Portal.imagen("linterna-central.png", { width: 122, height: 190 })),
      h("div", { class: "estado__texto" },
        h("div", { class: "estado__chips" },
          Portal.chipNegocio(neg.estado),
          h("span", { class: "chip " + (ahora ? "chip--abierto" : "chip--cerrado") }, Portal.icono(ahora ? "i-abierto" : "i-cerrado"), "Ahora mismo: " + (ahora ? "Abierto" : "Cerrado"))),
        texto,
        h("p", { class: "texto-suave", text: neg.nombre + " · " + neg.giro + " · " + neg.direccion })))));

  /* ---- contadores ---- */
  var cont = function (n, etiqueta) { return h("div", { class: "contador" }, h("span", { class: "contador__numero", text: String(n) }), h("span", { class: "contador__etiqueta", text: etiqueta })); };
  main.appendChild(h("section", { "aria-labelledby": "t-numeros" },
    h("h2", { id: "t-numeros", class: "solo-lectores", text: "Tus números" }),
    h("div", { class: "contadores" },
      cont(datos.vistas, "Personas que vieron tu ficha"), cont(datos.rutas, "Rutas que pasaron por tu puerta"),
      cont(datos.canjes, "Cupones canjeados"), cont(datos.cupones_activos, "Cupones activos"))));

  main.appendChild(h("hr", { class: "separador" }));

  /* ---- cupones activos ---- */
  var activos = Store.listarCupones(neg.id).filter(function (c) { return Store.estadoCupon(c) === "activo"; });
  var bloque = h("section", { "aria-labelledby": "t-cupones" },
    h("div", { class: "seccion-cabeza" },
      h("h2", { id: "t-cupones", text: "Tus cupones activos" }),
      h("a", { class: "enlace-flecha", href: "cupones.html" }, "Ver todos", Portal.icono("i-flecha"))));
  if (activos.length) {
    bloque.appendChild(h("ul", { class: "rejilla-boletos", role: "list" }, activos.slice(0, 3).map(function (c) { return h("li", {}, Portal.boleto(c)); })));
  } else {
    bloque.appendChild(h("div", { class: "vacio" },
      Portal.imagen("linterna-central.png", { width: 77, height: 120 }),
      h("p", { text: aprobado ? "Aún no tienes cupones activos. Publica uno y atrae a quien camina frente a tu puerta." : "Cuando tu Faro esté encendido podrás publicar cupones." }),
      aprobado ? h("a", { class: "boton boton--primario boton--chico", href: "cupones.html", text: "Publicar cupón" }) : null));
  }
  main.appendChild(bloque);

  main.appendChild(h("hr", { class: "separador" }));

  /* ---- tu puerta en el mapa ---- */
  var cruce = Store.nodo(neg.nodo_id);
  var faros = Store.listarNegocios({ estado: "aprobado" }).map(function (n) { return { nodo_id: n.nodo_id, nombre: n.nombre, abre: n.abre, cierra: n.cierra }; });
  if (!faros.some(function (f) { return f.nodo_id === neg.nodo_id; })) faros.push({ nodo_id: neg.nodo_id, nombre: neg.nombre, abre: neg.abre, cierra: neg.cierra });
  var cajaMapa = h("div", {});
  main.appendChild(h("section", { "aria-labelledby": "t-mapa" },
    h("h2", { id: "t-mapa", text: "Tu puerta en el mapa", style: "margin-bottom: 16px" }),
    h("div", { class: "tarjeta tarjeta--marfil mapa-tarjeta" },
      cajaMapa,
      h("div", { class: "mapa-tarjeta__texto" },
        h("p", {}, h("strong", { text: neg.nombre })),
        h("p", { text: neg.direccion }),
        h("p", {}, "Cruce más cercano: ", h("strong", { text: cruce ? cruce.nombre : "—" })),
        h("p", { class: "texto-suave", text: "El círculo con aro blanco es tu Faro. Los demás son sus vecinos de la zona piloto." })))));
  Mapa.render(cajaMapa, {
    zona: Store.zona(), faros: faros, resaltarNodo: neg.nodo_id, leyenda: true,
    etiqueta: "Mapa de la zona piloto. Tu Faro está en " + (cruce ? cruce.nombre : "la zona") + "."
  });
})();
