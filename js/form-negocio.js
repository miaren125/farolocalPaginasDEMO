/* Formulario de datos del negocio (nombre, giro, dirección, ubicación en el mapa, horario y servicios).
   Lo usan el paso 2 del registro y la página "Mi negocio", para no duplicar código.

   const f = FormNegocio.montar(raiz, { base: "../", conPrivacidad: false, negocio: {...} });
   f.valores()     → datos listos para Store.registrarNegocio / editarNegocio
   f.validar()     → true/false; pinta los errores y manda el foco al primero
   f.cargar(neg)   → rellena el formulario con un negocio
   f.errores(map)  → pinta errores que vengan de Store
   f.mostrado()    → llamar si el formulario estaba oculto y ya se ve (redibuja el mapa) */
(function () {
  "use strict";

  function plantilla(base, conPrivacidad) {
    var ico = function (id) { return '<svg class="icono" aria-hidden="true"><use href="' + base + 'assets/icons/iconos.svg#' + id + '"></use></svg>'; };
    var giros = (window.Store.GIROS || []).map(function (g) { return "<option>" + g + "</option>"; }).join("");
    var servicios = (window.Store.SERVICIOS || []).map(function (s) {
      return '<label class="opcion"><input type="checkbox" name="servicio" value="' + s + '"><span>' + ico("i-check") + s + "</span></label>";
    }).join("");
    return '' +
      '<div class="campo"><label class="campo__etiqueta" for="n-nombre">Nombre del negocio</label>' +
      '<input class="campo__control" id="n-nombre" type="text" autocomplete="organization" required></div>' +
      '<div class="campo"><label class="campo__etiqueta" for="n-giro">Giro</label>' +
      '<select class="campo__control" id="n-giro" required><option value="">Elige el giro</option>' + giros + "</select></div>" +
      '<div class="campo"><label class="campo__etiqueta" for="n-direccion">Dirección</label>' +
      '<input class="campo__control" id="n-direccion" type="text" autocomplete="street-address" required></div>' +
      '<fieldset class="campo" id="g-ubicacion"><legend class="campo__etiqueta">Ubicación en el mapa</legend><div class="mapa-bloque">' +
      '<p class="campo__ayuda" id="ubicacion-ayuda">Toca el cruce más cercano a tu puerta.</p><div id="mapa-registro"></div>' +
      '<p class="cruce-elegido" id="cruce-elegido" aria-live="polite">Aún no eliges un cruce.</p></div></fieldset>' +
      '<fieldset class="campo" id="g-horario"><legend class="campo__etiqueta">Horario</legend><div class="campo__fila">' +
      '<div class="campo"><label class="campo__etiqueta" for="n-abre">Abrimos a las</label><input class="campo__control" id="n-abre" type="time" value="09:00" required></div>' +
      '<div class="campo"><label class="campo__etiqueta" for="n-cierra">Cerramos a las</label><input class="campo__control" id="n-cierra" type="time" value="21:00" required></div></div>' +
      '<label class="casilla"><input type="checkbox" id="n-24h"> Abrimos las 24 horas</label></fieldset>' +
      '<fieldset class="campo" id="g-servicios"><legend class="campo__etiqueta">Servicios para peatones</legend>' +
      '<span class="campo__ayuda" id="servicios-ayuda">Elige los que ofreces a quien camina de noche.</span><div class="opciones">' + servicios + "</div></fieldset>" +
      (conPrivacidad ? '<div class="campo"><label class="casilla"><input type="checkbox" id="n-privacidad"> He leído y acepto el aviso de privacidad de FaroLocal.</label></div>' : "");
  }

  function montar(raiz, op) {
    op = op || {};
    var base = op.base || "";
    window.FaroCampos.base = base;
    raiz.innerHTML = plantilla(base, !!op.conPrivacidad);
    var $ = function (id) { return raiz.querySelector("#" + id); };
    var nodoId = null, mapa = null;

    function mostrarCruce(nodo) {
      var p = $("cruce-elegido");
      p.textContent = "";
      if (!nodo) { p.textContent = "Aún no eliges un cruce."; return; }
      p.appendChild(document.createTextNode("Cruce elegido: "));
      var s = document.createElement("strong");
      s.textContent = nodo.nombre;
      p.appendChild(s);
    }

    function iniciarMapa() {
      var zona = window.Store.zona();
      mapa = window.Mapa.render($("mapa-registro"), {
        zona: zona, seleccionable: true, leyenda: true, seleccionado: nodoId,
        etiqueta: "Mapa de la zona piloto con " + zona.faros.length + " Faros.",
        faros: zona.faros.map(function (f) { return { nodo_id: f.nodo_id, nombre: f.nombre, abre: f.abre, cierra: f.cierra }; }),
        onSeleccionar: function (id, nodo) { nodoId = id; mostrarCruce(nodo); window.FaroCampos.limpiar($("g-ubicacion")); }
      });
    }

    function servicios() {
      return Array.prototype.map.call(raiz.querySelectorAll('input[name="servicio"]:checked'), function (i) { return i.value; });
    }

    function valores() {
      var h24 = $("n-24h").checked;
      return {
        nombre: $("n-nombre").value, giro: $("n-giro").value, direccion: $("n-direccion").value, nodo_id: nodoId,
        abre: h24 ? "00:00" : $("n-abre").value, cierra: h24 ? "00:00" : $("n-cierra").value, servicios: servicios()
      };
    }

    var IDS = { nombre: "n-nombre", giro: "n-giro", direccion: "n-direccion", nodo_id: "g-ubicacion", abre: "n-abre", cierra: "n-cierra", servicios: "g-servicios" };

    function enfocar(el) {
      if (!el) return;
      if (el.id === "g-ubicacion") { var nodo = el.querySelector('[role="button"][tabindex="0"]'); if (nodo) nodo.focus(); return; }
      if (el.tagName === "FIELDSET") { var i = el.querySelector("input"); if (i) i.focus(); return; }
      el.focus();
    }

    function pintar(errores) {
      var primero = null;
      Object.keys(IDS).forEach(function (k) {
        var el = $(IDS[k]);
        if (errores[k]) { window.FaroCampos.error(el, errores[k]); if (!primero) primero = el; }
        else window.FaroCampos.limpiar(el);
      });
      return primero;
    }

    function validar() {
      var d = valores();
      var errores = window.Store.validarNegocio(d);
      if (!errores.abre && !errores.cierra && !$("n-24h").checked && d.abre === d.cierra) {
        errores.cierra = "Si abres y cierras a la misma hora, marca «Abrimos las 24 horas».";
      }
      var primero = pintar(errores);
      var priv = $("n-privacidad");
      if (priv) {
        if (!priv.checked) { window.FaroCampos.error(priv, "Acepta el aviso de privacidad para continuar."); if (!primero) primero = priv; }
        else window.FaroCampos.limpiar(priv);
      }
      if (primero) enfocar(primero);
      return !primero;
    }

    function cargar(n) {
      $("n-nombre").value = n.nombre || "";
      var giro = $("n-giro");
      if (n.giro && !Array.prototype.some.call(giro.options, function (o) { return o.value === n.giro || o.text === n.giro; })) {
        var o = document.createElement("option"); o.textContent = n.giro; giro.appendChild(o);
      }
      giro.value = n.giro || "";
      $("n-direccion").value = n.direccion || "";
      var h24 = n.abre && n.abre === n.cierra;
      $("n-24h").checked = !!h24;
      $("n-abre").disabled = $("n-cierra").disabled = !!h24;
      if (!h24) { $("n-abre").value = n.abre || "09:00"; $("n-cierra").value = n.cierra || "21:00"; }
      Array.prototype.forEach.call(raiz.querySelectorAll('input[name="servicio"]'), function (i) { i.checked = (n.servicios || []).indexOf(i.value) >= 0; });
      nodoId = n.nodo_id === undefined ? null : n.nodo_id;
      if (mapa && nodoId !== null) mapa.seleccionar(nodoId, false);
      mostrarCruce(nodoId !== null ? window.Store.nodo(nodoId) : null);
      Object.keys(IDS).forEach(function (k) { window.FaroCampos.limpiar($(IDS[k])); });
    }

    /* validación al salir de los campos de texto y limpieza al corregir */
    ["n-nombre", "n-direccion"].forEach(function (id) {
      var el = $(id);
      el.addEventListener("blur", function () {
        if (!el.value) return;
        var e = window.Store.validarNegocio(valores());
        var k = id === "n-nombre" ? "nombre" : "direccion";
        if (e[k]) window.FaroCampos.error(el, e[k]); else window.FaroCampos.limpiar(el);
      });
    });
    $("n-giro").addEventListener("change", function () { window.FaroCampos.limpiar($("n-giro")); });
    Array.prototype.forEach.call(raiz.querySelectorAll('input[name="servicio"]'), function (i) {
      i.addEventListener("change", function () { if (servicios().length) window.FaroCampos.limpiar($("g-servicios")); });
    });
    var priv = $("n-privacidad");
    if (priv) priv.addEventListener("change", function () { if (priv.checked) window.FaroCampos.limpiar(priv); });
    $("n-24h").addEventListener("change", function () {
      var h24 = $("n-24h").checked;
      $("n-abre").disabled = h24; $("n-cierra").disabled = h24;
      if (h24) { window.FaroCampos.limpiar($("n-abre")); window.FaroCampos.limpiar($("n-cierra")); }
    });

    iniciarMapa();
    if (op.negocio) cargar(op.negocio);

    return {
      valores: valores, validar: validar, cargar: cargar, errores: pintar,
      mostrado: function () { if (mapa) mapa.actualizar({ seleccionado: nodoId }); },
      nodo: function () { return nodoId; }
    };
  }

  window.FormNegocio = { montar: montar };
})();
