/* =====================================================================
   bd_transporte · ESQUEMA DE PRODUCCIÓN
   Transportadora Osorio · Sistema de Gestión Logística
   Motor: MySQL 8.0.16 o superior

   USO EN HOSTING:
   1. Crea la base de datos y su usuario desde el panel del hosting
      (cPanel, hPanel, etc.).
   2. En phpMyAdmin selecciona esa base y abre la pestaña Importar.
   3. Importa este archivo, después 02_catalogos_y_usuarios.sql y, solo
      si quieres datos de demostración, 03_datos_prueba.sql.

   Basado en 01_CREATE_BD_TRANSPORTE_V2.sql (mejoras M1 a M7) y agrega
   la tabla usuario para el acceso al panel administrativo.

   ADVERTENCIA: elimina y vuelve a crear todas las tablas del sistema
   dentro de la base seleccionada.
   ===================================================================== */

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS vista_carga_viajes;
DROP VIEW IF EXISTS vista_mercancia_en_espera;
DROP PROCEDURE IF EXISTS sp_asignar_mercancia_viaje;
DROP PROCEDURE IF EXISTS sp_despachar_viaje;
DROP PROCEDURE IF EXISTS sp_actualizar_estado_mercancia;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS movimiento_mercancia;
DROP TABLE IF EXISTS mercancia;
DROP TABLE IF EXISTS viaje;
DROP TABLE IF EXISTS unidad;
DROP TABLE IF EXISTS ruta_localidad;
DROP TABLE IF EXISTS ruta;
DROP TABLE IF EXISTS cliente;
DROP TABLE IF EXISTS cat_estado_viaje;
DROP TABLE IF EXISTS cat_estado_mercancia;
DROP TABLE IF EXISTS cat_tipo_unidad;
DROP TABLE IF EXISTS modalidad_cobro;
DROP TABLE IF EXISTS modalidad_entrega;
DROP TABLE IF EXISTS bodega;
DROP TABLE IF EXISTS localidad;

SET FOREIGN_KEY_CHECKS = 1;

/* ---------------------------------------------------------------------
   1. CATÁLOGOS
   --------------------------------------------------------------------- */

CREATE TABLE localidad (
    id_localidad INT AUTO_INCREMENT PRIMARY KEY,
    nombre_localidad VARCHAR(100) NOT NULL,
    CONSTRAINT uq_localidad_nombre UNIQUE (nombre_localidad)
) ENGINE = InnoDB;

/* [M4] Bodegas físicas donde se recibe la mercancía. */
CREATE TABLE bodega (
    id_bodega INT AUTO_INCREMENT PRIMARY KEY,
    nombre_bodega VARCHAR(100) NOT NULL,
    id_localidad INT NOT NULL,
    CONSTRAINT uq_bodega_nombre UNIQUE (nombre_bodega),
    CONSTRAINT fk_bodega_localidad
        FOREIGN KEY (id_localidad) REFERENCES localidad(id_localidad)
) ENGINE = InnoDB;

CREATE TABLE modalidad_entrega (
    id_modalidad_entrega INT AUTO_INCREMENT PRIMARY KEY,
    nombre_modalidad VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) NULL,
    CONSTRAINT uq_modalidad_entrega_nombre UNIQUE (nombre_modalidad)
) ENGINE = InnoDB;

/* [M6] Sustituye al ENUM; agregar una modalidad ya no altera la tabla. */
CREATE TABLE modalidad_cobro (
    id_modalidad_cobro INT AUTO_INCREMENT PRIMARY KEY,
    nombre_modalidad VARCHAR(50) NOT NULL,
    descripcion VARCHAR(150) NULL,
    CONSTRAINT uq_modalidad_cobro_nombre UNIQUE (nombre_modalidad)
) ENGINE = InnoDB;

/* [M5] Tipos de unidad. aplica_minimo_carga indica si el viaje necesita
   al menos el 50 % de la capacidad para despacharse. */
CREATE TABLE cat_tipo_unidad (
    id_tipo_unidad TINYINT UNSIGNED PRIMARY KEY,
    nombre_tipo VARCHAR(50) NOT NULL,
    aplica_minimo_carga BOOLEAN NOT NULL DEFAULT TRUE,
    descripcion VARCHAR(150) NULL,
    CONSTRAINT uq_tipo_unidad_nombre UNIQUE (nombre_tipo)
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

/* [M3] Localidades que atiende cada ruta, en orden de recorrido. */
CREATE TABLE ruta_localidad (
    id_ruta INT NOT NULL,
    id_localidad INT NOT NULL,
    orden TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (id_ruta, id_localidad),
    CONSTRAINT uq_ruta_localidad_orden UNIQUE (id_ruta, orden),
    CONSTRAINT fk_ruta_localidad_ruta
        FOREIGN KEY (id_ruta) REFERENCES ruta(id_ruta),
    CONSTRAINT fk_ruta_localidad_localidad
        FOREIGN KEY (id_localidad) REFERENCES localidad(id_localidad),
    CONSTRAINT chk_ruta_localidad_orden_positivo CHECK (orden > 0)
) ENGINE = InnoDB;

CREATE TABLE unidad (
    id_unidad INT AUTO_INCREMENT PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL,
    id_tipo_unidad TINYINT UNSIGNED NOT NULL,          -- [M5]
    capacidad_toneladas DECIMAL(7,2) NOT NULL,
    CONSTRAINT uq_unidad_matricula UNIQUE (matricula),
    CONSTRAINT chk_unidad_capacidad_positiva
        CHECK (capacidad_toneladas > 0),
    CONSTRAINT fk_unidad_tipo
        FOREIGN KEY (id_tipo_unidad) REFERENCES cat_tipo_unidad(id_tipo_unidad)
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
    INDEX idx_viaje_fecha (fecha_programada),
    INDEX idx_viaje_unidad_fecha (id_unidad, fecha_programada)   -- [M2]
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
    id_bodega_recepcion INT NOT NULL,                   -- [M4]
    id_modalidad_entrega INT NOT NULL,
    id_modalidad_cobro INT NOT NULL,                    -- [M6]
    id_estado_mercancia TINYINT UNSIGNED NOT NULL DEFAULT 1,
    ubicacion_actual VARCHAR(120) NOT NULL DEFAULT 'Por registrar',
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega DATETIME NULL,                        -- [M7]
    CONSTRAINT uq_mercancia_codigo_seguimiento
        UNIQUE (codigo_seguimiento),
    CONSTRAINT chk_mercancia_peso_positivo
        CHECK (peso_mercancia > 0),
    CONSTRAINT chk_mercancia_origen_distinto_destino    -- [M1]
        CHECK (id_origen <> id_destino),
    CONSTRAINT chk_mercancia_fecha_entrega              -- [M7]
        CHECK (fecha_entrega IS NULL
               OR (id_estado_mercancia = 4 AND fecha_entrega >= fecha_registro)),
    CONSTRAINT fk_mercancia_cliente
        FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    CONSTRAINT fk_mercancia_viaje
        FOREIGN KEY (id_viaje) REFERENCES viaje(id_viaje),
    CONSTRAINT fk_mercancia_origen
        FOREIGN KEY (id_origen) REFERENCES localidad(id_localidad),
    CONSTRAINT fk_mercancia_destino
        FOREIGN KEY (id_destino) REFERENCES localidad(id_localidad),
    CONSTRAINT fk_mercancia_bodega
        FOREIGN KEY (id_bodega_recepcion) REFERENCES bodega(id_bodega),
    CONSTRAINT fk_mercancia_modalidad_entrega
        FOREIGN KEY (id_modalidad_entrega)
        REFERENCES modalidad_entrega(id_modalidad_entrega),
    CONSTRAINT fk_mercancia_modalidad_cobro
        FOREIGN KEY (id_modalidad_cobro)
        REFERENCES modalidad_cobro(id_modalidad_cobro),
    CONSTRAINT fk_mercancia_estado
        FOREIGN KEY (id_estado_mercancia)
        REFERENCES cat_estado_mercancia(id_estado_mercancia),
    INDEX idx_mercancia_estado (id_estado_mercancia),
    INDEX idx_mercancia_cliente (id_cliente),
    INDEX idx_mercancia_viaje (id_viaje),
    INDEX idx_mercancia_origen (id_origen),
    INDEX idx_mercancia_destino (id_destino),
    INDEX idx_mercancia_bodega (id_bodega_recepcion)
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
   --------------------------------------------------------------------- */

DELIMITER $$

/* La recepción siempre crea la mercancía En espera y sin viaje.
   [M4] Si no se indica ubicación, se toma el nombre de la bodega. */
CREATE TRIGGER trg_mercancia_bi_validar_asignacion
BEFORE INSERT ON mercancia
FOR EACH ROW
BEGIN
    IF NEW.id_viaje IS NOT NULL OR NEW.id_estado_mercancia <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La mercancía debe recibirse En espera y sin viaje; use sp_asignar_mercancia_viaje para asignarla.';
    END IF;

    IF NEW.ubicacion_actual = 'Por registrar' THEN
        SET NEW.ubicacion_actual = (
            SELECT nombre_bodega
            FROM bodega
            WHERE id_bodega = NEW.id_bodega_recepcion
        );
    END IF;
END$$

/* Guardia de consistencia ante cambios directos.
   [M7] Llena o limpia fecha_entrega según el estado. */
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

    IF NEW.id_estado_mercancia = 4 AND OLD.id_estado_mercancia <> 4 THEN
        SET NEW.fecha_entrega = COALESCE(NEW.fecha_entrega, CURRENT_TIMESTAMP);
    ELSEIF NEW.id_estado_mercancia <> 4 THEN
        SET NEW.fecha_entrega = NULL;
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

/* [M2] Una unidad no puede tener dos viajes activos (Programado o En
   tránsito) el mismo día. */
CREATE TRIGGER trg_viaje_bi_validar_unidad
BEFORE INSERT ON viaje
FOR EACH ROW
BEGIN
    IF NEW.id_estado_viaje IN (1, 2) AND EXISTS (
        SELECT 1
        FROM viaje
        WHERE id_unidad = NEW.id_unidad
          AND fecha_programada = NEW.fecha_programada
          AND id_estado_viaje IN (1, 2)
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La unidad ya tiene un viaje activo programado para esa fecha.';
    END IF;
END$$

/* Validación defensiva al cambiar un viaje directamente.
   [M2] Revisa choques de unidad y que no esté ya en tránsito.
   [M5] El mínimo del 50 % depende del tipo de unidad. */
CREATE TRIGGER trg_viaje_bu_validar_despacho
BEFORE UPDATE ON viaje
FOR EACH ROW
BEGIN
    DECLARE v_capacidad_toneladas DECIMAL(7,2);
    DECLARE v_aplica_minimo BOOLEAN;
    DECLARE v_carga_actual_kg DECIMAL(12,2);

    IF NEW.id_estado_viaje IN (1, 2)
       AND (NEW.id_unidad <> OLD.id_unidad
            OR NEW.fecha_programada <> OLD.fecha_programada)
       AND EXISTS (
           SELECT 1
           FROM viaje
           WHERE id_unidad = NEW.id_unidad
             AND fecha_programada = NEW.fecha_programada
             AND id_estado_viaje IN (1, 2)
             AND id_viaje <> NEW.id_viaje
       ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La unidad ya tiene un viaje activo programado para esa fecha.';
    END IF;

    IF OLD.id_estado_viaje = 1 AND NEW.id_estado_viaje = 2 THEN
        IF EXISTS (
            SELECT 1
            FROM viaje
            WHERE id_unidad = NEW.id_unidad
              AND id_estado_viaje = 2
              AND id_viaje <> NEW.id_viaje
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'La unidad ya está en tránsito en otro viaje.';
        END IF;

        SELECT u.capacidad_toneladas, t.aplica_minimo_carga
          INTO v_capacidad_toneladas, v_aplica_minimo
        FROM unidad AS u
        INNER JOIN cat_tipo_unidad AS t ON t.id_tipo_unidad = u.id_tipo_unidad
        WHERE u.id_unidad = NEW.id_unidad;

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

        IF v_aplica_minimo AND v_carga_actual_kg < v_capacidad_toneladas * 500 THEN
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

/* ---------------------------------------------------------------------
   4. PROCEDIMIENTOS ALMACENADOS
   --------------------------------------------------------------------- */

/* Asignación serializada por viaje: bloquea la fila del viaje, valida
   el envío, la ruta [M3] y la capacidad, y después asigna. */
CREATE PROCEDURE sp_asignar_mercancia_viaje(
    IN p_id_mercancia INT,
    IN p_id_viaje INT,
    IN p_ubicacion VARCHAR(120)
)
BEGIN
    DECLARE v_estado_viaje TINYINT UNSIGNED;
    DECLARE v_id_ruta INT;
    DECLARE v_id_viaje_actual INT;
    DECLARE v_estado_mercancia_actual TINYINT UNSIGNED;
    DECLARE v_peso_mercancia DECIMAL(10,2);
    DECLARE v_id_destino INT;
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

    SELECT v.id_estado_viaje, v.id_ruta, u.capacidad_toneladas
      INTO v_estado_viaje, v_id_ruta, v_capacidad_toneladas
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
    SELECT id_viaje, id_estado_mercancia, peso_mercancia, id_destino
      INTO v_id_viaje_actual, v_estado_mercancia_actual, v_peso_mercancia, v_id_destino
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

    /* [M3] El destino debe pertenecer a la ruta del viaje. */
    IF NOT EXISTS (
        SELECT 1
        FROM ruta_localidad
        WHERE id_ruta = v_id_ruta
          AND id_localidad = v_id_destino
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El destino de la mercancía no pertenece a la ruta del viaje.';
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

/* Despacha un viaje si la carga cumple los límites de su tipo de unidad
   [M5] y la unidad no está en tránsito en otro viaje [M2]. */
CREATE PROCEDURE sp_despachar_viaje(IN p_id_viaje INT)
BEGIN
    DECLARE v_estado_actual TINYINT UNSIGNED;
    DECLARE v_id_unidad INT;
    DECLARE v_capacidad_toneladas DECIMAL(7,2);
    DECLARE v_aplica_minimo BOOLEAN;
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

    IF EXISTS (
        SELECT 1
        FROM viaje
        WHERE id_unidad = v_id_unidad
          AND id_estado_viaje = 2
          AND id_viaje <> p_id_viaje
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La unidad ya está en tránsito en otro viaje.';
    END IF;

    SELECT u.capacidad_toneladas, t.aplica_minimo_carga
      INTO v_capacidad_toneladas, v_aplica_minimo
    FROM unidad AS u
    INNER JOIN cat_tipo_unidad AS t ON t.id_tipo_unidad = u.id_tipo_unidad
    WHERE u.id_unidad = v_id_unidad;

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

    IF v_aplica_minimo AND v_carga_actual_kg < v_capacidad_toneladas * 500 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La carga es inferior al 50 por ciento de la capacidad.';
    END IF;

    UPDATE viaje
    SET id_estado_viaje = 2,
        fecha_salida = CURRENT_TIMESTAMP
    WHERE id_viaje = p_id_viaje;

    COMMIT;
END$$

/* Actualiza estado y ubicación; el trigger conserva el historial y
   llena fecha_entrega al pasar a Entregada [M7]. */
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
   5. VISTAS OPERATIVAS
   --------------------------------------------------------------------- */

CREATE VIEW vista_mercancia_en_espera AS
SELECT
    m.id_mercancia,
    m.codigo_seguimiento,
    c.nombre_cliente,
    lo.nombre_localidad AS origen,
    ld.nombre_localidad AS destino,
    b.nombre_bodega AS bodega_recepcion,
    m.peso_mercancia,
    me.nombre_modalidad AS modalidad_entrega,
    m.fecha_registro,
    m.ubicacion_actual
FROM mercancia AS m
INNER JOIN cliente AS c ON c.id_cliente = m.id_cliente
INNER JOIN localidad AS lo ON lo.id_localidad = m.id_origen
INNER JOIN localidad AS ld ON ld.id_localidad = m.id_destino
INNER JOIN bodega AS b ON b.id_bodega = m.id_bodega_recepcion
INNER JOIN modalidad_entrega AS me
    ON me.id_modalidad_entrega = m.id_modalidad_entrega
WHERE m.id_viaje IS NULL
  AND m.id_estado_mercancia = 1;

CREATE VIEW vista_carga_viajes AS
SELECT
    v.id_viaje,
    r.nombre_ruta,
    u.matricula,
    t.nombre_tipo AS tipo_unidad,
    u.capacidad_toneladas,
    t.aplica_minimo_carga,
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
INNER JOIN cat_tipo_unidad AS t ON t.id_tipo_unidad = u.id_tipo_unidad
INNER JOIN cat_estado_viaje AS ev ON ev.id_estado_viaje = v.id_estado_viaje
LEFT JOIN mercancia AS m ON m.id_viaje = v.id_viaje
GROUP BY
    v.id_viaje,
    r.nombre_ruta,
    u.matricula,
    t.nombre_tipo,
    u.capacidad_toneladas,
    t.aplica_minimo_carga,
    ev.nombre_estado,
    v.fecha_programada,
    v.fecha_salida;


/* ---------------------------------------------------------------------
   6. USUARIOS DEL PANEL
   La contraseña se guarda como hash bcrypt (password_hash de PHP).
   Nunca se almacena la contraseña en texto.
   --------------------------------------------------------------------- */

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(40) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    clave_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'operador') NOT NULL,
    id_bodega INT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    debe_cambiar_clave BOOLEAN NOT NULL DEFAULT TRUE,
    intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    bloqueado_hasta DATETIME NULL,
    ultimo_acceso DATETIME NULL,
    CONSTRAINT uq_usuario_usuario UNIQUE (usuario),
    CONSTRAINT fk_usuario_bodega
        FOREIGN KEY (id_bodega) REFERENCES bodega(id_bodega)
) ENGINE = InnoDB;

/* ---------------------------------------------------------------------
   FIN DEL ESQUEMA DE PRODUCCIÓN
   --------------------------------------------------------------------- */
