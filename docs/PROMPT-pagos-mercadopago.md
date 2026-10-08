# Prompt para otra sesión de Claude Code: pagos (Mercado Pago + transferencia) y seguimiento desde el CRM, igual que en Suple Market

> Copiá y pegá todo este archivo como primer mensaje en la otra sesión. Es una
> descripción exacta de cómo lo tenemos funcionando en Suple Market
> (suplemarket.com.ar), para replicarlo igual en otro proyecto.

---

## Lo que quiero que hagas

Integrá **pagos con Mercado Pago (Checkout Pro) y por transferencia** en mi
tienda, y que **desde el CRM se vea el estado de pago de cada pedido y de cada
cliente**, replicando exactamente la arquitectura y el flujo que describo
abajo. Es un sistema que ya funciona en otro proyecto mío (Suple Market); no
inventes otra forma: copiá esta.

Reglas:
- Los secretos (Access Token de Mercado Pago, token de GitHub, PIN del CRM)
  **nunca van en el repositorio ni en el frontend**. Van en *Propiedades del
  script* de Google Apps Script y se leen server-side.
- Cuando toques el archivo de Apps Script, pasame **siempre el archivo
  completo** (no ediciones parciales) y los pasos para redeployar.
- No pidas el Access Token ni el PIN en el chat: decime qué propiedad tengo que
  cargar y yo la cargo en Apps Script.

---

## 1. Arquitectura de referencia (así está en Suple Market)

- **Frontend**: Next.js 14 (App Router) exportado estático (`output: "export"`,
  `trailingSlash: true`), hosteado en GitHub Pages con dominio propio. No hay
  servidor Node: todo lo dinámico lo resuelve un backend en Google Apps Script.
- **Base de datos**: una planilla de Google Sheets con pestañas `Productos`,
  `Categorias`, `Clientes`, `Pedidos`, `Suscriptores`.
- **Backend**: un proyecto de Apps Script vinculado a esa planilla, publicado
  como *aplicación web* ("Ejecutar como: yo", "Acceso: cualquier usuario").
  Expone una sola URL `/exec` y una función `handle(action, params)` con un
  `switch` por acción. La web lo llama por **JSONP** (GET con `?callback=`),
  y las subidas de archivos por **POST** `no-cors` con el contenido en base64.
- **CRM**: ruta privada `/admin` de la misma web (React), protegida por PIN.
  El PIN se valida en el backend (`crm_login`) que devuelve un token de sesión
  de 30 días; el token viaja en cada llamada (`token=`) y el backend lo exige
  para toda acción que no sea pública.

### Secretos en Apps Script → *Configuración del proyecto* → *Propiedades del script*

| Propiedad | Para qué |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token de **producción** de Mercado Pago (empieza con `APP_USR-`). Lo usa el backend para crear preferencias y consultar pagos. |
| `GITHUB_TOKEN` | Token de GitHub con permiso de contenido sobre el repo. Lo usa el backend para subir fotos y comprobantes al repo (quedan públicos en la web). |
| `CRM_PIN` | PIN de acceso al CRM. |
| `CRM_TOKENS` | Lo maneja el backend solo (tokens de sesión vigentes). |

Cómo se cargan: en el editor de Apps Script → ícono de engranaje
(*Configuración del proyecto*) → *Propiedades del script* → *Agregar
propiedad* → nombre y valor → *Guardar propiedades*. Después de cambiar
código: *Implementar → Administrar implementaciones → lápiz → Versión nueva →
Implementar* (la URL `/exec` no cambia).

---

## 2. La pestaña `Pedidos` (columnas exactas)

| clave | encabezado | contenido |
|---|---|---|
| `id` | id | `"ped" + Date.now()` generado en la web |
| `fecha` | Fecha | la pone el backend al crear |
| `cliente` | Cliente | nombre y apellido |
| `telefono` | Teléfono | WhatsApp |
| `detalle` | Detalle | texto legible: `2x Whey (Vainilla) \| 1x Creatina` |
| `monto` | Monto | total final cobrado (productos + envío − descuento) |
| `estado` | Estado | `nuevo` · `pendiente de pago` · `pagado` · `Entregado` |
| `notas` | Notas | `Email: ...` (y lo que agregue el admin) |
| `envio` | Envío | dirección completa: `calle, ciudad, provincia, CP` |
| `envioCobrado` | Envío cobrado | uso manual del admin |
| `montoEnvio` | Monto envío | costo de envío cobrado |
| `costo` | Costo | costo total del pedido (lo calcula el backend al aprobar) |
| `pago` | Pago | `Transferencia` o `Mercado Pago` |
| `items` | Items | JSON `[{"n":"nombre","v":"variante","q":cantidad}]` (sirve para descontar stock) |
| `descontado` | Descontado | `no` / `sí` (si ya se descontó stock por este pedido) |
| `comprobante` | Comprobante | URL de la foto del comprobante de transferencia |

`Clientes` tiene: `id, fecha, nombre, telefono, email, ciudad, notas, dni,
direccion, origen, clave` (la clave se guarda hasheada y nunca se devuelve).

---

## 3. Flujo en la web (checkout)

Archivo de referencia: `app/(store)/checkout/page.tsx`.

1. El carrito vive en `localStorage`. El checkout muestra el resumen y un
   formulario con `name=` `nombre, email, telefono, dni, direccion, ciudad,
   provincia, cp` (todos required salvo dni) y un radio `name="pago"` con dos
   valores: `Transferencia` (por defecto, 10% de descuento sobre los productos)
   y `Mercado Pago` (sin descuento).
2. Al enviar, la web:
   - arma `detalle` (texto) e `items` (JSON), calcula `montoFinal`
     (`total − descuento` si es transferencia; `total` si es Mercado Pago),
     genera `id = "ped" + Date.now()`;
   - llama `createOrder(...)` → acción `add` en la pestaña `Pedidos` con
     `estado = "pendiente de pago"` si es Mercado Pago, o `"nuevo"` si es
     transferencia, `pago = metodo`, `descontado = "no"`, `notas = "Email: ..."`.
3. **Si eligió Transferencia**: muestra pantalla de éxito con el alias/CVU y
   titular (constante `TRANSFER` en `lib/config.ts`, con botón "copiar"), un
   campo para **subir la foto del comprobante** ahí mismo, y un botón para
   coordinar por WhatsApp. La foto va por POST `subir_comprobante`
   (`{pedido, data: base64}`): el backend la commitea al repo en
   `public/comprobantes/<id>-<timestamp>.jpg` vía API de GitHub y guarda la URL
   en la columna `comprobante` del pedido. Vacía el carrito.
4. **Si eligió Mercado Pago**: llama `mpCreatePreference({pedido: id, monto,
   titulo: "Pedido <tienda> (N art.)", email})` → acción `mp_crear_pref` →
   recibe `init_point` → `window.location.href = init_point` (va a Mercado
   Pago). Reintenta hasta 3 veces si falla la red; si el backend responde
   `ok:false`, muestra "No se pudo iniciar el pago con Mercado Pago. Probá de
   nuevo o elegí otro medio."
5. Páginas de retorno (estáticas): `/pago/exito/` (vacía el carrito y ofrece
   coordinar el envío por WhatsApp), `/pago/pendiente/`, `/pago/error/`.

Código frontend de referencia (`lib/api.ts`):

```ts
export async function createOrder(o: OrderInput): Promise<boolean> {
  const estado = o.metodo === "Mercado Pago" ? "pendiente de pago" : "nuevo";
  const r = await api("add", {
    tab: "Pedidos",
    data: JSON.stringify({
      id: o.id, cliente: o.cliente, telefono: o.telefono, detalle: o.detalle,
      monto: o.monto, estado, notas: `Email: ${o.email}`, envio: o.envio,
      montoEnvio: o.montoEnvio, pago: o.metodo, items: o.items ?? "", descontado: "no",
    }),
  }, 18000);
  return r.ok !== false;
}

export async function mpCreatePreference(args: { pedido: string; monto: number; titulo: string; email: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await api("mp_crear_pref", { pedido: args.pedido, monto: args.monto, titulo: args.titulo, email: args.email }, 18000);
      if (r.ok && r.init_point) return r.init_point;
      if (r.ok === false) return null;
    } catch { if (i === 2) return null; }
  }
  return null;
}
```

`api(action, params, timeoutMs)` inyecta un `<script src="EXEC?action=...&callback=npm_cb_x&...">`
(JSONP) y resuelve con el JSON que devuelve el backend. Si hay token de CRM en
`localStorage`, lo agrega como `token=`.

---

## 4. Backend (Apps Script): Mercado Pago

Constantes: `SITE_URL = "https://<dominio>"`, `GITHUB_REPO = "usuario/repo"`,
`GITHUB_BRANCH = "main"`.

```js
// Crea una preferencia de pago (Checkout Pro) y devuelve el link (init_point).
function mpCrearPreferencia(p) {
  var token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
  if (!token) return { ok: false, error: "Falta MP_ACCESS_TOKEN en Propiedades del script" };
  var monto = Number(p.monto) || 0;
  if (monto <= 0) return { ok: false, error: "Monto inválido" };
  var exec = "";
  try { exec = ScriptApp.getService().getUrl(); } catch (e0) {}

  var pref = {
    items: [{ title: String(p.titulo || "Pedido"), quantity: 1, unit_price: monto, currency_id: "ARS" }],
    external_reference: String(p.pedido || ""),      // ← id del pedido en la planilla
    back_urls: {
      success: SITE_URL + "/pago/exito/",
      failure: SITE_URL + "/pago/error/",
      pending: SITE_URL + "/pago/pendiente/",
    },
    auto_return: "approved",
  };
  if (exec) pref.notification_url = exec + "?action=mp_webhook";   // ← webhook
  if (p.email) pref.payer = { email: String(p.email) };

  var res = UrlFetchApp.fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "post", contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(pref), muteHttpExceptions: true,
  });
  var code = res.getResponseCode(); var body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e1) {}
  if (code < 200 || code >= 300) return { ok: false, error: "MP " + code + ": " + res.getContentText().slice(0, 180) };
  return { ok: true, init_point: body.init_point, id: body.id };
}

// Webhook: cuando un pago queda "approved", marca el pedido como "pagado".
// MP manda el id del pago por query (?data.id=) o en el cuerpo del POST.
function mpWebhook(p, e) {
  try {
    var token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
    if (!token) return { ok: false };
    var type = p.type || p.topic || "";
    if (type && String(type).indexOf("payment") === -1) return { ok: true }; // solo pagos
    var payId = p["data.id"] || p.id || "";
    if (!payId && e && e.postData && e.postData.contents) {
      try { var b = JSON.parse(e.postData.contents); payId = (b.data && b.data.id) || b.id || ""; } catch (er) {}
    }
    if (!payId) return { ok: true };
    var r = UrlFetchApp.fetch("https://api.mercadopago.com/v1/payments/" + payId, {
      headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true,
    });
    var pay = {}; try { pay = JSON.parse(r.getContentText()); } catch (er2) {}
    var ref = pay.external_reference;
    if (pay.status === "approved" && ref) {
      var n = findRowById("Pedidos", ref);
      if (n > 0) updateRowByNumber("Pedidos", n, { estado: "pagado" });
    }
    return { ok: true };
  } catch (err) { return { ok: false, error: String(err) }; }
}
```

En `handle()`:

```js
case "mp_crear_pref": out = mpCrearPreferencia(p); break;
case "mp_webhook":    out = mpWebhook(p, e); break;   // llega por GET o POST
case "aprobar_pedido": out = aprobarPedido(p.id); break; // requiere token de CRM
```

`doGet(e)` y `doPost(e)` llaman a `handle(e.parameter.action, e.parameter, e)`;
`doGet` envuelve la respuesta en el `callback` si viene (JSONP). Es importante
que `doPost` exista y responda rápido 200, porque Mercado Pago envía el
webhook por POST.

### Acciones públicas vs. con token

Una función `esAccionPublica(action, p)` define qué puede llamar la web sin
estar logueado en el CRM: `version`, `productos_list` (sin costos), `list`
solo de `Categorias`, `add` solo en `Pedidos` y `Suscriptores`, `registrar`,
`login`, `subir_comprobante`, `mp_crear_pref`, `mp_webhook`, `crm_login`,
`crm_logout`. **Todo lo demás** (`list` de Pedidos/Clientes, `update`,
`delete`, `aprobar_pedido`, subir/borrar fotos) exige `token` válido; si no,
responde `{ok:false, error:"auth"}`.

### Aprobar pago desde el CRM (`aprobarPedido(id)`)

Idempotente: busca el pedido por `id`; si `descontado == "sí"` solo asegura
`estado = "pagado"`; si no, lee `items` (JSON), descuenta el stock de cada
producto/variante en `Productos` (para combos, descuenta cada componente),
calcula y guarda `costo`, y actualiza `{estado: "pagado", descontado: "sí"}`.

---

## 5. Cómo se ve en el CRM (`/admin`)

**Pestaña Pedidos** (`components/admin/AdminRecords.tsx` con `tab: "Pedidos"`):
- Lista en tarjetas (más nuevo primero) con: cliente, fecha, monto, método de
  pago (`pago`), y una etiqueta de estado:
  - `Pendiente` / `Entregado` con **toggle** (cambia `estado` con `update`);
  - `pendiente de pago` (Mercado Pago aún sin confirmar);
  - `Pagado · stock descontado` cuando `descontado == "sí"`.
- Botón **"Aprobar pago"** (acción `aprobar_pedido`). Si el método es
  Transferencia y no hay `comprobante`, muestra la alerta **"Falta
  comprobante"**; cuando hay comprobante el botón dice "Comprobante ✓ ·
  Aprobar".
- Al tocar la tarjeta se abre el detalle: datos del cliente (nombre, teléfono
  con link a WhatsApp, email desde `notas`), dirección de envío, items con
  variantes, subtotal, envío, total, método de pago, y **la foto del
  comprobante** (miniatura → se abre a pantalla completa, con link al archivo).
- Eliminar pedido pide confirmación y, si ya había descontado stock, el
  backend lo repone (`reponerStockPedido`).

**Pestaña Clientes**: lista de clientes (nombre, teléfono, email, ciudad,
dirección, origen: registro web / checkout). Para ver qué pagó cada cliente,
los pedidos se cruzan por nombre/teléfono (`cliente`, `telefono` en Pedidos).

**Panel principal** (`AdminDashboard.tsx`): "Estado de los pedidos" con
*Falta entregar* (no `Entregado`), *Falta cobrar* (no `pagado`), *Sin
comprobante* (transferencias sin foto); y "Facturación y beneficio" del mes y
la semana (suma `monto` y `monto − costo` de los pedidos pagados).

**Facturación** (`AdminBilling.tsx`): gráfico semanal y totales por período
usando solo pedidos con `estado = pagado` o `descontado = sí`.

El webhook de Mercado Pago marca `pagado` solo; el stock se descuenta cuando el
admin toca "Aprobar pago" (así el admin controla la salida de mercadería).
Si querés que el webhook descuente stock automáticamente, llamá
`aprobarPedido(ref)` en vez de solo actualizar el estado.

---

## 6. Pasos para activar Mercado Pago (los hago yo, vos guiame)

1. Entrar a <https://www.mercadopago.com.ar/developers/panel/app> con la cuenta
   de la tienda → **Crear aplicación** → nombre de la tienda → producto
   "Pagos online" → modelo **Checkout Pro**.
2. En la aplicación → **Credenciales de producción** → copiar el **Access
   Token** (`APP_USR-...`). (Las credenciales de prueba `TEST-...` sirven para
   probar con usuarios de prueba antes de salir.)
3. En Apps Script → Propiedades del script → `MP_ACCESS_TOKEN` = ese token.
4. *Implementar → Administrar implementaciones → lápiz → Versión nueva →
   Implementar*.
5. Probar sin tocar la web:
   `EXEC?action=mp_crear_pref&pedido=pedPRUEBA&monto=1000&titulo=Prueba&email=test%40example.com&callback=cb`
   debe devolver `cb({"ok":true,"init_point":"https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."})`.
6. Webhook: no hace falta configurar nada extra porque cada preferencia lleva
   `notification_url = EXEC?action=mp_webhook`. Opcionalmente, en la
   aplicación de MP → *Webhooks* → modo producción → URL `EXEC?action=mp_webhook`
   → evento **Pagos**, para que también notifique pagos creados fuera de una
   preferencia.
7. Hacer una compra real de monto chico, confirmar que el pedido pasa a
   `pagado` en la planilla y que aparece así en el CRM.

---

## 7. Qué quiero que entregues

1. Backend de Apps Script completo (un solo archivo) con: pestañas y columnas
   iguales a las de arriba, `handle()` con el `switch`, JSONP en `doGet`,
   `doPost`, `esAccionPublica`, `crm_login`/token, `mpCrearPreferencia`,
   `mpWebhook`, `subirComprobante`, `aprobarPedido`, `reponerStockPedido`.
2. Frontend: checkout con los dos medios y el mismo comportamiento (descuento
   por transferencia, pantalla de éxito con alias/CVU y subida de comprobante,
   redirección a Mercado Pago, páginas `/pago/exito`, `/pago/pendiente`,
   `/pago/error`).
3. CRM: pestaña Pedidos con estados, "Aprobar pago", comprobante visible,
   detalle del pedido; pestaña Clientes; panel con *Falta cobrar* / *Falta
   entregar* / *Sin comprobante*; facturación con pedidos pagados.
4. Una lista de qué propiedades del script tengo que cargar y los pasos de
   deploy, sin pedirme ningún secreto por chat.
