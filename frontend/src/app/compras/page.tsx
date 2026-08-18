"use client";

import { useState } from "react";
import Link from "next/link";

interface Purchase {
  id: string;
  date: string;
  status: "ENTREGADO" | "EN_CAMINO" | "CANCELADO";
  statusText: string;
  productId: string;
  productName: string;
  brand: string;
  price: number;
  quantity: number;
  image: string;
  sellerName: string;
  sellerPhone: string;
}

const mockPurchases: Purchase[] = [
  {
    id: "p1",
    date: "21 de junio de 2026",
    status: "ENTREGADO",
    statusText: "Entregado",
    productId: "l1",
    productName: "Miel Orgánica Pura del Caldenal",
    brand: "Pampeana Alta",
    price: 18500.0,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=600&auto=format&fit=crop",
    sellerName: "Apicultura La Fusta",
    sellerPhone: "2954-112233",
  },
  {
    id: "p2",
    date: "18 de junio de 2026",
    status: "EN_CAMINO",
    statusText: "En camino - Esperando coordinación de entrega",
    productId: "l2",
    productName: "Taladro Percutor Bosch 500W",
    brand: "Bosch",
    price: 125000.0,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=600&auto=format&fit=crop",
    sellerName: "Ferretería El Pampeano",
    sellerPhone: "2954-445566",
  },
  
  {
    id: "p4",
    date: "28 de abril de 2026",
    status: "CANCELADO",
    statusText: "Cancelado",
    productId: "l3",
    productName: "Sillón Retro Tapizado Pana Verde",
    brand: "Vintage",
    price: 85000.0,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?q=80&w=600&auto=format&fit=crop",
    sellerName: "Ramiro Tule (Particular)",
    sellerPhone: "2954-998877",
  },
];

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<"TODAS" | "EN_CAMINO" | "ENTREGADO" | "CANCELADO">("TODAS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // Filtrar las compras por pestaña activa y término de búsqueda
  const filteredPurchases = mockPurchases.filter((purchase) => {
    const matchesTab = activeTab === "TODAS" || purchase.status === activeTab;
    const matchesSearch = 
      purchase.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col gap-8">
      
      {/* Header section */}
      <div className="flex flex-col gap-2 border-b border-card-border pb-6">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Mis compras
        </h1>
        <p className="text-text-muted text-sm">
          Hacé el seguimiento de tus pedidos, contactá a tus vendedores o calificá tus transacciones realizadas en La Pampa.
        </p>
      </div>

      {/* Search & Tabs Row (Inspired by MercadoLibre) */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        
        {/* Tab Selector */}
        <div className="flex bg-card-bg border border-card-border p-1 rounded-xl overflow-x-auto max-w-full scrollbar-none whitespace-nowrap self-start">
          {[
            { id: "TODAS", label: "Todas" },
            { id: "EN_CAMINO", label: "En camino" },
            { id: "ENTREGADO", label: "Entregadas" },
            { id: "CANCELADO", label: "Canceladas" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-accent-blue text-background shadow-sm"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-sm text-text-muted select-none">
            🔍
          </span>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar compras por producto, marca o vendedor..."
            className="w-full bg-card-bg-solid border border-card-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent-gold"
          />
        </div>

      </div>

      {/* Purchases List */}
      <div className="flex flex-col gap-4">
        {filteredPurchases.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-card-border rounded-3xl flex flex-col items-center gap-2 bg-card-bg-solid">
            <span className="text-4xl">🛍️</span>
            <h3 className="font-heading text-sm font-bold text-foreground mt-2">No encontramos compras</h3>
            <p className="text-text-muted text-sm">
              No tenés compras registradas que coincidan con la búsqueda actual.
            </p>
            <Link 
              href="/search" 
              className="mt-4 rounded-xl bg-accent-gold px-5 py-2.5 text-sm font-extrabold text-background shadow-md hover:opacity-90 transition-all"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          filteredPurchases.map((purchase) => {
            const isDelivered = purchase.status === "ENTREGADO";
            const isPending = purchase.status === "EN_CAMINO";
            const isCancelled = purchase.status === "CANCELADO";

            return (
              <div 
                key={purchase.id}
                className="rounded-2xl border border-card-border bg-card-bg-solid p-5 flex flex-col gap-4 shadow-sm hover:border-card-border/80 transition-colors"
              >
                {/* Card Top: Date & Order info */}
                <div className="flex justify-between items-center border-b border-card-border/30 pb-3 text-xs text-text-muted">
                  <span>Comprado el {purchase.date}</span>
                  <span className="font-mono">ID Compra: #{purchase.id.toUpperCase()}</span>
                </div>

                {/* Card Body: Info and Action layout */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  
                  {/* Left Column: Image and details */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-card-border/20 border border-card-border/30 shrink-0">
                      <img 
                        src={purchase.image} 
                        alt={purchase.productName} 
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      
                      {/* Status indicator */}
                      <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide px-2.5 py-0.5 rounded-full w-fit ${
                        isDelivered 
                          ? "bg-accent-green/10 text-accent-green" 
                          : isPending 
                            ? "bg-accent-gold/10 text-accent-gold" 
                            : "bg-red-500/10 text-red-500"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          isDelivered ? "bg-accent-green animate-pulse" : isPending ? "bg-accent-gold animate-pulse" : "bg-red-500"
                        }`} />
                        {purchase.statusText}
                      </span>

                      <h3 className="font-heading text-base font-bold text-foreground leading-tight mt-1">
                        {purchase.productName}
                      </h3>
                      <p className="text-xs text-text-muted">
                        Marca: {purchase.brand} | Cantidad: {purchase.quantity}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Vendedor: <span className="font-bold text-foreground/80">{purchase.sellerName}</span>
                      </p>
                    </div>
                  </div>

                  {/* Middle Column: Price details */}
                  <div className="flex flex-col items-start md:items-end shrink-0">
                    <span className="text-xs text-text-muted uppercase font-semibold">Total abonado</span>
                    <span className="font-heading text-lg font-extrabold text-foreground mt-0.5">
                      ${(purchase.price * purchase.quantity).toLocaleString("es-AR")}
                    </span>
                  </div>

                  {/* Right Column: CTA Buttons */}
                  <div className="flex flex-wrap md:flex-col gap-2 w-full md:w-auto shrink-0 md:min-w-[150px]">
                    <button 
                      onClick={() => {
                        setSelectedPurchase(purchase);
                        setShowContactModal(true);
                      }}
                      className="flex-1 md:w-full rounded-xl bg-card-bg border border-card-border px-4 py-2.5 text-xs font-bold text-foreground hover:text-accent-gold hover:border-accent-gold/30 transition-all cursor-pointer text-center"
                    >
                      Contactar vendedor
                    </button>
                    {!isCancelled && (
                      <Link 
                        href={`/listings/${purchase.productId}`}
                        className="flex-1 md:w-full rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-hover px-4 py-2.5 text-xs font-extrabold text-background shadow-sm hover:opacity-95 transition-all text-center"
                      >
                        {isDelivered ? "Volver a comprar" : "Ver publicación"}
                      </Link>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Contact Seller Modal */}
      {showContactModal && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative rounded-3xl border border-card-border bg-card-bg-solid p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-6">
            
            <button 
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-1.5 text-text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="text-left flex flex-col gap-2">
              <span className="text-2xl">📞</span>
              <h3 className="font-heading text-lg font-extrabold text-foreground">
                Coordinación del Envió y Pago
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Comunicate de forma directa con el vendedor en La Pampa para acordar el lugar de entrega y el medio de cobro.
              </p>
            </div>

            <div className="rounded-2xl border border-card-border bg-background p-4 flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-card-border/30 pb-2">
                <span className="text-text-muted">Vendedor:</span>
                <strong className="text-foreground">{selectedPurchase.sellerName}</strong>
              </div>
              <div className="flex justify-between border-b border-card-border/30 pb-2">
                <span className="text-text-muted">WhatsApp / Teléfono:</span>
                <strong className="text-accent-green">{selectedPurchase.sellerPhone}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Producto:</span>
                <strong className="text-foreground truncate max-w-[180px]">{selectedPurchase.productName}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowContactModal(false)}
                className="rounded-xl border border-card-border py-3 text-xs font-bold text-foreground hover:bg-card-border/20 transition-all cursor-pointer"
              >
                Volver
              </button>
              <a 
                href={`https://wa.me/549${selectedPurchase.sellerPhone.replace("-", "")}?text=Hola%20${selectedPurchase.sellerName},%20te%20contacto%20desde%20CompraVentaOnline%20por%20la%20compra%20de%20${selectedPurchase.productName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-accent-green py-3 text-xs font-extrabold text-background shadow-md hover:opacity-95 transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>💬</span> WhatsApp
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
