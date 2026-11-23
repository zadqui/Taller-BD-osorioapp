/* =====================================================================
   DATOS DE PRUEBA: bd_transporte
   Ejecutar después de 01_CREATE_BD_TRANSPORTE.sql

   Incluye los seis conjuntos operativos y los cuatro catálogos.
   No contiene pagos, montos, vencimientos ni adeudos.

   NOTAS:
   - Los pesos heredados se interpretan como kg.
   - Las modalidades de cobro se trasladan provisionalmente a los envíos
     usando el tipo de pago que aparecía para cada cliente en el INSERT
     anterior. Esa correspondencia debe confirmarse con la empresa.
   - "Sucursal" y "Ocurrencia" permanecen como opciones diferenciadas
     hasta confirmar su significado.
   - Las matrículas ECO-xxx son identificadores ficticios de demostración.
   - Los viajes quedan programados: los pesos de muestra no alcanzan el
     50 % de la capacidad de las unidades asignadas.
   - La localidad "Ciudad del Carmen" se conserva como dato heredado;
     falta contrastarla con las rutas definitivas del anteproyecto.
   ===================================================================== */

USE bd_transporte;

/* Limpieza segura para volver a ejecutar el script. */
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE movimiento_mercancia;
TRUNCATE TABLE mercancia;
TRUNCATE TABLE viaje;
TRUNCATE TABLE unidad;
TRUNCATE TABLE ruta;
TRUNCATE TABLE cliente;
TRUNCATE TABLE cat_estado_viaje;
TRUNCATE TABLE cat_estado_mercancia;
TRUNCATE TABLE modalidad_entrega;
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
   2. CATÁLOGO DE MODALIDADES DE ENTREGA
   Sucursal y Ocurrencia se mantienen diferenciadas provisionalmente.
   --------------------------------------------------------------------- */

INSERT INTO modalidad_entrega
    (id_modalidad_entrega, nombre_modalidad, descripcion)
VALUES
(1, 'Domicilio', 'Entrega en el domicilio indicado por el cliente.'),
(2, 'Sucursal', 'Entrega para recoger en una sucursal; significado pendiente de confirmar.'),
(3, 'Ocurrencia', 'Modalidad por ocurrencia; significado pendiente de confirmar.');

/* ---------------------------------------------------------------------
   3. CATÁLOGO DE ESTADOS DE MERCANCÍA
   --------------------------------------------------------------------- */

INSERT INTO cat_estado_mercancia
    (id_estado_mercancia, nombre_estado, descripcion)
VALUES
(1, 'En espera', 'Mercancía recibida sin viaje asignado.'),
(2, 'Asignada a viaje', 'Mercancía vinculada a un viaje programado.'),
(3, 'En tránsito', 'Mercancía cuyo viaje ya fue despachado.'),
(4, 'Entregada', 'Mercancía entregada al destinatario.');

/* ---------------------------------------------------------------------
   4. CATÁLOGO DE ESTADOS DE VIAJE
   --------------------------------------------------------------------- */

INSERT INTO cat_estado_viaje
    (id_estado_viaje, nombre_estado, descripcion)
VALUES
(1, 'Programado', 'Viaje creado que todavía no ha salido.'),
(2, 'En tránsito', 'Unidad despachada y en recorrido.'),
(3, 'Finalizado', 'Viaje concluido.'),
(4, 'Cancelado', 'Viaje cancelado.');

/* ---------------------------------------------------------------------
   5. CLIENTES
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
   6. RUTAS
   --------------------------------------------------------------------- */

INSERT INTO ruta (nombre_ruta) VALUES
('Ruta Quintana Roo (Cancun - Chetumal)'),
('Ruta Campeche (Ciudad del Carmen)');

/* ---------------------------------------------------------------------
   7. UNIDADES
   Los números ECO son identificadores económicos ficticios para probar
   la restricción UNIQUE; deben sustituirse por los datos autorizados.
   --------------------------------------------------------------------- */

INSERT INTO unidad
    (matricula, tipo_unidad, capacidad_toneladas)
VALUES
('ECO-001', 'Reparto local', 5.00),
('ECO-002', 'Foraneo Trailer', 32.00),
('ECO-003', 'Reparto local', 4.50),
('ECO-004', 'Foraneo Trailer', 28.00),
('ECO-005', 'Reparto local', 3.80),
('ECO-006', 'Foraneo Trailer', 32.00);

/* ---------------------------------------------------------------------
   8. VIAJES
   El estado 1 corresponde a Programado.
   --------------------------------------------------------------------- */

INSERT INTO viaje
    (id_ruta, id_unidad, id_estado_viaje, fecha_programada, fecha_salida)
VALUES
(1, 2, 1, '2026-11-09', NULL),
(2, 2, 1, '2026-11-10', NULL),
(1, 1, 1, '2026-11-11', NULL),
(2, 4, 1, '2026-11-12', NULL),
(1, 2, 1, '2026-11-13', NULL),
(2, 3, 1, '2026-11-14', NULL),
(1, 4, 1, '2026-11-15', NULL);

/* ---------------------------------------------------------------------
   9. MERCANCÍAS
   Todas ingresan inicialmente sin viaje y En espera. El trigger crea
   automáticamente el primer movimiento. Después se asignan 1 a 7 usando
   el procedimiento, que valida capacidad y bloquea el viaje.
   --------------------------------------------------------------------- */

INSERT INTO mercancia (
    id_cliente,
    id_viaje,
    codigo_seguimiento,
    peso_mercancia,
    tipo_mercancia,
    id_origen,
    id_destino,
    id_modalidad_entrega,
    modalidad_cobro,
    id_estado_mercancia,
    ubicacion_actual,
    fecha_registro
) VALUES
(1, NULL, 'OSO-7K4M-91QX',  50.00, 'No peligrosa', 1, 2, 1, 'Contado',           1, 'Bodega Cancun',   '2026-11-08 08:00:00'),
(2, NULL, 'OSO-3P8R-62WN', 120.00, 'No peligrosa', 4, 5, 2, 'Crédito a 15 días', 1, 'Bodega Campeche', '2026-11-08 08:30:00'),
(3, NULL, 'OSO-9D2F-47LC',  75.00, 'No peligrosa', 1, 3, 1, 'Contado',           1, 'Bodega Cancun',   '2026-11-08 09:00:00'),
(4, NULL, 'OSO-5H7T-38VB', 140.00, 'No peligrosa', 4, 6, 2, 'Crédito a 15 días', 1, 'Bodega Campeche', '2026-11-08 09:30:00'),
(5, NULL, 'OSO-2N6C-84ZA',  60.00, 'No peligrosa', 1, 2, 1, 'Contra entrega',    1, 'Bodega Cancun',   '2026-11-08 10:00:00'),
(6, NULL, 'OSO-8J3W-15RP', 200.00, 'No peligrosa', 4, 6, 2, 'Crédito a 15 días', 1, 'Bodega Campeche', '2026-11-08 10:30:00'),
(7, NULL, 'OSO-4Q9L-73DX',  95.00, 'No peligrosa', 1, 3, 1, 'Contado',           1, 'Bodega Cancun',   '2026-11-08 11:00:00'),
(8, NULL, 'OSO-6B2Y-58FH',  85.00, 'No peligrosa', 4, 4, 3, 'Contado',           1, 'Bodega Campeche', '2026-11-08 11:30:00'),
(1, NULL, 'OSO-1M7A-26KC', 110.00, 'No peligrosa', 1, 5, 1, 'Contra entrega',    1, 'Bodega Cancun',   '2026-11-08 12:00:00');

/* Los primeros siete envíos se asignan a viajes programados. El estado
   cambia a 2 (Asignada a viaje) y el trigger agrega el segundo movimiento. */

CALL sp_asignar_mercancia_viaje(1, 1, 'Bodega Cancun');
CALL sp_asignar_mercancia_viaje(2, 2, 'Bodega Campeche');
CALL sp_asignar_mercancia_viaje(3, 3, 'Bodega Cancun');
CALL sp_asignar_mercancia_viaje(4, 4, 'Bodega Campeche');
CALL sp_asignar_mercancia_viaje(5, 5, 'Bodega Cancun');
CALL sp_asignar_mercancia_viaje(6, 6, 'Bodega Campeche');
CALL sp_asignar_mercancia_viaje(7, 7, 'Bodega Cancun');

/* ---------------------------------------------------------------------
   10. CONSULTAS DE COMPROBACIÓN
   --------------------------------------------------------------------- */

-- Mercancía que todavía no tiene viaje asignado:
SELECT *
FROM vista_mercancia_en_espera
ORDER BY fecha_registro;

-- Carga calculada de cada viaje, matrícula y porcentaje de capacidad:
SELECT *
FROM vista_carga_viajes
ORDER BY id_viaje;

-- Estado actual, localidades y modalidades de cada envío:
SELECT
    m.id_mercancia,
    m.codigo_seguimiento,
    c.nombre_cliente,
    lo.nombre_localidad AS origen,
    ld.nombre_localidad AS destino,
    me.nombre_modalidad AS modalidad_entrega,
    m.modalidad_cobro,
    em.nombre_estado AS estado_mercancia,
    m.ubicacion_actual
FROM mercancia AS m
INNER JOIN cliente AS c ON c.id_cliente = m.id_cliente
INNER JOIN localidad AS lo ON lo.id_localidad = m.id_origen
INNER JOIN localidad AS ld ON ld.id_localidad = m.id_destino
INNER JOIN modalidad_entrega AS me
    ON me.id_modalidad_entrega = m.id_modalidad_entrega
INNER JOIN cat_estado_mercancia AS em
    ON em.id_estado_mercancia = m.id_estado_mercancia
ORDER BY m.id_mercancia;

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
   11. EJEMPLOS DE OPERACIONES (NO SE EJECUTAN AUTOMÁTICAMENTE)
   --------------------------------------------------------------------- */

-- Asignar una mercancía que permanece en espera:
-- CALL sp_asignar_mercancia_viaje(8, 1, 'Bodega Campeche');

-- Despachar un viaje cuando su carga alcance al menos el 50 %:
-- CALL sp_despachar_viaje(1);

-- Actualizar estado y ubicación de una mercancía después del despacho:
-- CALL sp_actualizar_estado_mercancia(1, 'Entregada', 'Destino Cancun');

/* ---------------------------------------------------------------------
   FIN DEL SCRIPT INSERT
   No se insertan pagos, montos, vencimientos ni adeudos.
   --------------------------------------------------------------------- */
