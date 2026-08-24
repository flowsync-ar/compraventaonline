// "CompraVenta" en azul de marca, "Online" (+ cualquier sufijo, p.ej.
// ".com.ar") en naranja de marca — text prop preserva la casing exacta
// encontrada en cada lugar (p.ej. la variante "CompraventaOnline" con v
// minúscula que aparece en los términos y condiciones).
export default function Brand({ text }: { text: string }) {
  return (
    <>
      <span className="font-bold text-accent-blue">{text.slice(0, 11)}</span>
      <span className="font-bold text-accent-gold">{text.slice(11)}</span>
    </>
  );
}
