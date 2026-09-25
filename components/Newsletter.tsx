"use client";

import { useState } from "react";
import { MailIcon, CheckIcon } from "./Icons";

/** Bloque de newsletter antes del footer. */
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="container-page py-10 sm:py-14">
      <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-10 text-white sm:px-12 sm:py-14">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-xl text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent text-primary">
            <MailIcon className="h-6 w-6" />
          </span>
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            Sumate a Suple Market
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
            Recibí novedades, lanzamientos y descuentos exclusivos.
          </p>

          {done ? (
            <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-lg bg-accent/15 px-4 py-3 text-sm font-semibold text-accent">
              <CheckIcon className="h-5 w-5" /> ¡Gracias por sumarte! Revisá tu email.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setDone(true);
              }}
              className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu email"
                aria-label="Tu email"
                className="input h-12 flex-1"
              />
              <button type="submit" className="btn btn-primary btn-lg shrink-0">
                Quiero sumarme
              </button>
            </form>
          )}
          <p className="mt-3 text-[11px] text-white/50">
            Podés desuscribirte cuando quieras. (Formulario de demostración)
          </p>
        </div>
      </div>
    </section>
  );
}
