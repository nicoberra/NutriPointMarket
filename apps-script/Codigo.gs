/* ============================================================================
 * NUTRIPOINTMARKET · BACKEND (Google Apps Script)
 * ----------------------------------------------------------------------------
 * API entre la planilla de Google Sheets y la tienda / el CRM.
 *
 * MODELO DE PRODUCTOS (importante):
 *   - El CATÁLOGO (nombre, categoría, descripción, fotos, sabores) vive en el
 *     código de la web (data/products.ts). Casi no cambia.
 *   - La PLANILLA guarda solo lo que cambia seguido: Precio, Stock (sí/no),
 *     Precio sin descuento (solo si hay descuento cargado) y Destacado (sí/no).
 *   - La web cruza ambos por el NOMBRE del producto (tiene que coincidir EXACTO).
 *
 * PUESTA EN MARCHA (una vez): Extensiones → Apps Script → pegar esto → guardar →
 * ejecutar `setup` (autorizar) → Deploy → Aplicación web (Ejecutar como: Yo /
 * Acceso: Cualquier usuario) → copiar la URL /exec.
 * Al cambiar el código: Deploy → Administrar implementaciones → editar → Versión
 * nueva → Desplegar. (Guardar NO publica.)
 * ============================================================================ */

var SHEET_ID = "12paAzW6OcSgYv4u6L7QVI4tpvrEx1yqnujW0OjcieMc";
var API_VERSION = "v17"; // v17: regalo con cupón (pestaña Leads, cupón único validado en el servidor) // v16: Club de sellos (premio en la N-ésima compra, descuento aplicado y validado en el servidor) // v15: venta por caja o por unidad (Unidades por caja + Precio caja) // v14: un producto puede estar en varias categorías ("A | B") // v13: compras pendientes (se revisan y se suman al stock después) // v12: lectura de compras con Claude Haiku 5.5 (el más barato) // v11: las compras leen fotos, archivos y texto con Claude // v10: las compras crean los productos nuevos // v9: las compras suman stock // v8: envío gratis desde $120.000 // v7: compras de mercadería (pestaña Compras) // v6: límite contra abuso, campo trampa y bloqueo de login // v3: validación de pedidos, bloqueo, caché y registro de errores

// Repo de GitHub donde se guardan las fotos de productos (en public/productos/).
// El token NO va acá: se guarda en Propiedades del script como GITHUB_TOKEN.
var GITHUB_REPO = "nicoberra/NutriPointMarket";
var GITHUB_BRANCH = "main";

// Dominio del sitio (para las páginas de retorno de Mercado Pago).
var SITE_URL = "https://suplemarket.com.ar";

// Modelo de precios (tiene que coincidir con lib/config.ts): la planilla guarda
// el precio CON transferencia; la web publica ese precio + 10% redondeado a la
// centena. Mercado Pago cobra el precio publicado; transferencia/efectivo el base.
var DESCUENTO_TRANSFERENCIA = 0.1;
// Costos de envío por zona (tienen que coincidir con lib/envios.ts).
var ENVIOS = { "Capital": 5500, "GBA 1": 7000, "GBA 2": 9000, "GBA 3": 15000 };
// Envío gratis (CABA y GBA) cuando los productos suman desde este monto a precio publicado.
var ENVIO_GRATIS_DESDE = 120000;
// Tamaño máximo del comprobante (base64, ~2.5 MB de imagen).
var COMPROBANTE_MAX_B64 = 3500000;

/* ----------------------------- ESQUEMA DE TABLAS -------------------------- */

var TABLES = {
  Productos: {
    // Fuente COMPLETA de productos. Vos agregás filas acá y aparecen en la web.
    // La clave (para actualizar) es "nombre".
    columns: [
      ["nombre", "Nombre"],
      ["marca", "Marca"],
      ["categoria", "Categoría"], // una o varias, separadas por " | " (la primera es la principal)
      ["precio", "Precio"],
      ["precioML", "Precio sin descuento"], // precio normal cuando el CRM carga un descuento (vacío = sin descuento)
      ["variantes", "Variantes"],
      ["stock", "Stock"],
      ["destacado", "Destacado"],
      ["costo", "Costo"],
      ["costoMoneda", "Costo moneda"],
      ["imagen", "Imagen"],
      ["cantidad", "Cantidad"],
      ["variantesFotos", "Variantes fotos"],
      ["descripcion", "Descripción"],
      ["modoUso", "Modo de uso"],
      ["infoNutricional", "Información nutricional"],
      ["ingredientes", "Ingredientes"],
      ["combo", "Combo"],
      ["porCaja", "Unidades por caja"], // si se compra/vende en caja: unidades que trae (el costo es por unidad)
      ["precioCaja", "Precio caja"], // precio de la caja CON transferencia (vacío o 0 = no se vende por caja)
    ],
    idField: "nombre",
  },
  Categorias: {
    // Categorías de la tienda, editables desde el CRM. La clave es "nombre".
    columns: [
      ["nombre", "Nombre"],
      ["orden", "Orden"],
      ["imagen", "Imagen"],
    ],
    idField: "nombre",
  },
  Suscriptores: {
    columns: [
      ["fecha", "Fecha"],
      ["email", "Email"],
    ],
    idField: null,
  },
  Clientes: {
    columns: [
      ["id", "id"],
      ["fecha", "Fecha"],
      ["nombre", "Nombre"],
      ["telefono", "Teléfono"],
      ["email", "Email"],
      ["ciudad", "Ciudad"],
      ["notas", "Notas"],
      ["dni", "CUIT/DNI"],
      ["direccion", "Dirección"],
      ["origen", "Origen"],
      ["clave", "Clave"],
    ],
    idField: "id",
    secret: ["clave"],
  },
  Pedidos: {
    columns: [
      ["id", "id"],
      ["fecha", "Fecha"],
      ["cliente", "Cliente"],
      ["telefono", "Teléfono"],
      ["detalle", "Detalle"],
      ["monto", "Monto"],
      ["estado", "Estado"],
      ["notas", "Notas"],
      ["envio", "Envío"],
      ["envioCobrado", "Envío cobrado"],
      ["montoEnvio", "Monto envío"],
      ["costo", "Costo"],
      ["pago", "Pago"],
      ["items", "Items"],
      ["descontado", "Descontado"],
      ["comprobante", "Comprobante"],
      ["cobrado", "Cobrado"],
      ["email", "Email"], // email del cliente (la web lo manda; sirve para el Club de sellos)
      ["club", "Club"], // "premio $X" cuando este pedido usó el premio del Club de sellos
      ["cupon", "Cupón"], // "SUPLE-XXXXXX $X" cuando este pedido usó un cupón del regalo
    ],
    idField: "id",
  },
  Leads: {
    columns: [
      ["id", "id"],
      ["fecha", "Fecha"],
      ["nombre", "Nombre"],
      ["telefono", "Teléfono"],
      ["email", "Email"],
      ["origen", "Origen"], // de dónde vino (ej. ig-reel, ig-bio, ig-historia)
      ["codigo", "Código"], // cupón único de este contacto
      ["vence", "Vence"], // AAAA-MM-DD
      ["usado", "Usado en pedido"], // id del pedido que lo usó (vacío = disponible)
      ["notas", "Notas"],
    ],
    idField: "id",
  },
  Compras: {
    // Compras de mercadería (lo que se le compra a los proveedores). Solo CRM.
    columns: [
      ["id", "id"],
      ["fecha", "Fecha"],
      ["proveedor", "Proveedor"],
      ["detalle", "Detalle"],
      ["total", "Total"],
      ["pago", "Pago"],
      ["notas", "Notas"],
      ["items", "Items"], // JSON [{n, v, q}] → productos del catálogo a los que se suma stock
      ["sumado", "Stock sumado"], // "sí" = sumó al stock · "no" = pendiente de sumar · vacío = compra vieja
      ["archivos", "Archivos"], // JSON [{id, nombre, tipo, url}] → fotos y archivos guardados en Drive
    ],
    idField: "id",
  },
  Seguimientos: {
    columns: [
      ["id", "id"],
      ["fecha", "Fecha"],
      ["cliente", "Cliente"],
      ["telefono", "Teléfono"],
      ["motivo", "Motivo"],
      ["fechaObjetivo", "Fecha objetivo"],
      ["estado", "Estado"],
      ["notas", "Notas"],
    ],
    idField: "id",
  },
  Eventos: {
    columns: [
      ["fecha", "Fecha"],
      ["tipo", "Tipo"],
      ["item", "Item"],
      ["sesion", "Sesión"],
      ["fuente", "Fuente"],
      ["contacto", "Contacto"],
      ["monto", "Monto"],
      ["pais", "País"],
      ["region", "Región"],
      ["ciudad", "Ciudad"],
      ["dispositivo", "Dispositivo"],
      ["so", "SO"],
      ["navegador", "Navegador"],
      ["idioma", "Idioma"],
      ["pantalla", "Pantalla"],
    ],
    idField: null,
  },
};

/* ================================ ROUTER ================================== */

function doGet(e) {
  return handle(e);
}
function doPost(e) {
  return handle(e);
}

function handle(e) {
  var p = (e && e.parameter) || {};
  // Subidas de imagen llegan por POST con el JSON en el cuerpo.
  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      for (var k in body) p[k] = body[k];
    } catch (err) {}
  }
  var action = p.action || "version";
  var out;
  try {
    // ---- Seguridad ---------------------------------------------------------
    // Solo las acciones que necesita la tienda pública entran sin token (ver
    // esAccionPublica). Todo lo demás (CRM) exige el token que devuelve
    // crm_login; si falta o venció, responde {ok:false, error:"auth"}.
    var esAdmin = tokenValido(p.token);
    if (!esAdmin && !esAccionPublica(action, p)) {
      return respond({ ok: false, error: "auth" }, p.callback);
    }
    // Límite contra abuso: solo la tienda pública (el CRM con token no tiene límite).
    if (!esAdmin) controlarAbuso(action, p);
    // Las escrituras van de a una (bloqueo): así dos pedidos simultáneos no
    // pisan el stock. Al terminar se borra el caché del catálogo.
    if (ACCIONES_ESCRITURA[action]) {
      out = conBloqueo(function () { return ejecutar(action, p, e, esAdmin); });
    } else {
      out = ejecutar(action, p, e, esAdmin);
    }
  } catch (err) {
    registrarError(action, err, p);
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return respond(out, p.callback);
}

/* -------------------------- Límite contra abuso --------------------------- */

// [cantidad, segundos]. "porId": por cliente (teléfono / email / pedido);
// "global": entre todos, por acción y por minuto. Holgados para compras normales.
var LIMITES = {
  pedido:      { porId: [5, 600],  global: [60, 60] },
  suscriptor:  { porId: [3, 600],  global: [30, 60] },
  registrar:   { porId: [3, 600],  global: [20, 60] },
  login:       { porId: [15, 600], global: [120, 60] },
  mp:          { porId: [8, 600],  global: [60, 60] },
  comprobante: { porId: [6, 600],  global: [30, 60] },
  club:        { porId: [12, 600], global: [120, 60] },
  lead:        { porId: [4, 600],  global: [30, 60] },
  leadDia:     { global: [300, 86400] },
  cupon:       { porId: [10, 600], global: [60, 60] },
  crm:         { global: [30, 60] },
};
var MSG_LIMITE = "Hiciste muchos intentos seguidos. Esperá unos minutos y volvé a probar.";
var MSG_TRAMPA = "No pudimos procesar el envío. Recargá la página y probá de nuevo.";
// Campo oculto de los formularios: una persona no lo ve ni lo completa; un bot sí.
var CAMPO_TRAMPA = "hp_sm";

function controlarAbuso(action, p) {
  var d = null;
  var datos = function () { return d || (d = parseData(p)); };
  var trampa = function () {
    if (String(datos()[CAMPO_TRAMPA] || p[CAMPO_TRAMPA] || "").trim() !== "") throw new Error(MSG_TRAMPA);
  };
  switch (action) {
    case "add":
      if (p.tab === "Pedidos") {
        trampa();
        var tel = String(datos().telefono || "").replace(/\D/g, "");
        limitar("pedido", tel.length >= 6 ? tel : datos().cliente);
      } else if (p.tab === "Suscriptores") {
        trampa();
        limitar("suscriptor", datos().email);
      }
      break;
    case "registrar":
      trampa();
      limitar("registrar", datos().email);
      break;
    case "login":
      limitar("login", p.email);
      break;
    case "mp_crear_pref":
      limitar("mp", p.pedido);
      break;
    case "subir_comprobante":
      limitar("comprobante", p.pedido);
      break;
    case "club":
      limitar("club", p.email || p.telefono);
      break;
    case "lead":
      trampa();
      limitar("lead", String(datos().telefono || "").replace(/\D/g, "") || datos().email);
      limitar("leadDia", "");
      break;
    case "cupon":
      limitar("cupon", p.codigo || "config");
      break;
    case "crm_login":
      limitar("crm", "");
      break;
  }
}

function limitar(tipo, id) {
  var cfg = LIMITES[tipo];
  if (!cfg) return;
  var cache = CacheService.getScriptCache();
  var claves = [];
  if (cfg.global) {
    claves.push(["rl_g_" + tipo + "_" + Math.floor(Date.now() / 1000 / cfg.global[1]), cfg.global[0], cfg.global[1] * 2]);
  }
  var clave = String(id || "").toLowerCase().replace(/\s+/g, "").slice(0, 120);
  if (cfg.porId && clave) claves.push(["rl_" + tipo + "_" + clave, cfg.porId[0], cfg.porId[1]]);
  for (var i = 0; i < claves.length; i++) {
    var n = Number(cache.get(claves[i][0]) || 0);
    if (n >= claves[i][1]) throw new Error(MSG_LIMITE);
  }
  for (var j = 0; j < claves.length; j++) {
    var m = Number(cache.get(claves[j][0]) || 0);
    cache.put(claves[j][0], String(m + 1), claves[j][2]);
  }
}

// Acciones que escriben en la planilla (se ejecutan con bloqueo).
var ACCIONES_ESCRITURA = {
  productos_save: 1, add: 1, update: 1, delete: 1, categoria_rename: 1, producto_rename: 1,
  subir_imagen: 1, borrar_imagen: 1, subir_comprobante: 1, mp_webhook: 1, aprobar_pedido: 1, registrar: 1,
  compra_sumar_stock: 1, lead: 1, cupon_config: 1,
};

function conBloqueo(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    throw new Error("Hay mucha demanda en este momento. Probá de nuevo en unos segundos.");
  }
  try {
    return fn();
  } finally {
    try { borrarCacheCatalogo(); } catch (eC) {}
    lock.releaseLock();
  }
}

function ejecutar(action, p, e, esAdmin) {
  var out;
    switch (action) {
      case "version":
        out = { ok: true, version: API_VERSION };
        break;
      case "productos_list":
        // Con token (CRM) incluye costos y siempre lee la planilla; la tienda
        // pública usa el caché (se borra con cada cambio).
        out = { ok: true, data: esAdmin ? listProductos(true) : leerCacheado("cat_productos", function () { return listProductos(false); }) };
        break;
      case "productos_save":
        out = { ok: true, data: saveProducto(parseData(p)) };
        break;
      case "list":
        out = {
          ok: true,
          data: !esAdmin && p.tab === "Categorias"
            ? leerCacheado("cat_categorias", function () { return listTable("Categorias"); })
            : listTable(p.tab),
        };
        break;
      case "add":
        // Sin token (tienda pública) solo pasan los campos permitidos y el
        // monto se recalcula acá con los precios de la planilla.
        if (esAdmin) {
          out = { ok: true, data: addRow(p.tab, parseData(p)) };
        } else {
          var alta = validarAltaPublica(p.tab, parseData(p));
          // Reintento del mismo pedido (misma compra): no se duplica.
          out = alta.__repetido
            ? { ok: true, data: { id: alta.id }, repetido: true }
            : { ok: true, data: addRow(p.tab, alta) };
          if (!alta.__repetido && p.tab === "Pedidos") {
            if (alta.cupon) marcarCuponUsado(String(alta.cupon).split(" ")[0], alta.id);
            (alta.__premiosLiberados || []).forEach(function (idL) { quitarDescuentoPedido(idL, "club", alta.id); });
          }
        }
        break;
      case "update":
        out = { ok: true, data: updateRow(p.tab, p.id, parseData(p)) };
        break;
      case "delete":
        out = { ok: true, data: deleteRow(p.tab, p.id) };
        break;
      case "categoria_rename":
        out = { ok: true, data: categoriaRename(p.from, p.to) };
        break;
      case "producto_rename":
        out = { ok: true, data: productoRename(p.from, p.to) };
        break;
      case "subir_imagen":
        out = subirImagen(p);
        break;
      case "borrar_imagen":
        out = borrarImagen(p);
        break;
      case "subir_comprobante":
        out = subirComprobante(p);
        break;
      case "compra_archivo":
        out = compraArchivo(p);
        break;
      case "compra_archivo_estado":
        out = compraArchivoEstado(p);
        break;
      case "compra_sumar_stock":
        out = { ok: true, data: compraSumarStock(p.id) };
        break;
      case "mp_crear_pref":
        out = mpCrearPreferencia(p);
        break;
      case "mp_webhook":
        out = mpWebhook(p, e);
        break;
      case "aprobar_pedido":
        out = aprobarPedido(p.id);
        break;
      case "registrar":
        out = registrar(parseData(p));
        break;
      case "login":
        out = login(p.email, p.password);
        break;
      case "crm_login":
        out = crmLogin(p.pin);
        break;
      case "crm_logout":
        out = crmLogout(p.token);
        break;
      case "club":
        // Estado del Club de sellos de un cliente (público, con límite). Sin
        // email ni teléfono devuelve solo la configuración (premio y meta).
        var ce = clubEstado(p.email, p.telefono);
        delete ce.liberados;
        out = { ok: true, data: ce };
        break;
      case "club_resumen":
        out = { ok: true, data: clubResumen() };
        break;
      case "club_config":
        out = { ok: true, data: p.data ? clubConfigGuardar(parseData(p)) : clubConfig() };
        break;
      case "lead":
        // Regalo: deja su WhatsApp / email y recibe un cupón único (público, con límite).
        out = { ok: true, data: leadAlta(parseData(p)) };
        break;
      case "cupon":
        // Sin código: configuración pública del regalo. Con código: si sirve.
        out = { ok: true, data: p.codigo ? cuponPublico(p.codigo) : cuponConfigPublica() };
        break;
      case "cupon_config":
        out = { ok: true, data: p.data ? cuponConfigGuardar(parseData(p)) : cuponConfig() };
        break;
      default:
        out = { ok: false, error: "Acción desconocida: " + action };
    }
  return out;
}

function respond(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ")").setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* ============================ ACCESO A LA PLANILLA ======================== */

var _libro = null;
function ss() {
  if (_libro) return _libro;
  // Para pruebas en una COPIA de la planilla: en el script de la copia se crea
  // la propiedad SHEET_ID con el id de la copia. En producción no existe.
  var otro = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  var id = otro || SHEET_ID;
  _libro = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  return _libro;
}

// Ejecutar desde el editor para ver qué planilla usa este script (útil en la copia).
function verificarPlanilla() {
  var b = ss();
  var msg = "Este script usa la planilla: " + b.getName() + " (" + b.getId() + ")" +
    (b.getId() === SHEET_ID ? " · PRODUCCIÓN" : " · copia");
  Logger.log(msg);
  return msg;
}
function sheetFor(tab) {
  var sh = ss().getSheetByName(tab);
  if (!sh && TABLES[tab]) {
    // Pestaña nueva del esquema (ej. Compras): se crea sola con sus títulos.
    sh = ss().insertSheet(tab);
    writeHeader(sh, tab);
  }
  if (!sh) throw new Error("No existe la pestaña: " + tab);
  // Columnas nuevas del esquema en una pestaña vieja: se agregan sus títulos.
  if (TABLES[tab]) {
    var cols = TABLES[tab].columns, lc = sh.getLastColumn();
    if (lc < cols.length) {
      sh.getRange(1, lc + 1, 1, cols.length - lc).setValues([cols.slice(lc).map(function (c) { return c[1]; })]);
    }
  }
  return sh;
}

// Categoría probable de un producto nuevo según su nombre (de las que existen).
function categoriaSugerida(texto) {
  var t = low(texto);
  var claves = [["prote", "whey"], ["creatin"], ["pancake"], ["shaker", "vaso"], ["barra", "barrita"], ["tape", "kinesio"], ["combo"]];
  var cats = listTable("Categorias").map(function (c) { return String(c.nombre || ""); });
  for (var i = 0; i < claves.length; i++) {
    var hit = claves[i].some(function (k) { return t.indexOf(k) !== -1; });
    if (!hit) continue;
    for (var j = 0; j < cats.length; j++) {
      var lc = low(cats[j]);
      if (claves[i].some(function (k) { return lc.indexOf(k.slice(0, 5)) !== -1; })) return cats[j];
    }
  }
  return "";
}

function crearProductoDeCompra(it) {
  addRow("Productos", {
    nombre: String(it.n).trim().slice(0, 120),
    marca: String(it.marca || "").trim().slice(0, 60),
    categoria: categoriaSugerida(it.n),
    precio: 0,
    stock: "no",
    destacado: "no",
    cantidad: 0,
    costo: Number(it.costo) > 0 ? Math.round(Number(it.costo) * 100) / 100 : "",
    costoMoneda: Number(it.costo) > 0 ? "ARS" : "",
    descripcion: "",
  });
}

// Compras: suma (+1) o resta (-1) al stock los productos del catálogo de la compra.
function moverStockCompra(itemsJson, signo) {
  var items = [];
  try { items = JSON.parse(itemsJson || "[]"); } catch (e) {}
  var hubo = false;
  for (var i = 0; i < items.length; i++) {
    var q = Math.floor(Number(items[i].q) || 0);
    if (!items[i].n || q <= 0) continue;
    // Producto que no está en la tienda: se crea (sin foto ni precio, así no se
    // ve en la web hasta que lo completes en el CRM).
    if (items[i].nuevo && signo > 0 && findRowById("Productos", items[i].n) < 0) crearProductoDeCompra(items[i]);
    ajustarProducto(items[i].n, q, items[i].v, null, signo);
    hubo = true;
  }
  return hubo;
}
function keysOf(tab) {
  return TABLES[tab].columns.map(function (c) {
    return c[0];
  });
}

function listTable(tab) {
  if (!TABLES[tab]) throw new Error("Pestaña inválida: " + tab);
  var sh = sheetFor(tab);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var keys = keysOf(tab);
  var secret = TABLES[tab].secret || [];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.join("") === "") continue;
    var obj = {};
    for (var c = 0; c < keys.length; c++) {
      if (secret.indexOf(keys[c]) !== -1) continue;
      obj[keys[c]] = formatValue(row[c]);
    }
    rows.push(obj);
  }
  return rows;
}

function formatValue(v) {
  if (v instanceof Date) return Utilities.formatDate(v, "GMT-3", "yyyy-MM-dd HH:mm");
  return v;
}

/* ------------------------------- Escritura ------------------------------- */

function addRow(tab, obj) {
  if (!TABLES[tab]) throw new Error("Pestaña inválida: " + tab);
  var sh = sheetFor(tab);
  var keys = keysOf(tab);
  // Si ya existe una fila con este id, es la MISMA alta repetida (doble toque
  // o el navegador reenviando la solicitud): no se crea otra ni se descuenta
  // stock de nuevo. Las altas van con bloqueo, así que el control es seguro.
  if (TABLES[tab].idField === "id" && obj.id && findRowById(tab, obj.id) > 0) {
    obj.repetido = true;
    return obj;
  }
  if (tab === "Clientes" && !obj.sinFusion) {
    var existing = findClienteRow(obj);
    if (existing > 0) return updateRowByNumber(tab, existing, obj);
  }
  delete obj.sinFusion;
  if (TABLES[tab].idField === "id" && !obj.id) obj.id = "id" + Date.now();
  if (keys.indexOf("fecha") !== -1 && !obj.fecha) obj.fecha = now();
  // Pedidos: el stock se descuenta al crear el pedido (web o CRM). Si el
  // pedido se elimina, deleteRow lo repone. "Aprobar" ya no descuenta de nuevo.
  if (tab === "Pedidos") {
    var itemsP = [];
    try { itemsP = JSON.parse(obj.items || "[]"); } catch (eP) {}
    if (itemsP.length && String(obj.descontado || "").trim().toLowerCase() !== "sí") {
      for (var ip = 0; ip < itemsP.length; ip++) {
        descontarProducto(itemsP[ip].n, unidadesItem(itemsP[ip]), itemsP[ip].v, itemsP[ip].cv);
      }
      obj.descontado = "sí";
    }
  }
  // Compras: lo comprado se suma al stock de cada producto del catálogo, salvo
  // que se guarde pendiente (sumar: "no") para revisarla y sumarla después.
  if (tab === "Compras" && obj.items) {
    if (obj.sumar === "no") obj.sumado = "no";
    else if (moverStockCompra(obj.items, +1)) obj.sumado = "sí";
  }
  var line = keys.map(function (k) {
    return sanitize(k, obj[k]);
  });
  sh.appendRow(line);
  return obj;
}

function updateRow(tab, id, obj) {
  var n = findRowById(tab, id);
  if (n < 0) throw new Error("No se encontró: " + id);
  if (tab === "Pedidos" && obj.hasOwnProperty("items")) ajustarStockPorEdicion(n, obj);
  if (tab === "Compras" && obj.hasOwnProperty("items")) ajustarStockCompraPorEdicion(n, obj);
  var res = updateRowByNumber(tab, n, obj);
  // Compra pendiente que se guarda con "sumar al stock": se suma una sola vez.
  if (tab === "Compras" && obj.sumar === "sí") compraSumarStock(id);
  return res;
}

// Suma al stock una compra pendiente (sumado "no"). Si ya se sumó no hace nada,
// así un doble clic o un reintento nunca suma dos veces.
function compraSumarStock(id) {
  var n = findRowById("Compras", id);
  if (n < 0) throw new Error("No se encontró la compra");
  var keys = keysOf("Compras");
  var sh = sheetFor("Compras");
  var row = sh.getRange(n, 1, 1, keys.length).getValues()[0];
  var iS = keys.indexOf("sumado");
  if (low(row[iS]) === "sí") return { sumada: true, yaEstaba: true };
  var items = String(row[keys.indexOf("items")] || "");
  if (!items || items === "[]") throw new Error("Esta compra no tiene productos asociados al stock.");
  moverStockCompra(items, +1);
  sh.getRange(n, iS + 1).setValue("sí");
  return { sumada: true };
}

// Editar los productos de una compra que ya sumó stock: resta lo viejo y suma
// lo nuevo. Una pendiente solo guarda los productos (todavía no tocó el stock) y
// las compras viejas (sin "Stock sumado") no tocan el stock.
function ajustarStockCompraPorEdicion(n, obj) {
  var keys = keysOf("Compras");
  var row = sheetFor("Compras").getRange(n, 1, 1, keys.length).getValues()[0];
  var estado = low(row[keys.indexOf("sumado")]);
  if (estado === "no") return;
  if (estado !== "sí") { delete obj.items; return; }
  var viejo = String(row[keys.indexOf("items")] || "[]");
  var nuevo = String(obj.items || "[]");
  if (viejo === nuevo) return;
  moverStockCompra(viejo, -1);
  moverStockCompra(nuevo, +1);
}

// Al editar los productos de un pedido: repone lo que tenía (si ya se había
// descontado) y descuenta lo nuevo, así el stock queda por la diferencia.
function ajustarStockPorEdicion(n, obj) {
  var sh = sheetFor("Pedidos");
  var keys = keysOf("Pedidos");
  var row = sh.getRange(n, 1, 1, keys.length).getValues()[0];
  var viejo = String(row[keys.indexOf("items")] || "[]");
  var nuevo = String(obj.items || "[]");
  if (viejo === nuevo) return;
  var yaDesc = String(row[keys.indexOf("descontado")] || "").trim().toLowerCase() === "sí";
  var itemsV = [], itemsN = [];
  try { itemsV = JSON.parse(viejo); } catch (e1) {}
  try { itemsN = JSON.parse(nuevo); } catch (e2) {}
  if (yaDesc) {
    for (var i = 0; i < itemsV.length; i++) ajustarProducto(itemsV[i].n, unidadesItem(itemsV[i]), itemsV[i].v, itemsV[i].cv, +1);
  }
  for (var j = 0; j < itemsN.length; j++) ajustarProducto(itemsN[j].n, unidadesItem(itemsN[j]), itemsN[j].v, itemsN[j].cv, -1);
  obj.descontado = "sí";
}

function updateRowByNumber(tab, rowNumber, obj) {
  var sh = sheetFor(tab);
  var keys = keysOf(tab);
  var current = sh.getRange(rowNumber, 1, 1, keys.length).getValues()[0];
  for (var c = 0; c < keys.length; c++) {
    if (obj.hasOwnProperty(keys[c]) && obj[keys[c]] !== "") {
      current[c] = sanitize(keys[c], obj[keys[c]]);
    }
  }
  sh.getRange(rowNumber, 1, 1, keys.length).setValues([current]);
  return obj;
}

function deleteRow(tab, id) {
  var n = findRowById(tab, id);
  if (n < 0) throw new Error("No se encontró: " + id);
  // Si es un pedido con el pago aprobado (stock ya descontado), repone el
  // stock de cada producto antes de borrarlo.
  if (tab === "Pedidos") reponerStockPedido(n);
  if (tab === "Compras") {
    // Borrar una compra que sumó stock lo vuelve a restar.
    var kC = keysOf("Compras");
    var rowC = sheetFor("Compras").getRange(n, 1, 1, kC.length).getValues()[0];
    if (low(rowC[kC.indexOf("sumado")]) === "sí") moverStockCompra(String(rowC[kC.indexOf("items")] || "[]"), -1);
  }
  guardarEnPapelera(tab, n);
  sheetFor(tab).deleteRow(n);
  return { deleted: id };
}

// Copia la fila a la pestaña "Papelera" (se crea sola) antes de borrarla, con
// fecha y pestaña de origen. Para recuperar: copiar los valores de vuelta.
function guardarEnPapelera(tab, n) {
  try {
    var sh = sheetFor(tab);
    var keys = keysOf(tab);
    var row = sh.getRange(n, 1, 1, keys.length).getValues()[0];
    var book = ss();
    var pap = book.getSheetByName("Papelera");
    if (!pap) {
      pap = book.insertSheet("Papelera");
      pap.appendRow(["Borrado el", "Pestaña", "Datos (en el orden de las columnas de esa pestaña)"]);
      pap.getRange(1, 1, 1, 3).setFontWeight("bold");
      pap.setFrozenRows(1);
    }
    pap.appendRow([now(), tab].concat(row));
  } catch (e) {
    // La papelera nunca debe impedir la operación, pero sí quedar registrada.
    console.error("Papelera: " + e);
  }
}

function reponerStockPedido(n) {
  var sh = sheetFor("Pedidos");
  var keys = keysOf("Pedidos");
  var row = sh.getRange(n, 1, 1, keys.length).getValues()[0];
  var desc = String(row[keys.indexOf("descontado")] || "").trim().toLowerCase();
  if (desc !== "sí") return;
  var items = [];
  try { items = JSON.parse(row[keys.indexOf("items")] || "[]"); } catch (e) {}
  for (var i = 0; i < items.length; i++) {
    ajustarProducto(items[i].n, unidadesItem(items[i]), items[i].v, items[i].cv, +1);
  }
}

// Unidades que mueve un renglón de pedido: si es una caja, cantidad × unidades por caja.
function unidadesItem(it) {
  var q = Number(it && it.q) || 0;
  if (!it || !it.caja) return q;
  var n = findRowById("Productos", it.n);
  if (n < 0) return q;
  var porCaja = Math.floor(Number(sheetFor("Productos").getRange(n, keysOf("Productos").indexOf("porCaja") + 1).getValue()) || 0);
  return q * Math.max(1, porCaja);
}

function findRowById(tab, id) {
  // Un id vacío no puede coincidir con una fila sin id: sería borrar/editar
  // una fila cualquiera.
  if (id === undefined || id === null || String(id).trim() === "") return -1;
  var sh = sheetFor(tab);
  var keys = keysOf(tab);
  var idCol = keys.indexOf(TABLES[tab].idField);
  if (idCol < 0) return -1;
  var last = Math.max(sh.getLastRow() - 1, 0);
  if (last === 0) return -1;
  var col = sh.getRange(2, idCol + 1, last, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (low(col[i][0]) === low(id)) return i + 2;
  }
  return -1;
}

function findClienteRow(obj) {
  var sh = sheetFor("Clientes");
  var keys = keysOf("Clientes");
  var data = sh.getDataRange().getValues();
  var iEmail = keys.indexOf("email"),
    iDni = keys.indexOf("dni"),
    iNom = keys.indexOf("nombre");
  for (var r = 1; r < data.length; r++) {
    if (obj.email && data[r][iEmail] && low(data[r][iEmail]) === low(obj.email)) return r + 1;
    if (obj.dni && data[r][iDni] && String(data[r][iDni]) === String(obj.dni)) return r + 1;
    if (obj.nombre && data[r][iNom] && low(data[r][iNom]) === low(obj.nombre)) return r + 1;
  }
  return -1;
}

// Limpieza por columna al guardar.
function sanitize(key, value) {
  if (value === undefined || value === null) return "";
  if (key === "telefono") return cleanPhone(value);
  if (key === "stock" || key === "destacado") return siNo(value); // guardar "sí"/"no"
  // Un texto que empieza con = + - @ o un tabulador lo interpretaría Sheets
  // como fórmula. El apóstrofo inicial lo fuerza a texto (no se ve en la celda
  // ni vuelve al leer).
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(value)) return "'" + value;
  return value;
}

/* --------------------------- Altas públicas ------------------------------ */

// Campos que puede mandar la tienda pública (sin token) al crear una fila.
var CAMPOS_PUBLICOS = {
  Pedidos: ["id", "cliente", "telefono", "email", "detalle", "monto", "notas", "envio", "montoEnvio", "pago", "items", "cupon"],
  Suscriptores: ["email"],
};

// Deja solo los campos permitidos, fija los que no puede decidir el cliente y
// recalcula el total del pedido con los precios de la planilla. Si el total
// que mandó la web no coincide (precios viejos o manipulados), rechaza.
function validarAltaPublica(tab, obj) {
  var permitidos = CAMPOS_PUBLICOS[tab];
  if (!permitidos) throw new Error("Alta no permitida: " + tab);
  var limpio = {};
  for (var i = 0; i < permitidos.length; i++) {
    var k = permitidos[i];
    if (obj[k] !== undefined && obj[k] !== null) {
      limpio[k] = typeof obj[k] === "string" ? obj[k].slice(0, 2000) : obj[k];
    }
  }
  if (tab === "Suscriptores") {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(limpio.email || ""))) throw new Error("Email inválido");
    return limpio;
  }
  // Pedidos
  if (!/^ped\d{10,16}$/.test(String(limpio.id || ""))) throw new Error("Id de pedido inválido");
  var nExiste = findRowById("Pedidos", limpio.id);
  if (nExiste > 0) {
    // Mismo id: si es la misma compra (reintento por mala conexión) se
    // responde OK sin crear otro pedido ni descontar stock de nuevo.
    var kEx = keysOf("Pedidos");
    var rowEx = sheetFor("Pedidos").getRange(nExiste, 1, 1, kEx.length).getValues()[0];
    if (String(rowEx[kEx.indexOf("items")]) === String(limpio.items || "") &&
        low(rowEx[kEx.indexOf("cliente")]) === low(limpio.cliente)) {
      return { __repetido: true, id: limpio.id };
    }
    throw new Error("El pedido ya existe");
  }
  var pago = String(limpio.pago || "").trim();
  if (["Mercado Pago", "Transferencia", "Efectivo"].indexOf(pago) === -1) throw new Error("Medio de pago inválido");
  var items = [];
  try { items = JSON.parse(limpio.items || "[]"); } catch (e) {}
  if (!items.length) throw new Error("El pedido no tiene productos");
  if (items.length > 50) throw new Error("Demasiados productos");

  verificarStock(items);
  var calc = calcularTotalPedido(items, pago);
  var envio = envioSegunTexto(limpio.envio);
  if (calc.subtotalWeb >= ENVIO_GRATIS_DESDE) envio = 0;
  // Email: solo si es válido (sirve para el Club de sellos).
  limpio.email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(limpio.email || "")) ? low(limpio.email) : "";
  // Club de sellos: si al cliente le toca el premio en esta compra, el
  // descuento se aplica ACÁ (la web solo lo muestra). Nunca supera los productos.
  var club = clubEstado(limpio.email, limpio.telefono);
  var descClub = club.premioDisponible ? Math.min(club.premio, calc.subtotal) : 0;
  // Pedidos viejos con premio que quedaron sin pagar: si este pedido usa el
  // premio, a esos se les quita el descuento (así no se usa dos veces).
  limpio.__premiosLiberados = descClub > 0 ? club.liberados : [];
  // Cupón del regalo: único, de un solo uso y con vencimiento. Se valida acá.
  var descCupon = 0, codigoCupon = String(limpio.cupon || "").trim().toUpperCase();
  if (codigoCupon) {
    var cu = cuponEstado(codigoCupon, limpio.telefono, limpio.email);
    if (!cu.valido) throw new Error(cu.motivo);
    descCupon = Math.min(cuponDescuento(cu, calc.subtotal - descClub), calc.subtotal - descClub);
  }
  var total = calc.subtotal + envio - descClub - descCupon;
  var enviado = Number(limpio.monto);
  // Se acepta el total con el premio aplicado o, si la web no llegó a verlo,
  // el total sin premio: el cliente nunca paga de más.
  if (Math.abs(enviado - total) > 1 && !(descClub > 0 && Math.abs(enviado - (total + descClub)) <= 1)) {
    throw new Error("Los precios se actualizaron. Recargá la página y volvé a confirmar el pedido.");
  }
  limpio.monto = total;
  limpio.club = descClub > 0 ? "premio $" + descClub : "";
  limpio.cupon = descCupon > 0 ? codigoCupon + " $" + descCupon : "";
  limpio.montoEnvio = envio;
  limpio.estado = pago === "Mercado Pago" ? "pendiente de pago" : "nuevo";
  limpio.descontado = "no";
  limpio.cobrado = "";
  limpio.comprobante = "";
  limpio.costo = "";
  return limpio;
}

// Revisa que haya stock para todo el pedido (se llama con el bloqueo tomado,
// justo antes de descontar). Reglas:
//  - Stock "no" en la planilla → sin stock.
//  - Variante con cantidad ("Vainilla:3") → no se puede pedir más que eso.
//  - Cantidad total cargada (> 0) → no se puede pedir más que eso.
//  - Si la cantidad no está cargada (0 o vacía) y el stock es "sí", se acepta.
//  - Combos: se revisa cada producto que lo compone.
function verificarStock(items) {
  var values = sheetFor("Productos").getDataRange().getValues();
  var keys = keysOf("Productos");
  var iPorCaja = keys.indexOf("porCaja");
  var iN = keys.indexOf("nombre"), iS = keys.indexOf("stock"), iC = keys.indexOf("cantidad"),
    iV = keys.indexOf("variantes"), iCo = keys.indexOf("combo");
  var prods = {};
  for (var r = 1; r < values.length; r++) {
    var nm = low(values[r][iN]);
    if (nm) prods[nm] = values[r];
  }
  var porProducto = {}, porVariante = {};
  function sumar(nombre, variante, q) {
    var row = prods[low(nombre)];
    if (!row) return; // el total del pedido ya avisa "Producto no disponible"
    var comboRaw = String(row[iCo] || "").trim();
    if (comboRaw) {
      var comps = [];
      try { comps = JSON.parse(comboRaw); } catch (e) {}
      for (var c = 0; c < comps.length; c++) {
        sumar(comps[c].n, (variante && variante[comps[c].n]) || comps[c].v, q * (Number(comps[c].q) || 1));
      }
      return;
    }
    var k = low(nombre);
    porProducto[k] = (porProducto[k] || 0) + q;
    if (variante && typeof variante === "string") {
      var kv = k + "|" + low(variante);
      porVariante[kv] = (porVariante[kv] || 0) + q;
    }
  }
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var row0 = prods[low(it.n)];
    // Una caja descuenta todas sus unidades: si hay menos (caja abierta), no alcanza.
    var q = Math.floor(Number(it.q) || 0) * (it.caja && row0 ? Math.max(1, Math.floor(Number(row0[iPorCaja]) || 0)) : 1);
    var esCombo = row0 && String(row0[iCo] || "").trim();
    sumar(it.n, esCombo ? (it.cv || null) : (it.v || ""), q);
  }
  for (var k2 in porProducto) {
    var row2 = prods[k2];
    var nombreReal = String(row2[iN]);
    var stockTxt = String(row2[iS] === undefined ? "" : row2[iS]).trim();
    if (stockTxt !== "" && !parseSiNo(stockTxt)) throw new Error("Sin stock: " + nombreReal);
    var cant = Number(row2[iC]) || 0;
    if (cant > 0 && porProducto[k2] > cant) {
      throw new Error("Solo quedan " + cant + " unidades de " + nombreReal);
    }
  }
  for (var kv2 in porVariante) {
    var partes = kv2.split("|");
    var row3 = prods[partes[0]];
    var vars = String(row3[iV] || "").split(",");
    for (var j = 0; j < vars.length; j++) {
      var idx = vars[j].lastIndexOf(":");
      if (idx <= 0) continue;
      if (low(vars[j].slice(0, idx)) !== partes[1]) continue;
      var disp = Number(vars[j].slice(idx + 1).trim()) || 0;
      if (porVariante[kv2] > disp) {
        var vNom = vars[j].slice(0, idx).trim();
        throw new Error(disp > 0
          ? "Solo quedan " + disp + " de " + String(row3[iN]) + " (" + vNom + ")"
          : "Sin stock: " + String(row3[iN]) + " (" + vNom + ")");
      }
    }
  }
}

/* ------------------------------- Caché ----------------------------------- */

// Guarda en caché (2 minutos) la respuesta de una lectura pública. Se parte en
// trozos porque cada clave admite ~100 KB. Cualquier escritura la borra.
var CACHE_TTL_S = 120;
var CACHE_CLAVES = ["cat_productos", "cat_categorias"];

function leerCacheado(clave, fn) {
  var cache = CacheService.getScriptCache();
  try {
    var n = Number(cache.get(clave + "_n") || 0);
    if (n > 0) {
      var keys = [];
      for (var i = 0; i < n; i++) keys.push(clave + "_" + i);
      var partes = cache.getAll(keys);
      var txt = "";
      for (var j = 0; j < n; j++) {
        if (partes[clave + "_" + j] == null) { txt = null; break; }
        txt += partes[clave + "_" + j];
      }
      if (txt) return JSON.parse(txt);
    }
  } catch (eR) {}
  var data = fn();
  try {
    var json = JSON.stringify(data);
    var TAM = 90000, obj = {}, cant = Math.ceil(json.length / TAM);
    if (cant <= 50) {
      for (var k = 0; k < cant; k++) obj[clave + "_" + k] = json.slice(k * TAM, (k + 1) * TAM);
      obj[clave + "_n"] = String(cant);
      cache.putAll(obj, CACHE_TTL_S);
    }
  } catch (eW) {}
  return data;
}

function borrarCacheCatalogo() {
  var cache = CacheService.getScriptCache();
  var keys = [];
  for (var i = 0; i < CACHE_CLAVES.length; i++) keys.push(CACHE_CLAVES[i] + "_n");
  cache.removeAll(keys); // sin el contador, los trozos se ignoran
}

/* --------------------------- Registro de errores -------------------------- */

// Anota el error en la pestaña "Errores" (se crea sola). Sin datos sensibles:
// solo acción, mensaje, pestaña e id. Nunca debe romper la respuesta.
// Mensajes que son avisos normales al cliente (no fallas del sistema).
var ERRORES_ESPERADOS = /inválid|Sin stock|Solo quedan|precios se actualizaron|no disponible|ya existe|no encontrado|Faltan|Falta el|Demasiad|Cantidad|no es por|ya está|demasiado grande|JPEG|sin precio|no tiene productos|Ya existe una cuenta|Contraseña|al menos 6/i;

function registrarError(action, err, p, grave) {
  var txt0 = String(err && err.message ? err.message : err);
  if (txt0 === MSG_LIMITE || txt0 === MSG_TRAMPA) return;
  try {
    var texto = String(err && err.message ? err.message : err);
    if (grave === undefined) grave = !ERRORES_ESPERADOS.test(texto);
    if (grave) avisarFallaGrave(action, texto);
  } catch (eA) {}
  try {
    var book = ss();
    var sh = book.getSheetByName("Errores");
    if (!sh) {
      sh = book.insertSheet("Errores");
      sh.appendRow(["Fecha", "Acción", "Mensaje", "Pestaña", "Id"]);
      sh.getRange(1, 1, 1, 5).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
    var msg = String(err && err.message ? err.message : err).slice(0, 300);
    sh.appendRow([now(), String(action || "").slice(0, 40), sanitize("m", msg), sanitize("t", String((p && p.tab) || "").slice(0, 40)), sanitize("i", String((p && (p.id || p.pedido)) || "").slice(0, 60))]);
  } catch (e2) {
    console.error("registrarError: " + e2);
  }
}

// Mail inmediato ante una falla grave (no los avisos normales al cliente).
// Para no llenar la casilla: como máximo uno por hora; el resto queda en la
// pestaña Errores y en el resumen diario.
function avisarFallaGrave(action, texto) {
  var cache = CacheService.getScriptCache();
  if (cache.get("aviso_grave")) return;
  cache.put("aviso_grave", "1", 3600);
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Suple Market · falla en el sistema",
    "Acción: " + action + "\nError: " + texto.slice(0, 500) +
    "\n\nRevisá la pestaña Errores de la planilla. No se mandan más avisos por una hora.");
}

// Mail diario (disparador "resumenDiario", 9 am) SOLO si hubo errores, pagos para
// revisar o la planilla se acerca al límite de celdas.
function resumenDiario() {
  var book = ss();
  var avisos = [];
  var shE = book.getSheetByName("Errores");
  if (shE && shE.getLastRow() > 1) {
    var desde = Utilities.formatDate(new Date(Date.now() - 24 * 3600 * 1000), "GMT-3", "yyyy-MM-dd HH:mm");
    var filas = shE.getRange(2, 1, shE.getLastRow() - 1, 3).getValues().filter(function (f) {
      var fecha = f[0] instanceof Date ? Utilities.formatDate(f[0], "GMT-3", "yyyy-MM-dd HH:mm") : String(f[0]);
      return fecha >= desde;
    });
    if (filas.length) {
      avisos.push("Errores en las últimas 24 h: " + filas.length);
      filas.slice(-10).forEach(function (f) { avisos.push("  · " + f[1] + ": " + f[2]); });
    }
  }
  var pedidos = listTable("Pedidos").filter(function (r) { return low(r.estado) === "revisar pago"; });
  if (pedidos.length) {
    avisos.push("Pedidos con pago para revisar (monto distinto en Mercado Pago): " + pedidos.length);
    pedidos.slice(0, 10).forEach(function (r) { avisos.push("  · " + r.id + " · " + r.cliente); });
  }
  var celdas = 0;
  book.getSheets().forEach(function (shx) { celdas += shx.getMaxRows() * shx.getMaxColumns(); });
  if (celdas > 5000000) avisos.push("La planilla tiene " + celdas + " celdas (límite de Google: 10.000.000). Conviene archivar pedidos viejos.");
  if (!avisos.length) return "sin avisos";
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Suple Market · avisos del sistema", avisos.join("\n") +
    "\n\nDetalle en la planilla, pestañas Errores y Pedidos.");
  return avisos.length + " avisos enviados";
}

// Precio publicado en la web a partir del precio base de la planilla.
function precioWeb(base) {
  if (!base || base <= 0) return 0;
  return Math.round(base / (1 - DESCUENTO_TRANSFERENCIA) / 100) * 100;
}

// Suma los productos de un pedido con los precios ACTUALES de la planilla.
// Mercado Pago: precio publicado. Transferencia / efectivo: precio base.
function calcularTotalPedido(items, pago) {
  var sh = sheetFor("Productos");
  var values = sh.getDataRange().getValues();
  var keysP = keysOf("Productos"), iPC = keysP.indexOf("porCaja"), iPrC = keysP.indexOf("precioCaja");
  var precios = {}, cajas = {};
  for (var r = 1; r < values.length; r++) {
    var nombre = low(values[r][0]);
    if (!nombre) continue;
    precios[nombre] = Number(values[r][3]) || 0;
    var nC = Math.floor(Number(values[r][iPC]) || 0), pC = Number(values[r][iPrC]) || 0;
    if (nC > 1 && pC > 0) cajas[nombre] = pC;
  }
  var subtotal = 0, subtotalWeb = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var q = Math.floor(Number(it.q) || 0);
    if (q <= 0 || q > 99) throw new Error("Cantidad inválida");
    var base = precios[low(it.n)];
    if (base === undefined) throw new Error("Producto no disponible: " + String(it.n || "").slice(0, 60));
    if (it.caja) {
      // Caja cerrada: se cobra el precio de la caja (si ya no se vende por caja, rechaza).
      if (!cajas[low(it.n)]) throw new Error("Este producto ya no se vende por caja. Recargá la página: " + String(it.n || "").slice(0, 60));
      base = cajas[low(it.n)];
    }
    if (!base) throw new Error("Producto sin precio: " + String(it.n || "").slice(0, 60));
    subtotal += (pago === "Mercado Pago" ? precioWeb(base) : base) * q;
    subtotalWeb += precioWeb(base) * q;
  }
  return { subtotal: subtotal, subtotalWeb: subtotalWeb };
}

// Costo de envío según el texto que guarda el checkout ("... · Envío GBA 1 · Morón").
function envioSegunTexto(txt) {
  var t = String(txt || "");
  for (var zona in ENVIOS) {
    if (t.indexOf("Envío " + zona) !== -1) return ENVIOS[zona];
  }
  return 0; // retiro, interior (Vía Cargo a coordinar) o sin dato
}

function cleanPhone(v) {
  return String(v).replace(/^[+\-=@]+\s*/, "").trim();
}

/* ---------------------------- Club de sellos ----------------------------- */
// Cada compra pagada (web o cargada en el CRM) suma un sello al cliente; en la
// compra número META (6 por defecto) el premio (monto fijo) se descuenta solo en
// el checkout y el contador arranca de nuevo. Configuración en la Propiedad del
// Script "CLUB" (JSON: premio, meta, desde); premio 0 = club apagado.
var CLUB_META_DEFAULT = 6;

function clubConfig() {
  var c = {};
  try { c = JSON.parse(PropertiesService.getScriptProperties().getProperty("CLUB") || "{}") || {}; } catch (e) {}
  var premio = Math.max(0, Math.round(Number(c.premio) || 0));
  var meta = Math.floor(Number(c.meta) || 0);
  if (meta < 2 || meta > 20) meta = CLUB_META_DEFAULT;
  var desde = /^\d{4}-\d{2}-\d{2}$/.test(String(c.desde || "")) ? String(c.desde) : "";
  return { premio: premio, meta: meta, desde: desde, activo: premio > 0 };
}

function clubConfigGuardar(obj) {
  var premio = Math.round(Number(obj.premio) || 0);
  if (premio < 0 || premio > 10000000) throw new Error("Monto del premio inválido");
  var meta = Math.floor(Number(obj.meta) || CLUB_META_DEFAULT);
  if (meta < 2 || meta > 20) throw new Error("La meta tiene que ser entre 2 y 20 compras");
  var desde = String(obj.desde || "").trim().slice(0, 10);
  if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new Error("Fecha inválida (AAAA-MM-DD)");
  PropertiesService.getScriptProperties().setProperty("CLUB", JSON.stringify({ premio: premio, meta: meta, desde: desde }));
  return clubConfig();
}

// Teléfono normalizado para comparar: solo dígitos, sin +54 / 9 / 0 iniciales,
// últimos 10. Vacío si es muy corto.
function telefonoClave(v) {
  var d = String(v || "").replace(/\D/g, "");
  if (d.indexOf("54") === 0 && d.length > 10) d = d.slice(2);
  if (d.indexOf("9") === 0 && d.length > 10) d = d.slice(1);
  d = d.replace(/^0+/, "");
  if (d.length === 12) {
    // Número local con el 15 después del código de área (2, 3 o 4 dígitos).
    for (var k = 2; k <= 4; k++) if (d.slice(k, k + 2) === "15") { d = d.slice(0, k) + d.slice(k + 2); break; }
  }
  return d.length < 8 ? "" : d.slice(-10);
}

function pedidoPagado(row, keys) {
  var est = low(row[keys.indexOf("estado")]);
  return low(row[keys.indexOf("cobrado")]) === "sí" || est === "pagado" || est === "entregado";
}

// ¿Este pedido con premio cuenta como premio usado? Sí si está pagado o
// entregado, o si es reciente (48 h: el premio queda reservado mientras se
// paga). Si quedó sin pagar más tiempo, se libera y el cliente conserva sus
// sellos (así un pedido abandonado o ajeno no le quema el premio).
var CLUB_RESERVA_MS = 48 * 3600 * 1000;
function premioUsado(row, keys) {
  if (pedidoPagado(row, keys)) return true;
  var f = Date.parse(String(row[keys.indexOf("fecha")] || "").trim().replace(" ", "T") + ":00-03:00");
  return !isFinite(f) || Date.now() - f < CLUB_RESERVA_MS;
}

// Email del pedido: columna Email o, en pedidos viejos, "Email: x" en las notas.
function emailDePedido(row, keys) {
  var e = low(row[keys.indexOf("email")]);
  if (!e) {
    var m = String(row[keys.indexOf("notas")] || "").match(/email:\s*([^\s@,;]+@[^\s@,;]+)/i);
    if (m) e = low(m[1]);
  }
  return e;
}

// Estado del club para un cliente (por email y/o teléfono). Recorre los
// pedidos en orden: un pedido con premio reinicia el contador; los pagados
// posteriores (desde la fecha configurada) suman sellos.
function clubEstado(email, telefono) {
  var cfg = clubConfig();
  var res = { activo: cfg.activo, premio: cfg.premio, meta: cfg.meta, sellos: 0, premios: 0, premioDisponible: false, liberados: [] };
  var em = low(email), tel = telefonoClave(telefono);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) em = "";
  if (!cfg.activo || (!em && !tel)) return res;
  var keys = keysOf("Pedidos");
  var data = sheetFor("Pedidos").getDataRange().getValues();
  var iTel = keys.indexOf("telefono"), iClub = keys.indexOf("club"), iFecha = keys.indexOf("fecha"), iId = keys.indexOf("id");
  var sellos = 0, premios = 0, liberados = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var mismo = (em && emailDePedido(row, keys) === em) || (tel && telefonoClave(row[iTel]) === tel);
    if (!mismo) continue;
    if (String(row[iClub] || "").indexOf("premio") === 0) {
      if (premioUsado(row, keys)) { premios++; sellos = 0; }
      else liberados.push(String(row[iId]));
      continue;
    }
    if (cfg.desde && String(row[iFecha] || "").slice(0, 10) < cfg.desde) continue;
    if (pedidoPagado(row, keys)) sellos++;
  }
  res.liberados = liberados;
  res.sellos = sellos;
  res.premios = premios;
  res.premioDisponible = sellos >= cfg.meta - 1;
  return res;
}

// Resumen para el CRM: sellos y premios de cada cliente (agrupa por email y
// teléfono, unificando cuando un pedido trae los dos).
function clubResumen() {
  var cfg = clubConfig();
  var keys = keysOf("Pedidos");
  var data = sheetFor("Pedidos").getDataRange().getValues();
  var iTel = keys.indexOf("telefono"), iClub = keys.indexOf("club"), iFecha = keys.indexOf("fecha"), iNom = keys.indexOf("cliente");
  var grupos = {}, porClave = {}, nId = 0;
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var em = emailDePedido(row, keys), tel = telefonoClave(row[iTel]);
    if (!em && !tel) continue;
    var gE = em ? porClave["e:" + em] : "", gT = tel ? porClave["t:" + tel] : "";
    var g = gE || gT;
    if (!g) {
      g = "g" + (++nId);
      grupos[g] = { nombre: "", email: "", telefono: "", sellos: 0, premios: 0, ultima: "" };
    } else if (gE && gT && gE !== gT) {
      // El mismo cliente apareció por email y por teléfono: se unifica.
      var a = grupos[gE], b = grupos[gT];
      a.sellos += b.sellos; a.premios += b.premios;
      if (!a.telefono) a.telefono = b.telefono;
      if (!a.email) a.email = b.email;
      for (var k in porClave) if (porClave[k] === gT) porClave[k] = gE;
      delete grupos[gT];
      g = gE;
    }
    if (em) porClave["e:" + em] = g;
    if (tel) porClave["t:" + tel] = g;
    var gr = grupos[g];
    if (!gr.nombre && row[iNom]) gr.nombre = String(row[iNom]);
    if (!gr.email && em) gr.email = em;
    if (!gr.telefono && tel) gr.telefono = String(row[iTel]);
    if (String(row[iClub] || "").indexOf("premio") === 0) {
      if (premioUsado(row, keys)) { gr.premios++; gr.sellos = 0; gr.ultima = String(row[iFecha] || ""); }
      continue;
    }
    if (cfg.desde && String(row[iFecha] || "").slice(0, 10) < cfg.desde) continue;
    if (pedidoPagado(row, keys)) { gr.sellos++; gr.ultima = String(row[iFecha] || ""); }
  }
  var lista = [];
  for (var id in grupos) {
    var x = grupos[id];
    if (x.sellos > 0 || x.premios > 0) {
      x.premioDisponible = x.sellos >= cfg.meta - 1;
      lista.push(x);
    }
  }
  lista.sort(function (a, b) { return b.sellos - a.sellos || b.premios - a.premios; });
  return { config: cfg, clientes: lista.slice(0, 500) };
}

/* -------------------------- Regalo con cupón ----------------------------- */
// El cliente deja su WhatsApp (y opcionalmente email) en /regalo y recibe un
// cupón único (SUPLE-XXXXXX) de un solo uso, con vencimiento. El descuento lo
// aplica y valida el servidor al crear el pedido. Configuración en la Propiedad
// del Script "CUPON" (JSON: tipo "monto"|"porcentaje", valor, dias); valor 0 =
// regalo apagado. Un pedido con cupón que queda sin pagar más de 48 h libera el
// cupón (igual que el premio del Club).
function cuponConfig() {
  var c = {};
  try { c = JSON.parse(PropertiesService.getScriptProperties().getProperty("CUPON") || "{}") || {}; } catch (e) {}
  var tipo = c.tipo === "porcentaje" ? "porcentaje" : "monto";
  var valor = Math.max(0, Math.round(Number(c.valor) || 0));
  if (tipo === "porcentaje" && valor > 50) valor = 50;
  var dias = Math.floor(Number(c.dias) || 30);
  if (dias < 1 || dias > 365) dias = 30;
  return { tipo: tipo, valor: valor, dias: dias, activo: valor > 0 };
}

function cuponConfigPublica() {
  var c = cuponConfig();
  return { activo: c.activo, tipo: c.tipo, valor: c.valor, dias: c.dias };
}

function cuponConfigGuardar(obj) {
  var tipo = obj.tipo === "porcentaje" ? "porcentaje" : "monto";
  var valor = Math.round(Number(obj.valor) || 0);
  if (valor < 0 || (tipo === "porcentaje" && valor > 50) || valor > 10000000) {
    throw new Error(tipo === "porcentaje" ? "El porcentaje tiene que ser entre 0 y 50" : "Monto inválido");
  }
  var dias = Math.floor(Number(obj.dias) || 30);
  if (dias < 1 || dias > 365) throw new Error("La validez tiene que ser entre 1 y 365 días");
  PropertiesService.getScriptProperties().setProperty("CUPON", JSON.stringify({ tipo: tipo, valor: valor, dias: dias }));
  return cuponConfig();
}

function codigoCuponNuevo() {
  var abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O, 1/I/L
  for (var intento = 0; intento < 8; intento++) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + ":" + Date.now() + ":" + intento);
    var out = "";
    for (var i = 0; i < 6; i++) out += abc.charAt(((bytes[i] + 256) % 256) % abc.length);
    var cod = "SUPLE-" + out;
    if (filaCupon(cod) < 0) return cod; // nunca repetir un código existente
  }
  throw new Error("No se pudo generar el cupón. Probá de nuevo.");
}

function fechaMasDias(dias) {
  return String(Utilities.formatDate(new Date(Date.now() + dias * 86400000), "GMT-3", "yyyy-MM-dd")).slice(0, 10);
}

// Alta del regalo. Si el contacto ya pidió uno, devuelve el mismo cupón.
function leadAlta(obj) {
  var cfg = cuponConfig();
  if (!cfg.activo) throw new Error("El regalo no está disponible en este momento.");
  var nombre = String(obj.nombre || "").trim().slice(0, 80);
  var tel = telefonoClave(obj.telefono);
  if (!tel) throw new Error("Escribí tu WhatsApp con código de área (ej. 11 5555 5555).");
  var email = low(obj.email);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Email inválido");
  var origen = String(obj.origen || "web").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "web";
  var keys = keysOf("Leads");
  var data = sheetFor("Leads").getDataRange().getValues();
  var iTel = keys.indexOf("telefono"), iEm = keys.indexOf("email"), iCod = keys.indexOf("codigo"), iVen = keys.indexOf("vence");
  for (var r = 1; r < data.length; r++) {
    if (telefonoClave(data[r][iTel]) === tel || (email && low(data[r][iEm]) === email)) {
      // Ya lo pidió: no se muestra el código completo (cualquiera podría escribir
      // un WhatsApp ajeno). Lo tiene guardado donde lo pidió o se lo reenviamos.
      var codR = String(data[r][iCod]);
      var est = cuponEstado(codR);
      return { codigo: codR.slice(0, 6) + "••••" + codR.slice(-2), vence: String(data[r][iVen] || "").slice(0, 10), tipo: cfg.tipo, valor: cfg.valor, repetido: true, enmascarado: true, disponible: est.valido, motivo: est.valido ? "" : est.motivo };
    }
  }
  var codigo = codigoCuponNuevo();
  var lead = {
    id: "lead" + Date.now() + "-" + codigo.slice(-6), // único aunque lleguen dos en el mismo milisegundo
    nombre: nombre,
    telefono: String(obj.telefono || "").trim().slice(0, 40),
    email: email,
    origen: origen,
    codigo: codigo,
    vence: fechaMasDias(cfg.dias),
    usado: "",
  };
  addRow("Leads", lead);
  return { codigo: lead.codigo, vence: lead.vence, tipo: cfg.tipo, valor: cfg.valor, repetido: false, disponible: true, motivo: "" };
}

function filaCupon(codigo) {
  var cod = String(codigo || "").trim().toUpperCase();
  if (!/^SUPLE-[A-Z0-9]{6}$/.test(cod)) return -1;
  var keys = keysOf("Leads");
  var col = keys.indexOf("codigo") + 1;
  var sh = sheetFor("Leads");
  var last = Math.max(sh.getLastRow() - 1, 0);
  if (!last) return -1;
  var vals = sh.getRange(2, col, last, 1).getValues();
  for (var i = 0; i < vals.length; i++) if (String(vals[i][0]).trim().toUpperCase() === cod) return i + 2;
  return -1;
}

// ¿El cupón se puede usar ahora? Devuelve { valido, motivo, tipo, valor, vence }.
// Con telefono/email (al crear el pedido) además exige que sea de quien lo pidió.
function cuponEstado(codigo, telefono, email) {
  var cfg = cuponConfig();
  var res = { valido: false, motivo: "", tipo: cfg.tipo, valor: cfg.valor, vence: "" };
  if (!cfg.activo) { res.motivo = "Los cupones del regalo no están activos en este momento."; return res; }
  var n = filaCupon(codigo);
  if (n < 0) { res.motivo = "El cupón no existe. Revisá que esté bien escrito."; return res; }
  var keys = keysOf("Leads");
  var row = sheetFor("Leads").getRange(n, 1, 1, keys.length).getValues()[0];
  res.vence = String(row[keys.indexOf("vence")] || "").slice(0, 10);
  var hoy = String(Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd")).slice(0, 10);
  if (res.vence && res.vence < hoy) { res.motivo = "El cupón venció el " + res.vence.split("-").reverse().join("/") + "."; return res; }
  if (telefono !== undefined || email !== undefined) {
    var telL = telefonoClave(row[keys.indexOf("telefono")]), emL = low(row[keys.indexOf("email")]);
    var mismo = (telL && telL === telefonoClave(telefono)) || (emL && emL === low(email));
    if (!mismo) { res.motivo = "Este cupón es personal: usalo con el mismo WhatsApp con el que lo pediste."; return res; }
  }
  var usado = String(row[keys.indexOf("usado")] || "").trim();
  if (usado) {
    var nP = findRowById("Pedidos", usado);
    if (nP > 0) {
      var kP = keysOf("Pedidos");
      var rowP = sheetFor("Pedidos").getRange(nP, 1, 1, kP.length).getValues()[0];
      // Pagado, entregado o reciente (reservado 48 h): ya se usó.
      if (premioUsado(rowP, kP)) { res.motivo = "Este cupón ya se usó."; return res; }
    }
    // El pedido se borró o quedó sin pagar más de 48 h: el cupón vuelve a servir.
  }
  res.valido = true;
  return res;
}

function cuponPublico(codigo) {
  var e = cuponEstado(codigo);
  return { valido: e.valido, motivo: e.motivo, tipo: e.tipo, valor: e.valor, vence: e.vence };
}

// Descuento del cupón sobre el importe de los productos (sin envío).
function cuponDescuento(cu, base) {
  if (base <= 0) return 0;
  return cu.tipo === "porcentaje" ? Math.round((base * cu.valor) / 100) : cu.valor;
}

function marcarCuponUsado(codigo, pedidoId) {
  var n = filaCupon(codigo);
  if (n < 0) return;
  var keys = keysOf("Leads");
  var celda = sheetFor("Leads").getRange(n, keys.indexOf("usado") + 1);
  var anterior = String(celda.getValue() || "").trim();
  if (anterior && anterior !== pedidoId) quitarDescuentoPedido(anterior, "cupon", pedidoId);
  celda.setValue(pedidoId);
}

// Un pedido sin pagar perdió su descuento (cupón o premio) porque se liberó y
// se usó en otro: vuelve al precio completo y queda anotado. Si después llega
// un pago por el monto viejo, el webhook lo marca "revisar pago".
function quitarDescuentoPedido(id, campo, nuevoPedido) {
  var n = findRowById("Pedidos", id);
  if (n < 0) return;
  var keys = keysOf("Pedidos");
  var row = sheetFor("Pedidos").getRange(n, 1, 1, keys.length).getValues()[0];
  if (pedidoPagado(row, keys)) return;
  var txt = String(row[keys.indexOf(campo)] || "");
  var m = txt.match(/\$(\d+)/);
  if (!m) return;
  var cambios = {};
  cambios[campo] = "liberado"; // "" no pisa la celda (updateRowByNumber ignora vacíos)
  cambios.monto = (Number(row[keys.indexOf("monto")]) || 0) + Number(m[1]);
  var notas = String(row[keys.indexOf("notas")] || "");
  cambios.notas = (notas ? notas + " · " : "") + "Sin " + (campo === "cupon" ? "cupón" : "premio del Club") + " ($" + m[1] + "): se liberó a las 48 h y se usó en " + nuevoPedido;
  updateRowByNumber("Pedidos", n, cambios);
}

/* ------------------------------ Productos -------------------------------- */

// ¿Es "sí"? Acepta sí/si/true/x/1.
function parseSiNo(v) {
  if (v === true) return true;
  var s = String(v).trim().toLowerCase();
  return s === "si" || s === "sí" || s === "true" || s === "x" || s === "1";
}
function siNo(v) {
  return parseSiNo(v) ? "sí" : "no";
}

// Devuelve los productos completos de la planilla.
// conCostos: true solo para el CRM (con token). La tienda pública no recibe
// costo ni costoMoneda.
function listProductos(conCostos) {
  var sh = sheetFor("Productos");
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var nombre = String(row[0] || "").trim();
    if (!nombre) continue;
    list.push({
      nombre: nombre,
      marca: String(row[1] || "").trim(),
      categoria: String(row[2] || "").trim(),
      precio: Number(row[3]) || 0,
      precioML: row[4] === "" || row[4] == null ? 0 : Number(row[4]) || 0,
      variantes: String(row[5] || "").trim(),
      stock: row[6] === "" || row[6] == null ? true : parseSiNo(row[6]),
      destacado: parseSiNo(row[7]),
      costo: row[8] === "" || row[8] == null ? 0 : Number(row[8]) || 0,
      costoMoneda: String(row[9] || "").trim().toUpperCase() === "USD" ? "USD" : "ARS",
      imagen: String(row[10] || "").trim(),
      cantidad: row[11] === "" || row[11] == null ? 0 : Number(row[11]) || 0,
      variantesFotos: String(row[12] || "").trim(),
      descripcion: String(row[13] || "").trim(),
      modoUso: String(row[14] || "").trim(),
      infoNutricional: String(row[15] || "").trim(),
      ingredientes: String(row[16] || "").trim(),
      combo: String(row[17] || "").trim(),
      porCaja: Number(row[18]) || 0,
      precioCaja: Number(row[19]) || 0,
    });
  }
  if (!conCostos) {
    for (var j = 0; j < list.length; j++) {
      delete list[j].costo;
      delete list[j].costoMoneda;
    }
  }
  return list;
}

// Crea o actualiza una fila de precio, cruzando por nombre.
function saveProducto(obj) {
  if (!obj.nombre) throw new Error("Falta el nombre del producto");
  var n = findRowById("Productos", obj.nombre);
  if (n > 0) return updateRow("Productos", obj.nombre, obj);
  return addRow("Productos", obj);
}

/* ------------------------------ Imágenes --------------------------------- */

/* =================== COMPRAS: ARCHIVOS Y LECTURA CON CLAUDE =============== */

// Las fotos, PDFs y planillas de las compras se guardan en Drive (privado) y se
// leen con Claude, que devuelve los productos con cantidades y precios. La clave
// va en Propiedades del script (ANTHROPIC_API_KEY), nunca en la web.
var CLAUDE_MODEL = "claude-haiku-5-5"; // el más barato: alcanza para leer facturas y listas
var CARPETA_COMPRAS = "Compras Suple Market";
var COMPRA_ARCHIVO_MAX_B64 = 20000000; // ~15 MB de archivo
var COMPRA_TEXTO_MAX = 200000;

var PROMPT_COMPRA = [
  "Leés compras de mercadería de Suple Market, una tienda de suplementos deportivos de Argentina.",
  "Te llega una factura, remito, presupuesto, lista de precios o un mensaje escrito por el dueño con lo que compró a un proveedor.",
  "Devolvé un renglón por cada producto comprado:",
  "- marca: la marca del producto (ej: ENA, Star Nutrition, Granger). Vacío si no figura.",
  "- producto: el nombre limpio con presentación y tamaño, sin la marca (ej: \"Creatina Micronizada 300 g\").",
  "- variante: sabor o color si figura (ej: Vainilla); vacío si no tiene.",
  "- cantidad: unidades compradas. Si dice cajas o bultos y aclara cuántas unidades trae cada uno, pasalo a unidades y aclaralo en notas.",
  "- precioUnitario: lo que se paga por unidad en pesos. Los números argentinos usan punto de miles y coma decimal (\"15.121,80\" = 15121.8).",
  "  Si los precios figuran sin IVA y el IVA se suma al final, o hay un descuento general, repartilo proporcionalmente para dar el precio final por unidad y contalo en notas.",
  "  Si solo figura el subtotal del renglón, dividilo por la cantidad. Si no hay precio, poné 0.",
  "- catalogo: si el producto es uno de la lista del catálogo de la tienda, copiá exactamente su valor (lo que está entre comillas, incluye \"||\" y la variante). Si no estás seguro o no está, dejalo vacío.",
  "proveedor: quién vende (el emisor), nunca Suple Market. fecha: la del comprobante en formato AAAA-MM-DD, o vacío. total: el total del comprobante, o 0 si no figura.",
  "No inventes productos ni precios: si algo no se lee bien, poné lo que se entienda y explicalo en dudas.",
  "Si no es una compra de mercadería, devolvé items vacío y explicalo en dudas.",
].join("\n");

var SCHEMA_COMPRA = {
  type: "object",
  properties: {
    proveedor: { type: "string" },
    fecha: { type: "string" },
    total: { type: "number" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          marca: { type: "string" },
          producto: { type: "string" },
          variante: { type: "string" },
          cantidad: { type: "number" },
          precioUnitario: { type: "number" },
          catalogo: { type: "string" },
        },
        required: ["marca", "producto", "variante", "cantidad", "precioUnitario", "catalogo"],
        additionalProperties: false,
      },
    },
    notas: { type: "string" },
    dudas: { type: "string" },
  },
  required: ["proveedor", "fecha", "total", "items", "notas", "dudas"],
  additionalProperties: false,
};

// Llega por POST (no-cors: el CRM no ve la respuesta), así que el resultado se
// guarda en caché con el id de trabajo y el CRM lo consulta con compra_archivo_estado.
function compraArchivo(p) {
  var job = idTrabajo(p.job);
  if (!job) return { ok: false, error: "Falta el id de trabajo" };
  var res;
  try {
    res = procesarArchivoCompra(p);
  } catch (err) {
    registrarError("compra_archivo", err, { nombre: p.nombre, tipo: p.tipo });
    res = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  var txt = JSON.stringify(res);
  if (txt.length > 95000) txt = JSON.stringify({ ok: false, archivo: res.archivo, error: "El comprobante tiene demasiados productos: subilo en partes." });
  CacheService.getScriptCache().put("cjob_" + job, txt, 21600);
  return res;
}

function compraArchivoEstado(p) {
  var job = idTrabajo(p.job);
  var v = job && CacheService.getScriptCache().get("cjob_" + job);
  return v ? JSON.parse(v) : { ok: true, pendiente: true };
}

function idTrabajo(v) {
  return String(v || "").replace(/[^\w-]/g, "").slice(0, 60);
}

function procesarArchivoCompra(p) {
  var nombre = String(p.nombre || "").replace(/[\\\/:*?"<>|]/g, " ").trim().slice(0, 120);
  var tipo = String(p.tipo || "application/octet-stream").slice(0, 100);
  var data = String(p.data || "");
  var texto = String(p.texto || "").slice(0, COMPRA_TEXTO_MAX);
  if (!data && !texto.trim()) throw new Error("No llegó ningún archivo ni texto");
  if (data.length > COMPRA_ARCHIVO_MAX_B64) throw new Error("El archivo es muy pesado (máximo 15 MB)");
  var out = { ok: true };
  if (data) out.archivo = guardarArchivoCompra(Utilities.base64Decode(data), tipo, nombre || "archivo");
  if (p.analizar !== false && p.analizar !== "no") {
    // Si la lectura falla, el archivo igual queda guardado y adjunto a la compra.
    try {
      out.analisis = leerCompraConClaude(texto ? "" : tipo, data, texto, p.catalogo, nombre);
    } catch (err) {
      if (!out.archivo) throw err;
      registrarError("compra_archivo", err, { nombre: nombre, tipo: tipo });
      out.errorLectura = String(err && err.message ? err.message : err);
    }
  }
  return out;
}

function guardarArchivoCompra(bytes, tipo, nombre) {
  var it = DriveApp.getFoldersByName(CARPETA_COMPRAS);
  var carpeta = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_COMPRAS);
  var stamp = Utilities.formatDate(new Date(), "America/Argentina/Buenos_Aires", "yyyy-MM-dd HH.mm");
  var f = carpeta.createFile(Utilities.newBlob(bytes, tipo, stamp + " - " + nombre));
  return { id: f.getId(), nombre: nombre, tipo: tipo, url: f.getUrl() };
}

function leerCompraConClaude(tipo, b64, texto, catalogo, nombre) {
  var key = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  if (!key) throw new Error("Falta la clave de Claude: cargá ANTHROPIC_API_KEY en Propiedades del script.");
  var bloque;
  if (texto) {
    bloque = { type: "text", text: (nombre ? "Contenido de \"" + nombre + "\":\n\n" : "Compra escrita por el dueño:\n\n") + texto };
  } else if (tipo === "application/pdf") {
    bloque = { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } };
  } else if (/^image\/(jpeg|png|gif|webp)$/.test(tipo)) {
    bloque = { type: "image", source: { type: "base64", media_type: tipo, data: b64 } };
  } else {
    throw new Error("Ese tipo de archivo no se puede leer. Subí una foto, un PDF, un Excel, un Word o un CSV.");
  }
  var cat = (Array.isArray(catalogo) ? catalogo : []).slice(0, 800).map(function (c) { return String(c).slice(0, 200); });
  var body = {
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA_COMPRA } },
    system: PROMPT_COMPRA,
    messages: [{
      role: "user",
      content: [bloque, { type: "text", text: "Catálogo de la tienda:\n" + (cat.join("\n") || "(vacío)") + "\n\nDevolvé los productos de esta compra." }],
    }],
  };
  var r = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    contentType: "application/json",
    headers: { "x-api-key": key, "anthropic-version": "2026-10-21" },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  var code = r.getResponseCode();
  var j = {};
  try { j = JSON.parse(r.getContentText()); } catch (e) {}
  if (code !== 200) {
    var msg = j.error && j.error.message ? j.error.message : "error " + code;
    if (code === 401) msg = "la clave de Claude no es válida";
    else if (code === 429 || code >= 500) msg = "Claude está ocupado, probá de nuevo en un minuto";
    throw new Error("No se pudo leer: " + msg);
  }
  if (j.stop_reason === "refusal") throw new Error("No se pudo leer este archivo.");
  if (j.stop_reason === "max_tokens") throw new Error("El comprobante es muy largo: subilo en partes (una foto por página).");
  var txt = (j.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("");
  var a;
  try { a = JSON.parse(txt); } catch (e) { throw new Error("No se pudo entender la respuesta de Claude."); }
  return limpiarAnalisisCompra(a);
}

// Normaliza lo que devuelve Claude (tipos, largos y números válidos).
function limpiarAnalisisCompra(a) {
  var s = function (v, n) { return String(v == null ? "" : v).trim().slice(0, n || 200); };
  var n = function (v) { var x = Number(v); return isFinite(x) && x > 0 ? Math.round(x * 100) / 100 : 0; };
  var fecha = s(a && a.fecha, 10);
  return {
    proveedor: s(a && a.proveedor, 80),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : "",
    total: n(a && a.total),
    items: ((a && a.items) || []).slice(0, 200).map(function (i) {
      return { marca: s(i.marca, 60), producto: s(i.producto, 140), variante: s(i.variante, 60), cantidad: Math.round(n(i.cantidad)), precioUnitario: n(i.precioUnitario), catalogo: s(i.catalogo, 200) };
    }).filter(function (i) { return i.producto; }),
    notas: s(a && a.notas, 600),
    dudas: s(a && a.dudas, 600),
  };
}

// Sube una imagen (base64) al repo de GitHub en public/productos/ y guarda el
// link en la columna "imagen" del producto. El token va en Propiedades del
// script como GITHUB_TOKEN (NO en el código).
function subirImagen(p) {
  if (!p.nombre || !p.data) return { ok: false, error: "Faltan datos" };
  var token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) return { ok: false, error: "Falta GITHUB_TOKEN en Propiedades del script" };
  var path = "public/productos/" + slugImagen(p.nombre) + "-" + Date.now() + ".jpg";
  var api = "https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + path;
  var res = UrlFetchApp.fetch(api, {
    method: "put",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "suplemarket-crm",
    },
    payload: JSON.stringify({
      message: "foto: " + p.nombre,
      content: p.data, // ya viene en base64
      branch: GITHUB_BRANCH,
    }),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    return { ok: false, error: "GitHub " + code + ": " + res.getContentText().slice(0, 180) };
  }
  var url =
    "https://raw.githubusercontent.com/" + GITHUB_REPO + "/" + GITHUB_BRANCH + "/" + path;

  // Foto de una CATEGORÍA.
  if (p.categoria) {
    var cn = findRowById("Categorias", p.categoria);
    if (cn > 0) updateRowByNumber("Categorias", cn, { imagen: url });
    else addRow("Categorias", { nombre: p.categoria, imagen: url });
    return { ok: true, url: url };
  }

  var n = findRowById("Productos", p.nombre);
  if (n < 0) {
    if (p.variante) addRow("Productos", { nombre: p.nombre, variantesFotos: JSON.stringify(mapVar(p.variante, [url])) });
    else addRow("Productos", { nombre: p.nombre, imagen: url });
    return { ok: true, url: url };
  }
  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  if (p.variante) {
    // Varias fotos por variante → array.
    var iVF = keys.indexOf("variantesFotos");
    var vf = {};
    try { vf = JSON.parse(sh.getRange(n, iVF + 1).getValue() || "{}"); } catch (e1) {}
    var arr = vf[p.variante];
    if (Object.prototype.toString.call(arr) !== "[object Array]") arr = arr ? [arr] : [];
    arr.push(url);
    vf[p.variante] = arr;
    sh.getRange(n, iVF + 1).setValue(JSON.stringify(vf));
  } else {
    // Galería del producto: agrega a la lista (separada por "|").
    var iImg = keys.indexOf("imagen");
    var cur = String(sh.getRange(n, iImg + 1).getValue() || "").trim();
    sh.getRange(n, iImg + 1).setValue(cur ? cur + "|" + url : url);
  }
  return { ok: true, url: url };
}

function mapVar(k, v) {
  var o = {};
  o[k] = v;
  return o;
}

// Borra la referencia a una foto (no borra el archivo de GitHub).
function borrarImagen(p) {
  // Foto de una categoría.
  if (p.categoria) {
    var cn = findRowById("Categorias", p.categoria);
    if (cn > 0) updateRowByNumber("Categorias", cn, { imagen: " " });
    return { ok: true };
  }
  if (!p.nombre) return { ok: false, error: "Falta el producto" };
  var n = findRowById("Productos", p.nombre);
  if (n < 0) return { ok: false, error: "Producto no encontrado" };
  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  if (p.variante) {
    var iVF = keys.indexOf("variantesFotos");
    var vf = {};
    try { vf = JSON.parse(sh.getRange(n, iVF + 1).getValue() || "{}"); } catch (e2) {}
    if (p.url) {
      // Quita una foto puntual de esa variante.
      var arr = vf[p.variante];
      if (Object.prototype.toString.call(arr) !== "[object Array]") arr = arr ? [arr] : [];
      arr = arr.filter(function (u) { return u && !mismaImagen(u, p.url); });
      if (arr.length) vf[p.variante] = arr;
      else delete vf[p.variante];
    } else {
      delete vf[p.variante]; // quita todas las de esa variante
    }
    sh.getRange(n, iVF + 1).setValue(JSON.stringify(vf));
  } else if (p.url) {
    var iImg = keys.indexOf("imagen");
    var list = String(sh.getRange(n, iImg + 1).getValue() || "")
      .split("|")
      .map(function (s) { return s.trim(); })
      .filter(function (u) { return u && !mismaImagen(u, p.url); });
    sh.getRange(n, iImg + 1).setValue(list.join("|"));
  }
  return { ok: true };
}

// Compara dos URLs de imagen por NOMBRE DE ARCHIVO: la web puede mandar la
// ruta local ("/productos/x.jpg") y la planilla guarda la URL completa de
// GitHub. Así borrar una foto funciona siempre.
function mismaImagen(a, b) {
  var fa = String(a || "").split("?")[0].split("/").pop();
  var fb = String(b || "").split("?")[0].split("/").pop();
  return !!fa && fa === fb;
}

function slugImagen(s) {
  return (
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "producto"
  );
}

// Sube el comprobante de transferencia de un pedido a GitHub y guarda el link
// en la columna Comprobante del pedido.
function subirComprobante(p) {
  if (!p.pedido || !p.data) return { ok: false, error: "Faltan datos" };
  var data = String(p.data);
  // Solo JPEG (la web lo convierte siempre a JPEG) y con un tamaño acotado.
  if (data.indexOf("/9j/") !== 0 || !/^[A-Za-z0-9+/=]+$/.test(data.slice(0, 200))) {
    return { ok: false, error: "El comprobante tiene que ser una imagen JPEG" };
  }
  if (data.length > COMPROBANTE_MAX_B64) return { ok: false, error: "La imagen es demasiado grande" };
  // Solo pedidos reales por transferencia que todavía no estén cobrados.
  var nPed = findRowById("Pedidos", p.pedido);
  if (nPed < 0) return { ok: false, error: "Pedido no encontrado" };
  var keysPed = keysOf("Pedidos");
  var rowPed = sheetFor("Pedidos").getRange(nPed, 1, 1, keysPed.length).getValues()[0];
  if (String(rowPed[keysPed.indexOf("pago")] || "").trim() !== "Transferencia") {
    return { ok: false, error: "Este pedido no es por transferencia" };
  }
  if (low(rowPed[keysPed.indexOf("estado")]) === "pagado" || low(rowPed[keysPed.indexOf("cobrado")]) === "sí") {
    return { ok: false, error: "El pedido ya está cobrado" };
  }
  var token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) return { ok: false, error: "Falta GITHUB_TOKEN en Propiedades del script" };
  var path = "public/comprobantes/" + slugImagen(p.pedido) + "-" + Date.now() + ".jpg";
  var api = "https://api.github.com/repos/" + GITHUB_REPO + "/contents/" + path;
  var res = UrlFetchApp.fetch(api, {
    method: "put",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "suplemarket-crm",
    },
    payload: JSON.stringify({ message: "comprobante: " + p.pedido, content: p.data, branch: GITHUB_BRANCH }),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    return { ok: false, error: "GitHub " + code + ": " + res.getContentText().slice(0, 180) };
  }
  var url = "https://raw.githubusercontent.com/" + GITHUB_REPO + "/" + GITHUB_BRANCH + "/" + path;
  updateRowByNumber("Pedidos", nPed, { comprobante: url });
  return { ok: true, url: url };
}

/* ----------------------------- Mercado Pago ------------------------------ */

// Crea una preferencia de pago (Checkout Pro) y devuelve el link (init_point).
// El Access Token va en Propiedades del script como MP_ACCESS_TOKEN (NO en el
// código ni en la web).
function mpCrearPreferencia(p) {
  var token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
  if (!token) return { ok: false, error: "Falta MP_ACCESS_TOKEN en Propiedades del script" };
  // El monto NO se toma de la web: se lee del pedido ya guardado en la planilla
  // (cuyo total se validó al crearlo).
  var nPed = findRowById("Pedidos", p.pedido);
  if (nPed < 0) return { ok: false, error: "Pedido no encontrado" };
  var keysPed = keysOf("Pedidos");
  var rowPed = sheetFor("Pedidos").getRange(nPed, 1, 1, keysPed.length).getValues()[0];
  if (String(rowPed[keysPed.indexOf("pago")] || "").trim() !== "Mercado Pago") {
    return { ok: false, error: "Este pedido no es por Mercado Pago" };
  }
  if (low(rowPed[keysPed.indexOf("estado")]) === "pagado") return { ok: false, error: "El pedido ya está pagado" };
  var monto = Number(rowPed[keysPed.indexOf("monto")]) || 0;
  if (monto <= 0) return { ok: false, error: "Monto inválido" };
  var exec = "";
  try { exec = ScriptApp.getService().getUrl(); } catch (e0) {}

  // El envío va como ítem aparte (una sola vez), el resto son los productos.
  var envioMonto = Number(rowPed[keysPed.indexOf("montoEnvio")]) || 0;
  if (envioMonto < 0 || envioMonto >= monto) envioMonto = 0;
  var itemsMP = [
    {
      title: String(p.titulo || "Pedido Suple Market"),
      quantity: 1,
      unit_price: monto - envioMonto,
      currency_id: "ARS",
    },
  ];
  if (envioMonto > 0) {
    itemsMP.push({
      title: String(p.envioTitulo || "Envío a domicilio"),
      quantity: 1,
      unit_price: envioMonto,
      currency_id: "ARS",
    });
  }
  var pref = {
    items: itemsMP,
    external_reference: String(p.pedido || ""),
    back_urls: {
      success: SITE_URL + "/pago/exito/",
      failure: SITE_URL + "/pago/error/",
      pending: SITE_URL + "/pago/pendiente/",
    },
    auto_return: "approved",
  };
  if (exec) pref.notification_url = exec + "?action=mp_webhook";
  if (p.email) pref.payer = { email: String(p.email) };

  var res = UrlFetchApp.fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(pref),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  var body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e1) {}
  if (code < 200 || code >= 300) {
    registrarError("mp_crear_pref", new Error("MP " + code + ": " + res.getContentText().slice(0, 180)), { id: p.pedido }, true);
    return { ok: false, error: "MP " + code + ": " + res.getContentText().slice(0, 180) };
  }
  return { ok: true, init_point: body.init_point, id: body.id };
}

// Webhook de Mercado Pago: cuando un pago se aprueba, marca el pedido como
// "pagado" en la planilla. MP manda el id del pago por query (?data.id=) o en
// el cuerpo. Consultamos el pago para leer el estado y el nº de pedido.
function mpWebhook(p, e) {
  try {
    var token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
    if (!token) return { ok: false };

    var type = p.type || p.topic || "";
    if (type && String(type).indexOf("payment") === -1) return { ok: true }; // solo pagos

    var payId = p["data.id"] || p.id || "";
    if (!payId && e && e.postData && e.postData.contents) {
      try {
        var b = JSON.parse(e.postData.contents);
        payId = (b.data && b.data.id) || b.id || "";
      } catch (er) {}
    }
    if (!payId) return { ok: true };

    var r = UrlFetchApp.fetch("https://api.mercadopago.com/v1/payments/" + payId, {
      headers: { Authorization: "Bearer " + token },
      muteHttpExceptions: true,
    });
    var pay = {};
    try { pay = JSON.parse(r.getContentText()); } catch (er2) {}
    if (r.getResponseCode() !== 200) {
      registrarError("mp_webhook", new Error("Mercado Pago respondió " + r.getResponseCode() + " al consultar el pago " + payId), { id: payId }, true);
      return { ok: true };
    }

    var ref = pay.external_reference;
    if (pay.status === "approved" && ref) {
      var n = findRowById("Pedidos", ref);
      if (n > 0) {
        var keysW = keysOf("Pedidos");
        var rowW = sheetFor("Pedidos").getRange(n, 1, 1, keysW.length).getValues()[0];
        var montoPedido = Number(rowW[keysW.indexOf("monto")]) || 0;
        var pagado = Number(pay.transaction_amount) || 0;
        var notasW = String(rowW[keysW.indexOf("notas")] || "");
        var marca = "MP #" + payId;
        // Mercado Pago avisa varias veces el mismo pago: si ya se anotó, no se
        // vuelve a tocar el pedido (ni el estado ni el stock).
        if (notasW.indexOf(marca) !== -1) return { ok: true, yaProcesado: true };
        notasW = (notasW ? notasW + " · " : "") + marca + " $" + pagado;
        var estadoActual = low(rowW[keysW.indexOf("estado")]);
        if (Math.abs(pagado - montoPedido) <= 1) {
          var cambios = { notas: notasW, cobrado: "sí" };
          // Si ya estaba entregado, se respeta; si no, pasa a "pagado".
          if (estadoActual !== "entregado") cambios.estado = "pagado";
          updateRowByNumber("Pedidos", n, cambios);
        } else {
          // Pagó otro monto: no se marca pagado, queda para revisar en el CRM.
          updateRowByNumber("Pedidos", n, {
            estado: "revisar pago",
            notas: notasW + " (pedido $" + montoPedido + ")",
          });
        }
      }
    }
    return { ok: true };
  } catch (err) {
    registrarError("mp_webhook", err, p, true);
    return { ok: false, error: String(err) };
  }
}

/* ------------------------------ Stock / ventas --------------------------- */

// Aprueba el pago de un pedido: descuenta el stock de sus productos (una sola
// vez) y lo marca como pagado. Idempotente: si ya se descontó, no vuelve a bajar.
function aprobarPedido(id) {
  if (!id) return { ok: false, error: "Falta el id del pedido" };
  var n = findRowById("Pedidos", id);
  if (n < 0) return { ok: false, error: "Pedido no encontrado" };
  var sh = sheetFor("Pedidos");
  var keys = keysOf("Pedidos");
  var row = sh.getRange(n, 1, 1, keys.length).getValues()[0];
  var iDesc = keys.indexOf("descontado");
  var iItems = keys.indexOf("items");

  if (String(row[iDesc] || "").trim().toLowerCase() === "sí") {
    updateRowByNumber("Pedidos", n, { estado: "pagado" });
    return { ok: true, yaDescontado: true };
  }

  var items = [];
  try { items = JSON.parse(row[iItems] || "[]"); } catch (e) {}
  for (var i = 0; i < items.length; i++) {
    // items[i].cv: en combos, la variante elegida por el cliente para cada
    // producto del combo ({ "WHEY ...": "Vainilla" }).
    descontarProducto(items[i].n, unidadesItem(items[i]), items[i].v, items[i].cv);
  }
  updateRowByNumber("Pedidos", n, { estado: "pagado", descontado: "sí" });
  return { ok: true, descontados: items.length };
}

// Baja la cantidad de un producto (por nombre). Si se indica la variante, baja
// el stock de esa variante en el texto "Rojo:5, Azul:3". Si el total llega a 0,
// marca el producto sin stock.
// comboVars (opcional): si el producto es un combo, variante elegida por el
// cliente para cada componente ({ nombreProducto: variante }).
function descontarProducto(nombre, cant, variante, comboVars) {
  ajustarProducto(nombre, cant, variante, comboVars, -1);
}

// Ajusta el stock de un producto: signo -1 descuenta (venta), +1 repone
// (pedido eliminado). Maneja variantes y combos (recursivo).
function ajustarProducto(nombre, cant, variante, comboVars, signo) {
  if (!nombre || !cant || cant <= 0) return;
  var n = findRowById("Productos", nombre);
  if (n < 0) return;
  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  var iCant = keys.indexOf("cantidad");
  var iStock = keys.indexOf("stock");
  var iVar = keys.indexOf("variantes");

  // Si es un COMBO, descuenta el stock de cada producto que lo compone
  // (y no toca el stock propio del combo).
  var iCombo = keys.indexOf("combo");
  var comboRaw = iCombo >= 0 ? String(sh.getRange(n, iCombo + 1).getValue() || "").trim() : "";
  if (comboRaw) {
    var comps = [];
    try { comps = JSON.parse(comboRaw); } catch (ec) {}
    for (var ci = 0; ci < comps.length; ci++) {
      // La variante que eligió el cliente manda; si no eligió, la fija del combo.
      var cv = comboVars && comboVars[comps[ci].n] ? comboVars[comps[ci].n] : comps[ci].v;
      ajustarProducto(comps[ci].n, cant * (Number(comps[ci].q) || 1), cv, null, signo);
    }
    return;
  }

  // Descontar de la variante específica (si corresponde).
  if (variante) {
    var raw = String(sh.getRange(n, iVar + 1).getValue() || "");
    var parts = raw.split(",").map(function (s) { return s.trim(); }).filter(String);
    for (var i = 0; i < parts.length; i++) {
      var idx = parts[i].lastIndexOf(":");
      var vname = idx > 0 ? parts[i].slice(0, idx).trim() : parts[i];
      if (vname.toLowerCase() === String(variante).trim().toLowerCase() && idx > 0) {
        var q = Number(parts[i].slice(idx + 1).trim()) || 0;
        parts[i] = vname + ":" + Math.max(0, q + signo * cant);
      }
    }
    sh.getRange(n, iVar + 1).setValue(parts.join(", "));
  }

  // Descontar del total.
  var actual = Number(sh.getRange(n, iCant + 1).getValue()) || 0;
  var nuevo = Math.max(0, actual + signo * cant);
  sh.getRange(n, iCant + 1).setValue(nuevo);
  sh.getRange(n, iStock + 1).setValue(nuevo > 0 ? "sí" : "no");
}

/* ------------------------------ Categorías ------------------------------- */

// Renombra una categoría y arrastra el cambio a todos los productos de esa
// categoría (para que no queden "huérfanos").
function categoriaRename(from, to) {
  if (!from || !to) throw new Error("Faltan datos");
  var n = findRowById("Categorias", from);
  if (n > 0) updateRowByNumber("Categorias", n, { nombre: to });
  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  var iCat = keys.indexOf("categoria");
  if (iCat >= 0) {
    var data = sh.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      // El producto puede estar en varias categorías ("A | B"): se cambia solo esa.
      var cats = String(data[r][iCat] || "").split("|").map(function (c) { return c.trim(); }).filter(String);
      var cambio = false, vistas = {}, nuevas = [];
      for (var c = 0; c < cats.length; c++) {
        var nombre = low(cats[c]) === low(from) ? (cambio = true, to) : cats[c];
        if (vistas[low(nombre)]) continue; // si ya estaba en la nueva, no se repite
        vistas[low(nombre)] = true;
        nuevas.push(nombre);
      }
      if (cambio) sh.getRange(r + 1, iCat + 1).setValue(nuevas.join(" | "));
    }
  }
  return { from: from, to: to };
}

// Categorías por defecto (se cargan en la planilla la primera vez).
var CATEGORIAS_DEFAULT = [
  "Proteínas", "Creatinas", "Pre entreno", "Aminoácidos", "Vitaminas",
  "Minerales", "Colágeno", "Barras y snacks", "Combos",
];

function seedCategorias() {
  var sh = ss().getSheetByName("Categorias");
  if (!sh) return;
  if (sh.getLastRow() > 1) return; // ya tiene datos
  for (var i = 0; i < CATEGORIAS_DEFAULT.length; i++) {
    sh.appendRow([CATEGORIAS_DEFAULT[i], i + 1]);
  }
}

/* --------------------------- Cuentas de clientes -------------------------- */

function registrar(obj) {
  if (!obj.email || !obj.password) return { ok: false, error: "Faltan email o contraseña" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(obj.email))) return { ok: false, error: "Email inválido" };
  if (String(obj.password).length < 6) return { ok: false, error: "La contraseña tiene que tener al menos 6 caracteres" };
  if (findClienteRow({ email: obj.email }) > 0)
    return { ok: false, error: "Ya existe una cuenta con ese email" };
  // Siempre fila nueva: si se fusionara por nombre o DNI con un cliente que ya
  // existe, cualquiera podría pisarle la clave registrándose con su nombre.
  addRow("Clientes", {
    sinFusion: true,
    nombre: obj.nombre || "",
    email: obj.email,
    telefono: obj.telefono || "",
    origen: obj.origen || "web",
    clave: nuevaClave(obj.password),
  });
  return { ok: true, user: { nombre: obj.nombre || "", email: obj.email } };
}

function login(email, password) {
  if (!email || !password) return { ok: false, error: "Faltan datos" };
  var cacheL = CacheService.getScriptCache();
  var claveL = "loginfail_" + String(email).toLowerCase().replace(/\s+/g, "").slice(0, 120);
  var fallos = Number(cacheL.get(claveL) || 0);
  if (fallos >= 5) return { ok: false, error: "Demasiados intentos con esa cuenta. Esperá 15 minutos o recuperá tu contraseña." };
  var sh = sheetFor("Clientes");
  var keys = keysOf("Clientes");
  var data = sh.getDataRange().getValues();
  var iEmail = keys.indexOf("email"),
    iClave = keys.indexOf("clave"),
    iNom = keys.indexOf("nombre");
  for (var r = 1; r < data.length; r++) {
    if (low(data[r][iEmail]) === low(email)) {
      if (verificarClave(data[r][iClave], password)) {
        // Migración transparente: las claves viejas (sin salt) se regraban con
        // el formato nuevo la primera vez que el cliente entra bien.
        if (String(data[r][iClave]).indexOf("v2$") !== 0) {
          sh.getRange(r + 1, iClave + 1).setValue(nuevaClave(password));
        }
        cacheL.remove(claveL);
        return { ok: true, user: { nombre: data[r][iNom], email: data[r][iEmail] } };
      }
      cacheL.put(claveL, String(fallos + 1), 15 * 60);
      return { ok: false, error: "Contraseña incorrecta" };
    }
  }
  return { ok: false, error: "No existe una cuenta con ese email" };
}

/**
 * Login del CRM. El PIN NO está en este código (repo público) sino en una
 * Propiedad del Script (Configuración del proyecto → Propiedades del script →
 * CRM_PIN). Se puede setear con la función setCrmPin() (ver abajo) y borrarla.
 */
function crmLogin(pin) {
  var stored = PropertiesService.getScriptProperties().getProperty("CRM_PIN");
  if (!stored) return { ok: false, error: "PIN no configurado" };
  // Fuerza bruta: tras 5 PIN incorrectos se bloquea el login 15 minutos.
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get("crm_fails") || 0);
  if (fails >= 5) return { ok: false, error: "bloqueado", minutos: 15 };
  if (String(pin || "").trim() !== String(stored).trim()) {
    cache.put("crm_fails", String(fails + 1), 15 * 60);
    return { ok: false, error: "pin", restantes: Math.max(0, 4 - fails) };
  }
  cache.remove("crm_fails");
  var t = crearToken();
  return { ok: true, token: t.token, expires: t.expires };
}

function crmLogout(token) {
  if (token) {
    var t = leerTokens();
    delete t[token];
    guardarTokens(t);
  }
  return { ok: true };
}

/* ------------------------- Tokens de sesión del CRM ----------------------- */
// crm_login devuelve un token aleatorio que vence a los 30 días. Se guardan en
// la Propiedad del Script CRM_TOKENS ({ token: vencimientoMs }). Las acciones
// de administración exigen un token válido (ver handle / esAccionPublica).

var TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function leerTokens() {
  try {
    return JSON.parse(PropertiesService.getScriptProperties().getProperty("CRM_TOKENS") || "{}");
  } catch (e) {
    return {};
  }
}
function guardarTokens(t) {
  PropertiesService.getScriptProperties().setProperty("CRM_TOKENS", JSON.stringify(t));
}
function tokenValido(token) {
  if (!token) return false;
  var t = leerTokens();
  return Number(t[String(token)] || 0) > Date.now();
}
function crearToken() {
  var t = leerTokens();
  var now = Date.now();
  for (var k in t) if (Number(t[k]) < now) delete t[k]; // limpia vencidos
  var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
  t[token] = now + TOKEN_TTL_MS;
  guardarTokens(t);
  return { token: token, expires: t[token] };
}

// Acciones que la tienda pública puede llamar SIN token. Todo lo demás es del
// CRM. "list" solo para Categorias; "add" solo para Pedidos y Suscriptores.
function esAccionPublica(action, p) {
  switch (action) {
    case "version":
    case "productos_list":
    case "registrar":
    case "login":
    case "subir_comprobante":
    case "mp_crear_pref":
    case "mp_webhook":
    case "crm_login":
    case "crm_logout":
    case "club":
    case "lead":
    case "cupon":
      return true;
    case "list":
      return p.tab === "Categorias";
    case "add":
      return p.tab === "Pedidos" || p.tab === "Suscriptores";
    default:
      return false;
  }
}

/* ------------------------- Contraseñas de clientes ------------------------ */
// Formato nuevo: "v2$<salt>$<sha256(salt::password)>" (salt único por cuenta).
// Las claves viejas (sha256 con prefijo fijo, sin salt) siguen validando y se
// migran solas al formato nuevo en el primer login correcto.

function hashV2(pwd, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + "::" + pwd);
  return raw
    .map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    })
    .join("");
}
function nuevaClave(pwd) {
  var salt = Utilities.getUuid().replace(/-/g, "");
  return "v2$" + salt + "$" + hashV2(pwd, salt);
}
function verificarClave(stored, pwd) {
  var s = String(stored || "");
  if (s.indexOf("v2$") === 0) {
    var parts = s.split("$");
    return parts.length === 3 && hashV2(pwd, parts[1]) === parts[2];
  }
  return s === hash(pwd); // formato viejo
}

function hash(txt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "npm::" + txt);
  return raw
    .map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    })
    .join("");
}

/* ------------------------- Renombrar un producto ------------------------- */
// El nombre es la clave del producto. Al renombrar, también se actualizan los
// combos que lo incluyen (columna combo: [{n,q}]) para que no se rompan.
function productoRename(from, to) {
  from = String(from || "").trim();
  to = String(to || "").trim();
  if (!from || !to) throw new Error("Faltan datos");
  if (from === to) return { renamed: false };
  if (findRowById("Productos", to) > 0) throw new Error("Ya existe un producto con ese nombre");
  var n = findRowById("Productos", from);
  if (n < 0) throw new Error("No se encontró: " + from);
  updateRowByNumber("Productos", n, { nombre: to });

  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  var iCombo = keys.indexOf("combo");
  var combosActualizados = 0;
  if (iCombo >= 0) {
    var data = sh.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      var raw = String(data[r][iCombo] || "").trim();
      if (!raw) continue;
      try {
        var comps = JSON.parse(raw);
        var changed = false;
        for (var i = 0; i < comps.length; i++) {
          if (comps[i].n === from) {
            comps[i].n = to;
            changed = true;
          }
        }
        if (changed) {
          sh.getRange(r + 1, iCombo + 1).setValue(JSON.stringify(comps));
          combosActualizados++;
        }
      } catch (e) {}
    }
  }
  return { renamed: true, from: from, to: to, combosActualizados: combosActualizados };
}

/* -------------------------------- Utils ---------------------------------- */

function parseData(p) {
  if (p.data) {
    try {
      return JSON.parse(p.data);
    } catch (e) {}
  }
  var obj = {};
  for (var k in p) {
    if (["action", "callback", "tab", "id", "data"].indexOf(k) === -1) obj[k] = p[k];
  }
  return obj;
}
function now() {
  return Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd HH:mm");
}
function low(v) {
  return String(v || "").trim().toLowerCase();
}

/* ============================ SETUP / MANTENIMIENTO ====================== */

// Copia de seguridad MANUAL (ya no hay copias automáticas): duplica la planilla
// en la carpeta "Backups Suple Market" de tu Drive y conserva las últimas 30.
function backupAhora() {
  var file = DriveApp.getFileById(ss().getId());
  var folders = DriveApp.getFoldersByName("Backups Suple Market");
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("Backups Suple Market");
  var stamp = Utilities.formatDate(new Date(), "America/Argentina/Buenos_Aires", "yyyy-MM-dd HH:mm");
  file.makeCopy("Backup Suple Market " + stamp, folder);
  // Conserva las 30 más nuevas
  var copias = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var c = it.next();
    if (c.getName().indexOf("Backup Suple Market ") === 0) copias.push(c);
  }
  copias.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  for (var i = 30; i < copias.length; i++) copias[i].setTrashed(true);
  return copias.length;
}

// Ejecutar UNA vez desde el editor (▶ quitarBackupsAutomaticos):
//  - borra los disparadores de copias diarias (había quedado uno repetido);
//  - deja UN disparador diario para el mail de avisos (solo manda algo si hubo
//    errores, pagos para revisar o la planilla se acerca al límite).
// Las copias que ya están en Drive NO se tocan (podés borrarlas a mano).
// Si alguna vez querés una copia, ejecutá ▶ backupAhora.
function quitarBackupsAutomaticos() {
  var quitados = 0, hayResumen = false;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === "backupDiario") { ScriptApp.deleteTrigger(t); quitados++; }
    else if (h === "resumenDiario") hayResumen = true;
  });
  if (!hayResumen) ScriptApp.newTrigger("resumenDiario").timeBased().everyDays(1).atHour(9).create();
  var msg = "Copias automáticas quitadas: " + quitados + " · Mail de avisos " + (hayResumen ? "ya estaba" : "programado (9 am)");
  Logger.log(msg);
  try { SpreadsheetApp.getActive().toast(msg, "Suple Market", 8); } catch (e) {}
  return msg;
}

// Por si un disparador viejo de copias llega a correr antes de quitarlo: ya no copia nada.
function backupDiario() {
  try { resumenDiario(); } catch (e) { registrarError("resumenDiario", e, {}); }
}

// Ejecutar UNA vez desde el editor (▶ tareasPendientes). Hace los pendientes:
//  1) borra los pedidos de prueba "PRUEBA CLAUDE (borrar)" (quedan en Papelera
//     y, si habían descontado stock, lo repone);
//  2) actualiza los encabezados de Pedidos;
// Es seguro repetirla: si no hay nada que hacer, no cambia nada.
// Pedidos creados por pruebas automáticas (13/10/2026) contra la versión vieja.
var IDS_PRUEBA = ["ped1791863284000", "hack"];

function tareasPendientes() {
  var sh = sheetFor("Pedidos");
  var keys = keysOf("Pedidos");
  var iCli = keys.indexOf("cliente");
  var data = sh.getDataRange().getValues();
  var borrados = 0;
  for (var r = data.length - 1; r >= 1; r--) {
    var idFila = String(data[r][keys.indexOf("id")] || "");
    if (String(data[r][iCli] || "").toUpperCase().indexOf("PRUEBA CLAUDE") !== -1 ||
        IDS_PRUEBA.indexOf(idFila) !== -1) {
      reponerStockPedido(r + 1);
      guardarEnPapelera("Pedidos", r + 1);
      sh.deleteRow(r + 1);
      borrados++;
    }
  }
  writeHeader(sh, "Pedidos");
  // Cliente de prueba registrado con email inválido
  var shC = sheetFor("Clientes");
  var kC = keysOf("Clientes");
  var dC = shC.getDataRange().getValues();
  for (var rc = dC.length - 1; rc >= 1; rc--) {
    if (low(dC[rc][kC.indexOf("email")]) === "no-es-email") {
      guardarEnPapelera("Clientes", rc + 1);
      shC.deleteRow(rc + 1);
      borrados++;
    }
  }
  borrarCacheCatalogo();
  var msg = "Filas de prueba borradas: " + borrados;
  Logger.log(msg);
  try { SpreadsheetApp.getActive().toast(msg, "Suple Market", 8); } catch (e) {}
  return msg;
}

function setup() {
  var book = ss();
  Object.keys(TABLES).forEach(function (tab, idx) {
    var sh = book.getSheetByName(tab);
    if (!sh) {
      if (idx === 0 && book.getSheets().length === 1) sh = book.getSheets()[0].setName(tab);
      else sh = book.insertSheet(tab);
    }
    writeHeader(sh, tab);
  });
  seedCategorias();
  SpreadsheetApp.getActive().toast("Listo: pestañas creadas.", "NutriPointMarket", 5);
}

// Reescribe SOLO la pestaña Productos con las columnas correctas y la deja
// VACÍA (los productos los cargás vos). Útil si venías de un formato viejo.
// PELIGRO: borra todos los productos. Para ejecutarla hay que crear antes la
// propiedad del script PERMITIR_RESET = "si" (y borrarla después).
function resetProductos_BORRA_TODO() {
  if (PropertiesService.getScriptProperties().getProperty("PERMITIR_RESET") !== "si") {
    throw new Error("Bloqueado: creá la propiedad PERMITIR_RESET = si para habilitarlo.");
  }
  var sh = ss().getSheetByName("Productos");
  if (!sh) sh = ss().insertSheet("Productos");
  sh.clear();
  writeHeader(sh, "Productos");
  SpreadsheetApp.getActive().toast("Pestaña Productos lista (vacía).", "NutriPointMarket", 5);
}

// Escribe (o actualiza) SOLO la fila de encabezados de Pedidos, sin tocar los
// datos. Ejecutar una vez después de agregar la columna "Cobrado".
function encabezadosPedidos() {
  writeHeader(sheetFor("Pedidos"), "Pedidos");
  SpreadsheetApp.getActive().toast("Encabezados de Pedidos actualizados (incluye Cobrado, Email y Club).", "Suple Market", 5);
}

function writeHeader(sh, tab) {
  var titles = TABLES[tab].columns.map(function (c) {
    return c[1];
  });
  sh.getRange(1, 1, 1, titles.length).setValues([titles]);
  sh.getRange(1, 1, 1, titles.length)
    .setFontWeight("bold")
    .setBackground("#0C1E33")
    .setFontColor("#FFFFFF");
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, titles.length);
}

// Ejecutá esta función UNA vez y aceptá el permiso "Conectarse a un servicio
// externo". Sirve para autorizar los pedidos a internet (Mercado Pago, GitHub).
// Después republicá: Implementar → Administrar implementaciones → Versión nueva.
function autorizar() {
  var r = UrlFetchApp.fetch("https://api.mercadopago.com/", { muteHttpExceptions: true });
  Logger.log("Autorización OK. Respuesta de Mercado Pago: " + r.getResponseCode());
  return r.getResponseCode();
}

// Función opcional para setear el PIN del CRM y NO dejarlo en el código.
// Cambiá el valor, ejecutala UNA vez, y después volvé a poner "" para no dejarlo.
function setCrmPin() {
  var PIN = ""; // ← poné el PIN acá, ejecutá, y luego borralo
  if (PIN) {
    PropertiesService.getScriptProperties().setProperty("CRM_PIN", String(PIN));
    SpreadsheetApp.getActive().toast("PIN del CRM configurado.", "NutriPointMarket", 4);
  }
}
