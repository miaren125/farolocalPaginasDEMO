/* Mi sello: ver, descargar e imprimir el sello "Negocio asociado con FaroLocal". Solo disponible con el Faro encendido. */
(async function () {
  "use strict";
  var ses = Auth.require("comercio", "../");
  if (!ses) return;
  await Store.init();
  var h = Portal.h;

  var neg = Store.negocioDeTitular(ses.correo);
  var aprobado = !!neg && neg.estado === "aprobado";
  Portal.montar({
    rol: "comercio", actual: "sello", ante: "Portal de comercios", titulo: "Mi sello", linterna: "izq", apagada: !aprobado,
    frase: "Para que quien pase sepa que aquí hay un refugio abierto."
  });
  var main = document.getElementById("contenido");

  var tarjeta = h("div", { class: "tarjeta tarjeta--marino sello-tarjeta" + (aprobado ? "" : " sello-tarjeta--gris") },
    h("img", { src: "../assets/img/sello.png", alt: "Sello «Negocio asociado con FaroLocal»", width: 449, height: 254 }));

  var descarga = aprobado
    ? h("a", { class: "boton boton--primario", href: "../assets/img/sello.png", download: "sello-farolocal.png", id: "descargar" }, Portal.icono("i-sello"), "Descargar sello (PNG)")
    : h("button", { class: "boton boton--primario", type: "button", id: "descargar", disabled: true, "aria-describedby": "sello-ayuda" }, Portal.icono("i-sello"), "Descargar sello (PNG)");
  var imprimir = h("button", { class: "boton boton--secundario", type: "button", id: "imprimir", disabled: !aprobado, "aria-describedby": aprobado ? false : "sello-ayuda", onclick: function () { window.print(); } }, "Imprimir");

  main.appendChild(h("div", { class: "sello-pagina" },
    tarjeta,
    h("div", { class: "sello-texto no-imprimir" },
      aprobado ? h("h2", { text: "Tu sello de Punto Faro" }) : h("h2", { text: "Tu sello aún no está listo" }),
      aprobado
        ? h("p", { text: "Pégalo en tu puerta o ventana, a la altura de los ojos. Así quien camina de noche sabe, desde la calle, que aquí hay un refugio abierto." })
        : h("p", { id: "sello-ayuda", class: "alerta alerta--info", style: "display:flex", text: "Disponible cuando tu Faro esté encendido." }),
      h("div", { class: "sello-acciones" }, descarga, imprimir),
      aprobado ? h("p", { class: "texto-suave", text: "Consejo: imprímelo en papel adhesivo o en una hoja que puedas plastificar." }) : null)));
})();
