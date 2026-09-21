/* ============================================================================
 * NUTRIPOINTMARKET · BACKEND (Google Apps Script)
 * ----------------------------------------------------------------------------
 * Este script funciona como API entre la planilla de Google Sheets (la base de
 * datos) y la tienda web / el futuro CRM.
 *
 * CÓMO USARLO (una sola vez):
 *   1. Abrí la planilla en Google Sheets.
 *   2. Menú: Extensiones → Apps Script.
 *   3. Borrá el contenido y pegá TODO este archivo.
 *   4. Guardá (💾) y ejecutá la función `setup` una vez (botón ▶ "Ejecutar").
 *      Google te va a pedir permisos: autorizá con tu cuenta.
 *      Eso crea las pestañas, los títulos y carga los productos de ejemplo.
 *   5. Deploy → "Nuevo despliegue" → tipo "Aplicación web":
 *        - Ejecutar como: Yo
 *        - Quién tiene acceso: Cualquier persona
 *      Copiá la URL que termina en /exec y pasásela a Claude para conectar la web.
 *
 * IMPORTANTE: cada vez que cambies el código, para que se aplique hay que hacer
 * Deploy → "Administrar despliegues" → editar (✏️) → "Versión nueva" → Desplegar.
 * (Guardar NO publica.) Por eso existe la acción `version`.
 * ============================================================================ */

// Identificador de la planilla (por las dudas; si el script está dentro de la
// planilla, usa la activa automáticamente).
var SHEET_ID = "12paAzW6OcSgYv4u6L7QVI4tpvrEx1yqnujW0OjcieMc";

// Cambiá este texto cuando publiques una versión nueva, para verificar el deploy.
var API_VERSION = "v1";

/* ----------------------------- ESQUEMA DE TABLAS -------------------------- */
// Para cada pestaña: los títulos "lindos" (fila 1) y la clave-API de cada columna.
// La clave-API es sin acentos ni espacios (es la que usan la web y el CRM).

var TABLES = {
  Productos: {
    columns: [
      ["id", "id"],
      ["slug", "slug"],
      ["name", "Nombre"],
      ["brand", "Marca"],
      ["category", "Categoría"],
      ["description", "Descripción"],
      ["price", "Precio"],
      ["oldPrice", "Precio anterior"],
      ["discount", "Descuento %"],
      ["flavors", "Sabores"],
      ["presentations", "Presentaciones"],
      ["stock", "Stock"],
      ["featured", "Destacado"],
      ["bestSeller", "Más vendido"],
      ["freeShipping", "Envío gratis"],
      ["isNew", "Nuevo"],
      ["rating", "Rating"],
      ["reviews", "Reviews"],
      ["images", "Imágenes"],
    ],
    idField: "id",
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
      ["clave", "Clave"], // hash de contraseña — NUNCA se expone en la API
    ],
    idField: "id",
    secret: ["clave"], // columnas que no se devuelven en las lecturas
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
    ],
    idField: "id",
  },
  Cotizaciones: {
    columns: [
      ["id", "id"],
      ["fecha", "Fecha"],
      ["cliente", "Cliente"],
      ["telefono", "Teléfono"],
      ["detalle", "Detalle"],
      ["monto", "Monto"],
      ["estado", "Estado"],
      ["notas", "Notas"],
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

// Campos de Productos que son numéricos / booleanos / listas (para parsear bien).
var PROD_NUMBER = ["price", "oldPrice", "discount", "stock", "rating", "reviews"];
var PROD_BOOL = ["featured", "bestSeller", "freeShipping", "isNew"];
var PROD_LIST = ["flavors", "presentations", "images"];

/* ================================ ROUTER ================================== */

function doGet(e) {
  return handle(e);
}
function doPost(e) {
  return handle(e);
}

function handle(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || "version";
  var out;

  try {
    switch (action) {
      case "version":
        out = { ok: true, version: API_VERSION };
        break;

      // --- Productos ---
      case "productos_list":
        out = { ok: true, data: listProductos() };
        break;
      case "productos_save":
        out = { ok: true, data: saveProducto(parseData(p)) };
        break;

      // --- CRUD genérico por pestaña: list/add/update/delete ---
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

      // --- Cuentas de clientes ---
      case "registrar":
        out = registrar(parseData(p));
        break;
      case "login":
        out = login(p.email, p.password);
        break;

      // --- Analytics ---
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

// Devuelve JSON, o JSONP si vino ?callback= (para que la web pueda leerlo sin CORS).
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

// Lee todas las filas de una pestaña como objetos {clave: valor}.
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
    if (row.join("") === "") continue; // saltar filas vacías
    var obj = {};
    for (var c = 0; c < keys.length; c++) {
      if (secret.indexOf(keys[c]) !== -1) continue; // no exponer secretos
      obj[keys[c]] = formatValue(row[c]);
    }
    rows.push(obj);
  }
  return rows;
}

// Formatea fechas y deja el resto tal cual.
function formatValue(v) {
  if (v instanceof Date) return Utilities.formatDate(v, "GMT-3", "yyyy-MM-dd HH:mm");
  return v;
}

/* ------------------------------- Escritura ------------------------------- */

function addRow(tab, obj) {
  if (!TABLES[tab]) throw new Error("Pestaña inválida: " + tab);
  var sh = sheetFor(tab);
  var keys = keysOf(tab);

  // Upsert de Clientes: no duplicar por email → DNI → nombre.
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
  if (n < 0) throw new Error("No se encontró id: " + id);
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
  if (n < 0) throw new Error("No se encontró id: " + id);
  sheetFor(tab).deleteRow(n);
  return { deleted: id };
}

function findRowById(tab, id) {
  var sh = sheetFor(tab);
  var keys = keysOf(tab);
  var idCol = keys.indexOf(TABLES[tab].idField);
  if (idCol < 0) return -1;
  var col = sh.getRange(2, idCol + 1, Math.max(sh.getLastRow() - 1, 0), 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]) === String(id)) return i + 2;
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
  if (PROD_LIST.indexOf(key) !== -1 && Array.isArray(value)) return value.join(", ");
  if (PROD_BOOL.indexOf(key) !== -1) return value === true || value === "true" || value === "TRUE";
  return value;
}

// Google Sheets interpreta como fórmula lo que empieza con + = - @  →  un
// teléfono "+54 9…" da #ERROR!. Sacamos el prefijo para poder pegar el número
// tal cual viene de WhatsApp.
function cleanPhone(v) {
  return String(v).replace(/^[+\-=@]+\s*/, "").trim();
}

/* ------------------------------ Productos -------------------------------- */

function listProductos() {
  var sh = sheetFor("Productos");
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var keys = keysOf("Productos");
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.join("") === "") continue;
    var o = {};
    for (var c = 0; c < keys.length; c++) o[keys[c]] = row[c];
    // Tipar valores
    PROD_NUMBER.forEach(function (k) {
      o[k] = o[k] === "" || o[k] === null ? (k === "oldPrice" ? null : 0) : Number(o[k]);
    });
    PROD_BOOL.forEach(function (k) {
      o[k] = o[k] === true || o[k] === "TRUE" || o[k] === "true" || o[k] === 1;
    });
    PROD_LIST.forEach(function (k) {
      o[k] = String(o[k] || "")
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(function (s) {
          return s;
        });
    });
    list.push(o);
  }
  return list;
}

function saveProducto(obj) {
  return addRowOrUpdate("Productos", obj);
}

function addRowOrUpdate(tab, obj) {
  if (obj.id && findRowById(tab, obj.id) > 0) return updateRow(tab, obj.id, obj);
  return addRow(tab, obj);
}

/* --------------------------- Cuentas de clientes -------------------------- */

function registrar(obj) {
  if (!obj.email || !obj.password) return { ok: false, error: "Faltan email o contraseña" };
  var existing = findClienteRow({ email: obj.email });
  if (existing > 0) return { ok: false, error: "Ya existe una cuenta con ese email" };
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
      if (String(data[r][iClave]) === hash(password)) {
        return { ok: true, user: { nombre: data[r][iNom], email: data[r][iEmail] } };
      }
      return { ok: false, error: "Contraseña incorrecta" };
    }
  }
  return { ok: false, error: "No existe una cuenta con ese email" };
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
  // Los datos pueden venir como JSON en ?data= o como parámetros sueltos.
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

/* ============================ SETUP (correr 1 vez) ======================== */
// Crea/formatea todas las pestañas con sus títulos y carga los productos demo.

function setup() {
  var book = ss();

  Object.keys(TABLES).forEach(function (tab, idx) {
    var sh = book.getSheetByName(tab);
    if (!sh) {
      // Reutilizar la primera hoja ("Hoja 1") para la primera tabla.
      if (idx === 0 && book.getSheets().length === 1) {
        sh = book.getSheets()[0].setName(tab);
      } else {
        sh = book.insertSheet(tab);
      }
    }
    var titles = TABLES[tab].columns.map(function (c) {
      return c[1];
    });
    sh.getRange(1, 1, 1, titles.length).setValues([titles]);
    sh.getRange(1, 1, 1, titles.length).setFontWeight("bold").setBackground("#0C1E33").setFontColor("#FFFFFF");
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, titles.length);
  });

  seedProductos(book.getSheetByName("Productos"));

  SpreadsheetApp.getActive().toast("Listo: pestañas creadas y productos cargados.", "NutriPointMarket", 5);
}

function seedProductos(sh) {
  if (sh.getLastRow() > 1) return; // ya tiene datos, no duplicar
  var keys = keysOf("Productos");
  var rows = SEED_PRODUCTS.map(function (p) {
    return keys.map(function (k) {
      var v = p[k];
      if (Array.isArray(v)) return v.join(", ");
      if (v === undefined || v === null) return "";
      return v;
    });
  });
  if (rows.length) sh.getRange(2, 1, rows.length, keys.length).setValues(rows);
}

// Productos de demostración (los mismos que muestra la web).
var SEED_PRODUCTS = [
  {id:"np-001",slug:"star-whey-protein-1kg",name:"Whey Protein 1 Kg",brand:"star-nutrition",category:"proteinas",description:"Proteína de suero de leche de rápida absorción, ideal para la recuperación muscular post entrenamiento. 24 g de proteína por porción.",price:38900,oldPrice:48625,discount:20,flavors:["Vainilla","Chocolate","Frutilla","Cookies & Cream"],presentations:["1 Kg","2 Kg"],stock:24,featured:true,bestSeller:true,freeShipping:true,isNew:false,rating:4.8,reviews:214,images:""},
  {id:"np-002",slug:"ena-true-made-whey-1kg",name:"True Made Whey Protein 1 Kg",brand:"ena",category:"proteinas",description:"Blend de proteínas premium con enzimas digestivas. Excelente perfil de aminoácidos para el desarrollo muscular.",price:44500,oldPrice:52350,discount:15,flavors:["Vainilla","Chocolate","Dulce de leche"],presentations:["1 Kg","2 Kg"],stock:18,featured:true,bestSeller:true,freeShipping:true,isNew:false,rating:4.7,reviews:176,images:""},
  {id:"np-003",slug:"star-creatina-monohidrato-300g",name:"Creatina Monohidrato 300 g",brand:"star-nutrition",category:"creatinas",description:"Creatina monohidrato micronizada de máxima pureza. Aumenta la fuerza y el rendimiento en entrenamientos de alta intensidad.",price:22400,oldPrice:26350,discount:15,flavors:[],presentations:["300 g","500 g"],stock:40,featured:true,bestSeller:true,freeShipping:false,isNew:false,rating:4.9,reviews:302,images:""},
  {id:"np-004",slug:"ena-creatina-micronizada-300g",name:"Creatina Micronizada 300 g",brand:"ena",category:"creatinas",description:"Creatina micronizada de fácil disolución. Mejora la potencia muscular y acelera la recuperación entre series.",price:24900,oldPrice:"",discount:0,flavors:[],presentations:["300 g"],stock:33,featured:true,bestSeller:false,freeShipping:false,isNew:false,rating:4.6,reviews:121,images:""},
  {id:"np-005",slug:"universal-pre-entreno-shock",name:"Pre Entreno Shock 300 g",brand:"universal",category:"pre-entreno",description:"Fórmula pre entreno con cafeína, beta alanina y citrulina para máxima energía, foco y bombeo muscular.",price:31200,oldPrice:39000,discount:20,flavors:["Frutos rojos","Sandía","Blue Raspberry"],presentations:["300 g"],stock:15,featured:true,bestSeller:true,freeShipping:true,isNew:false,rating:4.7,reviews:98,images:""},
  {id:"np-006",slug:"bsn-pre-entreno-nitro",name:"Pre Entreno Nitro 250 g",brand:"bsn",category:"pre-entreno",description:"Pre entreno de alto rendimiento con matriz energética avanzada. Ideal para entrenamientos exigentes.",price:36800,oldPrice:"",discount:0,flavors:["Fruit Punch","Uva"],presentations:["250 g"],stock:12,featured:false,bestSeller:false,freeShipping:false,isNew:true,rating:4.5,reviews:64,images:""},
  {id:"np-007",slug:"gold-bcaa-2000-120caps",name:"BCAA 2000 · 120 caps",brand:"gold-nutrition",category:"aminoacidos",description:"Aminoácidos ramificados en relación 2:1:1 para reducir el catabolismo y favorecer la recuperación muscular.",price:16800,oldPrice:19765,discount:15,flavors:[],presentations:["120 caps","240 caps"],stock:50,featured:true,bestSeller:false,freeShipping:false,isNew:false,rating:4.6,reviews:87,images:""},
  {id:"np-008",slug:"xbody-glutamina-300g",name:"Glutamina 300 g",brand:"xbody",category:"aminoacidos",description:"L-Glutamina pura para mejorar la recuperación, reforzar el sistema inmune y reducir el desgaste muscular.",price:19500,oldPrice:"",discount:0,flavors:[],presentations:["300 g"],stock:28,featured:false,bestSeller:false,freeShipping:false,isNew:false,rating:4.4,reviews:41,images:""},
  {id:"np-009",slug:"one-fit-multivitaminico-60caps",name:"Multivitamínico Complete 60 caps",brand:"one-fit",category:"vitaminas",description:"Complejo multivitamínico con minerales y antioxidantes para el bienestar general y el rendimiento diario.",price:14200,oldPrice:16700,discount:15,flavors:[],presentations:["60 caps"],stock:60,featured:true,bestSeller:true,freeShipping:false,isNew:false,rating:4.7,reviews:133,images:""},
  {id:"np-010",slug:"gold-vitamina-c-1000-90caps",name:"Vitamina C 1000 · 90 caps",brand:"gold-nutrition",category:"vitaminas",description:"Vitamina C de alta concentración para reforzar las defensas y favorecer la producción de colágeno.",price:11900,oldPrice:"",discount:0,flavors:[],presentations:["90 caps"],stock:45,featured:false,bestSeller:false,freeShipping:false,isNew:true,rating:4.5,reviews:58,images:""},
  {id:"np-011",slug:"one-fit-citrato-magnesio-450g",name:"Citrato de Magnesio 450 g",brand:"one-fit",category:"minerales",description:"Citrato de magnesio de alta biodisponibilidad. Ayuda a reducir la fatiga y mejorar la función muscular.",price:17300,oldPrice:20350,discount:15,flavors:["Naranja","Pomelo","Neutro"],presentations:["450 g"],stock:38,featured:true,bestSeller:true,freeShipping:false,isNew:false,rating:4.8,reviews:149,images:""},
  {id:"np-012",slug:"ena-zinc-magnesio-b6-120caps",name:"ZMB6 (Zinc + Magnesio + B6) 120 caps",brand:"ena",category:"minerales",description:"Combinación de zinc, magnesio y vitamina B6 para el descanso, la recuperación y el sistema hormonal.",price:15600,oldPrice:"",discount:0,flavors:[],presentations:["120 caps"],stock:30,featured:false,bestSeller:false,freeShipping:false,isNew:false,rating:4.6,reviews:72,images:""},
  {id:"np-013",slug:"mervick-colageno-hidrolizado-250g",name:"Colágeno Hidrolizado 250 g",brand:"mervick",category:"colageno",description:"Colágeno hidrolizado con vitamina C y ácido hialurónico. Favorece la piel, las articulaciones y los huesos.",price:21800,oldPrice:27250,discount:20,flavors:["Frutos rojos","Frutilla","Neutro"],presentations:["250 g","400 g"],stock:26,featured:true,bestSeller:true,freeShipping:true,isNew:false,rating:4.9,reviews:188,images:""},
  {id:"np-014",slug:"xbody-colageno-beauty-240g",name:"Colágeno Beauty 240 g",brand:"xbody",category:"colageno",description:"Colágeno con biotina y vitaminas para la belleza de la piel, el cabello y las uñas.",price:22900,oldPrice:"",discount:0,flavors:["Durazno","Limonada"],presentations:["240 g"],stock:20,featured:false,bestSeller:false,freeShipping:false,isNew:true,rating:4.5,reviews:54,images:""},
  {id:"np-015",slug:"star-protein-bar-caja-x12",name:"Protein Bar (Caja x12)",brand:"star-nutrition",category:"barras-snacks",description:"Barras proteicas con 20 g de proteína, ideales como colación saludable dentro y fuera del gimnasio.",price:18700,oldPrice:22000,discount:15,flavors:["Chocolate","Coco","Maní"],presentations:["Caja x12"],stock:35,featured:true,bestSeller:true,freeShipping:false,isNew:false,rating:4.6,reviews:96,images:""},
  {id:"np-016",slug:"one-fit-pasta-de-mani-500g",name:"Pasta de Maní 500 g",brand:"one-fit",category:"barras-snacks",description:"Pasta de maní natural, sin azúcar agregada. Fuente de grasas buenas y proteína vegetal.",price:8900,oldPrice:"",discount:0,flavors:["Natural","Con chocolate"],presentations:["500 g","1 Kg"],stock:48,featured:false,bestSeller:true,freeShipping:false,isNew:false,rating:4.7,reviews:110,images:""},
  {id:"np-017",slug:"combo-proteina-creatina",name:"Combo Proteína + Creatina",brand:"star-nutrition",category:"combos",description:"Whey Protein 1 Kg + Creatina Monohidrato 300 g. La dupla ideal para ganar fuerza y masa muscular a mejor precio.",price:56900,oldPrice:71120,discount:20,flavors:["Vainilla","Chocolate","Frutilla"],presentations:["Combo"],stock:14,featured:true,bestSeller:true,freeShipping:true,isNew:false,rating:4.9,reviews:142,images:""},
  {id:"np-018",slug:"combo-vitalidad-nutripoint",name:"Combo Vitalidad",brand:"one-fit",category:"combos",description:"Multivitamínico + Citrato de Magnesio + Vitamina C. Un combo pensado para tus defensas y tu energía diaria.",price:39900,oldPrice:49875,discount:20,flavors:[],presentations:["Combo"],stock:16,featured:true,bestSeller:false,freeShipping:true,isNew:false,rating:4.8,reviews:77,images:""}
];
