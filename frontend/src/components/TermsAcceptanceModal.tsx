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
            Términos y Condiciones de CompraVentaOnline
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
            <h4 className="text-xs font-bold text-foreground mb-1">Naturaleza del servicio</h4>
            <p>
              CompraVentaOnline es una plataforma de clasificados que conecta compradores y
              vendedores. No es propietaria de los productos publicados y, salvo un servicio
              particular que se indique expresamente, no administra el pago ni la entrega. Esas
              condiciones las acuerdan las partes entre sí.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Capacidad</h4>
            <p>
              Solo pueden registrarse y operar personas mayores de 18 años con capacidad legal
              para contratar. No está permitido el uso de la plataforma por menores de edad,
              aunque cuenten con autorización de un adulto.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Validación de identidad</h4>
            <p>
              Para publicar, vender o usar determinadas funciones de compra y contacto comercial
              debés completar la validación de identidad. Debés usar datos y documentación
              auténticos de tu propia identidad. Una cuenta validada no garantiza la conducta de
              la otra parte.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Publicaciones y operaciones</h4>
            <p>
              Sos responsable de la veracidad de tus publicaciones (fotos, precio real, estado y
              disponibilidad). CompraVentaOnline puede limitar, pausar o eliminar publicaciones y
              aplicar sanciones ante fraude, productos prohibidos o incumplimientos.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Responsabilidad</h4>
            <p>
              La plataforma no garantiza existencia, calidad, autenticidad, legalidad ni
              cumplimiento del pago o la entrega. Cada usuario evalúa la operación antes de
              concretarla. CompraVentaOnline responde por sus propios servicios en el alcance de
              la legislación argentina.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground mb-1">Aceptación</h4>
            <p>
              Al registrarte declarás haber leído y aceptado estos Términos y Condiciones (versión
              vigente 31 de agosto de 2026), la Declaración de Privacidad y las políticas
              complementarias. El texto completo está en compraventaonline.com.ar/terms.
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
              className="flex-1 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover py-3 text-xs font-extrabold text-white shadow-md hover:opacity-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
            >
              Acepto los Términos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
