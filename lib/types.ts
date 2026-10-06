/**
 * Slug de categoría. Antes era un enum fijo; ahora las categorías se cargan
 * desde la planilla (editables desde el CRM), así que es un string libre
 * (se genera con slugify del nombre).
 */
export type CategorySlug = string;

export interface Category {
  slug: CategorySlug;
  name: string;
  /** Texto corto para la card de categoría */
  tagline: string;
  /** Forma del ícono/visual placeholder */
  shape: ProductShape;
  /** Foto real de la categoría (URL de GitHub), cargada desde el CRM. */
  image?: string;
}

export interface Brand {
  slug: string;
  name: string;
  /** Iniciales/etiqueta mostrada en el logo placeholder */
  label: string;
}

/** Formas de los visuales placeholder de producto */
export type ProductShape = "tub" | "jar" | "bottle" | "pills" | "bar" | "combo";

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string; // slug de la marca
  category: CategorySlug;
  description: string;
  /** Modo de uso (opcional, editable desde el CRM). */
  usage?: string;
  /** Información nutricional (opcional; si está vacío no se muestra). */
  nutrition?: string;
  /** Ingredientes (opcional; si está vacío no se muestra). */
  ingredients?: string;
  /** Si es un combo: productos que lo componen y cuántos de cada uno. */
  combo?: { n: string; q: number }[];
  price: number;
  oldPrice?: number;
  /** Porcentaje de descuento (0 si no tiene). Se puede calcular pero se guarda para control manual */
  discount: number;
  /** Nombres de imágenes / referencias. Como aún no hay fotos, usamos visuales generados. */
  images: string[];
  /** Foto principal (primera de la galería). */
  image?: string;
  /** Fotos por variante: { "Rojo": ["url1","url2"], "Azul": ["url"] }. */
  variantImages?: Record<string, string[]>;
  stock: number;
  /** Hay stock (viene de la planilla: Stock sí/no). Por defecto true. */
  inStock?: boolean;
  /** Cantidad de unidades en stock (columna Cantidad de la planilla). */
  stockQty?: number;
  flavors: string[];
  /** Variantes con su stock (null = sin seguimiento de stock para esa variante). */
  variants?: { name: string; qty: number | null }[];
  presentations?: string[];
  /** Costo (para calcular ganancia en el CRM). En la moneda de `costCurrency`. */
  cost?: number;
  costCurrency?: "USD" | "ARS";
  featured: boolean;
  bestSeller: boolean;
  freeShipping: boolean;
  /** Solo para maqueta */
  rating: number;
  reviews: number;
  isNew?: boolean;
}

export interface CartItem {
  key: string; // id + flavor + presentation
  product: Product;
  quantity: number;
  flavor?: string;
  /** Combos: variante elegida para cada producto que la tenga (nombre → variante). */
  comboChoices?: Record<string, string>;
  presentation?: string;
}
