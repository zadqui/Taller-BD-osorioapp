# Informe de avance · Interfaz gráfica
**Sistema de Gestión Logística – Transportadora Osorio**
Fecha: 19/11/2026 · Avance estimado: **50 %**

---

## 1. Qué se entregó

Página web en `interfaz/` (abrir `interfaz/index.html` con doble clic; no requiere instalación).

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura: barra lateral, barra superior, contenedor de vistas |
| `css/styles.css` | Estilo minimalista *liquid glass* (vidrio esmerilado, modo claro/oscuro, adaptable a móvil) |
| `js/data.js` | Datos de prueba idénticos al estado de `bd_transporte` tras ejecutar los scripts 01 y 02 |
| `js/app.js` | Vistas, navegación y una capa que replica en memoria los triggers y procedimientos |

### Casos de uso cubiertos

| CU | Pantalla | Estado | Regla de la BD replicada |
|---|---|---|---|
| CU-01 Registrar cliente | Clientes | ✅ Alta y listado | — |
| CU-02 Registrar recepción | Registrar recepción | ✅ Formulario completo, código `OSO-XXXX-XXXX` automático | `trg_mercancia_bi_*`, `trg_mercancia_ai_*`, `chk_mercancia_peso_positivo` |
| CU-03 Mercancía en espera | Mercancía en espera | ✅ Tabla + asignación a viaje | `vista_mercancia_en_espera`, `sp_asignar_mercancia_viaje` |
| CU-04 Programar y despachar | Viajes | 🟡 Programar y despachar sí; finalizar/cancelar no | `vista_carga_viajes`, `sp_despachar_viaje` (mínimo 50 %, máximo 100 %) |
| CU-05 Actualizar estado / entrega | Envíos (panel lateral) | ✅ Cambio de estado, entrega, historial | `sp_actualizar_estado_mercancia`, `trg_mercancia_bu_*`, `trg_mercancia_au_*` |
| CU-06 Reportes operativos | Reportes | ❌ Solo maqueta “Próximamente” | — |
| CU-07 Consulta del cliente | Rastreo de envío | ✅ Búsqueda por código, pasos y movimientos | — |

Extras: Panel con indicadores y ocupación de viajes, Flota y catálogos (solo lectura), búsqueda, filtros por estado, mensajes de error con el texto exacto de los `SIGNAL` de MySQL.

> **Demostración de la regla del 50 %:** los datos de prueba tienen poca carga, así que *Despachar* muestra el error de `sp_despachar_viaje`. Para verlo funcionar, registra una mercancía de ~16 000 kg, asígnala al viaje 1 y despáchalo.

---

## 2. Qué falta (el otro 50 %)

### 2.1 Crítico – sin esto no es un sistema real
1. **Conexión con MySQL (backend/API).** Hoy los datos viven en memoria y se pierden al recargar. Se necesita un servidor (Node.js + Express + `mysql2`, PHP + PDO o Python + Flask) que exponga endpoints y llame a los procedimientos:
   | Acción en la interfaz | Endpoint sugerido | SQL |
   |---|---|---|
   | Registrar mercancía | `POST /api/mercancias` | `INSERT INTO mercancia …` |
   | Asignar a viaje | `POST /api/mercancias/:id/asignar` | `CALL sp_asignar_mercancia_viaje(?,?,?)` |
   | Despachar | `POST /api/viajes/:id/despachar` | `CALL sp_despachar_viaje(?)` |
   | Cambiar estado | `PATCH /api/mercancias/:id/estado` | `CALL sp_actualizar_estado_mercancia(?,?,?)` |
   | Listados | `GET /api/...` | vistas `vista_mercancia_en_espera`, `vista_carga_viajes` |

   En `js/app.js` cada función de la “CAPA DE DATOS” ya está señalada con el procedimiento que debe sustituirla. Esto cubre la competencia *“Establecer conexiones entre el SGBD y algún lenguaje de programación”*.
2. **Inicio de sesión y roles.** No hay tabla `usuario` ni login. Separar el módulo de administrador del de rastreo público.
3. **Seguridad en la BD.** Crear usuarios MySQL con `GRANT` limitados (p. ej. la app solo con `EXECUTE` sobre procedimientos y `SELECT` sobre vistas). Es competencia del temario y aún no existe.

### 2.2 Funcionalidad pendiente en la interfaz
4. **CU-06 Reportes:** viajes por periodo, mercancía en espera por bodega, ocupación por unidad, envíos por cliente, exportar a PDF/Excel.
5. **Finalizar y cancelar viajes:** los estados 3 y 4 existen en `cat_estado_viaje`, pero no hay procedimiento (`sp_finalizar_viaje`, `sp_cancelar_viaje`) ni regla para liberar la mercancía de un viaje cancelado.
6. **Editar / eliminar:** clientes, unidades, rutas y localidades solo se pueden dar de alta o consultar.
7. **Desasignar mercancía** de un viaje programado (hoy no hay forma de revertir un error de asignación).
8. **Comprobante de recepción** imprimible con el código de seguimiento para entregarlo al cliente.
9. **Validaciones de formulario más estrictas** (teléfono a 10 dígitos, origen ≠ destino, fechas no pasadas).

### 2.3 Inconsistencias detectadas en la BD (conviene corregir antes del backend)
10. **Una unidad en varios viajes a la vez:** `ECO-002` está en los viajes 1, 2 y 5, y `ECO-004` en el 4 y el 7. No hay regla que impida usar la misma unidad en viajes simultáneos.
11. **Origen igual a destino:** la mercancía 8 va de Campeche a Campeche. Falta `CHECK (id_origen <> id_destino)`.
12. **La ruta no está ligada a localidades:** `ruta` solo tiene nombre, así que no se valida que el destino de la mercancía pertenezca a la ruta del viaje (p. ej., la mercancía 2 va a Playa del Carmen en la *Ruta Campeche*).
13. **Ubicación vs. origen:** mercancía con origen Mérida aparece en “Bodega Cancun”. Falta definir si existe bodega en Mérida o una tabla `bodega`.
14. **Sin fecha de entrega:** no hay columna `fecha_entrega`; hoy solo se deduce del historial.
15. **Pendientes ya anotados en los scripts:** significado de *Sucursal* vs. *Ocurrencia*, la localidad “Puerto”, “Ciudad del Carmen” como dato heredado y si el mínimo del 50 % aplica al reparto local.

### 2.4 Diferencias con el anteproyecto
16. El anteproyecto promete **pagos, clientes con crédito, adeudos e ingresos**, pero el script actual eliminó la tabla `pago` (la modalidad de cobro es solo informativa). Hay que decidir con la profesora y la empresa si se recupera o se ajusta el alcance en la documentación.
17. **Concurrencia:** el procedimiento de asignación ya bloquea el viaje (`FOR UPDATE`), pero falta documentar y demostrar la prueba con dos sesiones simultáneas.
18. **Pruebas y documentación** (actividades 9–11 del cronograma): casos de prueba, manual de usuario y capturas.

---

## 3. Orden sugerido para continuar

| Semana | Tarea |
|---|---|
| 1 | Corregir puntos 10–14 en `01_CREATE` y regenerar datos de prueba |
| 2 | Backend con conexión a MySQL y endpoints de la tabla 2.1 |
| 3 | Sustituir `data.js` por llamadas `fetch()`; login de administrador |
| 4 | Reportes (CU-06), finalizar/cancelar viaje, edición de catálogos |
| 5 | Usuarios y `GRANT`, pruebas de concurrencia, manual y presentación |
