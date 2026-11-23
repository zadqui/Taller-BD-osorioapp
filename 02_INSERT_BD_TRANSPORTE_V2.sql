/* =====================================================================
   DATOS DE PRUEBA: bd_transporte  —  VERSIÓN 2
   Ejecutar después de 01_CREATE_BD_TRANSPORTE_V2.sql

   Basado en 02_INSERT_BD_TRANSPORTE_REENVIO.sql (que se conserva sin
   cambios). No contiene pagos, montos, vencimientos ni adeudos.

   CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
   - Nuevos catálogos: bodega, modalidad_cobro, cat_tipo_unidad y
     ruta_localidad.
   - unidad usa id_tipo_unidad en lugar de texto.
   - mercancia usa id_bodega_recepcion e id_modalidad_cobro.
   - Mercancía 8: destino cambiado de Campeche a Ciudad del Carmen,
     porque origen y destino ya no pueden ser iguales [M1].
   - Viaje 2: ruta cambiada de Campeche a Quintana Roo, porque lleva la
     mercancía 2 con destino Playa del Carmen [M3].
   - Ubicación "Bodega Cancun" pasa a "Bodega Cancún" (nombre de la
     bodega en el catálogo).

   NOTAS HEREDADAS:
   - Los pesos se interpretan como kg.
   - La modalidad de cobro de cada envío debe confirmarse con la empresa.
   - "Sucursal" y "Ocurrencia" siguen diferenciadas hasta confirmar.
   - Las matrículas ECO-xxx son ficticias.
   - Los viajes quedan programados: los pesos de muestra no alcanzan el
     50 % de la capacidad de las unidades.
   ===================================================================== */

USE bd_transporte;

/* Limpieza segura para volver a ejecutar el script. */
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE movimiento_mercancia;
TRUNCATE TABLE mercancia;
TRUNCATE TABLE viaje;
TRUNCATE TABLE unidad;
TRUNCATE TABLE ruta_localidad;
TRUNCATE TABLE ruta;
TRUNCATE TABLE cliente;
TRUNCATE TABLE cat_estado_viaje;
TRUNCATE TABLE cat_estado_mercancia;
TRUNCATE TABLE cat_tipo_unidad;
TRUNCATE TABLE modalidad_cobro;
TRUNCATE TABLE modalidad_entrega;
TRUNCATE TABLE bodega;
TRUNCATE TABLE localidad;
SET FOREIGN_KEY_CHECKS = 1;

/* ---------------------------------------------------------------------
   1. CATÁLOGO DE LOCALIDADES
   --------------------------------------------------------------------- */

INSERT INTO localidad (id_localidad, nombre_localidad) VALUES
(1, 'Mérida'),
(2, 'Cancún'),
(3, 'Chetumal'),
(4, 'Campeche'),
(5, 'Playa del Carmen'),
(6, 'Ciudad del Carmen');

/* ---------------------------------------------------------------------
   2. CATÁLOGO DE BODEGAS [M4]
   Según el anteproyecto, la empresa tiene bodegas en Cancún y Campeche.
   --------------------------------------------------------------------- */

INSERT INTO bodega (id_bodega, nombre_bodega, id_localidad) VALUES
(1, 'Bodega Cancún', 2),
(2, 'Bodega Campeche', 4);

/* ---------------------------------------------------------------------
   3. CATÁLOGO DE MODALIDADES DE ENTREGA
   --------------------------------------------------------------------- */

INSERT INTO modalidad_entrega
    (id_modalidad_entrega, nombre_modalidad, descripcion)
VALUES
(1, 'Domicilio', 'Entrega en el domicilio indicado por el cliente.'),
(2, 'Sucursal', 'Entrega para recoger en una sucursal; significado pendiente de confirmar.'),
(3, 'Ocurrencia', 'Modalidad por ocurrencia; significado pendiente de confirmar.');

/* ---------------------------------------------------------------------
   4. CATÁLOGO DE MODALIDADES DE COBRO [M6]
   --------------------------------------------------------------------- */

INSERT INTO modalidad_cobro
    (id_modalidad_cobro, nombre_modalidad, descripcion)
VALUES
(1, 'Contado', 'Pago al momento de recibir la mercancía.'),
(2, 'Crédito a 15 días', 'Crédito para clientes con volumen.'),
(3, 'Contra entrega', 'Cobro al entregar la mercancía.');

/* ---------------------------------------------------------------------
   5. CATÁLOGO DE TIPOS DE UNIDAD [M5]
   El mínimo del 50 % queda activo en ambos tipos hasta que la empresa
   confirme si aplica al reparto local.
   --------------------------------------------------------------------- */

INSERT INTO cat_tipo_unidad
    (id_tipo_unidad, nombre_tipo, aplica_minimo_carga, descripcion)
VALUES
(1, 'Reparto local', TRUE, 'Vehículo para entregas dentro de la ciudad; mínimo del 50 % pendiente de confirmar.'),
(2, 'Foráneo tráiler', TRUE, 'Camión de hasta 32 toneladas para traslados entre ciudades.');

/* ---------------------------------------------------------------------
   6. CATÁLOGOS DE ESTADOS
   --------------------------------------------------------------------- */

INSERT INTO cat_estado_mercancia
    (id_estado_mercancia, nombre_estado, descripcion)
VALUES
(1, 'En espera', 'Mercancía recibida sin viaje asignado.'),
(2, 'Asignada a viaje', 'Mercancía vinculada a un viaje programado.'),
(3, 'En tránsito', 'Mercancía cuyo viaje ya fue despachado.'),
(4, 'Entregada', 'Mercancía entregada al destinatario.');

INSERT INTO cat_estado_viaje
    (id_estado_viaje, nombre_estado, descripcion)
VALUES
(1, 'Programado', 'Viaje creado que todavía no ha salido.'),
(2, 'En tránsito', 'Unidad despachada y en recorrido.'),
(3, 'Finalizado', 'Viaje concluido.'),
(4, 'Cancelado', 'Viaje cancelado.');

/* ---------------------------------------------------------------------
   7. CLIENTES
   --------------------------------------------------------------------- */

INSERT INTO cliente (nombre_cliente, telefono_cliente) VALUES
('Juan Perez', '9991234567'),
('Maria Lopez', '9997654321'),
('Carlos Ramirez', '9994567890'),
('Ana Martinez', '9991112233'),
('Luis Herrera', '9992223344'),
('Fernanda Castro', '9993334455'),
('Jorge Medina', '9994445566'),
('Sofia Gomez', '9995556677');

/* ---------------------------------------------------------------------
   8. RUTAS Y SUS LOCALIDADES [M3]
   Solo se registran las localidades de destino que atiende cada ruta.
   PENDIENTE: confirmar la localidad "Puerto" del anteproyecto.
   --------------------------------------------------------------------- */

INSERT INTO ruta (id_ruta, nombre_ruta) VALUES
(1, 'Ruta Quintana Roo (Cancun - Chetumal)'),
(2, 'Ruta Campeche (Ciudad del Carmen)');

INSERT INTO ruta_localidad (id_ruta, id_localidad, orden) VALUES
(1, 2, 1),   -- Cancún
(1, 5, 2),   -- Playa del Carmen
(1, 3, 3),   -- Chetumal
(2, 4, 1),   -- Campeche
(2, 6, 2);   -- Ciudad del Carmen

/* ---------------------------------------------------------------------
   9. UNIDADES
   --------------------------------------------------------------------- */

INSERT INTO unidad
    (matricula, id_tipo_unidad, capacidad_toneladas)
VALUES
('ECO-001', 1, 5.00),
('ECO-002', 2, 32.00),
('ECO-003', 1, 4.50),
('ECO-004', 2, 28.00),
('ECO-005', 1, 3.80),
('ECO-006', 2, 32.00);

/* ---------------------------------------------------------------------
   10. VIAJES
   Ninguna unidad repite fecha, así que pasan la validación [M2].
   El viaje 2 ahora usa la ruta 1 (ver encabezado).
   --------------------------------------------------------------------- */

INSERT INTO viaje
    (id_ruta, id_unidad, id_estado_viaje, fecha_programada, fecha_salida)
VALUES
(1, 2, 1, '2026-11-09', NULL),
(1, 2, 1, '2026-11-10', NULL),
(1, 1, 1, '2026-11-11', NULL),
(2, 4, 1, '2026-11-12', NULL),
(1, 2, 1, '2026-11-13', NULL),
(2, 3, 1, '2026-11-14', NULL),
(1, 4, 1, '2026-11-15', NULL);

/* ---------------------------------------------------------------------
   11. MERCANCÍAS
   La ubicación inicial se toma del nombre de la bodega (trigger).
   Columnas de cobro: 1 Contado, 2 Crédito a 15 días, 3 Contra entrega.
   Columnas de bodega: 1 Bodega Cancún, 2 Bodega Campeche.
   --------------------------------------------------------------------- */

INSERT INTO mercancia (
    id_cliente,
    codigo_seguimiento,
    peso_mercancia,
    tipo_mercancia,
    id_origen,
    id_destino,
    id_bodega_recepcion,
    id_modalidad_entrega,
    id_modalidad_cobro,
    fecha_registro
) VALUES
(1, 'OSO-7K4M-91QX',  50.00, 'No peligrosa', 1, 2, 1, 1, 1, '2026-11-08 08:00:00'),
(2, 'OSO-3P8R-62WN', 120.00, 'No peligrosa', 4, 5, 2, 2, 2, '2026-11-08 08:30:00'),
(3, 'OSO-9D2F-47LC',  75.00, 'No peligrosa', 1, 3, 1, 1, 1, '2026-11-08 09:00:00'),
(4, 'OSO-5H7T-38VB', 140.00, 'No peligrosa', 4, 6, 2, 2, 2, '2026-11-08 09:30:00'),
(5, 'OSO-2N6C-84ZA',  60.00, 'No peligrosa', 1, 2, 1, 1, 3, '2026-11-08 10:00:00'),
(6, 'OSO-8J3W-15RP', 200.00, 'No peligrosa', 4, 6, 2, 2, 2, '2026-11-08 10:30:00'),
(7, 'OSO-4Q9L-73DX',  95.00, 'No peligrosa', 1, 3, 1, 1, 1, '2026-11-08 11:00:00'),
(8, 'OSO-6B2Y-58FH',  85.00, 'No peligrosa', 4, 6, 2, 3, 1, '2026-11-08 11:30:00'),
(1, 'OSO-1M7A-26KC', 110.00, 'No peligrosa', 1, 5, 1, 1, 3, '2026-11-08 12:00:00');

/* Los primeros siete envíos se asignan a viajes programados. El
   procedimiento valida estado, ruta [M3] y capacidad. */

CALL sp_asignar_mercancia_viaje(1, 1, 'Bodega Cancún');
CALL sp_asignar_mercancia_viaje(2, 2, 'Bodega Campeche');
CALL sp_asignar_mercancia_viaje(3, 3, 'Bodega Cancún');
CALL sp_asignar_mercancia_viaje(4, 4, 'Bodega Campeche');
CALL sp_asignar_mercancia_viaje(5, 5, 'Bodega Cancún');
CALL sp_asignar_mercancia_viaje(6, 6, 'Bodega Campeche');
CALL sp_asignar_mercancia_viaje(7, 7, 'Bodega Cancún');

/* ---------------------------------------------------------------------
   12. CONSULTAS DE COMPROBACIÓN
   --------------------------------------------------------------------- */

-- Mercancía que todavía no tiene viaje asignado:
SELECT *
FROM vista_mercancia_en_espera
ORDER BY fecha_registro;

-- Carga de cada viaje, tipo de unidad y porcentaje de capacidad:
SELECT *
FROM vista_carga_viajes
ORDER BY id_viaje;

-- Estado actual, localidades, bodega y modalidades de cada envío:
SELECT
    m.id_mercancia,
    m.codigo_seguimiento,
    c.nombre_cliente,
    lo.nombre_localidad AS origen,
    ld.nombre_localidad AS destino,
    b.nombre_bodega AS bodega_recepcion,
    me.nombre_modalidad AS modalidad_entrega,
    mc.nombre_modalidad AS modalidad_cobro,
    em.nombre_estado AS estado_mercancia,
    m.ubicacion_actual,
    m.fecha_entrega
FROM mercancia AS m
INNER JOIN cliente AS c ON c.id_cliente = m.id_cliente
INNER JOIN localidad AS lo ON lo.id_localidad = m.id_origen
INNER JOIN localidad AS ld ON ld.id_localidad = m.id_destino
INNER JOIN bodega AS b ON b.id_bodega = m.id_bodega_recepcion
INNER JOIN modalidad_entrega AS me
    ON me.id_modalidad_entrega = m.id_modalidad_entrega
INNER JOIN modalidad_cobro AS mc
    ON mc.id_modalidad_cobro = m.id_modalidad_cobro
INNER JOIN cat_estado_mercancia AS em
    ON em.id_estado_mercancia = m.id_estado_mercancia
ORDER BY m.id_mercancia;

-- Localidades de cada ruta en orden de recorrido:
SELECT r.nombre_ruta, rl.orden, l.nombre_localidad
FROM ruta_localidad AS rl
INNER JOIN ruta AS r ON r.id_ruta = rl.id_ruta
INNER JOIN localidad AS l ON l.id_localidad = rl.id_localidad
ORDER BY r.id_ruta, rl.orden;

-- Historial de movimientos:
SELECT
    mm.id_mercancia,
    m.codigo_seguimiento,
    em.nombre_estado AS estado,
    mm.fecha_hora,
    mm.ubicacion,
    mm.observacion
FROM movimiento_mercancia AS mm
INNER JOIN mercancia AS m ON m.id_mercancia = mm.id_mercancia
INNER JOIN cat_estado_mercancia AS em
    ON em.id_estado_mercancia = mm.id_estado_mercancia
ORDER BY mm.id_mercancia, mm.fecha_hora, mm.id_movimiento;

/* ---------------------------------------------------------------------
   13. PRUEBAS DE LAS REGLAS NUEVAS (NO SE EJECUTAN AUTOMÁTICAMENTE)
   Cada una debe fallar con el mensaje indicado.
   --------------------------------------------------------------------- */

-- [M1] Origen igual a destino -> Check constraint 'chk_mercancia_origen_distinto_destino' is violated.
-- INSERT INTO mercancia (id_cliente, codigo_seguimiento, peso_mercancia, id_origen, id_destino,
--     id_bodega_recepcion, id_modalidad_entrega, id_modalidad_cobro)
-- VALUES (1, 'OSO-TEST-0001', 10, 4, 4, 2, 1, 1);

-- [M2] Misma unidad, misma fecha -> 'La unidad ya tiene un viaje activo programado para esa fecha.'
-- INSERT INTO viaje (id_ruta, id_unidad, fecha_programada) VALUES (2, 2, '2026-11-09');

-- [M3] Destino fuera de la ruta -> 'El destino de la mercancía no pertenece a la ruta del viaje.'
-- CALL sp_asignar_mercancia_viaje(8, 1, 'Bodega Campeche');   -- Ciudad del Carmen en ruta Quintana Roo

-- [M3] Asignación válida (mercancía 8 a un viaje de la ruta Campeche):
-- CALL sp_asignar_mercancia_viaje(8, 4, 'Bodega Campeche');

-- [M7] Al entregar se llena fecha_entrega (después de despachar el viaje):
-- CALL sp_despachar_viaje(1);
-- CALL sp_actualizar_estado_mercancia(1, 'Entregada', 'Destino Cancún');

/* ---------------------------------------------------------------------
   FIN DEL SCRIPT INSERT (V2)
   No se insertan pagos, montos, vencimientos ni adeudos.
   --------------------------------------------------------------------- */
