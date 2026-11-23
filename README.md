# Taller BD · Transportadora Osorio

Proyecto escolar para gestionar mercancías, viajes y rastreo de envíos. La aplicación usa HTML, CSS y JavaScript, una API en PHP y una base de datos MySQL con vistas, triggers y procedimientos almacenados.

## Contenido del repositorio

| Ruta | Contenido |
|---|---|
| `osorio-app/` | Aplicación conectada a la base de datos: portada, rastreo, acceso y panel. |
| `osorio-app-bd/` | Esquema, catálogos, usuarios iniciales y datos de demostración para la aplicación. |
| `interfaz/` | Prototipo anterior con datos simulados en JavaScript. |
| `01_CREATE_BD_TRANSPORTE_*.sql` y `02_INSERT_BD_TRANSPORTE_*.sql` | Versiones anteriores de los scripts del proyecto. |
| Archivos PDF y DOCX | Anteproyecto y descripción de casos de uso. |

Para ejecutar la aplicación, utiliza los scripts de **`osorio-app-bd/`**. No los combines con los scripts anteriores de la raíz.

## Requisitos

- PHP **8.1 o superior**, con `pdo_mysql` y `mbstring` habilitados.
- MySQL **8.0.16 o superior**. La guía del proyecto indica pruebas previas con MySQL 8.0.40.
- Un usuario de MySQL con permisos para crear las tablas, vistas, triggers y procedimientos del esquema, y ejecutar las operaciones de la aplicación.
- Apache con soporte para `.htaccess`, recomendado para conservar las restricciones de acceso incluidas.
- Un navegador con JavaScript y cookies habilitados.

Si utilizas XAMPP, comprueba el motor de base de datos instalado: puede incluir MariaDB. La compatibilidad con MariaDB no está verificada en este proyecto.

## 1. Descargar el proyecto

```powershell
git clone https://github.com/zadqui/Taller-BD-osorioapp.git
cd Taller-BD-osorioapp
```

El repositorio es privado; necesitas acceso a la cuenta o autenticación con GitHub para clonarlo. También puedes descargar el ZIP desde GitHub.

## 2. Crear y cargar la base de datos

Inicia MySQL y crea una **base nueva y exclusiva para este proyecto**, por ejemplo desde MySQL Workbench o phpMyAdmin:

```sql
CREATE DATABASE bd_transporte CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Selecciona `bd_transporte` como base activa e importa estos archivos en orden:

1. `osorio-app-bd/01_esquema.sql`: tablas, vistas, triggers y procedimientos.
2. `osorio-app-bd/02_catalogos_y_usuarios.sql`: catálogos y cuentas iniciales.
3. `osorio-app-bd/03_datos_prueba.sql`: datos de demostración, opcionales pero útiles para la presentación escolar.

**Atención:** `01_esquema.sql` elimina y vuelve a crear las tablas y rutinas del sistema en la base seleccionada. No lo ejecutes sobre una base con información que quieras conservar. Los archivos de carga se importan una sola vez; repetirlos puede provocar errores de registros duplicados.

En phpMyAdmin, selecciona la base en la barra lateral y usa **Importar** para cada archivo. En MySQL Workbench, abre cada script, selecciona la base como esquema predeterminado y ejecuta el archivo completo.

## 3. Configurar la conexión local

Desde la raíz del repositorio, copia la plantilla **solo si aún no tienes `config.php`**:

```powershell
Copy-Item osorio-app/api/config.ejemplo.php osorio-app/api/config.php
```

Edita la sección `db` de `osorio-app/api/config.php` con los datos de tu instalación:

```php
'db' => [
    'host'    => '127.0.0.1',
    'puerto'  => 3306,
    'nombre'  => 'bd_transporte',
    'usuario' => 'TU_USUARIO_MYSQL',
    'clave'   => 'TU_CLAVE_MYSQL',
],
```

Los valores de usuario y clave son marcadores de ejemplo. Conserva las demás opciones de la plantilla. `config.php` está excluido de Git mediante `.gitignore`; cada equipo debe configurar su propia copia.

## 4. Ejecutar la aplicación en local

### Opción A: Apache

1. Copia la carpeta `osorio-app` dentro de la raíz web de Apache; por ejemplo, `C:\xampp\htdocs\osorio-app` si utilizas XAMPP para Apache y PHP.
2. Comprueba que la copia contiene `api/config.php` y los archivos `.htaccess`.
3. Inicia Apache y tu servidor MySQL.
4. Abre `http://localhost/osorio-app/`.
5. Entra al panel mediante `http://localhost/osorio-app/login.html`.

Si Apache utiliza otro puerto, inclúyelo en la dirección. No actives la redirección a HTTPS del `.htaccess` para una instalación local que solo sirve HTTP.

### Opción B: servidor de desarrollo de PHP

Con PHP disponible en la terminal, ejecuta desde la raíz del repositorio:

```powershell
php -S 127.0.0.1:8080 -t osorio-app
```

Mantén esa terminal abierta y MySQL encendido. Visita `http://127.0.0.1:8080/` y `http://127.0.0.1:8080/login.html`. Para detener el servidor, presiona `Ctrl+C`.

Esta opción es para pruebas locales: el servidor integrado de PHP no aplica las reglas `.htaccess`. El directorio servido debe ser `osorio-app`, para mantener fuera de la raíz web los scripts SQL y los documentos.

No abras los HTML con doble clic ni uses un servidor que solo sirva archivos estáticos: la aplicación necesita ejecutar PHP para acceder a MySQL.

## 5. Primer acceso y comprobación

Tras importar los catálogos, las cuentas iniciales son:

| Usuario | Contraseña temporal | Rol |
|---|---|---|
| `admin` | `Osorio2026!` | Administrador |
| `bodega` | `Bodega2026!` | Operador de Bodega Cancún |

Son cuentas de demostración definidas en el script SQL. El sistema exige cambiar la contraseña al primer ingreso; después utiliza la nueva contraseña que hayas elegido.

- Abre la portada y comprueba que cargan estilos e imágenes.
- Sin una sesión iniciada, abre `panel.html` y verifica que te envía al acceso.
- Inicia sesión y cambia la contraseña temporal.
- Si cargaste datos de prueba, consulta `rastreo.html?codigo=OSO-7K4M-91QX`.
- Registra una mercancía y confirma que se guarda en MySQL y aparece al recargar.
- Prueba la asignación y el despacho de un viaje respetando las reglas de capacidad y carga del sistema.

La portada no incluye enlace al panel; utiliza directamente `login.html`.

## Problemas frecuentes

| Mensaje o síntoma | Qué revisar |
|---|---|
| Falta `api/config.php` | Crea tu copia de la plantilla y configura la conexión. |
| `could not find driver` | Habilita `pdo_mysql` en el PHP que ejecuta la aplicación. |
| Error relacionado con `mb_strlen` | Habilita `mbstring`. |
| Error de conexión o `Access denied` | Comprueba que MySQL está encendido y revisa host, puerto, usuario, clave y permisos. |
| `Unknown database` o tablas inexistentes | Crea la base, importa los scripts correctos y verifica su nombre en `config.php`. |
| Error al crear triggers o procedimientos | Revisa los permisos del usuario y la configuración del servidor; conserva el mensaje SQL completo para diagnosticarlo. |
| PHP se muestra como texto o se descarga | La página se está sirviendo sin un intérprete PHP correctamente configurado. |
| No aparecen los cambios en la aplicación | Comprueba que ejecutas `osorio-app`, no el prototipo `interfaz`, y que editas la copia servida por Apache. |

## Documentación adicional

### Publicación desde GitHub en Alwaysdata

El flujo `.github/workflows/deploy-alwaysdata.yml` publica el contenido de `osorio-app/` en la cuenta `osorioapp`, dentro de `/home/osorioapp/www/`. El sitio utiliza la dirección `https://osorioapp.alwaysdata.net/`.

- Requiere los secretos del repositorio `ALWAYSDATA_SSH_KEY` (clave privada de despliegue) y `ALWAYSDATA_KNOWN_HOSTS` (identidad del servidor SSH).
- La variable del repositorio `ALWAYSDATA_READY` debe valer `true` después de configurar y comprobar la conexión a la base del hosting. Mientras no esté activa, el trabajo de despliegue se omite.
- Publica automáticamente los cambios en `main` que afecten a la aplicación o al flujo. También se puede ejecutar desde **Actions → Publicar en Alwaysdata → Run workflow**.
- El archivo `api/config.php` se instala por separado en el hosting y se conserva durante los despliegues. No se guarda en GitHub.
- Los scripts SQL no se ejecutan durante el despliegue: las actualizaciones de código conservan la base existente.
- El flujo comprueba que la API de sesión responde por HTTPS; esa comprobación no sustituye una prueba de las operaciones de MySQL.

- [Guía de despliegue en hosting](osorio-app-bd/GUIA_DE_DESPLIEGUE.md).
- [Informe de pendientes del prototipo](INFORME_PENDIENTES.md), como referencia histórica; no representa por sí solo el estado actual de `osorio-app`.

GitHub conserva el código y los scripts SQL. Los registros que captures en tu MySQL local requieren una exportación de la base para respaldarlos o trasladarlos a otro equipo.
