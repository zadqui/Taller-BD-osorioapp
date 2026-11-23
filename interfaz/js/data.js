/* =====================================================================
   DATOS DE DEMOSTRACIÓN
   Reflejan el estado de bd_transporte DESPUÉS de ejecutar
   01_CREATE_BD_TRANSPORTE_REENVIO.sql y 02_INSERT_BD_TRANSPORTE_REENVIO.sql
   (incluye las 7 llamadas a sp_asignar_mercancia_viaje).

   PENDIENTE: sustituir este archivo por llamadas a una API que consulte
   MySQL (ver INFORME_PENDIENTES.md, sección "Conexión con la BD").
   ===================================================================== */

const SEED = {
  localidad: [
    { id_localidad: 1, nombre_localidad: "Mérida" },
    { id_localidad: 2, nombre_localidad: "Cancún" },
    { id_localidad: 3, nombre_localidad: "Chetumal" },
    { id_localidad: 4, nombre_localidad: "Campeche" },
    { id_localidad: 5, nombre_localidad: "Playa del Carmen" },
    { id_localidad: 6, nombre_localidad: "Ciudad del Carmen" },
  ],

  modalidad_entrega: [
    { id_modalidad_entrega: 1, nombre_modalidad: "Domicilio", descripcion: "Entrega en el domicilio indicado por el cliente." },
    { id_modalidad_entrega: 2, nombre_modalidad: "Sucursal", descripcion: "Entrega para recoger en una sucursal; significado pendiente de confirmar." },
    { id_modalidad_entrega: 3, nombre_modalidad: "Ocurrencia", descripcion: "Modalidad por ocurrencia; significado pendiente de confirmar." },
  ],

  modalidad_cobro: ["Contado", "Crédito a 15 días", "Contra entrega"],

  cat_estado_mercancia: [
    { id: 1, nombre: "En espera", clase: "espera" },
    { id: 2, nombre: "Asignada a viaje", clase: "asignada" },
    { id: 3, nombre: "En tránsito", clase: "transito" },
    { id: 4, nombre: "Entregada", clase: "entregada" },
  ],

  cat_estado_viaje: [
    { id: 1, nombre: "Programado", clase: "asignada" },
    { id: 2, nombre: "En tránsito", clase: "transito" },
    { id: 3, nombre: "Finalizado", clase: "entregada" },
    { id: 4, nombre: "Cancelado", clase: "neutral" },
  ],

  cliente: [
    { id_cliente: 1, nombre_cliente: "Juan Perez", telefono_cliente: "9991234567" },
    { id_cliente: 2, nombre_cliente: "Maria Lopez", telefono_cliente: "9997654321" },
    { id_cliente: 3, nombre_cliente: "Carlos Ramirez", telefono_cliente: "9994567890" },
    { id_cliente: 4, nombre_cliente: "Ana Martinez", telefono_cliente: "9991112233" },
    { id_cliente: 5, nombre_cliente: "Luis Herrera", telefono_cliente: "9992223344" },
    { id_cliente: 6, nombre_cliente: "Fernanda Castro", telefono_cliente: "9993334455" },
    { id_cliente: 7, nombre_cliente: "Jorge Medina", telefono_cliente: "9994445566" },
    { id_cliente: 8, nombre_cliente: "Sofia Gomez", telefono_cliente: "9995556677" },
  ],

  ruta: [
    { id_ruta: 1, nombre_ruta: "Ruta Quintana Roo (Cancun - Chetumal)" },
    { id_ruta: 2, nombre_ruta: "Ruta Campeche (Ciudad del Carmen)" },
  ],

  unidad: [
    { id_unidad: 1, matricula: "ECO-001", tipo_unidad: "Reparto local", capacidad_toneladas: 5.0 },
    { id_unidad: 2, matricula: "ECO-002", tipo_unidad: "Foraneo Trailer", capacidad_toneladas: 32.0 },
    { id_unidad: 3, matricula: "ECO-003", tipo_unidad: "Reparto local", capacidad_toneladas: 4.5 },
    { id_unidad: 4, matricula: "ECO-004", tipo_unidad: "Foraneo Trailer", capacidad_toneladas: 28.0 },
    { id_unidad: 5, matricula: "ECO-005", tipo_unidad: "Reparto local", capacidad_toneladas: 3.8 },
    { id_unidad: 6, matricula: "ECO-006", tipo_unidad: "Foraneo Trailer", capacidad_toneladas: 32.0 },
  ],

  viaje: [
    { id_viaje: 1, id_ruta: 1, id_unidad: 2, id_estado_viaje: 1, fecha_programada: "2026-11-09", fecha_salida: null },
    { id_viaje: 2, id_ruta: 2, id_unidad: 2, id_estado_viaje: 1, fecha_programada: "2026-11-10", fecha_salida: null },
    { id_viaje: 3, id_ruta: 1, id_unidad: 1, id_estado_viaje: 1, fecha_programada: "2026-11-11", fecha_salida: null },
    { id_viaje: 4, id_ruta: 2, id_unidad: 4, id_estado_viaje: 1, fecha_programada: "2026-11-12", fecha_salida: null },
    { id_viaje: 5, id_ruta: 1, id_unidad: 2, id_estado_viaje: 1, fecha_programada: "2026-11-13", fecha_salida: null },
    { id_viaje: 6, id_ruta: 2, id_unidad: 3, id_estado_viaje: 1, fecha_programada: "2026-11-14", fecha_salida: null },
    { id_viaje: 7, id_ruta: 1, id_unidad: 4, id_estado_viaje: 1, fecha_programada: "2026-11-15", fecha_salida: null },
  ],

  mercancia: [
    { id_mercancia: 1, id_cliente: 1, id_viaje: 1, codigo_seguimiento: "OSO-7K4M-91QX", peso_mercancia: 50, tipo_mercancia: "No peligrosa", id_origen: 1, id_destino: 2, id_modalidad_entrega: 1, modalidad_cobro: "Contado", id_estado_mercancia: 2, ubicacion_actual: "Bodega Cancun", fecha_registro: "2026-11-08 08:00:00" },
    { id_mercancia: 2, id_cliente: 2, id_viaje: 2, codigo_seguimiento: "OSO-3P8R-62WN", peso_mercancia: 120, tipo_mercancia: "No peligrosa", id_origen: 4, id_destino: 5, id_modalidad_entrega: 2, modalidad_cobro: "Crédito a 15 días", id_estado_mercancia: 2, ubicacion_actual: "Bodega Campeche", fecha_registro: "2026-11-08 08:30:00" },
    { id_mercancia: 3, id_cliente: 3, id_viaje: 3, codigo_seguimiento: "OSO-9D2F-47LC", peso_mercancia: 75, tipo_mercancia: "No peligrosa", id_origen: 1, id_destino: 3, id_modalidad_entrega: 1, modalidad_cobro: "Contado", id_estado_mercancia: 2, ubicacion_actual: "Bodega Cancun", fecha_registro: "2026-11-08 09:00:00" },
    { id_mercancia: 4, id_cliente: 4, id_viaje: 4, codigo_seguimiento: "OSO-5H7T-38VB", peso_mercancia: 140, tipo_mercancia: "No peligrosa", id_origen: 4, id_destino: 6, id_modalidad_entrega: 2, modalidad_cobro: "Crédito a 15 días", id_estado_mercancia: 2, ubicacion_actual: "Bodega Campeche", fecha_registro: "2026-11-08 09:30:00" },
    { id_mercancia: 5, id_cliente: 5, id_viaje: 5, codigo_seguimiento: "OSO-2N6C-84ZA", peso_mercancia: 60, tipo_mercancia: "No peligrosa", id_origen: 1, id_destino: 2, id_modalidad_entrega: 1, modalidad_cobro: "Contra entrega", id_estado_mercancia: 2, ubicacion_actual: "Bodega Cancun", fecha_registro: "2026-11-08 10:00:00" },
    { id_mercancia: 6, id_cliente: 6, id_viaje: 6, codigo_seguimiento: "OSO-8J3W-15RP", peso_mercancia: 200, tipo_mercancia: "No peligrosa", id_origen: 4, id_destino: 6, id_modalidad_entrega: 2, modalidad_cobro: "Crédito a 15 días", id_estado_mercancia: 2, ubicacion_actual: "Bodega Campeche", fecha_registro: "2026-11-08 10:30:00" },
    { id_mercancia: 7, id_cliente: 7, id_viaje: 7, codigo_seguimiento: "OSO-4Q9L-73DX", peso_mercancia: 95, tipo_mercancia: "No peligrosa", id_origen: 1, id_destino: 3, id_modalidad_entrega: 1, modalidad_cobro: "Contado", id_estado_mercancia: 2, ubicacion_actual: "Bodega Cancun", fecha_registro: "2026-11-08 11:00:00" },
    { id_mercancia: 8, id_cliente: 8, id_viaje: null, codigo_seguimiento: "OSO-6B2Y-58FH", peso_mercancia: 85, tipo_mercancia: "No peligrosa", id_origen: 4, id_destino: 4, id_modalidad_entrega: 3, modalidad_cobro: "Contado", id_estado_mercancia: 1, ubicacion_actual: "Bodega Campeche", fecha_registro: "2026-11-08 11:30:00" },
    { id_mercancia: 9, id_cliente: 1, id_viaje: null, codigo_seguimiento: "OSO-1M7A-26KC", peso_mercancia: 110, tipo_mercancia: "No peligrosa", id_origen: 1, id_destino: 5, id_modalidad_entrega: 1, modalidad_cobro: "Contra entrega", id_estado_mercancia: 1, ubicacion_actual: "Bodega Cancun", fecha_registro: "2026-11-08 12:00:00" },
  ],

  // Generado por los triggers trg_mercancia_ai/au_registrar_movimiento.
  // La hora de los movimientos de asignación es ilustrativa (CURRENT_TIMESTAMP al ejecutar el script).
  movimiento_mercancia: (() => {
    const regs = [
      [1, "2026-11-08 08:00:00", "Bodega Cancun"], [2, "2026-11-08 08:30:00", "Bodega Campeche"],
      [3, "2026-11-08 09:00:00", "Bodega Cancun"], [4, "2026-11-08 09:30:00", "Bodega Campeche"],
      [5, "2026-11-08 10:00:00", "Bodega Cancun"], [6, "2026-11-08 10:30:00", "Bodega Campeche"],
      [7, "2026-11-08 11:00:00", "Bodega Cancun"], [8, "2026-11-08 11:30:00", "Bodega Campeche"],
      [9, "2026-11-08 12:00:00", "Bodega Cancun"],
    ];
    const out = [];
    let id = 1;
    regs.forEach(([m, f, u]) => out.push({ id_movimiento: id++, id_mercancia: m, id_estado_mercancia: 1, fecha_hora: f, ubicacion: u, observacion: "Registro inicial de la mercancía." }));
    regs.slice(0, 7).forEach(([m, , u], i) => out.push({ id_movimiento: id++, id_mercancia: m, id_estado_mercancia: 2, fecha_hora: `2026-11-08 13:0${i}:00`, ubicacion: u, observacion: "Actualización del estado o ubicación." }));
    return out;
  })(),
};
