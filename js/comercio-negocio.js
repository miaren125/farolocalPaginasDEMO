/* Los datos de mi negocio: el mismo formulario del registro (FormNegocio), precargado. */
(async function () {
  "use strict";
  var ses = Auth.require("comercio", "../");
  if (!ses) return;
  await Store.init();
  var h = Portal.h;

  var neg = Store.negocioDeTitular(ses.correo);
  Portal.montar({
    rol: "comercio", actual: "panel", ante: "Portal de comercios", titulo: "Los datos de mi negocio", linterna: "izq",
    apagada: !neg || neg.estado !== "aprobado",
    frase: "Si algo cambió en tu puerta, aquí lo contamos para que tus vecinos lo sepan."
  });
  var main = document.getElementById("contenido");

  if (!neg) {
    main.appendChild(h("div", { class: "vacio" },
      Portal.imagen("linterna-izq.png", { width: 77, height: 120 }),
      h("p", { text: "Todavía no registras tu negocio. Cuéntanos de él y enciende tu Faro." }),
      h("a", { class: "boton boton--primario", href: "../registro.html?paso=2", text: "Registrar mi negocio" })));
    return;
  }

  var chip = h("div", { class: "estado__chips" });
  var motivo = h("div", { class: "caja-motivo", hidden: true });
  var avisoRevision = h("div", { class: "aviso-grande", role: "status", hidden: true });
  var alerta = h("div", { class: "alerta alerta--error", role: "alert", hidden: true }, Portal.icono("i-error"), h("span", { id: "negocio-error-texto" }));
  var raiz = h("div", { class: "paso" });
  var guardar = h("button", { class: "boton boton--cobalto", type: "submit", id: "guardar-negocio", text: "Guardar cambios" });
  var form = h("form", { class: "formulario", id: "form-negocio", novalidate: true }, alerta, raiz,
    h("div", { class: "formulario__acciones" }, guardar, h("a", { class: "boton boton--secundario", href: "panel.html", text: "Volver a Mi Faro" })));

  main.appendChild(h("section", { "aria-label": "Estado de tu negocio" }, chip, motivo));
  main.appendChild(avisoRevision);
  main.appendChild(h("section", { "aria-labelledby": "t-form" }, h("h2", { id: "t-form", text: "Datos, horario y servicios", style: "margin-bottom: 16px" }), form));

  var fn = FormNegocio.montar(raiz, { base: "../", negocio: neg });

  function pintarEstado(n) {
    Portal.vaciar(chip);
    chip.appendChild(Portal.chipNegocio(n.estado));
    chip.appendChild(h("span", { class: "texto-suave", text: n.nombre }));
    Portal.vaciar(motivo);
    motivo.hidden = !(n.estado === "rechazado" && n.motivo_rechazo);
    if (!motivo.hidden) {
      motivo.appendChild(h("strong", { text: "Esto nos dijo la persona que la revisó:" }));
      motivo.appendChild(h("p", { text: n.motivo_rechazo }));
    }
    Portal.linternaBanda(n.estado !== "aprobado");
  }
  pintarEstado(neg);

  var guardando = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (guardando) return;
    alerta.hidden = true;
    if (!fn.validar()) return;
    guardando = true;
    var antes = Store.obtenerNegocio(neg.id);
    var r = Store.editarNegocio(neg.id, fn.valores());
    guardando = false;
    if (!r.ok) {
      document.getElementById("negocio-error-texto").textContent = r.error;
      alerta.hidden = false;
      if (r.errores) fn.errores(r.errores);
      return;
    }
    var ahora = Store.obtenerNegocio(neg.id);
    pintarEstado(ahora);
    Portal.vaciar(avisoRevision);
    if (r.reenviado_a_revision) {
      var msg = antes.estado === "rechazado"
        ? "Reenviamos tu solicitud. Un administrador la revisará pronto."
        : "Guardamos tus cambios. Como cambiaste datos importantes, tu Faro se apaga mientras un administrador los revisa.";
      avisoRevision.appendChild(Portal.imagen("linterna-izq.png", { width: 61, height: 96 }));
      avisoRevision.appendChild(h("p", { text: msg }));
      avisoRevision.hidden = false;
      FaroUI.aviso(msg, { base: "../" });
      avisoRevision.scrollIntoView({ block: "center" });
    } else {
      avisoRevision.hidden = true;
      FaroUI.aviso("Guardamos tus cambios.", { base: "../" });
    }
  });
})();
