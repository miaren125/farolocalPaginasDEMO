/* Datos de demostración de FaroLocal. Coinciden con la app del peatón.
   Todo vive en localStorage (ver js/store.js); no hay servidor. */
(function () {
  "use strict";

  window.FARO_SEED = {
    version: 1,
    usuarios: [
      { correo: "admin@farolocal.mx", contrasena: "Admin123!", rol: "admin", nombre: "Administración FaroLocal" },
      { correo: "esquina@farolocal.mx", contrasena: "Comercio123", rol: "comercio", nombre: "Abarrotes La Esquina", negocioId: "esquina" },
      { correo: "farmacia@farolocal.mx", contrasena: "Comercio123", rol: "comercio", nombre: "Farmacia del Centro", negocioId: "farmacia" },
      { correo: "tere@farolocal.mx", contrasena: "Comercio123", rol: "comercio", nombre: "Tortillería de Tere", negocioId: "tere" },
      { correo: "compadres@farolocal.mx", contrasena: "Comercio123", rol: "comercio", nombre: "Taquería Los Compadres", negocioId: "compadres" }
    ],
    /* estado: aprobado = "Faro encendido" · pendiente = "En revisión" · rechazado = "Necesita cambios" */
    negocios: [
      { id: "esquina", nombre: "Abarrotes La Esquina", estado: "aprobado" },
      { id: "farmacia", nombre: "Farmacia del Centro", estado: "aprobado" },
      { id: "tere", nombre: "Tortillería de Tere", estado: "pendiente" },
      { id: "compadres", nombre: "Taquería Los Compadres", estado: "rechazado", motivo: "Falta confirmar el horario y la dirección." }
    ],
    cupones: [],
    avisos: []
  };
})();
