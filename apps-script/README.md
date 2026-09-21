# Backend de NutriPointMarket (Google Apps Script)

Este es el "puente" entre la planilla de Google Sheets (la base de datos) y la tienda web / el CRM.

## Cómo se publican los productos

- Los productos se cargan **enteros desde la planilla** (pestaña **Productos**). Agregás una fila y aparece en la web. No hay productos en el código.
- Columnas (en este orden): **Nombre · Marca · Categoría · Precio · Precio ML · Variantes · Stock · Destacado**.
  - **Categoría**: usá una de las categorías de la tienda (Proteínas, Creatinas, Pre entreno, Aminoácidos, Vitaminas, Minerales, Colágeno, Barras y snacks, Combos).
  - **Precio ML**: precio tachado (si es mayor al Precio, se muestra el % OFF). Dejalo vacío si no hay oferta.
  - **Variantes**: sabores separados por coma (ej: `Vainilla, Chocolate`).
  - **Stock** y **Destacado**: `sí` / `no`.
- Podés cargar/editar productos desde el **CRM** (/admin → Productos) o directo en la planilla.
- Si la pestaña Productos tiene un formato viejo, ejecutá una vez la función **`resetProductos`** para dejarla con estas columnas (vacía).

- **Planilla**: https://docs.google.com/spreadsheets/d/12paAzW6OcSgYv4u6L7QVI4tpvrEx1yqnujW0OjcieMc/
- **Código**: [`Codigo.gs`](./Codigo.gs)

## 🚀 Puesta en marcha (una sola vez)

1. Abrí la planilla en Google Sheets.
2. Menú **Extensiones → Apps Script**.
3. Borrá lo que haya y **pegá todo** el contenido de `Codigo.gs`.
4. Guardá (💾).
5. Elegí la función **`setup`** en el selector de arriba y tocá **▶ Ejecutar**.
   - Google va a pedir permisos → **Revisar permisos** → elegí tu cuenta →
     "Configuración avanzada" → "Ir a NutriPointMarket (no seguro)" → **Permitir**.
     (Es tu propio script, es seguro.)
   - Esto crea las pestañas (Productos, Clientes, Pedidos, Seguimientos,
     Eventos) y carga los 18 productos de ejemplo.
6. **Publicar como app web**: botón **Deploy → Nuevo despliegue**.
   - Tipo (⚙️): **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier persona**.
   - **Desplegar** → copiá la **URL** que termina en `/exec`.
7. Pasale esa URL a Claude para conectar la tienda.

## 🔄 Cuando cambie el código

**Guardar NO publica.** Para aplicar cambios:
Deploy → **Administrar despliegues** → ✏️ editar → Versión: **Nueva versión** → **Desplegar**.

Verificá con: `TU_URL/exec?action=version` (debe devolver `{"ok":true,"version":"v1"}`).

## 📡 Acciones de la API

Lecturas (desde la web con JSONP, agregando `&callback=nombre`):
- `?action=version`
- `?action=productos_list` → lista de productos
- `?action=list&tab=Clientes` (o Pedidos, Seguimientos)

Escrituras:
- `?action=productos_save` + `data=` (JSON del producto)
- `?action=add&tab=Pedidos` + campos
- `?action=update&tab=Productos&id=np-001` + campos
- `?action=delete&tab=Pedidos&id=...`
- `?action=registrar` / `?action=login` (cuentas de clientes)
- `?action=evento_add` (analytics)
