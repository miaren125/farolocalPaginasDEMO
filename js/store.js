/* FaroLocal Web · capa de datos de la DEMOSTRACIÓN.
   Todo vive en localStorage (llave "farolocal.web.v1"); no hay servidor. Las reglas de negocio
   son las mismas que las del backend de la app del peatón (validaciones, estados, mensajes).

   SEGURIDAD: esto es solo una demostración escolar. Las contraseñas se guardan como SHA-256(sal + contraseña)
   para no dejarlas en claro, pero la sal es fija y pública y cualquiera puede leer o editar localStorage;
   no es un esquema de autenticación real. No uses contraseñas verdaderas.

   Uso: await Store.init();  luego las funciones de dominio (síncronas, salvo las que calculan hashes).
   Resultados: { ok: true, ... } o { ok: false, error, campo?, errores? }. */
(function () {
  "use strict";

  var LLAVE = "farolocal.web.v1";
  var LLAVE_SESION = "farolocal.web.sesion";
  var SAL = "farolocal-web-demo::sal-fija-v1::";
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  var MAX_PASSWORD = 128;
  var MAX_SERVICIOS = 10;
  var ZONA_URL = new URL("../data/zona.json", document.currentScript ? document.currentScript.src : location.href).href;

  var zonaCache = null;
  var respaldo = null; // si localStorage no está disponible (modo privado) se usa memoria

  /* ---------------------------------------------------------- utilidades */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function fechaISO(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function ahoraISO() { var d = new Date(); return fechaISO(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); }
  function hoyISO() { return fechaISO(new Date()); }
  function sumarDias(n) { var d = new Date(); d.setDate(d.getDate() + n); return fechaISO(d); }
  function horaActual() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function fechaValida(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
    var d = new Date(s + "T00:00:00");
    return !isNaN(d.getTime()) && fechaISO(d) === s;
  }
  function clonar(x) { return JSON.parse(JSON.stringify(x)); }
  function err(error, campo) { var r = { ok: false, error: error }; if (campo) r.campo = campo; return r; }

  async function hash(password) {
    if (!(window.crypto && window.crypto.subtle)) throw new Error("Este navegador no permite cifrar contraseñas. Abre el sitio con https o localhost.");
    var datos = new TextEncoder().encode(SAL + password);
    var buf = await window.crypto.subtle.digest("SHA-256", datos);
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join("");
  }

  /* ---------------------------------------------------------- almacenamiento */
  function D() {
    var raw = null;
    try { raw = window.localStorage.getItem(LLAVE); } catch (e) { raw = respaldo; }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e2) { return null; }
  }
  function G(d) {
    var raw = JSON.stringify(d);
    try { window.localStorage.setItem(LLAVE, raw); } catch (e) { respaldo = raw; }
  }
  function sig(d, tabla) { d.seq[tabla] = (d.seq[tabla] || 0) + 1; return d.seq[tabla]; }
  function requerirDatos() {
    var d = D();
    if (!d) throw new Error("Store.init() debe terminar antes de usar los datos.");
    return d;
  }

  /* ---------------------------------------------------------- zona */
  function zona() { return zonaCache; }
  function nodo(id) { return zonaCache && zonaCache.nodos.filter(function (n) { return n.id === id; })[0] || null; }
  function arista(id) { return zonaCache && zonaCache.aristas.filter(function (a) { return a.id === id; })[0] || null; }

  /* ---------------------------------------------------------- siembra */
  async function sembrar() {
    var S = window.FARO_SEED;
    if (!S) throw new Error("Falta cargar data/seed.js antes de js/store.js.");
    var ahora = ahoraISO();
    var d = { version: 1, seq: {}, usuarios: [], negocios: [], cupones: [], canjes: [], reportes: [], resumen: clonar(S.resumen) };

    for (var i = 0; i < S.usuarios.length; i++) {
      var u = S.usuarios[i];
      d.usuarios.push({ id: sig(d, "usuarios"), nombre: u.nombre, correo: u.correo, telefono: u.telefono, rol: u.rol, hash: await hash(u.password), creado: ahora });
    }

    zonaCache.faros.forEach(function (f) {
      d.negocios.push({
        id: f.id, titular_correo: S.titularesDeFaros[f.nombre] || null, nombre: f.nombre, direccion: f.direccion, nodo_id: f.nodo_id,
        giro: f.giro, abre: f.abre, cierra: f.cierra, servicios: f.servicios.slice(), estado: "aprobado", motivo_rechazo: null,
        revisado_por: "admin@farolocal.mx", revisado_en: ahora, vistas: f.vistas || 0, rutas: f.rutas || 0, creado: ahora
      });
      d.seq.negocios = Math.max(d.seq.negocios || 0, f.id);
    });
    S.negociosExtra.forEach(function (n) {
      var cruce = nodo(n.nodo_id);
      d.negocios.push({
        id: sig(d, "negocios"), titular_correo: n.titular_correo, nombre: n.nombre, direccion: (cruce ? cruce.nombre : "Zona piloto") + ", zona piloto",
        nodo_id: n.nodo_id, giro: n.giro, abre: n.abre, cierra: n.cierra, servicios: n.servicios.slice(), estado: n.estado,
        motivo_rechazo: n.motivo_rechazo || null, revisado_por: n.estado === "rechazado" ? "admin@farolocal.mx" : null,
        revisado_en: n.estado === "rechazado" ? ahora : null, vistas: 0, rutas: 0, creado: ahora
      });
    });

    S.cupones.forEach(function (c) {
      var neg = d.negocios.filter(function (n) { return n.nombre === c.negocio; })[0];
      if (!neg) return;
      d.cupones.push({ id: sig(d, "cupones"), negocio_id: neg.id, titulo: c.titulo, descripcion: c.descripcion, inicio: sumarDias(c.diasInicio), fin: sumarDias(c.diasFin), activo: c.activo ? 1 : 0 });
    });

    var luzUno = zonaCache.aristas.filter(function (a) { return a.luz === 1; }).map(function (a) { return a.id; });
    S.reportes.forEach(function (r, k) {
      var aid = luzUno.indexOf(r.arista_id) >= 0 ? r.arista_id : luzUno[k % luzUno.length];
      var rev = r.estado !== "pendiente";
      d.reportes.push({ id: sig(d, "reportes"), autor: "Peatón de demostración", arista_id: aid, tipo: r.tipo, descripcion: r.descripcion, estado: r.estado, creado: ahora, revisado_por: rev ? "admin@farolocal.mx" : null, revisado_en: rev ? ahora : null });
    });

    G(d);
    return d;
  }

  async function cargarZona() {
    if (zonaCache) return zonaCache;
    var r = await fetch(ZONA_URL, { cache: "no-cache" });
    if (!r.ok) throw new Error("No se pudo cargar data/zona.json (" + r.status + ").");
    zonaCache = await r.json();
    return zonaCache;
  }

  async function init() {
    await cargarZona();
    if (!D()) await sembrar();
    montarBotonReinicio();
  }

  async function reset() {
    await cargarZona();
    try { window.localStorage.removeItem(LLAVE); } catch (e) { respaldo = null; }
    var d = await sembrar();
    // la sesión sigue solo si esa cuenta existe en los datos de ejemplo
    ["sessionStorage", "localStorage"].forEach(function (donde) {
      try {
        var s = JSON.parse(window[donde].getItem(LLAVE_SESION) || "null");
        if (s && !d.usuarios.some(function (u) { return u.correo === s.correo; })) window[donde].removeItem(LLAVE_SESION);
      } catch (e) { /* sin almacenamiento */ }
    });
    return { ok: true };
  }

  /* Botón discreto en el pie de los portales (páginas con <body data-portal>) */
  function montarBotonReinicio() {
    if (!document.body || !document.body.hasAttribute("data-portal") || document.getElementById("reiniciar-demo")) return;
    var pie = document.querySelector(".pie .contenedor");
    if (!pie) return;
    var p = document.createElement("p");
    p.className = "pie__reinicio";
    var b = document.createElement("button");
    b.type = "button"; b.id = "reiniciar-demo"; b.className = "enlace-boton";
    b.textContent = "Reiniciar datos de demostración";
    b.addEventListener("click", async function () {
      if (!window.confirm("Se borrarán los cambios que hiciste y volverán los datos de ejemplo. ¿Continuar?")) return;
      await reset();
      window.location.reload();
    });
    p.appendChild(b);
    pie.appendChild(p);
  }

  /* ---------------------------------------------------------- horario */
  /* Abierto ahora: cruza la medianoche (abre > cierra) y abre == cierra significa 24 horas. */
  function estaAbierto(abre, cierra, hora) {
    hora = hora || horaActual();
    if (abre === cierra) return true;
    if (abre < cierra) return abre <= hora && hora < cierra;
    return hora >= abre || hora < cierra;
  }

  /* ---------------------------------------------------------- usuarios */
  function usuarioPorCorreo(correo) {
    var d = D(); if (!d) return null;
    correo = String(correo || "").trim().toLowerCase();
    var u = d.usuarios.filter(function (x) { return x.correo === correo; })[0];
    return u ? { id: u.id, nombre: u.nombre, correo: u.correo, telefono: u.telefono, rol: u.rol } : null;
  }

  async function verificarCredenciales(correo, password) {
    var d = requerirDatos();
    correo = String(correo || "").trim().toLowerCase();
    password = String(password || "");
    var u = d.usuarios.filter(function (x) { return x.correo === correo; })[0];
    if (password.length > MAX_PASSWORD) return null;
    var h = await hash(password); // se calcula siempre, exista o no el correo
    if (!u || u.hash !== h) return null;
    return { id: u.id, nombre: u.nombre, correo: u.correo, telefono: u.telefono, rol: u.rol };
  }

  function validarCuenta(datos) {
    var e = {};
    var nombre = String(datos.nombre || "").trim();
    var correo = String(datos.correo || "").trim().toLowerCase();
    var tel = String(datos.telefono || "").replace(/\D/g, "");
    var pwd = String(datos.password || "");
    if (nombre.length < 2) e.nombre = "Escribe tu nombre (mínimo 2 letras).";
    else if (nombre.length > 80) e.nombre = "Tu nombre no puede pasar de 80 caracteres.";
    if (!EMAIL_RE.test(correo)) e.correo = "Escribe un correo válido.";
    else if (usuarioPorCorreo(correo)) e.correo = "Ese correo ya está registrado.";
    if (tel.length !== 10) e.telefono = "El teléfono debe tener 10 dígitos.";
    if (pwd.length < 8) e.password = "La contraseña debe tener al menos 8 caracteres.";
    else if (pwd.length > MAX_PASSWORD) e.password = "La contraseña no puede pasar de " + MAX_PASSWORD + " caracteres.";
    if (datos.confirmar !== undefined && !e.password && String(datos.confirmar) !== pwd) e.confirmar = "Las contraseñas no coinciden.";
    return e;
  }

  async function crearCuenta(datos, rol) {
    var e = validarCuenta(datos);
    var campo = Object.keys(e)[0];
    if (campo) return { ok: false, error: e[campo], campo: campo, errores: e };
    var h = await hash(String(datos.password));
    var d = requerirDatos();
    var u = {
      id: sig(d, "usuarios"), nombre: String(datos.nombre).trim(), correo: String(datos.correo).trim().toLowerCase(),
      telefono: String(datos.telefono).replace(/\D/g, ""), rol: "comercio", hash: h, creado: ahoraISO()
    };
    d.usuarios.push(u);
    G(d);
    return { ok: true, usuario: { id: u.id, nombre: u.nombre, correo: u.correo, telefono: u.telefono, rol: u.rol } };
  }

  /* ---------------------------------------------------------- negocios */
  function conAbierto(n) {
    var c = clonar(n);
    c.abierto = estaAbierto(c.abre, c.cierra);
    return c;
  }

  function validarNegocio(datos) {
    var e = {};
    var nombre = String(datos.nombre || "").trim();
    var direccion = String(datos.direccion || "").trim();
    var giro = String(datos.giro || "").trim();
    if (nombre.length < 3) e.nombre = "Escribe el nombre del negocio (mínimo 3 letras).";
    else if (nombre.length > 80) e.nombre = "El nombre del negocio no puede pasar de 80 caracteres.";
    if (giro.length < 3) e.giro = "Elige el giro del negocio.";
    else if (giro.length > 40) e.giro = "El giro no puede pasar de 40 caracteres.";
    if (direccion.length < 5) e.direccion = "Escribe la dirección (mínimo 5 caracteres).";
    else if (direccion.length > 160) e.direccion = "La dirección no puede pasar de 160 caracteres.";
    var nodoId = datos.nodo_id === "" || datos.nodo_id === null || datos.nodo_id === undefined ? NaN : Number(datos.nodo_id);
    if (!Number.isInteger(nodoId)) e.nodo_id = "Marca la ubicación del negocio en el mapa.";
    else if (!nodo(nodoId)) e.nodo_id = "La ubicación está fuera de la zona piloto.";
    var abre = String(datos.abre || ""), cierra = String(datos.cierra || "");
    if (!HORA_RE.test(abre)) e.abre = "Escribe la hora en formato HH:MM.";
    if (!HORA_RE.test(cierra)) e.cierra = "Escribe la hora en formato HH:MM.";
    var servicios = Array.isArray(datos.servicios) ? datos.servicios : [];
    if (!servicios.length) e.servicios = "Elige al menos un servicio de apoyo para peatones.";
    else {
      var lista = [];
      servicios.forEach(function (s) { s = String(s).trim(); if (s && lista.indexOf(s) < 0) lista.push(s); });
      if (!lista.length || lista.length > MAX_SERVICIOS || lista.some(function (s) { return s.length > 40; }))
        e.servicios = "Elige entre 1 y " + MAX_SERVICIOS + " servicios (cada uno de hasta 40 caracteres).";
      else servicios = lista;
    }
    return { errores: e, limpio: { nombre: nombre, direccion: direccion, giro: giro, nodo_id: nodoId, abre: abre, cierra: cierra, servicios: servicios } };
  }

  function primerError(e) { var k = Object.keys(e)[0]; return k ? { ok: false, error: e[k], campo: k, errores: e } : null; }

  function listarNegocios(filtro) {
    var d = D(); if (!d) return [];
    var estado = filtro && filtro.estado;
    return d.negocios.filter(function (n) { return !estado || n.estado === estado; }).map(function (n) {
      var c = conAbierto(n);
      var t = d.usuarios.filter(function (u) { return u.correo === n.titular_correo; })[0];
      c.titular = t ? t.nombre : "";
      return c;
    });
  }
  function obtenerNegocio(id) {
    var d = D(); if (!d) return null;
    var n = d.negocios.filter(function (x) { return x.id === Number(id); })[0];
    return n ? conAbierto(n) : null;
  }
  function negocioDeTitular(correo) {
    var d = D(); if (!d) return null;
    correo = String(correo || "").trim().toLowerCase();
    var n = d.negocios.filter(function (x) { return x.titular_correo === correo; })[0];
    return n ? conAbierto(n) : null;
  }

  function registrarNegocio(datos) {
    var d = requerirDatos();
    var correo = String(datos.titular_correo || "").trim().toLowerCase();
    var u = d.usuarios.filter(function (x) { return x.correo === correo && x.rol === "comercio"; })[0];
    if (!u) return err("Solo una cuenta de comercio puede registrar un negocio.", "titular_correo");
    if (d.negocios.some(function (n) { return n.titular_correo === correo; })) return err("Ya registraste un negocio. Puedes editarlo.");
    var v = validarNegocio(datos);
    var fallo = primerError(v.errores);
    if (fallo) return fallo;
    var n = Object.assign({ id: sig(d, "negocios"), titular_correo: correo }, v.limpio, {
      estado: "pendiente", motivo_rechazo: null, revisado_por: null, revisado_en: null, vistas: 0, rutas: 0, creado: ahoraISO()
    });
    d.negocios.push(n);
    G(d);
    return { ok: true, negocio: conAbierto(n), estado: "pendiente" };
  }

  function editarNegocio(id, datos) {
    var d = requerirDatos();
    var n = d.negocios.filter(function (x) { return x.id === Number(id); })[0];
    if (!n) return err("Aún no registras un negocio.");
    var v = validarNegocio(datos);
    var fallo = primerError(v.errores);
    if (fallo) return fallo;
    var L = v.limpio;
    var mismos = function (a, b) { return JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort()); };
    var importante = L.nombre !== n.nombre || L.nodo_id !== n.nodo_id || L.abre !== n.abre || L.cierra !== n.cierra || !mismos(L.servicios, n.servicios);
    // un negocio rechazado que el titular corrige y guarda vuelve a revisión, aunque solo cambie la dirección
    var estado = ((importante && n.estado !== "pendiente") || n.estado === "rechazado") ? "pendiente" : n.estado;
    var anterior = n.estado;
    Object.assign(n, L, { estado: estado });
    if (estado === "pendiente") { n.motivo_rechazo = null; if (anterior !== "pendiente") { n.revisado_por = null; n.revisado_en = null; } }
    G(d);
    return { ok: true, negocio: conAbierto(n), estado: estado, reenviado_a_revision: estado !== anterior };
  }

  function revisar(tabla, id, estado, quien, motivo) {
    var d = requerirDatos();
    var r = d[tabla].filter(function (x) { return x.id === Number(id); })[0];
    if (!r) return err("No encontrado.");
    if (r.estado !== "pendiente") return err("Este elemento ya fue revisado.");
    r.estado = estado;
    r.revisado_por = quien || "admin@farolocal.mx";
    r.revisado_en = ahoraISO();
    if (tabla === "negocios") r.motivo_rechazo = motivo || null;
    G(d);
    return { ok: true, id: r.id, estado: estado };
  }
  function aprobarNegocio(id, quien) { return revisar("negocios", id, "aprobado", quien, null); }
  function rechazarNegocio(id, motivo, quien) {
    motivo = String(motivo || "").trim();
    if (motivo.length < 5) return err("Escribe el motivo del rechazo (se lo mostraremos al titular).", "motivo");
    return revisar("negocios", id, "rechazado", quien, motivo.slice(0, 300));
  }

  function panelNegocio(negocioId) {
    var d = requerirDatos();
    var n = d.negocios.filter(function (x) { return x.id === Number(negocioId); })[0];
    if (!n) return null;
    var ids = d.cupones.filter(function (c) { return c.negocio_id === n.id; }).map(function (c) { return c.id; });
    var canjes = d.canjes.filter(function (c) { return c.canjeado_en && ids.indexOf(c.cupon_id) >= 0; }).length;
    var hoy = hoyISO();
    var activos = d.cupones.filter(function (c) { return c.negocio_id === n.id && c.activo && c.fin >= hoy; }).length;
    return { negocio: conAbierto(n), vistas: n.vistas, rutas: n.rutas, canjes: canjes, cupones_activos: activos };
  }

  /* ---------------------------------------------------------- cupones */
  function validarCupon(datos) {
    var e = {};
    var titulo = String(datos.titulo || "").trim();
    var desc = String(datos.descripcion || "").trim();
    if (titulo.length < 3) e.titulo = "Escribe el título (mínimo 3 caracteres).";
    else if (titulo.length > 80) e.titulo = "El título no puede pasar de 80 caracteres.";
    if (desc.length < 3) e.descripcion = "Escribe la descripción (mínimo 3 caracteres).";
    else if (desc.length > 200) e.descripcion = "La descripción no puede pasar de 200 caracteres.";
    var ini = String(datos.inicio || ""), fin = String(datos.fin || "");
    if (!fechaValida(ini)) e.inicio = "Escribe las fechas de vigencia.";
    else if (!fechaValida(fin)) e.fin = "Escribe las fechas de vigencia.";
    else if (fin <= ini) e.fin = "La fecha de fin debe ser posterior a la de inicio.";
    return { errores: e, limpio: { titulo: titulo, descripcion: desc, inicio: ini, fin: fin } };
  }

  function listarCupones(negocioId) {
    var d = D(); if (!d) return [];
    return d.cupones.filter(function (c) { return !negocioId || c.negocio_id === Number(negocioId); }).sort(function (a, b) { return b.id - a.id; }).map(function (c) {
      var o = clonar(c);
      o.canjes = d.canjes.filter(function (x) { return x.cupon_id === c.id && x.canjeado_en; }).length;
      return o;
    });
  }
  function cuponesVigentes(negocioId) {
    var d = D(); if (!d) return [];
    var hoy = hoyISO();
    return d.cupones.filter(function (c) {
      var n = d.negocios.filter(function (x) { return x.id === c.negocio_id; })[0];
      return c.activo && c.inicio <= hoy && c.fin >= hoy && n && n.estado === "aprobado" && (!negocioId || c.negocio_id === Number(negocioId));
    }).map(clonar);
  }

  function crearCupon(negocioId, datos) {
    var d = requerirDatos();
    var n = d.negocios.filter(function (x) { return x.id === Number(negocioId); })[0];
    if (!n || n.estado !== "aprobado") return err("Solo un negocio aprobado puede publicar cupones.");
    var v = validarCupon(datos);
    var fallo = primerError(v.errores);
    if (fallo) return fallo;
    var c = Object.assign({ id: sig(d, "cupones"), negocio_id: n.id }, v.limpio, { activo: 1 });
    d.cupones.push(c);
    G(d);
    return { ok: true, cupon: clonar(c) };
  }

  function cuponDe(d, id, negocioId) {
    var c = d.cupones.filter(function (x) { return x.id === Number(id); })[0];
    if (!c || (negocioId !== undefined && negocioId !== null && c.negocio_id !== Number(negocioId))) return null;
    return c;
  }
  function editarCupon(id, datos, negocioId) {
    var d = requerirDatos();
    var c = cuponDe(d, id, negocioId);
    if (!c) return err("Cupón no encontrado.");
    var v = validarCupon(datos);
    var fallo = primerError(v.errores);
    if (fallo) return fallo;
    Object.assign(c, v.limpio);
    if (datos.activo !== undefined) c.activo = datos.activo ? 1 : 0;
    G(d);
    return { ok: true, cupon: clonar(c) };
  }
  function alternarCupon(id, negocioId) {
    var d = requerirDatos();
    var c = cuponDe(d, id, negocioId);
    if (!c) return err("Cupón no encontrado.");
    c.activo = c.activo ? 0 : 1;
    G(d);
    return { ok: true, id: c.id, activo: c.activo };
  }
  function borrarCupon(id, negocioId) {
    var d = requerirDatos();
    var c = cuponDe(d, id, negocioId);
    if (!c) return err("Cupón no encontrado.");
    d.cupones = d.cupones.filter(function (x) { return x.id !== c.id; });
    d.canjes = d.canjes.filter(function (x) { return x.cupon_id !== c.id; });
    G(d);
    return { ok: true };
  }

  /* Crea un canje de prueba (lo que en la app hace el peatón al "obtener" el cupón) y devuelve su código */
  function generarCodigoPrueba(cuponId) {
    var d = requerirDatos();
    var c = cuponDe(d, cuponId);
    if (!c) return null;
    var codigo;
    do {
      var b = new Uint8Array(3);
      window.crypto.getRandomValues(b);
      codigo = "FARO-" + Array.prototype.map.call(b, function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join("").toUpperCase();
    } while (d.canjes.some(function (x) { return x.codigo === codigo; }));
    d.canjes.push({ id: sig(d, "canjes"), cupon_id: c.id, usuario: "Peatón de demostración", codigo: codigo, creado: ahoraISO(), canjeado_en: null });
    G(d);
    return codigo;
  }

  function validarCodigo(codigo, negocioId) {
    var d = requerirDatos();
    codigo = String(codigo || "").trim().toUpperCase();
    if (!codigo) return { valido: false, motivo: "Escribe el código del cupón." };
    var canje = d.canjes.filter(function (x) { return x.codigo === codigo; })[0];
    var c = canje && d.cupones.filter(function (x) { return x.id === canje.cupon_id; })[0];
    if (!canje || !c || c.negocio_id !== Number(negocioId)) return { valido: false, motivo: "Código no encontrado en tu negocio." };
    if (canje.canjeado_en) return { valido: false, motivo: "Este cupón ya fue canjeado." };
    if (!c.activo) return { valido: false, motivo: "El cupón está desactivado." };
    var hoy = hoyISO();
    if (!(c.inicio <= hoy && hoy <= c.fin)) return { valido: false, motivo: "El cupón está vencido o aún no inicia." };
    canje.canjeado_en = ahoraISO();
    G(d);
    return { valido: true, titulo: c.titulo };
  }

  /* Estado de un cupón para mostrarlo: desactivado > vencido > activo (los que aún no inician cuentan como activos) */
  function estadoCupon(c) {
    if (!c.activo) return "desactivado";
    if (c.fin < hoyISO()) return "vencido";
    return "activo";
  }

  /* Últimos cupones cobrados de un negocio (más recientes primero) */
  function ultimosCanjes(negocioId, n) {
    var d = D(); if (!d) return [];
    var por = {};
    d.cupones.filter(function (c) { return c.negocio_id === Number(negocioId); }).forEach(function (c) { por[c.id] = c; });
    return d.canjes.filter(function (x) { return x.canjeado_en && por[x.cupon_id]; })
      .sort(function (a, b) { return a.canjeado_en < b.canjeado_en ? 1 : (a.canjeado_en > b.canjeado_en ? -1 : b.id - a.id); })
      .slice(0, n || 5).map(function (x) { return { codigo: x.codigo, titulo: por[x.cupon_id].titulo, canjeado_en: x.canjeado_en }; });
  }

  /* ---------------------------------------------------------- reportes y resumen */
  function listarReportes(filtro) {
    var d = D(); if (!d) return [];
    var estado = filtro && filtro.estado;
    return d.reportes.filter(function (r) { return !estado || r.estado === estado; }).map(function (r) {
      var o = clonar(r), a = arista(r.arista_id);
      o.a = a ? a.a : null; o.b = a ? a.b : null;
      return o;
    });
  }
  function aprobarReporte(id, quien) { return revisar("reportes", id, "aprobado", quien, null); }
  function descartarReporte(id, quien) { return revisar("reportes", id, "rechazado", quien, null); }
  function reportesAprobadosPorArista() {
    var d = D(), out = {};
    if (d) d.reportes.forEach(function (r) { if (r.estado === "aprobado") out[r.arista_id] = (out[r.arista_id] || 0) + 1; });
    return out;
  }
  function resumenAdmin() {
    var d = requerirDatos();
    var cuenta = function (lista, estado) { return lista.filter(function (x) { return x.estado === estado; }).length; };
    return {
      negocios_pendientes: cuenta(d.negocios, "pendiente"), negocios_aprobados: cuenta(d.negocios, "aprobado"),
      reportes_pendientes: cuenta(d.reportes, "pendiente"), usuarios: d.resumen.peatones
    };
  }

  /* ---------------------------------------------------------- API pública */
  window.Store = {
    LLAVE: LLAVE, LLAVE_SESION: LLAVE_SESION,
    init: init, reset: reset, leer: function () { var d = D(); return d ? clonar(d) : null; },
    zona: zona, nodo: nodo, arista: arista,
    GIROS: (window.FARO_SEED && window.FARO_SEED.giros) || [],
    SERVICIOS: (window.FARO_SEED && window.FARO_SEED.servicios) || [],
    TIPOS_REPORTE: (window.FARO_SEED && window.FARO_SEED.tiposReporte) || [],
    estaAbierto: estaAbierto, horaActual: horaActual, hoyISO: hoyISO, sumarDias: sumarDias,
    usuarioPorCorreo: usuarioPorCorreo, verificarCredenciales: verificarCredenciales, validarCuenta: validarCuenta, crearCuenta: crearCuenta,
    validarNegocio: function (d) { return validarNegocio(d).errores; },
    listarNegocios: listarNegocios, obtenerNegocio: obtenerNegocio, negocioDeTitular: negocioDeTitular,
    registrarNegocio: registrarNegocio, editarNegocio: editarNegocio, aprobarNegocio: aprobarNegocio, rechazarNegocio: rechazarNegocio, panelNegocio: panelNegocio,
    listarCupones: listarCupones, estadoCupon: estadoCupon, ultimosCanjes: ultimosCanjes, cuponesVigentes: cuponesVigentes, crearCupon: crearCupon, editarCupon: editarCupon, alternarCupon: alternarCupon,
    borrarCupon: borrarCupon, generarCodigoPrueba: generarCodigoPrueba, validarCodigo: validarCodigo,
    listarReportes: listarReportes, aprobarReporte: aprobarReporte, descartarReporte: descartarReporte, reportesAprobadosPorArista: reportesAprobadosPorArista,
    resumenAdmin: resumenAdmin, montarBotonReinicio: montarBotonReinicio
  };
})();
