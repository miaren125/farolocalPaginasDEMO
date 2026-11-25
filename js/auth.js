/* Sesión de la DEMOSTRACIÓN (sin servidor). La sesión es solo un aviso en el navegador:
   no protege nada de verdad, solo guía la navegación entre portales. Requiere js/store.js antes. */
(function () {
  "use strict";

  var CLAVE = (window.Store && window.Store.LLAVE_SESION) || "farolocal.web.sesion";
  var PANEL = { comercio: "comercio/panel.html", admin: "admin/index.html" };
  var ERROR_LOGIN = "Correo o contraseña incorrectos."; // no se distingue cuál de los dos falló

  function leerDe(almacen) {
    try { return JSON.parse(almacen.getItem(CLAVE) || "null"); } catch (e) { return null; }
  }
  function borrar() {
    try { window.sessionStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
    try { window.localStorage.removeItem(CLAVE); } catch (e2) { /* sin almacenamiento */ }
  }

  /* Sesión actual { correo, nombre, rol } o null (si la cuenta ya no existe en los datos, se descarta) */
  function actual() {
    var s = leerDe(window.sessionStorage) || leerDe(window.localStorage);
    if (!s || !s.correo) return null;
    var u = window.Store && window.Store.usuarioPorCorreo(s.correo);
    if (!u) { borrar(); return null; }
    return { correo: u.correo, nombre: u.nombre, rol: u.rol };
  }

  function iniciarSesion(usuario, recordar) {
    borrar();
    var datos = JSON.stringify({ correo: usuario.correo, nombre: usuario.nombre, rol: usuario.rol });
    try { (recordar ? window.localStorage : window.sessionStorage).setItem(CLAVE, datos); } catch (e) { /* sin almacenamiento */ }
  }

  async function login(correo, password, recordar) {
    await window.Store.init();
    var u = await window.Store.verificarCredenciales(correo, password);
    if (!u) return { ok: false, error: ERROR_LOGIN };
    iniciarSesion(u, !!recordar);
    return { ok: true, usuario: u };
  }

  function logout() { borrar(); }

  function panelDe(rol) { return PANEL[rol] || "login.html"; }

  /* Solo rutas internas relativas del mismo rol: comercio/… para comercio y admin/… para administración */
  function rutaSegura(next, rol) {
    if (typeof next !== "string" || !next || next.length > 200) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(next) || next.indexOf("//") !== -1 || next.indexOf("\\") !== -1 || next.indexOf("..") !== -1 || next.charAt(0) === "/") return null;
    if (!/^[a-z0-9_\-\/]+\.html(\?[a-z0-9=&_\-]*)?(#[a-z0-9_\-]*)?$/i.test(next)) return null;
    var carpeta = rol === "admin" ? "admin/" : "comercio/";
    return next.indexOf(carpeta) === 0 ? next : null;
  }

  function destinoTrasLogin(usuario, next) { return rutaSegura(next, usuario.rol) || panelDe(usuario.rol); }

  /* Guardia de páginas de portal. `base` es la ruta de vuelta a la raíz ("../" en comercio/ y admin/).
     Devuelve la sesión, o null si ya se está redirigiendo (el código de la página debe detenerse). */
  function require(rol, base) {
    base = base || "";
    var raiz = document.documentElement;
    raiz.classList.add("verificando");
    var s = actual();
    if (!s) {
      var partes = window.location.pathname.split("/");
      var profundidad = (base.match(/\.\.\//g) || []).length;
      var siguiente = partes.slice(partes.length - 1 - profundidad).join("/");
      window.location.replace(base + "login.html?next=" + encodeURIComponent(siguiente));
      return null;
    }
    if (s.rol !== rol) {
      window.location.replace(base + panelDe(s.rol));
      return null;
    }
    raiz.classList.remove("verificando");
    return s;
  }

  /* Rellena [data-usuario] con el nombre y conecta los botones [data-salir] */
  function montarCabecera(base) {
    var s = actual();
    document.querySelectorAll("[data-usuario]").forEach(function (el) { el.textContent = s ? s.nombre : ""; });
    document.querySelectorAll("[data-salir]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        logout();
        window.location.href = (base || "") + "login.html";
      });
    });
    return s;
  }

  window.Auth = {
    login: login, logout: logout, actual: actual, require: require, iniciarSesion: iniciarSesion,
    panelDe: panelDe, rutaSegura: rutaSegura, destinoTrasLogin: destinoTrasLogin, montarCabecera: montarCabecera, ERROR_LOGIN: ERROR_LOGIN
  };
})();
