"use client";

import { useEffect, useRef, useState } from "react";

// Shown from the register form so a new seller reads the actual terms
// (not just a checkbox next to a link they never open) before accepting.
// "Acepto" stays disabled until they've scrolled to the end — best
// practice for proving actual (not just clicked-through) consent, and
// worth more than the checkbox alone if this ever needs to be defended.
// Clicking "Acepto" both checks the box on the form AND closes this modal
// — the checkbox itself stays visually checked afterward as confirmation.
export default function TermsAcceptanceModal({
  onAccept,
  onClose,
}: {
  onAccept: () => void;
  onClose: () => void;
}) {
  const [reachedEnd, setReachedEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkReachedEnd = (el: HTMLDivElement) => {
    // 4px slack for sub-pixel rounding across browsers/zoom levels.
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
      setReachedEnd(true);
    }
  };

  // If the text already fits without scrolling (short text, tall viewport),
  // there's nothing to scroll TO — don't leave the button permanently
  // disabled in that case, that would just be a dead end for the user.
  useEffect(() => {
    if (scrollRef.current) checkReachedEnd(scrollRef.current);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card-bg-solid border border-card-border rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-6 border-b border-card-border">
          <h3 className="font-heading text-base font-bold text-foreground">
            Términos y Condiciones de Uso de CompraventaOnline
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-foreground text-lg cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        <div
          ref={scrollRef}
          onScroll={(e) => checkReachedEnd(e.currentTarget)}
          className="overflow-y-auto p-6 flex flex-col gap-4 text-xs text-text-muted leading-relaxed"
        >
          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Naturaleza del Servicio</h4>
            <p>
              CompraventaOnline actúa exclusivamente como un servicio de intermediación tecnológica
              y plataforma de contacto entre vendedores y compradores. CompraventaOnline no es
              dueño, propietario, ni poseedor de los productos publicados, ni participa en la
              cadena de distribución o venta física.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Responsabilidad</h4>
            <p>
              La responsabilidad por la calidad, garantía, veracidad de la descripción y entrega
              del producto recae 100% sobre el vendedor.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Proceso de Pago</h4>
            <p>
              Los pagos se procesan a través de proveedores externos (Mercado Pago). Al utilizar
              el sistema de cuotas, el usuario acepta que la plataforma aplica un cargo de gestión
              por servicio de intermediación y financiamiento.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Liberación de Fondos</h4>
            <p>
              La plataforma implementa un sistema de protección al comprador. El dinero de la
              transacción permanecerá retenido por el procesador de pagos hasta que el comprador
              confirme la recepción del producto o se cumpla el plazo de seguridad establecido.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Garantía</h4>
            <p>
              CompraventaOnline no garantiza la resolución de controversias entre las partes,
              aunque se reserva el derecho de mediar y aplicar sanciones (suspensión de cuentas)
              a vendedores que incumplan sus obligaciones.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Aceptación</h4>
            <p>
              Al hacer clic en &quot;Registrarse&quot;, el usuario declara haber leído,
              comprendido y aceptado la totalidad de estos términos.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 border-t border-card-border">
          {!reachedEnd && (
            <p className="text-center text-[10px] font-semibold text-text-muted">
              Desplazate hasta el final para poder aceptar.
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-card-border py-3 text-xs font-bold text-foreground hover:border-accent-gold transition-all cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={onAccept}
              disabled={!reachedEnd}
              className="flex-1 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
            >
              Acepto los Términos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
