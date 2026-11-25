/* Registro de negocio en 2 pasos. Lo escrito se conserva al ir y volver (los pasos solo se ocultan).
   El paso 2 usa FormNegocio (el mismo formulario de "Mi negocio").
   Si ya hay una cuenta de comercio sin negocio (registro.html?paso=2), se salta el paso 1. */
(function () {
  "use strict";

  var form = document.getElementById("form-registro");
  var alerta = document.getElementById("registro-error");
  var alertaTexto = document.getElementById("registro-error-texto");
  var $ = function (id) { return document.getElementById(id); };
  var paso = 1;
  var fn = null;
  var soloNegocio = false; // cuenta existente que solo registra su negocio
  var sesion = null;
  var listo = Store.init().then(function () {
    fn = FormNegocio.montar($("form-negocio-raiz"), { conPrivacidad: true });
    sesion = Auth.actual();
    var pideP2 = new URLSearchParams(window.location.search).get("paso") === "2";
    if (pideP2 && sesion && sesion.rol === "comercio" && !Store.negocioDeTitular(sesion.correo)) {
      soloNegocio = true;
      $("prog-1").classList.add("hecho");
      $("prog-1").textContent = "Tu cuenta (" + sesion.nombre + ")";
      irAPaso(2, false);
    }
  });

  function mostrarError(t) { alertaTexto.textContent = t; alerta.hidden = false; }
  function ocultarError() { alerta.hidden = true; alertaTexto.textContent = ""; }

  function irAPaso(n, enfocarTitulo) {
    paso = n;
    $("paso-1").hidden = n !== 1;
    $("paso-2").hidden = n !== 2;
    $("prog-1").setAttribute("aria-current", n === 1 ? "step" : "false");
    $("prog-1").classList.toggle("hecho", n === 2);
    if (n === 2) $("prog-2").setAttribute("aria-current", "step"); else $("prog-2").removeAttribute("aria-current");
    $("atras").hidden = soloNegocio;
    ocultarError();
    if (n === 2 && fn) fn.mostrado();
    if (enfocarTitulo) { var t = $("titulo-paso-" + n); t.focus(); t.scrollIntoView({ block: "start" }); }
  }

  /* ---------- paso 1 ---------- */
  var CAMPOS_PASO1 = { nombre: "r-nombre", correo: "r-correo", telefono: "r-telefono", password: "r-password", confirmar: "r-confirmar" };

  function datosCuenta() {
    return { nombre: $("r-nombre").value, correo: $("r-correo").value, telefono: $("r-telefono").value, password: $("r-password").value, confirmar: $("r-confirmar").value };
  }

  function pintar(errores, ids) {
    var primero = null;
    Object.keys(ids).forEach(function (k) {
      var el = $(ids[k]);
      if (errores[k]) { FaroCampos.error(el, errores[k]); if (!primero) primero = el; }
      else FaroCampos.limpiar(el);
    });
    return primero;
  }

  function validarPaso1() {
    var primero = pintar(Store.validarCuenta(datosCuenta()), CAMPOS_PASO1);
    if (primero) primero.focus();
    return !primero;
  }

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
    if (!soloNegocio && !validarPaso1()) { irAPaso(1, true); return; }
    if (!fn.validar()) return;

    enviando = true;
    var btn = $("registrar");
    btn.disabled = true; btn.setAttribute("aria-busy", "true"); btn.textContent = "Registrando…";
    try {
      var correo;
      if (soloNegocio) correo = sesion.correo;
      else {
        var rc = await Store.crearCuenta(datosCuenta(), "comercio");
        if (!rc.ok) {
          irAPaso(1, true);
          pintar(rc.errores || (function (o) { o[rc.campo] = rc.error; return o; })({}), CAMPOS_PASO1);
          var f = $(CAMPOS_PASO1[rc.campo] || "r-correo");
          if (f) f.focus();
          return;
        }
        correo = rc.usuario.correo;
        Auth.iniciarSesion(rc.usuario, false);
      }
      var neg = fn.valores();
      neg.titular_correo = correo;
      var rn = Store.registrarNegocio(neg);
      if (!rn.ok) {
        mostrarError(rn.error);
        if (rn.errores) fn.errores(rn.errores);
        return;
      }
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
