#!/usr/bin/env python3
"""Revisa el sitio estático antes de publicarlo en GitHub Pages (solo biblioteca estándar).

Comprueba en cada .html que:
  * cada href/src/srcset/use relativo apunta a un archivo que existe;
  * ninguna ruta empieza con "/" (ni "//") y ningún recurso propio usa http:// o https://;
  * hay <html lang="es">, <title>, meta description y meta viewport.
También revisa los url() de los .css y los textos de los .js que parecen rutas (assets/, data/).

Uso:  python tools/revisar_enlaces.py          (desde la raíz del repositorio o desde cualquier carpeta)
Sale con código 1 si hay errores.
"""
import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import unquote

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IGNORAR = {".git", "docs", "tools", "node_modules", "__pycache__", ".claude"}
OMITIR = ("#", "mailto:", "tel:", "javascript:", "data:")
ESPACIO_SVG = "http://www.w3.org/2000/svg"

errores, avisos = [], []


def rel(p):
    return os.path.relpath(p, RAIZ).replace(os.sep, "/")


def error(archivo, msg):
    errores.append("%s: %s" % (rel(archivo), msg))


def aviso(archivo, msg):
    avisos.append("%s: %s" % (rel(archivo), msg))


def existe(archivo, ruta):
    """¿Existe el recurso relativo `ruta` visto desde `archivo`? Quita ?consulta y #ancla."""
    limpio = unquote(re.split(r"[?#]", ruta, maxsplit=1)[0])
    if not limpio:
        return True
    base = os.path.dirname(archivo)
    destino = os.path.normpath(os.path.join(base, limpio))
    if limpio.endswith("/") or os.path.isdir(destino):
        return os.path.isfile(os.path.join(destino, "index.html"))
    return os.path.isfile(destino)


def revisar_ruta(archivo, ruta, etiqueta, es_recurso):
    ruta = ruta.strip()
    if not ruta or ruta.lower().startswith(OMITIR):
        return
    if ruta.startswith("//") or re.match(r"^[a-z][a-z0-9+.-]*://", ruta, re.I):
        if ruta.lower().startswith("http://") and es_recurso:
            error(archivo, "%s usa http:// (%s)" % (etiqueta, ruta))
        elif es_recurso:
            error(archivo, "%s carga un recurso externo (%s); el sitio no debe depender de CDNs" % (etiqueta, ruta))
        else:
            aviso(archivo, "enlace externo en %s: %s" % (etiqueta, ruta))
        return
    if ruta.startswith("/"):
        error(archivo, "%s empieza con «/» (%s): debe ser relativa" % (etiqueta, ruta))
        return
    if not existe(archivo, ruta):
        error(archivo, "%s apunta a algo que no existe (%s)" % (etiqueta, ruta))


class Revisor(HTMLParser):
    def __init__(self, archivo):
        super().__init__(convert_charrefs=True)
        self.archivo = archivo
        self.lang = None
        self.titulo = ""
        self.en_titulo = False
        self.descripcion = False
        self.viewport = False
        self.icono = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        elif tag == "title":
            self.en_titulo = True
        elif tag == "meta":
            nombre = (a.get("name") or "").lower()
            if nombre == "description" and (a.get("content") or "").strip():
                self.descripcion = True
            if nombre == "viewport":
                self.viewport = True
            if (a.get("property") or "").lower() == "og:image" and a.get("content"):
                revisar_ruta(self.archivo, a["content"], "og:image", True)
        elif tag == "base":
            aviso(self.archivo, "usa <base>; solo se admite en 404.html y por una razón documentada")
        if tag == "link":
            if "icon" in (a.get("rel") or "").lower():
                self.icono = True
            if a.get("href"):
                revisar_ruta(self.archivo, a["href"], "<link href>", True)
        elif tag == "a" and a.get("href") is not None:
            revisar_ruta(self.archivo, a["href"], "<a href>", False)
        elif tag in ("script", "img", "source", "video", "audio", "iframe") and a.get("src"):
            revisar_ruta(self.archivo, a["src"], "<%s src>" % tag, True)
        if tag in ("img", "source") and a.get("srcset"):
            for parte in a["srcset"].split(","):
                if parte.strip():
                    revisar_ruta(self.archivo, parte.strip().split()[0], "<%s srcset>" % tag, True)
        if tag == "use":
            ref = a.get("href") or a.get("xlink:href")
            if ref:
                revisar_ruta(self.archivo, ref, "<use href>", True)

    def handle_endtag(self, tag):
        if tag == "title":
            self.en_titulo = False

    def handle_data(self, data):
        if self.en_titulo:
            self.titulo += data


def revisar_html(archivo):
    with open(archivo, encoding="utf8") as f:
        texto = f.read()
    r = Revisor(archivo)
    r.feed(texto)
    if (r.lang or "").lower() != "es":
        error(archivo, 'falta <html lang="es"> (tiene %r)' % r.lang)
    if not r.titulo.strip():
        error(archivo, "falta <title>")
    if not r.descripcion:
        error(archivo, 'falta <meta name="description" content="…">')
    if not r.viewport:
        error(archivo, 'falta <meta name="viewport">')
    if not r.icono:
        error(archivo, "falta el favicon (<link rel=\"icon\">)")


def revisar_css(archivo):
    with open(archivo, encoding="utf8") as f:
        texto = f.read()
    for m in re.finditer(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", texto):
        revisar_ruta(archivo, m.group(1), "url()", True)


def revisar_js(archivo):
    with open(archivo, encoding="utf8") as f:
        texto = f.read()
    for m in re.finditer(r"https?://[^\s\"'`)]+", texto):
        if m.group(0).startswith(ESPACIO_SVG):
            continue
        error(archivo, "menciona una URL externa (%s)" % m.group(0))
    # textos que parecen rutas de recursos propios: se resuelven contra la raíz quitando los "../" iniciales
    for m in re.finditer(r"[\"'`]((?:\.\./)*(?:assets|data|css|js)/[\w./-]+\.[a-z0-9]+)(?:[#?][^\"'`]*)?[\"'`]", texto):
        ruta = re.sub(r"^(?:\.\./)+", "", m.group(1))
        if not os.path.isfile(os.path.join(RAIZ, ruta)):
            error(archivo, "ruta que no existe en el sitio (%s)" % m.group(1))
    for m in re.finditer(r"[\"'`](/(?:assets|data|css|js|comercio|admin)/[^\"'`]*)[\"'`]", texto):
        error(archivo, "ruta absoluta con «/» (%s)" % m.group(1))


def main():
    html = css = js = 0
    for carpeta, dirs, archivos in os.walk(RAIZ):
        dirs[:] = [d for d in dirs if d not in IGNORAR]
        for nombre in sorted(archivos):
            ruta = os.path.join(carpeta, nombre)
            if nombre.endswith(".html"):
                revisar_html(ruta); html += 1
            elif nombre.endswith(".css"):
                revisar_css(ruta); css += 1
            elif nombre.endswith(".js"):
                revisar_js(ruta); js += 1
    print("Revisados: %d páginas .html, %d .css, %d .js" % (html, css, js))
    for a in avisos:
        print("AVISO  " + a)
    for e in errores:
        print("ERROR  " + e)
    if errores:
        print("\n%d error(es)." % len(errores))
        return 1
    print("\nTodo en orden: sin errores.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
