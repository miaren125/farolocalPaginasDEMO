/* Registro de negocio en 2 pasos. Lo escrito se conserva al ir y volver (los pasos solo se ocultan). */
(function () {
  "use strict";

  var form = document.getElementById("form-registro");
  var alerta = document.getElementById("registro-error");
  var alertaTexto = document.getElementById("registro-error-texto");
  var $ = function (id) { return document.getElementById(id); };
  var paso = 1;
  var nodoId = null;
  var mapa = null;
  var listo = Store.init();

  function mostrarError(t) { alertaTexto.textContent = t; alerta.hidden = false; }
  function ocultarError() { alerta.hidden = true; alertaTexto.textContent = ""; }

  /* ---------- pasos ---------- */
  function irAPaso(n, enfocarTitulo) {
    paso = n;
    $("paso-1").hidden = n !== 1;
    $("paso-2").hidden = n !== 2;
    $("prog-1").setAttribute("aria-current", n === 1 ? "step" : "false");
    $("prog-1").classList.toggle("hecho", n === 2);
    if (n === 2) $("prog-2").setAttribute("aria-current", "step"); else $("prog-2").removeAttribute("aria-current");
    ocultarError();
    if (n === 2 && !mapa) iniciarMapa();
    if (enfocarTitulo) { var t = $("titulo-paso-" + n); t.focus(); t.scrollIntoView({ block: "start" }); }
  }

  function iniciarMapa() {
    listo.then(function () {
      var zona = Store.zona();
      mapa = Mapa.render($("mapa-registro"), {
        zona: zona, seleccionable: true, leyenda: true,
        etiqueta: "Mapa de la zona piloto con " + zona.faros.length + " Faros.",
        faros: zona.faros.map(function (f) { return { nodo_id: f.nodo_id, nombre: f.nombre, abre: f.abre, cierra: f.cierra }; }),
        seleccionado: nodoId,
        onSeleccionar: function (id, nodo) {
          nodoId = id;
          var p = $("cruce-elegido");
          p.textContent = "";
          p.appendChild(document.createTextNode("Cruce elegido: "));
          var s = document.createElement("strong");
          s.textContent = nodo.nombre;
          p.appendChild(s);
          FaroCampos.limpiar($("g-ubicacion"));
        }
      });
    });
  }

  /* ---------- validación ---------- */
  var CAMPOS_PASO1 = { nombre: "r-nombre", correo: "r-correo", telefono: "r-telefono", password: "r-password", confirmar: "r-confirmar" };
  var CAMPOS_PASO2 = { nombre: "n-nombre", giro: "n-giro", direccion: "n-direccion", nodo_id: "g-ubicacion", abre: "n-abre", cierra: "n-cierra", servicios: "g-servicios" };

  function datosCuenta() {
    return { nombre: $("r-nombre").value, correo: $("r-correo").value, telefono: $("r-telefono").value, password: $("r-password").value, confirmar: $("r-confirmar").value };
  }
  function serviciosElegidos() {
    return Array.prototype.map.call(form.querySelectorAll('input[name="servicio"]:checked'), function (i) { return i.value; });
  }
  function datosNegocio() {
    var h24 = $("n-24h").checked;
    return {
      nombre: $("n-nombre").value, giro: $("n-giro").value, direccion: $("n-direccion").value, nodo_id: nodoId,
      abre: h24 ? "00:00" : $("n-abre").value, cierra: h24 ? "00:00" : $("n-cierra").value, servicios: serviciosElegidos()
    };
  }

  /* Muestra los errores de un mapa {campo: mensaje}; devuelve el primer elemento con error */
  function pintar(errores, ids) {
    var primero = null;
    Object.keys(ids).forEach(function (k) {
      var el = $(ids[k]);
      if (errores[k]) { FaroCampos.error(el, errores[k]); if (!primero) primero = el; }
      else FaroCampos.limpiar(el);
    });
    return primero;
  }
  function enfocar(el) {
    if (!el) return;
    if (el.tagName === "FIELDSET") {
      var f = el.querySelector("input, button, [tabindex]");
      if (el.id === "g-ubicacion") { var nodo = el.querySelector('[role="button"][tabindex="0"]'); (nodo || el).focus && (nodo || el).focus(); return; }
      if (f) f.focus();
    } else el.focus();
  }

  function validarPaso1() {
    var errores = Store.validarCuenta(datosCuenta());
    var primero = pintar(errores, CAMPOS_PASO1);
    if (primero) enfocar(primero);
    return !primero;
  }

  function validarPaso2() {
    var d = datosNegocio();
    var errores = Store.validarNegocio(d);
    if (!errores.cierra && !errores.abre && !$("n-24h").checked && d.abre === d.cierra) {
      errores.cierra = "Si abres y cierras a la misma hora, marca «Abrimos las 24 horas».";
    }
    var primero = pintar(errores, CAMPOS_PASO2);
    var priv = $("n-privacidad");
    if (!priv.checked) {
      FaroCampos.error(priv, "Acepta el aviso de privacidad para continuar.");
      if (!primero) primero = priv;
    } else FaroCampos.limpiar(priv);
    if (primero) enfocar(primero);
    return !primero;
  }

  /* validación al salir de cada campo del paso 1 */
  Object.keys(CAMPOS_PASO1).forEach(function (k) {
    var el = $(CAMPOS_PASO1[k]);
    el.addEventListener("blur", function () {
      if (!el.value) return;
      listo.then(function () {
        var e = Store.validarCuenta(datosCuenta());
        if (e[k]) FaroCampos.error(el, e[k]); else FaroCampos.limpiar(el);
      });
    });
  });
  ["n-nombre", "n-direccion"].forEach(function (id) {
    var el = $(id);
    el.addEventListener("blur", function () {
      if (!el.value) return;
      var e = Store.validarNegocio(datosNegocio());
      var k = id === "n-nombre" ? "nombre" : "direccion";
      if (e[k]) FaroCampos.error(el, e[k]); else FaroCampos.limpiar(el);
    });
  });
  $("n-giro").addEventListener("change", function () { FaroCampos.limpiar($("n-giro")); });
  form.querySelectorAll('input[name="servicio"]').forEach(function (i) {
    i.addEventListener("change", function () { if (serviciosElegidos().length) FaroCampos.limpiar($("g-servicios")); });
  });
  $("n-privacidad").addEventListener("change", function (e) { if (e.target.checked) FaroCampos.limpiar(e.target); });

  /* 24 horas */
  $("n-24h").addEventListener("change", function () {
    var h24 = $("n-24h").checked;
    $("n-abre").disabled = h24; $("n-cierra").disabled = h24;
    if (h24) { FaroCampos.limpiar($("n-abre")); FaroCampos.limpiar($("n-cierra")); }
  });

  /* mostrar / ocultar contraseña */
  document.querySelectorAll("[data-ver]").forEach(function (b) {
    b.addEventListener("click", function () {
      var input = $(b.getAttribute("data-ver"));
      var ver = input.type === "password";
      input.type = ver ? "text" : "password";
      b.setAttribute("aria-pressed", ver ? "true" : "false");
      b.setAttribute("aria-label", ver ? "Ocultar contraseña" : "Mostrar contraseña");
      b.querySelector("use").setAttribute("href", "assets/icons/iconos.svg#" + (ver ? "i-ojo-tachado" : "i-ojo"));
    });
  });

  $("atras").addEventListener("click", function () { irAPaso(1, true); });

  /* ---------- envío ---------- */
  var enviando = false;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (enviando) return;
    try { await listo; } catch (err) { mostrarError("No se pudieron cargar los datos de demostración. Abre el sitio desde un servidor."); return; }
    if (paso === 1) {
      if (validarPaso1()) irAPaso(2, true);
      return;
    }
    if (!validarPaso1()) { irAPaso(1, true); return; }
    if (!validarPaso2()) return;

    enviando = true;
    var btn = $("registrar");
    btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Registrando…";
    try {
      var cuenta = datosCuenta();
      var rc = await Store.crearCuenta(cuenta, "comercio");
      if (!rc.ok) {
        irAPaso(1, true);
        pintar(rc.errores || (function (o) { o[rc.campo] = rc.error; return o; })({}), CAMPOS_PASO1);
        enfocar($(CAMPOS_PASO1[rc.campo] || "r-correo"));
        return;
      }
      var neg = datosNegocio();
      neg.titular_correo = rc.usuario.correo;
      var rn = Store.registrarNegocio(neg);
      if (!rn.ok) {
        mostrarError(rn.error);
        if (rn.errores) pintar(rn.errores, CAMPOS_PASO2);
        return;
      }
      Auth.iniciarSesion(rc.usuario, false);
      try { window.sessionStorage.setItem("farolocal.aviso", "¡Listo! Estamos revisando tu solicitud."); } catch (e2) { /* sin almacenamiento */ }
      window.location.href = "comercio/panel.html";
    } catch (err) {
      mostrarError("No pudimos registrar tu negocio. Intenta de nuevo.");
      if (window.console) console.warn(err);
    } finally {
      enviando = false;
      btn.disabled = false; btn.removeAttribute("aria-busy"); btn.textContent = "Registrar mi negocio";
    }
  });

  listo.catch(function (err) {
    mostrarError("No se pudieron cargar los datos de demostración. Abre el sitio desde un servidor (no desde un archivo).");
    if (window.console) console.warn(err);
  });
})();
