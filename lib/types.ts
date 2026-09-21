export type CategorySlug =
  | "proteinas"
  | "creatinas"
  | "pre-entreno"
  | "aminoacidos"
  | "vitaminas"
  | "minerales"
  | "colageno"
  | "barras-snacks"
  | "combos";

export interface Category {
  slug: CategorySlug;
  name: string;
  /** Texto corto para la card de categoría */
  tagline: string;
  /** Forma del ícono/visual placeholder */
  shape: ProductShape;
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
  price: number;
  oldPrice?: number;
  /** Porcentaje de descuento (0 si no tiene). Se puede calcular pero se guarda para control manual */
  discount: number;
  /** Nombres de imágenes / referencias. Como aún no hay fotos, usamos visuales generados. */
  images: string[];
  stock: number;
  /** Hay stock (viene de la planilla: Stock sí/no). Por defecto true. */
  inStock?: boolean;
  flavors: string[];
  presentations?: string[];
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
  presentation?: string;
}
