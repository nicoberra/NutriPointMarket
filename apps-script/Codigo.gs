/* ============================================================================
 * NUTRIPOINTMARKET · BACKEND (Google Apps Script)
 * ----------------------------------------------------------------------------
 * API entre la planilla de Google Sheets y la tienda / el CRM.
 *
 * MODELO DE PRODUCTOS (importante):
 *   - El CATÁLOGO (nombre, categoría, descripción, fotos, sabores) vive en el
 *     código de la web (data/products.ts). Casi no cambia.
 *   - La PLANILLA guarda solo lo que cambia seguido: Precio, Stock (sí/no),
 *     Precio ML (precio tachado, opcional) y Destacado (sí/no).
 *   - La web cruza ambos por el NOMBRE del producto (tiene que coincidir EXACTO).
 *
 * PUESTA EN MARCHA (una vez): Extensiones → Apps Script → pegar esto → guardar →
 * ejecutar `setup` (autorizar) → Deploy → Aplicación web (Ejecutar como: Yo /
 * Acceso: Cualquier usuario) → copiar la URL /exec.
 * Al cambiar el código: Deploy → Administrar implementaciones → editar → Versión
 * nueva → Desplegar. (Guardar NO publica.)
 * ============================================================================ */

var SHEET_ID = "12paAzW6OcSgYv4u6L7QVI4tpvrEx1yqnujW0OjcieMc";
var API_VERSION = "v2";

// Repo de GitHub donde se guardan las fotos de productos (en public/productos/).
// El token NO va acá: se guarda en Propiedades del script como GITHUB_TOKEN.
var GITHUB_REPO = "nicoberra/NutriPointMarket";
var GITHUB_BRANCH = "main";

// Dominio del sitio (para las páginas de retorno de Mercado Pago).
var SITE_URL = "https://suplemarket.com.ar";

/* ----------------------------- ESQUEMA DE TABLAS -------------------------- */

var TABLES = {
  Productos: {
    // Fuente COMPLETA de productos. Vos agregás filas acá y aparecen en la web.
    // La clave (para actualizar) es "nombre".
    columns: [
      ["nombre", "Nombre"],
      ["marca", "Marca"],
      ["categoria", "Categoría"],
      ["precio", "Precio"],
      ["precioML", "Precio ML"],
      ["variantes", "Variantes"],
      ["stock", "Stock"],
      ["destacado", "Destacado"],
      ["costo", "Costo"],
      ["costoMoneda", "Costo moneda"],
      ["imagen", "Imagen"],
      ["cantidad", "Cantidad"],
    ],
    idField: "nombre",
  },
  Categorias: {
    // Categorías de la tienda, editables desde el CRM. La clave es "nombre".
    columns: [
      ["nombre", "Nombre"],
      ["orden", "Orden"],
    ],
    idField: "nombre",
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
    switch (action) {
      case "version":
        out = { ok: true, version: API_VERSION };
        break;
      case "productos_list":
        out = { ok: true, data: listProductos() };
        break;
      case "productos_save":
        out = { ok: true, data: saveProducto(parseData(p)) };
        break;
      case "list":
        out = { ok: true, data: listTable(p.tab) };
        break;
      case "add":
        out = { ok: true, data: addRow(p.tab, parseData(p)) };
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
      case "subir_imagen":
        out = subirImagen(p);
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
      case "evento_add":
        out = { ok: true, data: addRow("Eventos", parseData(p)) };
        break;
      default:
        out = { ok: false, error: "Acción desconocida: " + action };
    }
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return respond(out, p.callback);
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

function ss() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}
function sheetFor(tab) {
  var sh = ss().getSheetByName(tab);
  if (!sh) throw new Error("No existe la pestaña: " + tab);
  return sh;
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
  if (tab === "Clientes") {
    var existing = findClienteRow(obj);
    if (existing > 0) return updateRowByNumber(tab, existing, obj);
  }
  if (TABLES[tab].idField === "id" && !obj.id) obj.id = "id" + Date.now();
  if (keys.indexOf("fecha") !== -1 && !obj.fecha) obj.fecha = now();
  var line = keys.map(function (k) {
    return sanitize(k, obj[k]);
  });
  sh.appendRow(line);
  return obj;
}

function updateRow(tab, id, obj) {
  var n = findRowById(tab, id);
  if (n < 0) throw new Error("No se encontró: " + id);
  return updateRowByNumber(tab, n, obj);
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
  sheetFor(tab).deleteRow(n);
  return { deleted: id };
}

function findRowById(tab, id) {
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
  return value;
}

function cleanPhone(v) {
  return String(v).replace(/^[+\-=@]+\s*/, "").trim();
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
function listProductos() {
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
    });
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
  var n = findRowById("Productos", p.nombre);
  if (n > 0) updateRowByNumber("Productos", n, { imagen: url });
  else addRow("Productos", { nombre: p.nombre, imagen: url });
  return { ok: true, url: url };
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

/* ----------------------------- Mercado Pago ------------------------------ */

// Crea una preferencia de pago (Checkout Pro) y devuelve el link (init_point).
// El Access Token va en Propiedades del script como MP_ACCESS_TOKEN (NO en el
// código ni en la web).
function mpCrearPreferencia(p) {
  var token = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
  if (!token) return { ok: false, error: "Falta MP_ACCESS_TOKEN en Propiedades del script" };
  var monto = Number(p.monto) || 0;
  if (monto <= 0) return { ok: false, error: "Monto inválido" };
  var exec = "";
  try { exec = ScriptApp.getService().getUrl(); } catch (e0) {}

  var pref = {
    items: [
      {
        title: String(p.titulo || "Pedido Suple Market"),
        quantity: 1,
        unit_price: monto,
        currency_id: "ARS",
      },
    ],
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

    var ref = pay.external_reference;
    if (pay.status === "approved" && ref) {
      var n = findRowById("Pedidos", ref);
      if (n > 0) updateRowByNumber("Pedidos", n, { estado: "pagado" });
    }
    return { ok: true };
  } catch (err) {
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
    descontarProducto(items[i].n, Number(items[i].q) || 0);
  }
  updateRowByNumber("Pedidos", n, { estado: "pagado", descontado: "sí" });
  return { ok: true, descontados: items.length };
}

// Baja la cantidad de un producto (por nombre) y, si llega a 0, lo marca sin stock.
function descontarProducto(nombre, cant) {
  if (!nombre || !cant || cant <= 0) return;
  var n = findRowById("Productos", nombre);
  if (n < 0) return;
  var sh = sheetFor("Productos");
  var keys = keysOf("Productos");
  var iCant = keys.indexOf("cantidad");
  var iStock = keys.indexOf("stock");
  var actual = Number(sh.getRange(n, iCant + 1).getValue()) || 0;
  var nuevo = Math.max(0, actual - cant);
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
      if (low(data[r][iCat]) === low(from)) sh.getRange(r + 1, iCat + 1).setValue(to);
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
  if (findClienteRow({ email: obj.email }) > 0)
    return { ok: false, error: "Ya existe una cuenta con ese email" };
  addRow("Clientes", {
    nombre: obj.nombre || "",
    email: obj.email,
    telefono: obj.telefono || "",
    origen: obj.origen || "web",
    clave: hash(obj.password),
  });
  return { ok: true, user: { nombre: obj.nombre || "", email: obj.email } };
}

function login(email, password) {
  if (!email || !password) return { ok: false, error: "Faltan datos" };
  var sh = sheetFor("Clientes");
  var keys = keysOf("Clientes");
  var data = sh.getDataRange().getValues();
  var iEmail = keys.indexOf("email"),
    iClave = keys.indexOf("clave"),
    iNom = keys.indexOf("nombre");
  for (var r = 1; r < data.length; r++) {
    if (low(data[r][iEmail]) === low(email)) {
      if (String(data[r][iClave]) === hash(password))
        return { ok: true, user: { nombre: data[r][iNom], email: data[r][iEmail] } };
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
  return { ok: String(pin || "").trim() === String(stored).trim() };
}

function hash(txt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "npm::" + txt);
  return raw
    .map(function (b) {
      return ("0" + (b & 0xff).toString(16)).slice(-2);
    })
    .join("");
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
function resetProductos() {
  var sh = ss().getSheetByName("Productos");
  if (!sh) sh = ss().insertSheet("Productos");
  sh.clear();
  writeHeader(sh, "Productos");
  SpreadsheetApp.getActive().toast("Pestaña Productos lista (vacía).", "NutriPointMarket", 5);
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
