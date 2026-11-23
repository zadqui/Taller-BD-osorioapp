<?php
/* =====================================================================
   CONFIGURACIÓN DEL SERVIDOR
   1. Copia este archivo como config.php en esta misma carpeta.
   2. Escribe los datos de la base que creaste en el panel del hosting.
   config.php nunca debe compartirse ni subirse a un repositorio público.
   ===================================================================== */

// Si alguien abre este archivo desde el navegador, no se ejecuta nada.
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

return [
    'db' => [
        'host'    => 'localhost',
        'puerto'  => 3306,
        'nombre'  => 'NOMBRE_DE_LA_BASE',
        'usuario' => 'USUARIO_DE_LA_BASE',
        'clave'   => 'CONTRASEÑA_DE_LA_BASE',
    ],

    // Mérida no usa horario de verano: UTC-6 todo el año.
    'zona_horaria' => 'America/Merida',
    'desfase_mysql' => '-06:00',

    // true en el hosting: oculta los detalles técnicos de los errores.
    'produccion' => true,

    // Minutos de inactividad antes de cerrar la sesión del panel.
    'minutos_sesion' => 120,
];
