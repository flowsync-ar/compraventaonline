"use client"

import { PRICE_RISK, type PriceIntegrityResult } from "@/lib/priceIntegrity/types"

interface Props {
  analysis: PriceIntegrityResult
  formattedPrice: string
  onEdit: () => void
  onConfirm: () => void
}

export default function PriceRiskConfirmModal({ analysis, formattedPrice, onEdit, onConfirm }: Props) {
  const high = analysis.risk === PRICE_RISK.HIGH

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-risk-title"
        className="w-full max-w-md rounded-2xl glass-panel border border-card-border p-6 shadow-2xl"
      >
        <h3 id="price-risk-title" className="font-heading text-base font-bold text-foreground">
          {high ? "Confirmá el precio publicado" : "¿Seguro que este es el precio correcto?"}
        </h3>
        <p className="text-xs text-text-muted mt-2 leading-relaxed">
          {high
            ? `Estás por publicar este producto a ${formattedPrice}. Los compradores van a ver este valor como el precio informado por vos.`
            : "Detectamos que el precio ingresado parece inusual. Verificá el importe antes de publicar."}
        </p>
        <p className="text-lg font-extrabold text-foreground mt-4">{formattedPrice}</p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-card-border hover:bg-card-bg/20 px-4 py-3 text-xs font-bold text-foreground transition-all cursor-pointer min-h-11"
          >
            {high ? "Volver y editar" : "Editar precio"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-4 py-3 text-xs font-extrabold text-white shadow-md hover:opacity-95 transition-all cursor-pointer min-h-11"
          >
            {high ? `Confirmar ${formattedPrice}` : "Confirmar y continuar"}
          </button>
        </div>
      </div>
    </div>
  )
}
