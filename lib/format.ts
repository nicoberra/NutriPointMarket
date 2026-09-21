/** Formatea un número como precio en pesos argentinos. */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Calcula el valor de cada cuota (sin interés, solo maqueta). */
export function installment(value: number, count: number = 12): string {
  return formatPrice(Math.round(value / count));
}

/** Descuento porcentual entre precio viejo y actual. */
export function discountPercent(price: number, oldPrice?: number): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
