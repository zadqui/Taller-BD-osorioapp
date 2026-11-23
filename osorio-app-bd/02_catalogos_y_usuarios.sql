/* =====================================================================
   bd_transporte · CATÁLOGOS Y USUARIOS INICIALES
   Importar después de 01_esquema.sql.

   USUARIOS INICIALES (el sistema obliga a cambiar la contraseña en el
   primer ingreso):
     admin   / Osorio2026!   Administrador
     bodega  / Bodega2026!   Encargado de Bodega Cancún
   ===================================================================== */

SET NAMES utf8mb4;

INSERT INTO localidad (id_localidad, nombre_localidad) VALUES
(1, 'Mérida'),
(2, 'Cancún'),
(3, 'Chetumal'),
(4, 'Campeche'),
(5, 'Playa del Carmen'),
(6, 'Ciudad del Carmen');

INSERT INTO bodega (id_bodega, nombre_bodega, id_localidad) VALUES
(1, 'Bodega Cancún', 2),
(2, 'Bodega Campeche', 4);

INSERT INTO modalidad_entrega (id_modalidad_entrega, nombre_modalidad, descripcion) VALUES
(1, 'Domicilio', 'Entrega en el domicilio indicado por el cliente.'),
(2, 'Sucursal', 'Entrega para recoger en una sucursal; significado pendiente de confirmar.'),
(3, 'Ocurrencia', 'Modalidad por ocurrencia; significado pendiente de confirmar.');

INSERT INTO modalidad_cobro (id_modalidad_cobro, nombre_modalidad, descripcion) VALUES
(1, 'Contado', 'Pago al momento de recibir la mercancía.'),
(2, 'Crédito a 15 días', 'Crédito para clientes con volumen.'),
(3, 'Contra entrega', 'Cobro al entregar la mercancía.');

INSERT INTO cat_tipo_unidad (id_tipo_unidad, nombre_tipo, aplica_minimo_carga, descripcion) VALUES
(1, 'Reparto local', TRUE, 'Vehículo para entregas dentro de la ciudad; mínimo del 50 % pendiente de confirmar.'),
(2, 'Foráneo tráiler', TRUE, 'Camión de hasta 32 toneladas para traslados entre ciudades.');

INSERT INTO cat_estado_mercancia (id_estado_mercancia, nombre_estado, descripcion) VALUES
(1, 'En espera', 'Mercancía recibida sin viaje asignado.'),
(2, 'Asignada a viaje', 'Mercancía vinculada a un viaje programado.'),
(3, 'En tránsito', 'Mercancía cuyo viaje ya fue despachado.'),
(4, 'Entregada', 'Mercancía entregada al destinatario.');

INSERT INTO cat_estado_viaje (id_estado_viaje, nombre_estado, descripcion) VALUES
(1, 'Programado', 'Viaje creado que todavía no ha salido.'),
(2, 'En tránsito', 'Unidad despachada y en recorrido.'),
(3, 'Finalizado', 'Viaje concluido.'),
(4, 'Cancelado', 'Viaje cancelado.');

INSERT INTO ruta (id_ruta, nombre_ruta) VALUES
(1, 'Ruta Quintana Roo (Cancun - Chetumal)'),
(2, 'Ruta Campeche (Ciudad del Carmen)');

INSERT INTO ruta_localidad (id_ruta, id_localidad, orden) VALUES
(1, 2, 1),
(1, 5, 2),
(1, 3, 3),
(2, 4, 1),
(2, 6, 2);

INSERT INTO usuario (usuario, nombre, clave_hash, rol, id_bodega, debe_cambiar_clave) VALUES
('admin', 'Administrador', '$2y$12$T.m9nj4sO/YJQvZRx30DqOxWo4J4BFMFL.XD3BZ6z9uBe8aMppUuW', 'admin', NULL, TRUE),
('bodega', 'Encargado de bodega', '$2y$12$2yRVPq53j0Pq1Tv.Cl9pf.4wV5YDi7vASIEXwvdlrxR37QHB6ca5K', 'operador', 1, TRUE);
