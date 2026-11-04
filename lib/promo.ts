"use client";

import { useEffect, useState } from "react";
import { promoDestacadosActiva } from "./config";

/**
 * ¿Mostrar la etiqueta de la promo de destacados (Cyber Week)? Se decide en el
 * navegador después de montar, así el HTML estático (generado en el build) no
 * difiere del cliente cuando la promo ya terminó.
 */
export function usePromoDestacados(): boolean {
  const [activa, setActiva] = useState(false);
  useEffect(() => {
    setActiva(promoDestacadosActiva());
  }, []);
  return activa;
}
