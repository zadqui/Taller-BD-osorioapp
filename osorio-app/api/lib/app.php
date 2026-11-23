<?php
/* =====================================================================
   Núcleo del backend: configuración, conexión, respuestas JSON,
   validación de entrada, sesión y manejo de errores de MySQL.
   ===================================================================== */
declare(strict_types=1);

const API_RAIZ = __DIR__ . '/..';

function config(): array
{
    static $c = null;
    if ($c === null) {
        $ruta = API_RAIZ . '/config.php';
        if (!is_file($ruta)) {
            responder(500, ['error' => 'Falta api/config.php. Copia config.ejemplo.php y escribe los datos de la base.']);
        }
        $c = require $ruta;
    }
    return $c;
}

function bd(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config()['db'];
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], (int) $c['puerto'], $c['nombre']);
        $pdo = new PDO($dsn, $c['usuario'], $c['clave'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
        ]);
        $st = $pdo->prepare('SET time_zone = ?');
        $st->execute([config()['desfase_mysql'] ?? '-06:00']);
    }
    return $pdo;
}

/* ---------- Respuestas ---------- */
function responder(int $codigo, array $datos): never
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}
function ok(array $datos = []): never { responder(200, ['ok' => true] + $datos); }
function fallo(int $codigo, string $mensaje): never { responder($codigo, ['error' => $mensaje]); }

/* ---------- Entrada ---------- */
function entrada(): array
{
    static $d = null;
    if ($d === null) {
        $raw = file_get_contents('php://input', false, null, 0, 65536) ?: '';
        $d = $raw === '' ? [] : json_decode($raw, true);
        if (!is_array($d)) fallo(400, 'El cuerpo de la petición no es JSON válido.');
    }
    return $d;
}
function entero(array $d, string $k, bool $requerido = true): ?int
{
    $v = $d[$k] ?? null;
    if ($v === null || $v === '') { if ($requerido) fallo(422, "Falta el dato: $k."); return null; }
    if (filter_var($v, FILTER_VALIDATE_INT) === false || (int) $v < 1) fallo(422, "El dato $k no es válido.");
    return (int) $v;
}
function texto(array $d, string $k, int $max, bool $requerido = true): ?string
{
    $v = trim((string) ($d[$k] ?? ''));
    if ($v === '') { if ($requerido) fallo(422, "Falta el dato: $k."); return null; }
    if (mb_strlen($v) > $max) fallo(422, "El dato $k supera $max caracteres.");
    return $v;
}
function decimal(array $d, string $k): float
{
    $v = $d[$k] ?? null;
    if (!is_numeric($v) || (float) $v <= 0 || (float) $v > 99999999) fallo(422, "El dato $k debe ser un número mayor que 0.");
    return round((float) $v, 2);
}

/* ---------- Sesión ---------- */
function iniciarSesionPhp(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('OSOSESION');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
    ini_set('session.use_strict_mode', '1');
    session_start();
    $limite = 60 * (int) (config()['minutos_sesion'] ?? 120);
    if (isset($_SESSION['ultimo_uso']) && time() - $_SESSION['ultimo_uso'] > $limite) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['ultimo_uso'] = time();
}

function usuarioSesion(): ?array { return $_SESSION['usuario'] ?? null; }

function exigirSesion(?string $rol = null, bool $permitirCambioPendiente = false): array
{
    $u = usuarioSesion();
    if (!$u) fallo(401, 'Tu sesión terminó. Vuelve a iniciar sesión.');
    if ($u['debe_cambiar_clave'] && !$permitirCambioPendiente) fallo(403, 'Debes cambiar tu contraseña antes de continuar.');
    if ($rol && $u['rol'] !== $rol) fallo(403, 'Tu usuario no tiene permiso para esta acción.');
    return $u;
}

function verificarCsrf(): void
{
    $enviado = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $enviado)) {
        fallo(419, 'La página caducó. Recárgala e intenta de nuevo.');
    }
}

/* ---------- Errores de MySQL ---------- */
function manejarErrorBd(PDOException $e): never
{
    $estado = $e->errorInfo[0] ?? '';
    $codigo = (int) ($e->errorInfo[1] ?? 0);
    $mensaje = (string) ($e->errorInfo[2] ?? '');

    // SIGNAL de triggers y procedimientos: regla de negocio
    if ($estado === '45000') fallo(422, $mensaje);

    // CHECK violado (3819 en MySQL, 4025 en MariaDB)
    if ($codigo === 3819 || $codigo === 4025) {
        $nombres = [
            'chk_mercancia_origen_distinto_destino' => 'El origen y el destino deben ser distintos.',
            'chk_mercancia_peso_positivo' => 'El peso debe ser mayor que 0.',
            'chk_unidad_capacidad_positiva' => 'La capacidad debe ser mayor que 0.',
            'chk_mercancia_fecha_entrega' => 'La fecha de entrega no es válida para el estado del envío.',
        ];
        foreach ($nombres as $chk => $txt) if (str_contains($mensaje, $chk)) fallo(422, $txt);
        fallo(422, 'Algún dato no cumple las reglas de la base de datos.');
    }
    if ($codigo === 1062) fallo(409, 'Ya existe un registro con esos datos.');
    if ($codigo === 1452) fallo(422, 'Uno de los datos seleccionados ya no existe.');

    error_log('[osorio] ' . $e->getMessage());
    fallo(500, config()['produccion'] ?? true ? 'Ocurrió un error en el servidor. Intenta de nuevo.' : $e->getMessage());
}
