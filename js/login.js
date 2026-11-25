/* Pantalla de inicio de sesión: validación en línea, error general accesible y estado de carga. */
(function () {
  "use strict";

  var form = document.getElementById("form-login");
  var correo = document.getElementById("correo");
  var password = document.getElementById("password");
  var recordar = document.getElementById("recordar");
  var entrar = document.getElementById("entrar");
  var alerta = document.getElementById("login-error");
  var alertaTexto = document.getElementById("login-error-texto");
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function mostrarError(texto) { alertaTexto.textContent = texto; alerta.hidden = false; }
  function ocultarError() { alerta.hidden = true; alertaTexto.textContent = ""; }

  function validarCorreo() {
    var v = correo.value.trim();
    if (!v) { FaroCampos.error(correo, "Escribe tu correo electrónico."); return false; }
    if (!EMAIL_RE.test(v)) { FaroCampos.error(correo, "Escribe un correo válido."); return false; }
    FaroCampos.limpiar(correo);
    return true;
  }
  function validarPassword() {
    if (!password.value) { FaroCampos.error(password, "Escribe tu contraseña."); return false; }
    FaroCampos.limpiar(password);
    return true;
  }

  correo.addEventListener("blur", function () { if (correo.value) validarCorreo(); });
  correo.addEventListener("input", function () { ocultarError(); if (correo.closest(".campo--error")) validarCorreo(); });
  password.addEventListener("blur", function () { if (password.value) validarPassword(); });
  password.addEventListener("input", function () { ocultarError(); if (password.closest(".campo--error")) validarPassword(); });

  /* mostrar / ocultar contraseña */
  var ojo = document.getElementById("ver-password");
  ojo.addEventListener("click", function () {
    var ver = password.type === "password";
    password.type = ver ? "text" : "password";
    ojo.setAttribute("aria-pressed", ver ? "true" : "false");
    ojo.setAttribute("aria-label", ver ? "Ocultar contraseña" : "Mostrar contraseña");
    ojo.querySelector("use").setAttribute("href", "assets/icons/iconos.svg#" + (ver ? "i-ojo-tachado" : "i-ojo"));
  });

  /* cuentas de demostración */
  document.querySelectorAll("[data-demo-correo]").forEach(function (b) {
    b.addEventListener("click", function () {
      correo.value = b.getAttribute("data-demo-correo");
      password.value = b.getAttribute("data-demo-clave");
      FaroCampos.limpiar(correo); FaroCampos.limpiar(password); ocultarError();
      FaroUI.aviso("Listo: los datos de la cuenta ya están en el formulario. Pulsa Entrar.");
      entrar.focus();
    });
  });

  var enviando = false;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (enviando) return;
    ocultarError();
    var okCorreo = validarCorreo(), okPass = validarPassword();
    if (!okCorreo) { correo.focus(); return; }
    if (!okPass) { password.focus(); return; }

    enviando = true;
    entrar.disabled = true;
    entrar.setAttribute("aria-busy", "true");
    entrar.textContent = "Entrando…";
    try {
      await new Promise(function (r) { setTimeout(r, 450); }); // estado de carga corto
      var r = await Auth.login(correo.value, password.value, recordar.checked);
      if (!r.ok) {
        mostrarError(r.error);
        password.value = "";
        password.focus();
        return;
      }
      var next = new URLSearchParams(window.location.search).get("next");
      window.location.href = Auth.destinoTrasLogin(r.usuario, next);
    } catch (err) {
      mostrarError("No pudimos iniciar sesión en este momento. Recarga la página e intenta de nuevo.");
      if (window.console) console.warn(err);
    } finally {
      enviando = false;
      entrar.disabled = false;
      entrar.removeAttribute("aria-busy");
      entrar.textContent = "Entrar";
    }
  });

  /* siembra los datos de ejemplo en segundo plano para que el primer envío sea rápido */
  Store.init().catch(function (err) {
    mostrarError("No se pudieron cargar los datos de demostración. Abre el sitio desde un servidor (no desde un archivo).");
    if (window.console) console.warn(err);
  });
})();
