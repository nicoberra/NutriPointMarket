# Plan de escalabilidad · Suple Market

Fecha: 2026-10-13. Estado: **plan, sin aplicar**. Nada de esto toca producción
hasta que Nicolás dé el OK por etapa.

## 1. Cómo está armado hoy

- **Web**: Next.js exportado estático en GitHub Pages. Escala sola: no hay
  servidor propio, el HTML y las imágenes los sirve GitHub/Cloudflare.
- **Backend**: un solo Google Apps Script publicado como aplicación web
  ("Ejecutar como: yo"), sobre una planilla de Google Sheets. Todo lo que hace
  la tienda y el CRM pasa por ahí.
- **Pagos**: Mercado Pago Checkout Pro (preferencia + webhook al mismo Apps Script).

El cuello de botella es el Apps Script + Sheets, no la web.

## 2. Límites que importan (cuenta de Google personal)

| Recurso | Límite aproximado | Qué lo consume |
|---|---|---|
| Ejecuciones simultáneas del script | 30 | cada visita, pedido, webhook y acción del CRM |
| Tiempo por ejecución | 6 min | backups, renombres masivos |
| Llamadas UrlFetch por día | 20.000 | Mercado Pago, GitHub (fotos y comprobantes) |
| Celdas por planilla | 10 millones | crecimiento de Pedidos, Eventos y Papelera |

Cada visita que carga la tienda desde cero hace **2 llamadas** al script
(productos y categorías). Cada una lee la pestaña completa. Con ~1 s por
llamada, el techo práctico es de 15 a 30 visitas nuevas por segundo; por
encima, Google responde error y la tienda queda con el snapshot/caché.

## 3. Riesgos encontrados (por prioridad)

1. **Stock sin bloqueo.** `descontarProducto` lee el stock, resta y escribe.
   Dos pedidos simultáneos del mismo producto pueden leer el mismo valor y uno
   de los descuentos se pierde (sobreventa).
2. **Pedido duplicado por reintento.** El id del pedido se genera en cada
   intento (`"ped" + Date.now()`). Si la respuesta tarda y el cliente vuelve a
   tocar "Confirmar", se crean dos pedidos y se descuenta el stock dos veces.
3. **Lecturas completas en cada visita.** `productos_list` y `list Categorias`
   leen toda la pestaña siempre, sin caché del lado del servidor.
4. **Errores invisibles.** Los errores del script solo se ven en el panel de
   ejecuciones de Apps Script; nadie se entera si fallan pedidos o webhooks.
5. **Crecimiento sin techo.** Pedidos, Papelera y Eventos solo crecen; las
   búsquedas por id recorren toda la columna.

Ya resuelto en la última versión del Codigo.gs: total del pedido recalculado
en el servidor, campos permitidos en altas públicas, control del monto en el
webhook de Mercado Pago, escape de fórmulas, papelera y backups diarios.

## 4. Plan por etapas

Antes de la primera etapa: crear el tag `antes-escalabilidad-AAAAMMDD` en git
y hacer un backup manual de la planilla (`backupAhora`).

### Etapa 1 · Integridad (lo más importante)

- **Bloqueo en las escrituras críticas.** `LockService.getScriptLock()` con
  espera de hasta 20 s alrededor de: alta de pedido + descuento de stock,
  edición y borrado de pedidos, aprobar pago, webhook. Si no consigue el
  bloqueo, responde un error claro ("Mucha demanda, probá de nuevo") en vez de
  escribir a medias.
- **Pedidos idempotentes.** El checkout genera el id una sola vez por intento
  de compra y lo reutiliza en los reintentos. El servidor, si el id ya existe
  con el mismo contenido, responde `ok` sin volver a crear ni descontar.
- **Validación de stock al crear.** Si la cantidad pedida supera el stock,
  rechaza con el nombre del producto.

Prueba: dos pedidos simultáneos del último producto en stock → uno entra y el
otro recibe "sin stock"; un reintento con el mismo id → un solo pedido.

### Etapa 2 · Lecturas rápidas

- **Caché del catálogo en el servidor.** `CacheService` guarda la respuesta de
  `productos_list` y de categorías (en partes de 90 KB) por 5 minutos. Cualquier
  cambio desde el CRM (producto, stock, categoría, pedido) borra el caché.
- **Lecturas por rango.** Leer solo las columnas necesarias y buscar ids con
  `TextFinder` en vez de recorrer toda la pestaña.
- **Carga diferida en la web.** Si el caché del navegador tiene menos de 2
  minutos, no volver a pedir productos en esa visita.

Resultado esperado: la mayoría de las visitas se responden desde caché en
~0,2 s y el techo pasa a varios cientos de visitas por segundo.

### Etapa 3 · Visibilidad

- Pestaña **Errores** con fecha, acción, mensaje y datos mínimos (sin datos
  personales completos ni tokens).
- Mail diario a Nicolás solo si hubo errores o pedidos en "revisar pago".
- Panel del CRM con el último backup y la cantidad de errores del día.

### Etapa 4 · Crecimiento de datos

- Archivar cada año los pedidos cerrados a una planilla "Pedidos AAAA".
- Vaciar la Papelera con más de 90 días (queda en los backups).
- Alarma cuando la planilla supere 5 millones de celdas.

### Etapa 5 · Cuándo dejar Sheets

Migrar a una base de datos (por ejemplo Supabase con Postgres) solo si se
cumple alguna de estas condiciones de forma sostenida:

- más de 300 pedidos por día;
- más de 20 errores de cuota por día después de la etapa 2;
- necesidad de varios usuarios del CRM editando a la vez.

La migración mantiene la misma API (`action=...`), así la web casi no cambia.

## 5. Pruebas de carga (entorno aislado)

Nunca contra la planilla real.

1. Copia de la planilla y un segundo despliegue del script que lea su
   `SHEET_ID` de una propiedad `SHEET_ID_PRUEBA`.
2. Script de Node que dispare N visitas y M pedidos simultáneos contra ese
   despliegue (10, 30, 60 en paralelo).
3. Medir: tiempo de respuesta, errores de cuota, stock final esperado contra
   stock real, pedidos duplicados.
4. Criterio de aprobación: 0 diferencias de stock, 0 duplicados, menos de 1%
   de errores con 30 en paralelo.

## 6. Orden recomendado y esfuerzo

| Etapa | Impacto | Esfuerzo | Requiere redeploy del script |
|---|---|---|---|
| 1 · Integridad | Alto | Medio | Sí |
| 2 · Lecturas rápidas | Alto | Medio | Sí |
| 3 · Visibilidad | Medio | Bajo | Sí |
| 4 · Crecimiento | Bajo hoy | Bajo | Sí |
| 5 · Migración | Solo si hace falta | Alto | — |

Cada etapa se entrega con el Codigo.gs completo, pasos de redeploy y prueba
en el entorno aislado antes de pasar a producción.
