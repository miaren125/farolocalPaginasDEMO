/* Datos de demostración de FaroLocal (coinciden con la app del peatón).
   Esto es SOLO una demostración: las contraseñas de ejemplo están a la vista a propósito
   y js/store.js las guarda como hash en localStorage. No hay servidor ni datos reales.

   Los Faros aprobados (nodo, giro, horario, servicios, vistas y rutas) salen de data/zona.json;
   aquí se agregan los negocios en revisión y rechazado, los titulares y lo demás. */
(function () {
  "use strict";

  var COMERCIO = "Comercio123";

  window.FARO_SEED = {
    resumen: { peatones: 148 },

    usuarios: [
      { nombre: "Administración FaroLocal", correo: "admin@farolocal.mx", telefono: "6621000000", rol: "admin", password: "Admin123!" },
      { nombre: "Rosa Beltrán", correo: "farmacia@farolocal.mx", telefono: "6621000004", rol: "comercio", password: COMERCIO },
      { nombre: "Chuy Moreno", correo: "esquina@farolocal.mx", telefono: "6621000005", rol: "comercio", password: COMERCIO },
      { nombre: "Beto Salazar", correo: "taqueria@farolocal.mx", telefono: "6621000006", rol: "comercio", password: COMERCIO },
      { nombre: "Lupita Ibarra", correo: "gasolinera@farolocal.mx", telefono: "6621000007", rol: "comercio", password: COMERCIO },
      { nombre: "Dani Ortega", correo: "luna@farolocal.mx", telefono: "6621000008", rol: "comercio", password: COMERCIO },
      { nombre: "Jesús Corrales", correo: "donchuy@farolocal.mx", telefono: "6621000009", rol: "comercio", password: COMERCIO },
      { nombre: "Tere Acosta", correo: "tere@farolocal.mx", telefono: "6621000010", rol: "comercio", password: COMERCIO },
      { nombre: "Marco Vega", correo: "sol@farolocal.mx", telefono: "6621000011", rol: "comercio", password: COMERCIO },
      { nombre: "Nacho Pineda", correo: "compadres@farolocal.mx", telefono: "6621000012", rol: "comercio", password: COMERCIO }
    ],

    /* Titular de cada Faro aprobado de zona.json, por nombre del negocio */
    titularesDeFaros: {
      "Farmacia Guadalupe 24 h": "farmacia@farolocal.mx",
      "Tienda La Esquina": "esquina@farolocal.mx",
      "Taquería El Faro Norteño": "taqueria@farolocal.mx",
      "Gasolinera Rosales": "gasolinera@farolocal.mx",
      "Cafetería Luna": "luna@farolocal.mx",
      "Abarrotes Don Chuy": "donchuy@farolocal.mx"
    },

    /* Negocios que no están aprobados (la dirección se arma con el nombre del cruce) */
    negociosExtra: [
      { nombre: "Lonchería Doña Tere", titular_correo: "tere@farolocal.mx", nodo_id: 44, giro: "Lonchería", abre: "17:00", cierra: "03:00", servicios: ["Agua", "Baño"], estado: "pendiente" },
      { nombre: "Papelería y Copias Sol", titular_correo: "sol@farolocal.mx", nodo_id: 15, giro: "Papelería", abre: "09:00", cierra: "22:00", servicios: ["Teléfono"], estado: "pendiente" },
      { nombre: "Bar Los Compadres", titular_correo: "compadres@farolocal.mx", nodo_id: 6, giro: "Bar", abre: "20:00", cierra: "03:00", servicios: [], estado: "rechazado",
        motivo_rechazo: "El negocio no ofrece ningún servicio de apoyo a peatones. Agrega al menos uno y reenvía." }
    ],

    /* Vigencia: de (hoy + diasInicio) a (hoy + diasFin), calculada al sembrar */
    cupones: [
      { negocio: "Farmacia Guadalupe 24 h", titulo: "10 % en vitaminas", descripcion: "Presenta tu cupón en caja. No aplica con otras promociones.", diasInicio: -3, diasFin: 60, activo: true },
      { negocio: "Tienda La Esquina", titulo: "Agua gratis con tu compra", descripcion: "Una botella de 600 ml con cualquier compra mayor a $30.", diasInicio: -3, diasFin: 60, activo: true },
      { negocio: "Taquería El Faro Norteño", titulo: "Refresco gratis con 3 tacos", descripcion: "Válido de lunes a jueves.", diasInicio: -3, diasFin: 60, activo: true },
      { negocio: "Cafetería Luna", titulo: "2×1 en café americano", descripcion: "Después de las 8 p. m.", diasInicio: -3, diasFin: 60, activo: true },
      { negocio: "Gasolinera Rosales", titulo: "Botella de agua de cortesía", descripcion: "Con carga mínima de $100.", diasInicio: -3, diasFin: 60, activo: true },
      { negocio: "Abarrotes Don Chuy", titulo: "Cupón vencido de prueba", descripcion: "Ya no debe mostrarse.", diasInicio: -40, diasFin: -10, activo: true },
      { negocio: "Abarrotes Don Chuy", titulo: "Cupón desactivado de prueba", descripcion: "Ya no debe mostrarse.", diasInicio: -3, diasFin: 60, activo: false }
    ],

    /* Cada reporte es sobre un tramo con luz 1 de zona.json (si el tramo no existe, se toma otro con luz 1) */
    reportes: [
      { arista_id: 20, tipo: "Luminaria apagada", descripcion: "Tres postes seguidos sin luz.", estado: "aprobado" },
      { arista_id: 34, tipo: "Tramo sin iluminación", descripcion: "Calle completamente oscura de noche.", estado: "aprobado" },
      { arista_id: 41, tipo: "Banqueta en mal estado", descripcion: "Hoyos grandes en la banqueta.", estado: "pendiente" },
      { arista_id: 49, tipo: "Poco tránsito de noche", descripcion: "Casi nadie pasa después de las 10.", estado: "pendiente" }
    ],

    giros: ["Abarrotes", "Farmacia", "Taquería", "Cafetería", "Lonchería", "Gasolinera", "Papelería", "Otro"],
    servicios: ["Agua", "Teléfono", "Baño", "Cámara de vigilancia", "Personal toda la noche"],
    tiposReporte: ["Luminaria apagada", "Tramo sin iluminación", "Banqueta en mal estado", "Poco tránsito de noche"]
  };
})();
