/* Minimapa plano de la zona piloto dibujado en SVG con data/zona.json (nodos y aristas).
   Fondo Marino, calles como trazos redondeados gris azulado, Faros como círculos planos. Sin brillos ni halos.

   Mapa.render(contenedor, {
     zona,                      // opcional; por defecto Store.zona()
     faros: [{ nodo_id, nombre, abierto | abre+cierra }],
     resaltarNodo: id, resaltarArista: id,
     marcadores: [{ arista_id | nodo_id, titulo }],   // triángulos Dorado (avisos)
     seleccionable: true, seleccionado: id, onSeleccionar(nodoId, nodo),
     leyenda: true, etiqueta: "texto para lectores de pantalla"
   }) → { seleccionar(id), actualizar(opciones), seleccionado(), destruir() } */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var C = {
    fondo: "#0a1f36", calle3: "#8fa3bf", calle2: "#6c82a2", calle1: "#46597a",
    miel: "#fad680", pizarra: "#223758", dorado: "#e8bc6a", marfil: "#fffff2", cruce: "#b9c6da", gris: "#8a96aa"
  };

  function el(nombre, atributos, padre) {
    var e = document.createElementNS(NS, nombre);
    Object.keys(atributos || {}).forEach(function (k) { e.setAttribute(k, atributos[k]); });
    if (padre) padre.appendChild(e);
    return e;
  }
  function f(n) { return Math.round(n * 10) / 10; }

  function limites(zona) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    zona.nodos.forEach(function (n) { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); });
    var pad = 40;
    return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
  }

  /* Curvas suaves y deterministas: el desvío depende solo del id del tramo */
  function curva(a, b, id) {
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var desvio = (((id * 53) % 17) - 8) / 8 * Math.min(16, len * 0.1);
    var cx = (a.x + b.x) / 2 + (-dy / len) * desvio, cy = (a.y + b.y) / 2 + (dx / len) * desvio;
    return { d: "M" + f(a.x) + " " + f(a.y) + " Q" + f(cx) + " " + f(cy) + " " + f(b.x) + " " + f(b.y), mx: 0.25 * a.x + 0.5 * cx + 0.25 * b.x, my: 0.25 * a.y + 0.5 * cy + 0.25 * b.y };
  }

  function render(contenedor, opciones) {
    var op = Object.assign({}, opciones || {});
    var zona = op.zona || (window.Store && window.Store.zona());
    if (!zona) throw new Error("Mapa.render necesita la zona (llama antes a Store.init()).");
    var nodos = {}; zona.nodos.forEach(function (n) { nodos[n.id] = n; });
    var vb = limites(zona);
    var seleccionado = op.seleccionado === undefined || op.seleccionado === null ? null : Number(op.seleccionado);
    var anchoPrevio = 0, cuadro = 0, destruido = false, nodoActivo = null;

    var raiz = document.createElement("div");
    raiz.className = "mapa";
    contenedor.textContent = "";
    contenedor.appendChild(raiz);

    function abierto(faro) {
      if (typeof faro.abierto === "boolean") return faro.abierto;
      if (faro.abre && faro.cierra && window.Store) return window.Store.estaAbierto(faro.abre, faro.cierra, op.hora);
      return true;
    }

    function dibujar() {
      raiz.textContent = "";
      var ancho = raiz.clientWidth || contenedor.clientWidth || 600;
      anchoPrevio = ancho;
      var s = Math.max(0.25, ancho / vb.w); // píxeles de pantalla por unidad del mapa
      var px = function (n) { return f(n / s); }; // tamaño en píxeles de pantalla → unidades del mapa
      var etiqueta = op.etiqueta || ("Mapa de la zona piloto" + (op.faros && op.faros.length ? " con " + op.faros.length + " Faros" : "") + ".");

      var svg = el("svg", { viewBox: [f(vb.x), f(vb.y), f(vb.w), f(vb.h)].join(" "), preserveAspectRatio: "xMidYMid meet", "class": "mapa__svg", focusable: "false" }, raiz);
      if (op.seleccionable || typeof op.onMarcador === "function") {
        svg.setAttribute("role", "group");
        svg.setAttribute("aria-label", etiqueta + (op.seleccionable ? " Elige el cruce más cercano. Con teclado usa las flechas para moverte y Enter para elegir." : " Elige un aviso para ver su detalle."));
      } else {
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", etiqueta);
      }
      el("rect", { x: f(vb.x), y: f(vb.y), width: f(vb.w), height: f(vb.h), fill: C.fondo }, svg);

      /* calles */
      var calles = el("g", { "aria-hidden": "true", fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      var medios = {};
      zona.aristas.forEach(function (a) {
        var na = nodos[a.a], nb = nodos[a.b];
        if (!na || !nb) return;
        var c = curva(na, nb, a.id);
        medios[a.id] = c;
        var attrs = { d: c.d };
        if (a.luz === 1) { attrs.stroke = C.calle1; attrs["stroke-width"] = px(5); attrs["stroke-dasharray"] = px(2.5) + " " + px(7); }
        else if (a.luz === 2) { attrs.stroke = C.calle2; attrs["stroke-width"] = px(7); }
        else { attrs.stroke = C.calle3; attrs["stroke-width"] = px(9); }
        el("path", attrs, calles);
      });
      if (op.resaltarArista && medios[op.resaltarArista]) {
        el("path", { d: medios[op.resaltarArista].d, fill: "none", stroke: C.dorado, "stroke-width": px(5), "stroke-linecap": "round", "aria-hidden": "true" }, svg);
      }

      /* Faros. Con "estado": encendido = Miel, en revisión = círculo hueco Dorado, devuelto = gris.
         Sin estado: abierto = Miel; cerrado = Pizarra con borde Dorado. */
      var capaFaros = el("g", { "aria-hidden": "true" }, svg);
      var rFaro = px(op.radioFaro || 4.5);
      (op.faros || []).forEach(function (fa) {
        var n = nodos[fa.nodo_id]; if (!n) return;
        var c, nota;
        if (fa.estado === "encendido") { c = el("circle", { cx: n.x, cy: n.y, r: rFaro, fill: C.miel }, capaFaros); nota = " · Faro encendido"; }
        else if (fa.estado === "revision") { c = el("circle", { cx: n.x, cy: n.y, r: rFaro, fill: "none", stroke: C.dorado, "stroke-width": px(2.5) }, capaFaros); nota = " · en revisión"; }
        else if (fa.estado === "devuelto") { c = el("circle", { cx: n.x, cy: n.y, r: rFaro, fill: C.gris }, capaFaros); nota = " · devuelto"; }
        else {
          var ab = abierto(fa);
          c = el("circle", { cx: n.x, cy: n.y, r: rFaro, fill: ab ? C.miel : C.pizarra }, capaFaros);
          if (!ab) { c.setAttribute("stroke", C.dorado); c.setAttribute("stroke-width", px(2)); }
          nota = ab ? " · abierto ahora" : " · cerrado ahora";
        }
        if (fa.nombre) el("title", {}, c).textContent = fa.nombre + nota;
      });

      if (op.resaltarNodo !== undefined && op.resaltarNodo !== null && nodos[op.resaltarNodo]) {
        var rn = nodos[op.resaltarNodo];
        el("circle", { cx: rn.x, cy: rn.y, r: px(9), fill: "none", stroke: C.marfil, "stroke-width": px(2.5), "aria-hidden": "true" }, svg);
      }

      /* avisos: triángulos. Por revisar = Dorado; aprobado = Marino con borde Dorado; descartado = gris.
         Con onMarcador son botones (clic, toque, Enter o Espacio) con aria-label. */
      var interactivo = typeof op.onMarcador === "function";
      var capaAvisos = el("g", interactivo ? {} : { "aria-hidden": "true" }, svg);
      (op.marcadores || []).forEach(function (m) {
        var x, y;
        if (m.arista_id && medios[m.arista_id]) { x = medios[m.arista_id].mx; y = medios[m.arista_id].my; }
        else if (m.nodo_id && nodos[m.nodo_id]) { x = nodos[m.nodo_id].x; y = nodos[m.nodo_id].y; }
        else return;
        var sel = interactivo && m.id !== undefined && m.id === op.marcadorSeleccionado;
        var g = el("g", interactivo
          ? { "class": "mapa__marcador", role: "button", tabindex: "0", "aria-label": m.etiqueta || m.titulo || "Aviso", "aria-pressed": sel ? "true" : "false", "data-marcador": m.id }
          : {}, capaAvisos);
        var r = px(op.radioAviso || 8);
        if (interactivo) el("circle", { cx: x, cy: y, r: px(17), fill: "transparent" }, g);
        var relleno = m.estilo === "aprobado" ? C.fondo : (m.estilo === "descartado" ? C.gris : C.dorado);
        var borde = m.estilo === "aprobado" ? C.dorado : C.fondo;
        var t = el("polygon", { points: [x, y - r, x + r * 0.95, y + r * 0.7, x - r * 0.95, y + r * 0.7].map(f).join(","), fill: relleno, stroke: borde, "stroke-width": px(m.estilo === "aprobado" ? 2 : 1.5), "stroke-linejoin": "round" }, g);
        if (m.titulo) el("title", {}, t).textContent = m.titulo;
        if (interactivo) {
          el("circle", { cx: x, cy: y, r: px(13), fill: "none", "stroke-width": px(3), "class": "mapa__aro", stroke: sel ? C.marfil : "transparent" }, g);
          g.addEventListener("click", function (e) { e.stopPropagation(); op.onMarcador(m); });
          g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); op.onMarcador(m); } });
        }
      });

      /* cruces seleccionables: botones con teclado (flechas + Enter) */
      var botones = {};
      if (op.seleccionable) {
        var capa = el("g", {}, svg);
        zona.nodos.forEach(function (n, i) {
          var g = el("g", { "class": "mapa__nodo", role: "button", tabindex: "-1", "aria-label": "Cruce: " + n.nombre, "aria-pressed": "false", "data-nodo": n.id }, capa);
          el("circle", { cx: n.x, cy: n.y, r: px(16), fill: "transparent" }, g);
          el("circle", { cx: n.x, cy: n.y, r: px(3), fill: C.cruce }, g);
          el("circle", { cx: n.x, cy: n.y, r: px(11), fill: "none", "stroke-width": px(3), "class": "mapa__aro" }, g);
          botones[n.id] = g;
          g.addEventListener("click", function (e) { e.stopPropagation(); elegir(n.id, true); });
          g.addEventListener("keydown", function (e) { teclado(e, n); });
        });
        nodoActivo = (seleccionado !== null && botones[seleccionado]) ? seleccionado : (nodoActivo !== null && botones[nodoActivo] ? nodoActivo : zona.nodos[0].id);
        botones[nodoActivo].setAttribute("tabindex", "0");
        svg.addEventListener("click", function (e) {
          var r = svg.getBoundingClientRect();
          var k = Math.min(r.width / vb.w, r.height / vb.h);
          var ox = r.left + (r.width - vb.w * k) / 2, oy = r.top + (r.height - vb.h * k) / 2;
          var mx = vb.x + (e.clientX - ox) / k, my = vb.y + (e.clientY - oy) / k;
          var mejor = null, d2 = Infinity;
          zona.nodos.forEach(function (n) { var d = (n.x - mx) * (n.x - mx) + (n.y - my) * (n.y - my); if (d < d2) { d2 = d; mejor = n; } });
          if (mejor) elegir(mejor.id, true);
        });
        pintarSeleccion = function () {
          var viejo = svg.querySelector(".mapa__sel");
          if (viejo) viejo.parentNode.removeChild(viejo);
          Object.keys(botones).forEach(function (id) { botones[id].setAttribute("aria-pressed", Number(id) === seleccionado ? "true" : "false"); });
          if (seleccionado !== null && nodos[seleccionado]) {
            var n = nodos[seleccionado];
            el("circle", { "class": "mapa__sel", cx: n.x, cy: n.y, r: px(9), fill: C.dorado, stroke: C.marfil, "stroke-width": px(2.5), "pointer-events": "none", "aria-hidden": "true" }, svg);
          }
        };
        pintarSeleccion();
        svgActual = svg; botonesActual = botones; escalaActual = px;
      }

      /* leyenda */
      if (op.leyenda) raiz.appendChild(leyenda(op));
    }

    var pintarSeleccion = function () {};
    var svgActual = null, botonesActual = {}, escalaActual = null;

    function elegir(id, avisar) {
      id = Number(id);
      if (!nodos[id]) return;
      seleccionado = id;
      if (botonesActual[nodoActivo]) botonesActual[nodoActivo].setAttribute("tabindex", "-1");
      nodoActivo = id;
      if (botonesActual[id]) botonesActual[id].setAttribute("tabindex", "0");
      pintarSeleccion();
      if (avisar && typeof op.onSeleccionar === "function") op.onSeleccionar(id, nodos[id]);
    }

    function teclado(e, n) {
      var dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(n.id, true); return; }
      if (!dir) return;
      e.preventDefault();
      var mejor = null, puntaje = Infinity;
      zona.nodos.forEach(function (o) {
        if (o.id === n.id) return;
        var dx = o.x - n.x, dy = o.y - n.y;
        var a = dx * dir[0] + dy * dir[1];           // avance en la dirección pedida
        if (a <= 1) return;
        var p = Math.abs(dx * dir[1] - dy * dir[0]); // desvío lateral
        var sc = a + 2 * p;
        if (sc < puntaje) { puntaje = sc; mejor = o; }
      });
      if (mejor && botonesActual[mejor.id]) {
        botonesActual[n.id].setAttribute("tabindex", "-1");
        botonesActual[mejor.id].setAttribute("tabindex", "0");
        nodoActivo = mejor.id;
        botonesActual[mejor.id].focus();
      }
    }

    dibujar();

    /* Si el contenedor cambia de ancho (o estaba oculto al dibujar), se redibuja para mantener el tamaño en píxeles */
    var obs = null;
    if ("ResizeObserver" in window) {
      obs = new ResizeObserver(function () {
        if (destruido) return;
        var w = raiz.clientWidth;
        if (Math.abs(w - anchoPrevio) < 2) return;
        cancelAnimationFrame(cuadro);
        cuadro = requestAnimationFrame(function () {
          var enfocado = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute("data-nodo");
          dibujar();
          if (enfocado && botonesActual[enfocado]) botonesActual[enfocado].focus();
        });
      });
      obs.observe(raiz);
    }

    return {
      seleccionar: function (id, avisar) { elegir(id, !!avisar); },
      seleccionado: function () { return seleccionado; },
      actualizar: function (nuevas) {
        Object.assign(op, nuevas || {});
        if (op.seleccionado !== undefined && op.seleccionado !== null) seleccionado = Number(op.seleccionado);
        var activo = document.activeElement && document.activeElement.getAttribute ? document.activeElement.getAttribute("data-marcador") : null;
        dibujar();
        if (activo !== null) { var g = raiz.querySelector('[data-marcador="' + activo + '"]'); if (g) g.focus(); }
      },
      destruir: function () { destruido = true; if (obs) obs.disconnect(); raiz.parentNode && raiz.parentNode.removeChild(raiz); }
    };
  }

  function leyenda(op) {
    var ul = document.createElement("ul");
    ul.className = "mapa__leyenda";
    var items = [];
    var faros = op.faros || [];
    if (faros.length && faros.some(function (x) { return x.estado; })) {
      items.push(["faro-encendido", "Faro encendido"], ["faro-revision", "En revisión"], ["faro-devuelto", "Devuelto"]);
    } else if (faros.length) {
      items.push(["faro-abierto", "Faro abierto"], ["faro-cerrado", "Faro cerrado"]);
    }
    items.push(["calle3", "Calle bien iluminada"], ["calle1", "Poca luz"]);
    if (op.marcadores && op.marcadores.length) {
      var conEstilo = op.marcadores.some(function (m) { return m.estilo; });
      var estilos = {};
      op.marcadores.forEach(function (m) { estilos[m.estilo || "pendiente"] = true; });
      if (op.leyendaAvisos) estilos = { pendiente: true, aprobado: true, descartado: true };
      var nombres = { pendiente: "Aviso por revisar", aprobado: "Aviso aprobado", descartado: "Aviso descartado" };
      Object.keys(nombres).forEach(function (k) {
        if (estilos[k]) items.push(["aviso-" + k, (conEstilo || op.leyendaAvisos) ? nombres[k] : "Aviso de la calle"]);
      });
    }
    items.forEach(function (it) {
      var li = document.createElement("li");
      var svg = el("svg", { width: 28, height: 14, viewBox: "0 0 28 14", "aria-hidden": "true", focusable: "false" });
      var k = it[0];
      if (k === "faro-abierto" || k === "faro-encendido") el("circle", { cx: 14, cy: 7, r: 4.5, fill: C.miel }, svg);
      else if (k === "faro-cerrado") el("circle", { cx: 14, cy: 7, r: 4, fill: C.pizarra, stroke: C.dorado, "stroke-width": 2 }, svg);
      else if (k === "faro-revision") el("circle", { cx: 14, cy: 7, r: 4, fill: "none", stroke: C.dorado, "stroke-width": 2.5 }, svg);
      else if (k === "faro-devuelto") el("circle", { cx: 14, cy: 7, r: 4.5, fill: C.gris }, svg);
      else if (k.indexOf("aviso") === 0) {
        var est = k.slice(6);
        el("polygon", { points: "14,1 21,12 7,12", fill: est === "aprobado" ? C.fondo : (est === "descartado" ? C.gris : C.dorado), stroke: est === "aprobado" ? C.dorado : C.fondo, "stroke-width": est === "aprobado" ? 2 : 1.5, "stroke-linejoin": "round" }, svg);
      }
      else if (k === "calle3") el("path", { d: "M3 7H25", stroke: C.calle3, "stroke-width": 8, "stroke-linecap": "round" }, svg);
      else el("path", { d: "M3 7H25", stroke: C.calle1, "stroke-width": 5, "stroke-linecap": "round", "stroke-dasharray": "2.5 7" }, svg);
      li.appendChild(svg);
      var t = document.createElement("span");
      t.textContent = it[1];
      li.appendChild(t);
      ul.appendChild(li);
    });
    return ul;
  }

  window.Mapa = { render: render };
})();
