# Guía de despliegue · Transportadora Osorio

Cómo subir el sistema a un hosting compartido (cPanel, hPanel de Hostinger o similar).

## Requisitos del hosting

- PHP 8.1 o superior, con la extensión `pdo_mysql` (viene activa en casi todos).
- MySQL 8.0.16 o superior. El sistema se probó con MySQL 8.0.40. Si tu hosting usa MariaDB, debería funcionar porque soporta `CHECK`, triggers y procedimientos, pero no se ha probado: revisa el paso 7 con cuidado.
- Apache con soporte para `.htaccess`.
- Certificado SSL (HTTPS). La mayoría de los hostings lo dan gratis.

## Qué se sube y qué no

| Carpeta | Destino |
|---|---|
| `osorio-app/` | Su **contenido** va dentro de `public_html/` (o de la carpeta de tu dominio) |
| `osorio-app-bd/` | **No se sube.** Son los scripts que se importan en phpMyAdmin |

## Paso 1 · Crear la base de datos

1. En el panel del hosting entra a **Bases de datos MySQL**.
2. Crea una base (por ejemplo `u123_osorio`).
3. Crea un usuario con contraseña segura y asígnale **todos los privilegios** sobre esa base.
4. Anota el nombre de la base, el usuario, la contraseña y el servidor (casi siempre `localhost`).

## Paso 2 · Importar los scripts

En **phpMyAdmin**, selecciona la base del paso 1, abre **Importar** y carga los archivos en este orden:

1. `01_esquema.sql`: crea tablas, triggers, procedimientos y vistas.
2. `02_catalogos_y_usuarios.sql`: crea ciudades, bodegas, rutas, estados y los dos usuarios iniciales.
3. `03_datos_prueba.sql` (opcional): agrega clientes, unidades y envíos de demostración. **No lo importes si vas a capturar datos reales.**

Si phpMyAdmin muestra el error `#1419` al crear triggers o procedimientos, el hosting no permite rutinas con tu usuario. Pide a soporte que active `log_bin_trust_function_creators` o que te den el privilegio `TRIGGER`.

## Paso 3 · Subir los archivos

1. Abre el **Administrador de archivos** del hosting (o usa FTP).
2. Sube todo el contenido de `osorio-app/` dentro de `public_html/`, incluidos los archivos `.htaccess`. Algunos clientes FTP ocultan los archivos que empiezan con punto; activa "mostrar archivos ocultos".

## Paso 4 · Configurar la conexión

1. Dentro de `public_html/api/`, copia `config.ejemplo.php` y nombra la copia `config.php`.
2. Edita `config.php` con los datos del paso 1:

```php
'db' => [
    'host'    => 'localhost',
    'puerto'  => 3306,
    'nombre'  => 'u123_osorio',
    'usuario' => 'u123_app',
    'clave'   => 'la contraseña del usuario de la base',
],
```

3. Deja `'produccion' => true`.

## Paso 5 · Activar HTTPS

En `public_html/.htaccess`, quita el `#` de estas tres líneas una vez que el certificado SSL esté activo:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## Paso 6 · Primer ingreso

Entra a `https://tu-dominio/login.html`. La landing no tiene enlace al panel a propósito; guarda esta dirección.

| Usuario | Contraseña temporal | Rol |
|---|---|---|
| `admin` | `Osorio2026!` | Administrador: operación, clientes y configuración |
| `bodega` | `Bodega2026!` | Encargado de Bodega Cancún: solo operación |

El sistema obliga a cambiar la contraseña en el primer ingreso. Hazlo con ambos usuarios en cuanto subas el sitio.

## Paso 7 · Comprobar

- [ ] `https://tu-dominio/` muestra la landing.
- [ ] `https://tu-dominio/rastreo.html?codigo=OSO-7K4M-91QX` muestra el envío (solo si importaste los datos de prueba).
- [ ] `https://tu-dominio/api/config.php` responde 403 o 404, nunca el contenido del archivo.
- [ ] `https://tu-dominio/panel.html` sin sesión te manda a `login.html`.
- [ ] Puedes entrar, registrar una mercancía y ver su código.

## Seguridad incluida

- Contraseñas guardadas con bcrypt. Nunca se guardan en texto.
- Bloqueo de 15 minutos después de 5 intentos fallidos.
- Sesión que se cierra tras 120 minutos sin uso (se ajusta en `config.php`).
- Protección CSRF en todas las acciones que modifican datos.
- Consultas preparadas: no hay SQL armado con texto del usuario.
- Política de seguridad de contenido: el sitio solo carga scripts, estilos y fuentes propios.
- `config.php` y `api/lib/` bloqueados desde la web.
- El rastreo público no muestra nombre ni teléfono del cliente.

## Pendiente para versiones futuras

- Pantalla para crear y desactivar usuarios (hoy se agregan desde phpMyAdmin).
- Finalizar y cancelar viajes.
- Editar clientes y unidades desde el panel.
- Reportes operativos (CU-06).
- Límite de consultas por IP en el rastreo público.
