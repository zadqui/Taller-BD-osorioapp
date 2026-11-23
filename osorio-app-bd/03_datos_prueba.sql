/* =====================================================================
   bd_transporte · DATOS DE PRUEBA (OPCIONAL)
   Importar después de 02_catalogos_y_usuarios.sql solo para demostrar
   el sistema. No lo importes si vas a capturar datos reales.
   Las matrículas ECO-xxx son ficticias.
   ===================================================================== */

SET NAMES utf8mb4;

INSERT INTO cliente (nombre_cliente, telefono_cliente) VALUES
('Juan Perez', '9991234567'),
('Maria Lopez', '9997654321'),
('Carlos Ramirez', '9994567890'),
('Ana Martinez', '9991112233'),
('Luis Herrera', '9992223344'),
('Fernanda Castro', '9993334455'),
('Jorge Medina', '9994445566'),
('Sofia Gomez', '9995556677');

INSERT INTO unidad (matricula, id_tipo_unidad, capacidad_toneladas) VALUES
('ECO-001', 1, 5.00),
('ECO-002', 2, 32.00),
('ECO-003', 1, 4.50),
('ECO-004', 2, 28.00),
('ECO-005', 1, 3.80),
('ECO-006', 2, 32.00);

INSERT INTO viaje (id_ruta, id_unidad, id_estado_viaje, fecha_programada, fecha_salida) VALUES
(1, 2, 1, '2026-11-09', NULL),
(1, 2, 1, '2026-11-10', NULL),
(1, 1, 1, '2026-11-11', NULL),
(2, 4, 1, '2026-11-12', NULL),
(1, 2, 1, '2026-11-13', NULL),
(2, 3, 1, '2026-11-14', NULL),
(1, 4, 1, '2026-11-15', NULL);

INSERT INTO mercancia (
    id_cliente, codigo_seguimiento, peso_mercancia, tipo_mercancia,
    id_origen, id_destino, id_bodega_recepcion,
    id_modalidad_entrega, id_modalidad_cobro, fecha_registro
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

CALL sp_asignar_mercancia_viaje(1, 1, 'Bodega Cancún');
CALL sp_asignar_mercancia_viaje(2, 2, 'Bodega Campeche');
CALL sp_asignar_mercancia_viaje(3, 3, 'Bodega Cancún');
CALL sp_asignar_mercancia_viaje(4, 4, 'Bodega Campeche');
CALL sp_asignar_mercancia_viaje(5, 5, 'Bodega Cancún');
CALL sp_asignar_mercancia_viaje(6, 6, 'Bodega Campeche');
CALL sp_asignar_mercancia_viaje(7, 7, 'Bodega Cancún');
