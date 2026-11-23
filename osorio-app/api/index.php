<?php
/* =====================================================================
   API · Transportadora Osorio
   Punto de entrada único: api/index.php?r=<ruta>

   Públicas:   GET  rastreo
   Sesión:     POST login · POST logout · GET sesion · POST cambiar_clave
   Operación:  GET  datos · GET movimientos
               POST mercancia · asignar · despachar · estado · viaje · cliente
   Admin:      POST tipo_minimo
   ===================================================================== */
declare(strict_types=1);

require __DIR__ . '/lib/app.php';

date_default_timezone_set(config()['zona_horaria'] ?? 'America/Merida');
if (config()['produccion'] ?? true) { ini_set('display_errors', '0'); }

$ruta = preg_replace('/[^a-z_]/', '', (string) ($_GET['r'] ?? ''));
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$rutas = [
    'GET'  => ['rastreo', 'sesion', 'datos', 'movimientos'],
    'POST' => ['login', 'logout', 'cambiar_clave', 'mercancia', 'asignar', 'despachar', 'estado', 'viaje', 'cliente', 'tipo_minimo'],
];
if (!in_array($ruta, $rutas[$metodo] ?? [], true)) fallo(404, 'Ruta no encontrada.');

iniciarSesionPhp();
if ($metodo === 'POST' && $ruta !== 'login') verificarCsrf();

try {
    $fn = 'r_' . $ruta;
    $fn();
} catch (PDOException $e) {
    if (bd()->inTransaction()) bd()->rollBack();
    manejarErrorBd($e);
}

/* =====================================================================
   PÚBLICA: RASTREO POR CÓDIGO
   No devuelve datos personales del cliente.
   ===================================================================== */
function r_rastreo(): void
{
    $codigo = strtoupper(trim((string) ($_GET['codigo'] ?? '')));
    if (!preg_match('/^OSO-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $codigo)) fallo(422, 'El código debe tener el formato OSO-XXXX-XXXX.');

    $st = bd()->prepare(
        'SELECT m.id_mercancia, m.codigo_seguimiento AS codigo, m.id_estado_mercancia AS id_estado,
                m.peso_mercancia AS peso, m.tipo_mercancia AS tipo, m.ubicacion_actual AS ubicacion,
                m.fecha_registro, m.fecha_entrega, m.id_destino,
                lo.nombre_localidad AS origen, ld.nombre_localidad AS destino,
                b.nombre_bodega AS bodega, me.nombre_modalidad AS entrega, mc.nombre_modalidad AS cobro,
                v.id_viaje, v.id_ruta, v.id_estado_viaje, v.fecha_programada, v.fecha_salida,
                u.matricula, tu.nombre_tipo AS tipo_unidad
         FROM mercancia m
         JOIN localidad lo ON lo.id_localidad = m.id_origen
         JOIN localidad ld ON ld.id_localidad = m.id_destino
         JOIN bodega b ON b.id_bodega = m.id_bodega_recepcion
         JOIN modalidad_entrega me ON me.id_modalidad_entrega = m.id_modalidad_entrega
         JOIN modalidad_cobro mc ON mc.id_modalidad_cobro = m.id_modalidad_cobro
         LEFT JOIN viaje v ON v.id_viaje = m.id_viaje
         LEFT JOIN unidad u ON u.id_unidad = v.id_unidad
         LEFT JOIN cat_tipo_unidad tu ON tu.id_tipo_unidad = u.id_tipo_unidad
         WHERE m.codigo_seguimiento = ?'
    );
    $st->execute([$codigo]);
    $m = $st->fetch();
    if (!$m) fallo(404, 'No encontramos ese código.');

    $idRuta = $m['id_ruta'];
    if (!$idRuta) {
        $r = bd()->prepare('SELECT id_ruta FROM ruta_localidad WHERE id_localidad = ? ORDER BY id_ruta LIMIT 1');
        $r->execute([$m['id_destino']]);
        $idRuta = $r->fetchColumn() ?: null;
    }
    $paradas = [];
    $nombreRuta = null;
    if ($idRuta) {
        $p = bd()->prepare('SELECT l.nombre_localidad FROM ruta_localidad rl JOIN localidad l ON l.id_localidad = rl.id_localidad WHERE rl.id_ruta = ? ORDER BY rl.orden');
        $p->execute([$idRuta]);
        $paradas = $p->fetchAll(PDO::FETCH_COLUMN);
        $n = bd()->prepare('SELECT nombre_ruta FROM ruta WHERE id_ruta = ?');
        $n->execute([$idRuta]);
        $nombreRuta = $n->fetchColumn();
    }

    $mv = bd()->prepare('SELECT id_movimiento AS id, id_estado_mercancia AS id_estado, fecha_hora, ubicacion FROM movimiento_mercancia WHERE id_mercancia = ? ORDER BY fecha_hora DESC, id_movimiento DESC');
    $mv->execute([$m['id_mercancia']]);

    ok(['envio' => [
        'codigo' => $m['codigo'], 'id_estado' => (int) $m['id_estado'], 'peso' => (float) $m['peso'], 'tipo' => $m['tipo'],
        'ubicacion' => $m['ubicacion'], 'fecha_registro' => $m['fecha_registro'], 'fecha_entrega' => $m['fecha_entrega'],
        'origen' => $m['origen'], 'destino' => $m['destino'], 'bodega' => $m['bodega'], 'entrega' => $m['entrega'], 'cobro' => $m['cobro'],
        'viaje' => $m['id_viaje'] ? [
            'id' => (int) $m['id_viaje'], 'id_estado' => (int) $m['id_estado_viaje'], 'fecha_programada' => $m['fecha_programada'],
            'fecha_salida' => $m['fecha_salida'], 'matricula' => $m['matricula'], 'tipo_unidad' => $m['tipo_unidad'],
        ] : null,
        'ruta' => $nombreRuta, 'paradas' => $paradas,
        'movimientos' => $mv->fetchAll(),
    ]]);
}

/* =====================================================================
   SESIÓN
   ===================================================================== */
function datosUsuario(array $u): array
{
    return [
        'id' => (int) $u['id_usuario'], 'usuario' => $u['usuario'], 'nombre' => $u['nombre'], 'rol' => $u['rol'],
        'id_bodega' => $u['id_bodega'] !== null ? (int) $u['id_bodega'] : null, 'bodega' => $u['nombre_bodega'] ?? null,
        'debe_cambiar_clave' => (bool) $u['debe_cambiar_clave'],
    ];
}

function r_login(): void
{
    $d = entrada();
    $usuario = strtolower(texto($d, 'usuario', 40));
    $clave = (string) ($d['clave'] ?? '');
    if ($clave === '' || strlen($clave) > 200) fallo(422, 'Escribe tu contraseña.');

    $st = bd()->prepare('SELECT u.*, b.nombre_bodega FROM usuario u LEFT JOIN bodega b ON b.id_bodega = u.id_bodega WHERE u.usuario = ?');
    $st->execute([$usuario]);
    $u = $st->fetch();

    if ($u && $u['bloqueado_hasta'] && strtotime($u['bloqueado_hasta']) > time()) {
        fallo(429, 'Usuario bloqueado por intentos fallidos. Intenta en 15 minutos.');
    }
    // Se verifica contra un hash ficticio si el usuario no existe para no revelar cuáles existen
    $hash = $u['clave_hash'] ?? '$2y$12$DvfLW6Fk03/YYCT5M7Hp9O2pzdJ/cLCaf5WUnKdw3NqIMJTnI7gx.';
    $valida = password_verify($clave, $hash);

    if (!$u || !$valida || !$u['activo']) {
        if ($u) {
            bd()->prepare('UPDATE usuario SET intentos_fallidos = intentos_fallidos + 1 WHERE id_usuario = ?')->execute([$u['id_usuario']]);
            bd()->prepare('UPDATE usuario SET bloqueado_hasta = NOW() + INTERVAL 15 MINUTE, intentos_fallidos = 0 WHERE id_usuario = ? AND intentos_fallidos >= 5')->execute([$u['id_usuario']]);
        }
        usleep(400000);
        fallo(401, 'Usuario o contraseña incorrectos.');
    }

    if (password_needs_rehash($u['clave_hash'], PASSWORD_BCRYPT, ['cost' => 12])) {
        bd()->prepare('UPDATE usuario SET clave_hash = ? WHERE id_usuario = ?')->execute([password_hash($clave, PASSWORD_BCRYPT, ['cost' => 12]), $u['id_usuario']]);
    }
    bd()->prepare('UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = NOW() WHERE id_usuario = ?')->execute([$u['id_usuario']]);

    session_regenerate_id(true);
    $_SESSION['usuario'] = datosUsuario($u);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    ok(['usuario' => $_SESSION['usuario'], 'csrf' => $_SESSION['csrf']]);
}

function r_logout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Strict']);
    }
    session_destroy();
    ok();
}

function r_sesion(): void
{
    $u = usuarioSesion();
    if (!$u) ok(['usuario' => null]);
    ok(['usuario' => $u, 'csrf' => $_SESSION['csrf']]);
}

function r_cambiar_clave(): void
{
    $u = exigirSesion(null, true);
    $d = entrada();
    $actual = (string) ($d['actual'] ?? '');
    $nueva = (string) ($d['nueva'] ?? '');
    if (strlen($nueva) < 10 || !preg_match('/[A-Za-z]/', $nueva) || !preg_match('/\d/', $nueva)) {
        fallo(422, 'La nueva contraseña debe tener al menos 10 caracteres, con letras y números.');
    }
    if (strlen($nueva) > 200) fallo(422, 'La contraseña es demasiado larga.');
    $st = bd()->prepare('SELECT clave_hash FROM usuario WHERE id_usuario = ?');
    $st->execute([$u['id']]);
    $hash = $st->fetchColumn();
    if (!$hash || !password_verify($actual, $hash)) fallo(422, 'La contraseña actual no es correcta.');
    if (password_verify($nueva, $hash)) fallo(422, 'La nueva contraseña debe ser distinta de la actual.');

    bd()->prepare('UPDATE usuario SET clave_hash = ?, debe_cambiar_clave = FALSE WHERE id_usuario = ?')
        ->execute([password_hash($nueva, PASSWORD_BCRYPT, ['cost' => 12]), $u['id']]);
    $_SESSION['usuario']['debe_cambiar_clave'] = false;
    session_regenerate_id(true);
    ok(['usuario' => $_SESSION['usuario']]);
}

/* =====================================================================
   OPERACIÓN
   ===================================================================== */
function filas(string $sql, array $p = []): array
{
    $st = bd()->prepare($sql);
    $st->execute($p);
    return $st->fetchAll();
}

function r_datos(): void
{
    exigirSesion();
    $num = fn(array $rows, array $floats = [], array $bools = []) => array_map(function ($r) use ($floats, $bools) {
        foreach ($floats as $k) $r[$k] = (float) $r[$k];
        foreach ($bools as $k) $r[$k] = (bool) $r[$k];
        return $r;
    }, $rows);

    ok(['datos' => [
        'localidad' => filas('SELECT id_localidad AS id, nombre_localidad AS nombre FROM localidad ORDER BY id_localidad'),
        'bodega' => filas('SELECT id_bodega AS id, nombre_bodega AS nombre, id_localidad FROM bodega ORDER BY id_bodega'),
        'modalidad_entrega' => filas('SELECT id_modalidad_entrega AS id, nombre_modalidad AS nombre FROM modalidad_entrega ORDER BY id_modalidad_entrega'),
        'modalidad_cobro' => filas('SELECT id_modalidad_cobro AS id, nombre_modalidad AS nombre FROM modalidad_cobro ORDER BY id_modalidad_cobro'),
        'cat_tipo_unidad' => $num(filas('SELECT id_tipo_unidad AS id, nombre_tipo AS nombre, aplica_minimo_carga FROM cat_tipo_unidad ORDER BY id_tipo_unidad'), [], ['aplica_minimo_carga']),
        'cat_estado_mercancia' => filas('SELECT id_estado_mercancia AS id, nombre_estado AS nombre FROM cat_estado_mercancia ORDER BY id_estado_mercancia'),
        'cat_estado_viaje' => filas('SELECT id_estado_viaje AS id, nombre_estado AS nombre FROM cat_estado_viaje ORDER BY id_estado_viaje'),
        'ruta' => filas('SELECT id_ruta AS id, nombre_ruta AS nombre FROM ruta ORDER BY id_ruta'),
        'ruta_localidad' => filas('SELECT id_ruta, id_localidad, orden FROM ruta_localidad ORDER BY id_ruta, orden'),
        'unidad' => $num(filas('SELECT id_unidad AS id, matricula, id_tipo_unidad, capacidad_toneladas FROM unidad ORDER BY matricula'), ['capacidad_toneladas']),
        'cliente' => filas('SELECT id_cliente AS id, nombre_cliente AS nombre, telefono_cliente AS telefono FROM cliente ORDER BY nombre_cliente'),
        'viaje' => filas('SELECT id_viaje AS id, id_ruta, id_unidad, id_estado_viaje, fecha_programada, fecha_salida FROM viaje ORDER BY fecha_programada DESC, id_viaje DESC LIMIT 300'),
        'mercancia' => $num(filas(
            'SELECT id_mercancia AS id, id_cliente, id_viaje, codigo_seguimiento AS codigo, peso_mercancia AS peso, tipo_mercancia AS tipo,
                    id_origen, id_destino, id_bodega_recepcion AS id_bodega, id_modalidad_entrega, id_modalidad_cobro,
                    id_estado_mercancia AS id_estado, ubicacion_actual AS ubicacion, fecha_registro, fecha_entrega
             FROM mercancia
             WHERE id_estado_mercancia <> 4 OR fecha_entrega >= NOW() - INTERVAL 60 DAY
             ORDER BY fecha_registro DESC, id_mercancia DESC LIMIT 1000'), ['peso']),
    ]]);
}

function r_movimientos(): void
{
    exigirSesion();
    $id = entero($_GET, 'id');
    ok(['movimientos' => filas('SELECT id_movimiento AS id, id_estado_mercancia AS id_estado, fecha_hora, ubicacion, observacion FROM movimiento_mercancia WHERE id_mercancia = ? ORDER BY fecha_hora DESC, id_movimiento DESC', [$id])]);
}

function r_mercancia(): void
{
    exigirSesion();
    $d = entrada();
    $valores = [
        entero($d, 'id_cliente'), decimal($d, 'peso'), entero($d, 'id_origen'), entero($d, 'id_destino'),
        entero($d, 'id_bodega'), entero($d, 'id_modalidad_entrega'), entero($d, 'id_modalidad_cobro'),
    ];
    $sql = 'INSERT INTO mercancia (codigo_seguimiento, id_cliente, peso_mercancia, id_origen, id_destino, id_bodega_recepcion, id_modalidad_entrega, id_modalidad_cobro)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    $alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for ($intento = 0; $intento < 6; $intento++) {
        $parte = fn() => implode('', array_map(fn() => $alfabeto[random_int(0, strlen($alfabeto) - 1)], range(1, 4)));
        $codigo = 'OSO-' . $parte() . '-' . $parte();
        try {
            bd()->prepare($sql)->execute(array_merge([$codigo], $valores));
            ok(['codigo' => $codigo, 'id' => (int) bd()->lastInsertId()]);
        } catch (PDOException $e) {
            if ((int) ($e->errorInfo[1] ?? 0) === 1062 && str_contains((string) $e->errorInfo[2], 'codigo_seguimiento')) continue;
            throw $e;
        }
    }
    fallo(500, 'No se pudo generar un código único. Intenta de nuevo.');
}

function llamar(string $sql, array $p): void
{
    $st = bd()->prepare($sql);
    $st->execute($p);
    $st->closeCursor();
}

function r_asignar(): void
{
    exigirSesion();
    $d = entrada();
    llamar('CALL sp_asignar_mercancia_viaje(?, ?, ?)', [entero($d, 'id_mercancia'), entero($d, 'id_viaje'), texto($d, 'ubicacion', 120)]);
    ok();
}

function r_despachar(): void
{
    exigirSesion();
    llamar('CALL sp_despachar_viaje(?)', [entero(entrada(), 'id_viaje')]);
    ok();
}

function r_estado(): void
{
    exigirSesion();
    $d = entrada();
    llamar('CALL sp_actualizar_estado_mercancia(?, ?, ?)', [entero($d, 'id_mercancia'), texto($d, 'estado', 40), texto($d, 'ubicacion', 120)]);
    ok();
}

function r_viaje(): void
{
    exigirSesion();
    $d = entrada();
    $fecha = (string) ($d['fecha_programada'] ?? '');
    $f = DateTime::createFromFormat('!Y-m-d', $fecha);
    if (!$f || $f->format('Y-m-d') !== $fecha) fallo(422, 'La fecha programada no es válida.');
    if ($f < new DateTime('today')) fallo(422, 'La fecha programada no puede ser anterior a hoy.');
    bd()->prepare('INSERT INTO viaje (id_ruta, id_unidad, fecha_programada) VALUES (?, ?, ?)')->execute([entero($d, 'id_ruta'), entero($d, 'id_unidad'), $fecha]);
    ok(['id' => (int) bd()->lastInsertId()]);
}

function r_cliente(): void
{
    exigirSesion();
    $d = entrada();
    $nombre = texto($d, 'nombre', 100);
    $tel = texto($d, 'telefono', 15, false);
    if ($tel !== null && !preg_match('/^\d{10}$/', $tel)) fallo(422, 'El teléfono debe tener 10 dígitos.');
    bd()->prepare('INSERT INTO cliente (nombre_cliente, telefono_cliente) VALUES (?, ?)')->execute([$nombre, $tel]);
    ok(['id' => (int) bd()->lastInsertId(), 'nombre' => $nombre, 'telefono' => $tel]);
}

/* =====================================================================
   ADMINISTRACIÓN
   ===================================================================== */
function r_tipo_minimo(): void
{
    exigirSesion('admin');
    $d = entrada();
    if (!isset($d['valor']) || !is_bool($d['valor'])) fallo(422, 'El valor debe ser verdadero o falso.');
    bd()->prepare('UPDATE cat_tipo_unidad SET aplica_minimo_carga = ? WHERE id_tipo_unidad = ?')->execute([$d['valor'] ? 1 : 0, entero($d, 'id_tipo')]);
    ok();
}
