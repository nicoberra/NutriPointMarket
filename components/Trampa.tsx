/**
 * Campo trampa contra bots (honeypot). Una persona no lo ve ni lo completa;
 * los bots que llenan todos los campos sí, y el servidor rechaza ese envío.
 * Fuera de pantalla (no display:none, que algunos bots detectan), sin tab ni
 * autocompletado, y oculto para lectores de pantalla.
 */
export const CAMPO_TRAMPA = "hp_sm";

export function Trampa() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        No completar
        <input type="text" name={CAMPO_TRAMPA} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** Valor del campo trampa de un formulario ("" si una persona lo envió). */
export function leerTrampa(form: HTMLFormElement | null | undefined): string {
  const el = form?.elements.namedItem(CAMPO_TRAMPA);
  return el instanceof HTMLInputElement ? el.value : "";
}
