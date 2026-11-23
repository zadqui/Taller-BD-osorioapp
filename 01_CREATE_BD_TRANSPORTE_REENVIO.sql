/* =====================================================================
   BASE DE DATOS: bd_transporte
   Proyecto: Sistema de Gestión Logística - Transportadora Osorio
   Motor objetivo: MySQL 8.0.16 o superior (MySQL Workbench)

   ALCANCE:
   - Clientes, localidades, rutas, unidades, viajes y mercancías.
   - Seguimiento e historial de movimientos de cada envío.
   - Modalidad de cobro únicamente informativa; no hay pagos ni adeudos.
   - Catálogos para estados y modalidades de entrega.

   ADVERTENCIA:
   Este script elimina y reconstruye bd_transporte.

   DECISIONES Y SUPUESTOS:
   1. peso_mercancia se almacena en kg; capacidad_toneladas, en toneladas.
   2. El mínimo del 50 % se aplica a todas las unidades, pendiente de
      confirmación para reparto local.
   3. Sucursal y Ocurrencia se registran provisionalmente como opciones
      distintas del catálogo; falta confirmar su significado operativo.
   4. localidad representa ciudades/localidades, no necesariamente una
      sucursal física. ubicacion_actual se conserva como texto porque
      también puede describir puntos como "En ruta" o una bodega concreta.
   5. Las asignaciones deben realizarse mediante sp_asignar_mercancia_viaje.
      La aplicación debe evitar escrituras directas que omitan el procedimiento.
   6. Las matrículas ECO-xxx de los datos de prueba son identificadores
      ficticios para demostración, no matrículas reales de la empresa.
   ===================================================================== */

DROP DATABASE IF EXISTS bd_transporte;
CREATE DATABASE bd_transporte
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE bd_transporte;

/* ---------------------------------------------------------------------
   1. CATÁLOGOS
   --------------------------------------------------------------------- */

CREATE TABLE localidad (
    id_localidad INT AUTO_INCREMENT PRIMARY KEY,
    nombre_localidad VARCHAR(100) NOT NULL,
    CONSTRAINT uq_localidad_nombre UNIQUE (nombre_localidad)
) ENGINE = InnoDB;

CREATE TABLE modalidad_entrega (
    id_modalidad_entrega INT AUTO_INCREMENT PRIMARY KEY,
    nombre_modalidad VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) NULL,
    CONSTRAINT uq_modalidad_entrega_nombre UNIQUE (nombre_modalidad)
) ENGINE = InnoDB;

CREATE TABLE cat_estado_mercancia (
    id_estado_mercancia TINYINT UNSIGNED PRIMARY KEY,
    nombre_estado VARCHAR(40) NOT NULL,
    descripcion VARCHAR(150) NULL,
    CONSTRAINT uq_estado_mercancia_nombre UNIQUE (nombre_estado)
) ENGINE = InnoDB;

CREATE TABLE cat_estado_viaje (
    id_estado_viaje TINYINT UNSIGNED PRIMARY KEY,
    nombre_estado VARCHAR(40) NOT NULL,
    descripcion VARCHAR(150) NULL,
    CONSTRAINT uq_estado_viaje_nombre UNIQUE (nombre_estado)
) ENGINE = InnoDB;

/* ---------------------------------------------------------------------
   2. TABLAS OPERATIVAS
   --------------------------------------------------------------------- */

CREATE TABLE cliente (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cliente VARCHAR(100) NOT NULL,
    telefono_cliente VARCHAR(15)
) ENGINE = InnoDB;

CREATE TABLE ruta (
    id_ruta INT AUTO_INCREMENT PRIMARY KEY,
    nombre_ruta VARCHAR(100) NOT NULL
) ENGINE = InnoDB;

CREATE TABLE unidad (
    id_unidad INT AUTO_INCREMENT PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL,
    tipo_unidad VARCHAR(50) NOT NULL,
    capacidad_toneladas DECIMAL(7,2) NOT NULL,
    CONSTRAINT uq_unidad_matricula UNIQUE (matricula),
    CONSTRAINT chk_unidad_capacidad_positiva
        CHECK (capacidad_toneladas > 0)
) ENGINE = InnoDB;

CREATE TABLE viaje (
    id_viaje INT AUTO_INCREMENT PRIMARY KEY,
    id_ruta INT NOT NULL,
    id_unidad INT NOT NULL,
    id_estado_viaje TINYINT UNSIGNED NOT NULL DEFAULT 1,
    fecha_programada DATE NOT NULL,
    fecha_salida DATETIME NULL,
    CONSTRAINT fk_viaje_ruta
        FOREIGN KEY (id_ruta) REFERENCES ruta(id_ruta),
    CONSTRAINT fk_viaje_unidad
        FOREIGN KEY (id_unidad) REFERENCES unidad(id_unidad),
    CONSTRAINT fk_viaje_estado
        FOREIGN KEY (id_estado_viaje)
        REFERENCES cat_estado_viaje(id_estado_viaje),
    INDEX idx_viaje_estado (id_estado_viaje),
    INDEX idx_viaje_fecha (fecha_programada)
) ENGINE = InnoDB;

CREATE TABLE mercancia (
    id_mercancia INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_viaje INT NULL,
    codigo_seguimiento VARCHAR(30) NOT NULL,
    peso_mercancia DECIMAL(10,2) NOT NULL COMMENT 'Peso expresado en kilogramos',
    tipo_mercancia VARCHAR(100) NOT NULL DEFAULT 'No peligrosa',
    id_origen INT NOT NULL,
    id_destino INT NOT NULL,
    id_modalidad_entrega INT NOT NULL,
    modalidad_cobro ENUM(
        'Contado',
        'Crédito a 15 días',
        'Contra entrega'
    ) NOT NULL,
    id_estado_mercancia TINYINT UNSIGNED NOT NULL DEFAULT 1,
    ubicacion_actual VARCHAR(120) NOT NULL DEFAULT 'Por registrar',
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_mercancia_codigo_seguimiento
        UNIQUE (codigo_seguimiento),
    CONSTRAINT chk_mercancia_peso_positivo
        CHECK (peso_mercancia > 0),
    CONSTRAINT fk_mercancia_cliente
        FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    CONSTRAINT fk_mercancia_viaje
        FOREIGN KEY (id_viaje) REFERENCES viaje(id_viaje),
    CONSTRAINT fk_mercancia_origen
        FOREIGN KEY (id_origen) REFERENCES localidad(id_localidad),
    CONSTRAINT fk_mercancia_destino
        FOREIGN KEY (id_destino) REFERENCES localidad(id_localidad),
    CONSTRAINT fk_mercancia_modalidad_entrega
        FOREIGN KEY (id_modalidad_entrega)
        REFERENCES modalidad_entrega(id_modalidad_entrega),
    CONSTRAINT fk_mercancia_estado
        FOREIGN KEY (id_estado_mercancia)
        REFERENCES cat_estado_mercancia(id_estado_mercancia),
    INDEX idx_mercancia_estado (id_estado_mercancia),
    INDEX idx_mercancia_cliente (id_cliente),
    INDEX idx_mercancia_viaje (id_viaje),
    INDEX idx_mercancia_origen (id_origen),
    INDEX idx_mercancia_destino (id_destino)
) ENGINE = InnoDB;

CREATE TABLE movimiento_mercancia (
    id_movimiento INT AUTO_INCREMENT PRIMARY KEY,
    id_mercancia INT NOT NULL,
    id_estado_mercancia TINYINT UNSIGNED NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ubicacion VARCHAR(120) NOT NULL,
    observacion VARCHAR(255) NULL,
    CONSTRAINT fk_movimiento_mercancia
        FOREIGN KEY (id_mercancia)
        REFERENCES mercancia(id_mercancia)
        ON DELETE CASCADE,
    CONSTRAINT fk_movimiento_estado
        FOREIGN KEY (id_estado_mercancia)
        REFERENCES cat_estado_mercancia(id_estado_mercancia),
    INDEX idx_movimiento_mercancia_fecha (id_mercancia, fecha_hora)
) ENGINE = InnoDB;

/* ---------------------------------------------------------------------
   3. TRIGGERS
   La agregación SUM() para validar capacidad se retiró de los triggers
   de INSERT/UPDATE. La asignación concurrente se serializa bloqueando
   la fila de viaje dentro de sp_asignar_mercancia_viaje.
   --------------------------------------------------------------------- */

DELIMITER $$

/* La recepción siempre crea la mercancía En espera y sin viaje.
   La vinculación posterior debe pasar por sp_asignar_mercancia_viaje,
   que bloquea el viaje y valida su capacidad antes de asignar. */
CREATE TRIGGER trg_mercancia_bi_validar_asignacion
BEFORE INSERT ON mercancia
FOR EACH ROW
BEGIN
    IF NEW.id_viaje IS NOT NULL OR NEW.id_estado_mercancia <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La mercancía debe recibirse En espera y sin viaje; use sp_asignar_mercancia_viaje para asignarla.';
    END IF;
END$$

/* Guardia de consistencia ante cambios directos. No realiza SUM(); esa
   validación centralizada corresponde al procedimiento de asignación. */
CREATE TRIGGER trg_mercancia_bu_validar_asignacion
BEFORE UPDATE ON mercancia
FOR EACH ROW
BEGIN
    DECLARE v_estado_viaje TINYINT UNSIGNED;

    IF NEW.id_viaje IS NULL AND NEW.id_estado_mercancia <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La mercancía sin viaje asignado debe permanecer En espera.';
    END IF;

    IF NEW.id_viaje IS NOT NULL THEN
        IF NEW.id_estado_mercancia = 1 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'La mercancía asignada a un viaje no puede conservar el estado En espera.';
        END IF;

        IF NOT (NEW.id_viaje <=> OLD.id_viaje)
           OR NEW.peso_mercancia <> OLD.peso_mercancia THEN
            SELECT id_estado_viaje
              INTO v_estado_viaje
            FROM viaje
            WHERE id_viaje = NEW.id_viaje;

            IF v_estado_viaje <> 1 THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'No se puede cambiar la carga de un viaje que ya fue despachado.';
            END IF;
        END IF;
    END IF;

    IF NEW.id_viaje IS NOT NULL
       AND NEW.id_estado_mercancia IN (3, 4) THEN
        SELECT id_estado_viaje
          INTO v_estado_viaje
        FROM viaje
        WHERE id_viaje = NEW.id_viaje;

        IF v_estado_viaje = 1 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'No se puede avanzar el estado: primero debe despacharse el viaje.';
        END IF;
    END IF;
END$$

/* Cada mercancía nueva genera su primer movimiento automáticamente. */
CREATE TRIGGER trg_mercancia_ai_registrar_movimiento
AFTER INSERT ON mercancia
FOR EACH ROW
BEGIN
    INSERT INTO movimiento_mercancia
        (id_mercancia, id_estado_mercancia, fecha_hora, ubicacion, observacion)
    VALUES
        (NEW.id_mercancia, NEW.id_estado_mercancia, NEW.fecha_registro,
         NEW.ubicacion_actual, 'Registro inicial de la mercancía.');
END$$

/* Cada cambio de estado o ubicación genera un nuevo movimiento. */
CREATE TRIGGER trg_mercancia_au_registrar_movimiento
AFTER UPDATE ON mercancia
FOR EACH ROW
BEGIN
    IF NOT (NEW.id_estado_mercancia <=> OLD.id_estado_mercancia)
       OR NOT (NEW.ubicacion_actual <=> OLD.ubicacion_actual) THEN
        INSERT INTO movimiento_mercancia
            (id_mercancia, id_estado_mercancia, fecha_hora, ubicacion, observacion)
        VALUES
            (NEW.id_mercancia, NEW.id_estado_mercancia, CURRENT_TIMESTAMP,
             NEW.ubicacion_actual, 'Actualización del estado o ubicación.');
    END IF;
END$$

/* Validación defensiva si se cambia directamente el estado del viaje.
   La validación principal también está en sp_despachar_viaje. */
CREATE TRIGGER trg_viaje_bu_validar_despacho
BEFORE UPDATE ON viaje
FOR EACH ROW
BEGIN
    DECLARE v_capacidad_toneladas DECIMAL(7,2);
    DECLARE v_carga_actual_kg DECIMAL(12,2);

    IF OLD.id_estado_viaje = 1 AND NEW.id_estado_viaje = 2 THEN
        SELECT capacidad_toneladas
          INTO v_capacidad_toneladas
        FROM unidad
        WHERE id_unidad = NEW.id_unidad;

        SELECT COALESCE(SUM(peso_mercancia), 0)
          INTO v_carga_actual_kg
        FROM mercancia
        WHERE id_viaje = NEW.id_viaje;

        IF v_carga_actual_kg = 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'No se puede despachar un viaje sin mercancía asignada.';
        END IF;

        IF v_carga_actual_kg > v_capacidad_toneladas * 1000 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'La carga supera la capacidad de la unidad.';
        END IF;

        IF v_carga_actual_kg < v_capacidad_toneladas * 500 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'No se puede despachar: la carga es inferior al 50 por ciento de la capacidad.';
        END IF;

        SET NEW.fecha_salida = COALESCE(NEW.fecha_salida, CURRENT_TIMESTAMP);
    END IF;
END$$

/* Al despachar, las mercancías del viaje pasan a En tránsito. */
CREATE TRIGGER trg_viaje_au_actualizar_mercancias
AFTER UPDATE ON viaje
FOR EACH ROW
BEGIN
    IF OLD.id_estado_viaje = 1 AND NEW.id_estado_viaje = 2 THEN
        UPDATE mercancia
        SET id_estado_mercancia = 3,
            ubicacion_actual = 'En ruta'
        WHERE id_viaje = NEW.id_viaje
          AND id_estado_mercancia <> 4;
    END IF;
END$$

/* Asignación serializada por viaje: primero bloquea la fila del viaje,
   después valida el envío y suma la carga ya comprometida. Así, dos
   asignaciones simultáneas al mismo viaje no pueden aprobarse con la
   misma capacidad disponible. */
CREATE PROCEDURE sp_asignar_mercancia_viaje(
    IN p_id_mercancia INT,
    IN p_id_viaje INT,
    IN p_ubicacion VARCHAR(120)
)
BEGIN
    DECLARE v_estado_viaje TINYINT UNSIGNED;
    DECLARE v_id_viaje_actual INT;
    DECLARE v_estado_mercancia_actual TINYINT UNSIGNED;
    DECLARE v_peso_mercancia DECIMAL(10,2);
    DECLARE v_capacidad_toneladas DECIMAL(7,2);
    DECLARE v_carga_actual_kg DECIMAL(12,2);
    DECLARE v_no_encontrado BOOLEAN DEFAULT FALSE;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_no_encontrado = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT v.id_estado_viaje, u.capacidad_toneladas
      INTO v_estado_viaje, v_capacidad_toneladas
    FROM viaje AS v
    INNER JOIN unidad AS u ON u.id_unidad = v.id_unidad
    WHERE v.id_viaje = p_id_viaje
    FOR UPDATE;

    IF v_no_encontrado THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El viaje indicado no existe.';
    END IF;

    IF v_estado_viaje <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se puede asignar mercancía a un viaje programado.';
    END IF;

    SET v_no_encontrado = FALSE;
    SELECT id_viaje, id_estado_mercancia, peso_mercancia
      INTO v_id_viaje_actual, v_estado_mercancia_actual, v_peso_mercancia
    FROM mercancia
    WHERE id_mercancia = p_id_mercancia
    FOR UPDATE;

    IF v_no_encontrado THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La mercancía indicada no existe.';
    END IF;

    IF v_id_viaje_actual IS NOT NULL OR v_estado_mercancia_actual <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se puede asignar mercancía que esté en espera y sin viaje.';
    END IF;

    SELECT COALESCE(SUM(peso_mercancia), 0)
      INTO v_carga_actual_kg
    FROM mercancia
    WHERE id_viaje = p_id_viaje;

    IF v_carga_actual_kg + v_peso_mercancia > v_capacidad_toneladas * 1000 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La asignación supera la capacidad de la unidad.';
    END IF;

    UPDATE mercancia
    SET id_viaje = p_id_viaje,
        id_estado_mercancia = 2,
        ubicacion_actual = p_ubicacion
    WHERE id_mercancia = p_id_mercancia;

    COMMIT;
END$$

/* Despacha un viaje si la carga está entre el 50 % y el 100 % de la
   capacidad de la unidad. */
CREATE PROCEDURE sp_despachar_viaje(IN p_id_viaje INT)
BEGIN
    DECLARE v_estado_actual TINYINT UNSIGNED;
    DECLARE v_id_unidad INT;
    DECLARE v_capacidad_toneladas DECIMAL(7,2);
    DECLARE v_carga_actual_kg DECIMAL(12,2);
    DECLARE v_no_encontrado BOOLEAN DEFAULT FALSE;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_no_encontrado = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT id_estado_viaje, id_unidad
      INTO v_estado_actual, v_id_unidad
    FROM viaje
    WHERE id_viaje = p_id_viaje
    FOR UPDATE;

    IF v_no_encontrado THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El viaje indicado no existe.';
    END IF;

    IF v_estado_actual <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se puede despachar un viaje programado.';
    END IF;

    SELECT capacidad_toneladas
      INTO v_capacidad_toneladas
    FROM unidad
    WHERE id_unidad = v_id_unidad;

    SELECT COALESCE(SUM(peso_mercancia), 0)
      INTO v_carga_actual_kg
    FROM mercancia
    WHERE id_viaje = p_id_viaje;

    IF v_carga_actual_kg = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede despachar un viaje sin mercancía asignada.';
    END IF;

    IF v_carga_actual_kg > v_capacidad_toneladas * 1000 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La carga supera la capacidad de la unidad.';
    END IF;

    IF v_carga_actual_kg < v_capacidad_toneladas * 500 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La carga es inferior al 50 por ciento de la capacidad.';
    END IF;

    UPDATE viaje
    SET id_estado_viaje = 2,
        fecha_salida = CURRENT_TIMESTAMP
    WHERE id_viaje = p_id_viaje;

    COMMIT;
END$$

/* Actualiza estado y ubicación; el catálogo se consulta por nombre y el
   trigger de mercancía conserva automáticamente el movimiento histórico. */
CREATE PROCEDURE sp_actualizar_estado_mercancia(
    IN p_id_mercancia INT,
    IN p_estado VARCHAR(40),
    IN p_ubicacion VARCHAR(120)
)
BEGIN
    DECLARE v_id_estado TINYINT UNSIGNED;
    DECLARE v_id INT;
    DECLARE v_no_encontrado BOOLEAN DEFAULT FALSE;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_no_encontrado = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT id_estado_mercancia
      INTO v_id_estado
    FROM cat_estado_mercancia
    WHERE nombre_estado = p_estado;

    IF v_no_encontrado THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El estado de mercancía indicado no existe en el catálogo.';
    END IF;

    SET v_no_encontrado = FALSE;
    SELECT id_mercancia
      INTO v_id
    FROM mercancia
    WHERE id_mercancia = p_id_mercancia
    FOR UPDATE;

    IF v_no_encontrado THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La mercancía indicada no existe.';
    END IF;

    UPDATE mercancia
    SET id_estado_mercancia = v_id_estado,
        ubicacion_actual = p_ubicacion
    WHERE id_mercancia = p_id_mercancia;

    COMMIT;
END$$

DELIMITER ;

/* ---------------------------------------------------------------------
   4. VISTAS OPERATIVAS
   --------------------------------------------------------------------- */

CREATE VIEW vista_mercancia_en_espera AS
SELECT
    m.id_mercancia,
    m.codigo_seguimiento,
    c.nombre_cliente,
    lo.nombre_localidad AS origen,
    ld.nombre_localidad AS destino,
    m.peso_mercancia,
    me.nombre_modalidad AS modalidad_entrega,
    m.fecha_registro,
    m.ubicacion_actual
FROM mercancia AS m
INNER JOIN cliente AS c ON c.id_cliente = m.id_cliente
INNER JOIN localidad AS lo ON lo.id_localidad = m.id_origen
INNER JOIN localidad AS ld ON ld.id_localidad = m.id_destino
INNER JOIN modalidad_entrega AS me
    ON me.id_modalidad_entrega = m.id_modalidad_entrega
WHERE m.id_viaje IS NULL
  AND m.id_estado_mercancia = 1;

CREATE VIEW vista_carga_viajes AS
SELECT
    v.id_viaje,
    r.nombre_ruta,
    u.matricula,
    u.tipo_unidad,
    u.capacidad_toneladas,
    ev.nombre_estado AS estado_viaje,
    v.fecha_programada,
    v.fecha_salida,
    COALESCE(SUM(m.peso_mercancia), 0) AS carga_kg,
    ROUND(COALESCE(SUM(m.peso_mercancia), 0) / 1000, 2) AS carga_toneladas,
    ROUND(
        (COALESCE(SUM(m.peso_mercancia), 0) / 1000)
        / u.capacidad_toneladas * 100,
        2
    ) AS porcentaje_capacidad
FROM viaje AS v
INNER JOIN ruta AS r ON r.id_ruta = v.id_ruta
INNER JOIN unidad AS u ON u.id_unidad = v.id_unidad
INNER JOIN cat_estado_viaje AS ev ON ev.id_estado_viaje = v.id_estado_viaje
LEFT JOIN mercancia AS m ON m.id_viaje = v.id_viaje
GROUP BY
    v.id_viaje,
    r.nombre_ruta,
    u.matricula,
    u.tipo_unidad,
    u.capacidad_toneladas,
    ev.nombre_estado,
    v.fecha_programada,
    v.fecha_salida;

/* ---------------------------------------------------------------------
   FIN DEL SCRIPT CREATE
   Tablas: cliente, ruta, unidad, viaje, mercancia, movimiento_mercancia.
   Catálogos: localidad, modalidad_entrega, cat_estado_mercancia,
              cat_estado_viaje.
   No se crean objetos financieros.
   --------------------------------------------------------------------- */
