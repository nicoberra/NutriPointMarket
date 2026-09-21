# NutriPointMarket 🏋️

Prototipo de tienda online de **suplementos deportivos**, construido con **Next.js 14 (App Router) + TypeScript + Tailwind CSS**.

Es un primer boceto **completo y funcional**, pensado para modificarse fácilmente (colores, logo, productos, banners, textos).

## 🚀 Cómo correrlo

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

Otros comandos:

```bash
npm run build   # compilar para producción
npm run start   # servir el build
```

## 🎨 Cómo cambiar el branding (lo más importante)

Casi todo el diseño se controla desde **un solo archivo**:

- **`app/globals.css`** → colores, tipografías, bordes y sombras (variables CSS).
  Cambiá los valores en `:root` y todo el sitio se actualiza. Los colores están en
  formato `R G B` (ej: `--color-accent: 46 213 115;`).

Otros puntos de personalización rápida:

- **`lib/config.ts`** → nombre del negocio, WhatsApp (`WHATSAPP_NUMBER`), teléfono,
  email, dirección, Instagram, mensajes de la barra promo, menú de navegación y
  enlaces del footer.
- **`components/Logo.tsx`** → logotipo tipográfico provisorio (reemplazable por imagen).
- **`data/products.ts`**, **`data/categories.ts`**, **`data/brands.ts`** → catálogo demo.

## 📁 Estructura

```
app/                # Rutas (App Router)
  page.tsx          # Home
  productos/        # Catálogo con filtros
  producto/[slug]/  # Ficha de producto
  ofertas/          # Ofertas
  marcas/           # Marcas
  contacto/         # Contacto + FAQ
  cuenta/           # Login / registro / favoritos (demo)
  carrito/          # Carrito completo
  checkout/         # Checkout (demo)
components/         # Componentes reutilizables (Header, ProductCard, etc.)
context/            # Estado global (carrito + auth demo)
data/               # Productos, categorías y marcas de demostración
lib/                # Config, tipos y helpers
```

## 🔌 Estado actual (demo)

- **Cuentas de usuario**: funcionan en modo demo con `localStorage`
  (`context/AuthContext.tsx`). Listo para conectar a un backend real más adelante.
- **Carrito y favoritos**: persisten en `localStorage`.
- **Checkout / newsletter / contacto**: formularios de demostración (no procesan datos).
- **Imágenes**: por ahora son visuales generados por SVG (`components/ProductVisual.tsx`).
  Reemplazables por fotos reales.

## 📝 Próximos pasos sugeridos

- Reemplazar el logo y ajustar la paleta definitiva.
- Cargar productos e imágenes reales.
- Conectar cuentas, checkout y newsletter a un backend.
