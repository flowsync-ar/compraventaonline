"use client";

import { useEffect, useState } from "react";
import Brand from "@/components/Brand";

// Kept separate from `sections` (defined inside the component) so the
// scroll-spy effect below has a stable id list that doesn't change
// identity on every render.
const SECTION_IDS = [
  "resumen",
  "descripcion",
  "terminos",
  "capacidad",
  "registro",
  "privacidad",
  "comercial",
  "sanciones",
  "responsabilidad",
  "tarifas",
  "intelectual",
  "indemnidad",
  "automatizado",
  "anexos",
  "jurisdiccion",
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState("resumen");

  const sections = [
    { id: "resumen", label: "Resumen de Términos" },
    { id: "descripcion", label: "1. CompraVentaOnline" },
    { id: "terminos", label: "2. Términos y Condiciones" },
    { id: "capacidad", label: "3. Capacidad para Operar" },
    { id: "registro", label: "4. Registro y Cuenta" },
    { id: "privacidad", label: "5. Privacidad de Datos" },
    { id: "comercial", label: "6. Información Comercial" },
    { id: "sanciones", label: "7. Sanciones" },
    { id: "responsabilidad", label: "8. Responsabilidad" },
    { id: "tarifas", label: "9. Tarifas" },
    { id: "intelectual", label: "10. Propiedad Intelectual" },
    { id: "indemnidad", label: "11. Indemnidad" },
    { id: "automatizado", label: "12. Uso Automatizado" },
    { id: "anexos", label: "13. Anexos" },
    { id: "jurisdiccion", label: "14. Jurisdicción y Ley" },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Keeps the sidebar highlight in sync with whatever section is actually
  // in view while scrolling — before this, activeSection only changed on
  // click, so it kept showing whichever entry you'd last clicked even after
  // scrolling many sections past it. A single scroll-driven scan (instead
  // of IntersectionObserver + a separate scroll listener) avoids the two
  // running into each other and disagreeing about which section "won".
  useEffect(() => {
    // Comfortably past the sticky header (~143px) — scrollIntoView doesn't
    // land pixel-exact on the scroll-margin-top value in every browser, so
    // this has slack instead of chasing an exact match.
    const HEADER_OFFSET = 230;

    const updateActiveSection = () => {
      // The last section can't always be scrolled up far enough to cross
      // HEADER_OFFSET if there isn't enough page left below it — reaching
      // the bottom of the page is itself a clear enough signal for it.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActiveSection(SECTION_IDS[SECTION_IDS.length - 1]);
        return;
      }

      // Otherwise: the active section is the last one (in document order)
      // whose heading has already crossed the header offset line.
      let current = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= HEADER_OFFSET) {
          current = id;
        }
      }
      setActiveSection(current);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 w-full">
      
      {/* Page Header */}
      <div className="border-b border-card-border pb-6 mb-10">
        <span className="text-3xl">⚖️</span>
        <h1 className="font-heading text-3xl font-extrabold text-foreground mt-3">
          Términos y Condiciones de Uso del Sitio
        </h1>
        <p className="text-text-muted text-xs mt-1">
          Versión vigente: 7 de abril de 2026.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Sidebar Index (Desktop) */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-24">
          <div className="rounded-2xl border border-card-border bg-card-bg-solid p-5 flex flex-col gap-1 max-h-[75vh] overflow-y-auto">
            <h4 className="font-heading text-[10px] font-extrabold text-text-muted uppercase tracking-wider mb-2 px-3">
              Índice de Secciones
            </h4>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeSection === section.id
                    ? "bg-accent-gold/15 text-accent-gold"
                    : "text-text-muted hover:text-foreground hover:bg-card-border/20"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Legal Text Content */}
        <div className="flex-1 rounded-2xl border border-card-border bg-card-bg-solid p-6 md:p-8 shadow-xl flex flex-col gap-8 text-sm text-text-muted leading-relaxed">
          
          {/* Section: Resumen */}
          <section id="resumen" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              Resumen de términos y condiciones
            </h2>
            <p>
              <Brand text="CompraVentaOnline" /> es una compañía de tecnología que ofrece servicios vinculados principalmente al comercio electrónico y clasificados en la provincia de La Pampa, Argentina.
            </p>
            <p>
              El Marketplace es una plataforma de comercio electrónico donde las Personas (Usuarios de la plataforma) pueden vender y comprar productos usando soluciones de contacto directo y acordando de manera independiente el pago y envío de los bienes.
            </p>
            <p>
              En <Brand text="CompraVentaOnline" />, conectamos a las personas interesadas en realizar transacciones con vehículos, inmuebles y servicios con posibles vendedores de forma ágil y transparente.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> no cuenta con soluciones nativas de cobros o logística obligatorios (como procesadores de pago o envíos centralizados). Los pagos y las entregas se pactan de forma independiente y directa entre las partes de la transacción.
            </p>
            <p>
              Ofrecemos planes de visibilidad destacados (Planes FEATURED y PREMIUM) y promociones por reputación de vendedor para promover el comercio honesto y democratizar los servicios tecnológicos en la región pampeana.
            </p>
            <p>
              Para poder operar en la plataforma todas las Personas (Usuarios de la plataforma)s deberán aceptar los Términos y Condiciones, los anexos y la Declaración de Privacidad.
            </p>
            <p>
              Podrán operar dentro de <Brand text="CompraVentaOnline" /> quienes tengan capacidad legal y menores de edad debidamente autorizados por sus representantes legales.
            </p>
            <p>
              Cada Persona (Usuarios de la plataforma) es responsable de los datos personales que brinda al momento de registrarse y se obliga a mantenerlos actualizados. Además, es el único responsable del uso y resguardo de su contraseña.
            </p>
            <p>
              En algunos casos, podremos cobrar una tarifa por la activación de planes especiales de visibilidad dentro del ecosistema de <Brand text="CompraVentaOnline" />, la cual la Persona (Usuarios de la plataforma) se compromete a abonar.
            </p>
          </section>

          {/* Section 1 */}
          <section id="descripcion" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              1- CompraVentaOnline
            </h2>
            <p>
              <Brand text="CompraVentaOnline" /> es una plataforma tecnológica que ofrece servicios vinculados principalmente a la publicación de clasificados y al comercio electrónico local.
            </p>
            <p>
              Los servicios que ofrece <Brand text="CompraVentaOnline" /> en el sitio web oficial y sus aplicaciones móviles (de ahora en más: “Sitio”) están diseñados para formar un ecosistema que permita a las personas vender, comprar, publicitar, acordar envíos y realizar otras actividades comerciales con tecnología aplicada (de ahora en más: “Ecosistema <Brand text="CompraVentaOnline" />”).
            </p>
          </section>

          {/* Section 2 */}
          <section id="terminos" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              2- Términos y Condiciones
            </h2>
            <p>
              Estos términos y condiciones y los anexos que explican los servicios del Ecosistema <Brand text="CompraVentaOnline" /> (de ahora en más: “Términos y Condiciones”) regulan la relación entre <Brand text="CompraVentaOnline" /> y las personas que usan sus servicios (“Personas (Usuarios de la plataforma)s”).
            </p>
            <p>
              Las Personas (Usuarios de la plataforma)s aceptan estos Términos y Condiciones al registrarse en el Sitio y podrán aceptar actualizaciones posteriores mediante actos concluyentes de su parte al continuar utilizando el Ecosistema <Brand text="CompraVentaOnline" />.
            </p>
            <p>
              Los posibles cambios en nuestros servicios aplicarán a todas las Personas (Usuarios de la plataforma)s y serán informados con 10 días corridos de anticipación para que las Personas (Usuarios de la plataforma)s puedan revisarlas y seguir usando el Ecosistema <Brand text="CompraVentaOnline" />. Los cambios que reflejen actualizaciones en las tarifas de planes opcionales de visibilidad estarán sujetas a los plazos y condiciones establecidas en sus Términos y Condiciones específicos.
            </p>
            <p>
              Las Personas (Usuarios de la plataforma)s podrán finalizar la relación con <Brand text="CompraVentaOnline" /> cancelando su cuenta en cualquier momento. Esto no implicará la extinción de las obligaciones pendientes que la Persona (Usuarios de la plataforma) tenga con <Brand text="CompraVentaOnline" /> u otras Personas (Usuarios de la plataforma)s.
            </p>
          </section>

          {/* Section 3 */}
          <section id="capacidad" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              3- Capacidad
            </h2>
            <p>
              Podrán usar nuestros servicios las personas mayores de edad que tengan capacidad legal para contratar. Los menores de edad, a partir de los 13 años, sólo podrán utilizar su cuenta con autorización del representante legal, quien responderá por todas las acciones y obligaciones que se deriven de la utilización de esa cuenta y quien deberá velar por el uso responsable y adecuado de ella en atención a la madurez del menor de edad que autorice.
            </p>
            <p>
              Quien use el Ecosistema <Brand text="CompraVentaOnline" /> en representación de una empresa deberá tener capacidad para contratar a nombre de ella. Además, para poder usar la cuenta, la Persona (Usuarios de la plataforma) debe encontrarse activa.
            </p>
          </section>

          {/* Section 4 */}
          <section id="registro" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              4- Registro y Cuenta
            </h2>
            <p>
              Quien quiera usar nuestros servicios deberá completar el formulario de registro con los datos que le sean requeridos. Al completarlo, se compromete a hacerlo de manera exacta, precisa y verdadera y a mantener sus datos siempre actualizados. La Persona (Usuarios de la plataforma) será la única responsable de la certeza de sus datos de registro. Sin perjuicio de la información brindada en el formulario, podremos solicitar y/o consultar información adicional para corroborar la identidad de la Persona (Usuarios de la plataforma).
            </p>
            <p>
              La cuenta es personal, única e intransferible, es decir que bajo ningún concepto se podrá vender o ceder a otra persona. Se accede a ella con la clave personal de seguridad que haya elegido y que deberá mantener bajo estricta confidencialidad. En cualquier caso, la Persona (Usuarios de la plataforma) será la única responsable por las operaciones que se realicen en su cuenta. En caso de detectar un uso no autorizado de su cuenta, deberá notificar de forma inmediata y fehaciente a <Brand text="CompraVentaOnline" />.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá denegar una solicitud de registro o dar de baja un registro ya aceptado cuando existan razones objetivas fundadas en incumplimientos de estos Términos y Condiciones, requerimientos de autoridad competente, normativa aplicable, o motivos de prevención de riesgos para la integridad de la plataforma, otras Personas (Usuarios de la plataforma)s o terceros. Estas medidas no generarán derecho a resarcimiento.
            </p>
            <p>
              No podrán registrarse nuevamente en el Sitio las Personas (Usuarios de la plataforma)s que hayan sido inhabilitadas previamente. Tampoco podrán registrarse quienes estén incluidos o relacionados a personas incluidas en listas nacionales o internacionales de sanciones aplicables en la jurisdicción.
            </p>
            <p>
              Además, en caso de detectar el uso de más de una cuenta, podremos aplicar restricciones, suspensiones de publicación y/o cualquier otra medida si consideramos que ese accionar puede perjudicar al resto de las personas que usan el Sitio o a <Brand text="CompraVentaOnline" />.
            </p>
          </section>

          {/* Section 5 */}
          <section id="privacidad" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              5- Privacidad de datos
            </h2>
            <p>
              En <Brand text="CompraVentaOnline" /> hacemos un uso responsable de la información personal, protegiendo la privacidad de las Personas (Usuarios de la plataforma)s que nos confían sus datos, aplicando estándares de seguridad para garantizar un resguardo y tratamiento correcto en todo nuestro Ecosistema digital. Por este motivo, tanto el registro y tratamiento de los datos personales, como la gestión de los derechos vinculados a la protección de datos se realizan a través de nuestros canales digitales. Para más información, consultá la Declaración de Privacidad.
            </p>
          </section>

          {/* Section 6 */}
          <section id="comercial" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              6- Información Comercial
            </h2>
            <p>
              “Información Comercial” es toda información provista y/o generada por las Personas (Usuarios de la plataforma)s al utilizar los servicios de <Brand text="CompraVentaOnline" />, incluyendo sin limitación datos de productos vendidos, precios, vistas de artículos, volumen y fecha de transacciones estimadas.
            </p>
            <p>
              Al momento de proveer y/o generarse esta Información Comercial en el Sitio Web de <Brand text="CompraVentaOnline" />, las Personas (Usuarios de la plataforma)s reconocen que la plataforma podrá usar esa información no identitaria con fines analíticos, estadísticos e informativos para la optimización del ecosistema.
            </p>
          </section>

          {/* Section 7 */}
          <section id="sanciones" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              7- Sanciones
            </h2>
            <p>
              En caso que la Persona (Usuarios de la plataforma) incumpliera una ley o los Términos y Condiciones, podremos advertir, suspender, restringir o inhabilitar temporal o definitivamente su cuenta o las publicaciones infractoras, sin perjuicio de otras sanciones legales que correspondan.
            </p>
          </section>

          {/* Section 8 */}
          <section id="responsabilidad" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              8- Responsabilidad
            </h2>
            <p>
              <Brand text="CompraVentaOnline" /> actúa como intermediario tecnológico para la publicación de clasificados. No es propietaria, no posee, ni interviene en la entrega ni en la calidad física de los artículos publicados en el Sitio.
            </p>
            <p>
              La Persona (Usuarios de la plataforma) reconoce que cualquier transacción comercial que concrete se realiza directamente con la otra parte, asumiendo de forma exclusiva los riesgos del trato. <Brand text="CompraVentaOnline" /> será responsable únicamente por defectos en la prestación de sus propios servicios técnicos en la medida que le sean imputables y con el alcance previsto en las leyes vigentes de la República Argentina.
            </p>
          </section>

          {/* Section 9 */}
          <section id="tarifas" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              9- Tarifas
            </h2>
            <p>
              El uso básico del Sitio (publicación estándar y búsquedas) es gratuito. <Brand text="CompraVentaOnline" /> podrá cobrar tarifas especiales por servicios opcionales de destaque (Planes FEATURED y PREMIUM), y la Persona (Usuarios de la plataforma) se compromete a pagarlos a tiempo de acuerdo a lo contratado.
            </p>
            <p>
              Podremos modificar o eliminar las tarifas de visibilidad destacada en cualquier momento con el debido preaviso establecido en la cláusula 2 de estos Términos y Condiciones. De la misma manera, podremos ofrecer bonificaciones o promociones gratuitas a los vendedores destacados según su puntaje de reputación en la plataforma.
            </p>
            <p>
              En todos los casos se emitirá la factura correspondiente de conformidad con los datos fiscales vigentes que las personas tengan cargados en su cuenta.
            </p>
          </section>

          {/* Section 10 */}
          <section id="intelectual" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              10- Propiedad Intelectual
            </h2>
            <p>
              <Brand text="CompraVentaOnline" /> es propietaria de todos los derechos de propiedad intelectual sobre sus sitios, todo su contenido, marcas, logos, nombres comerciales, diseños, imágenes, derechos de autor, dominios, programas de computación, código fuente, bases de datos y software aplicados.
            </p>
            <p>
              Aunque <Brand text="CompraVentaOnline" /> otorga permiso para usar sus servicios conforme a lo previsto en los Términos y Condiciones, esto no implica una autorización para usar su Propiedad Intelectual de manera confusa o comercial sin previo consentimiento expreso.
            </p>
            <p>
              Está prohibido usar nuestros servicios para fines ilegales, realizar cualquier tipo de ingeniería inversa, utilizar herramientas de scraping, bots o extracción automatizada de datos para su reutilización sin autorización expresa. En caso de detectarse infracciones a derechos de autor o propiedad intelectual de terceros o de la plataforma, <Brand text="CompraVentaOnline" /> removerá los contenidos infractores y sancionará al usuario según corresponda.
            </p>
          </section>

          {/* Section 11 */}
          <section id="indemnidad" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              11- Indemnidad
            </h2>
            <p>
              La Persona (Usuarios de la plataforma) mantendrá indemne a <Brand text="CompraVentaOnline" />, sus administradores, representantes y trabajadores, por cualquier reclamo administrativo o judicial iniciado por otras Personas (Usuarios de la plataforma)s o terceros relacionado con sus actividades comerciales o publicaciones en el Ecosistema <Brand text="CompraVentaOnline" />.
            </p>
          </section>

          {/* Section 12 */}
          <section id="automatizado" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              12- Uso Automatizado del Sitio y Acceso a la Información
            </h2>
            <p>
              Queda prohibido el uso de sistemas automatizados (incluyendo, sin limitarse a, bots, spiders, scrapers o crawlers) para acceder, indexar, extraer, copiar, almacenar, reutilizar, reproducir, transmitir o distribuir, directa o indirectamente, cualquier contenido del Sitio de <Brand text="CompraVentaOnline" /> sin la correspondiente autorización expresa, especialmente respecto de:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Contenidos protegidos por propiedad intelectual (descripciones, imágenes, código fuente).</li>
              <li>Información disponible únicamente mediante autenticación previa o inicio de sesión.</li>
              <li>Cualquier dato personal de los usuarios.</li>
              <li>Actividades masivas que puedan afectar la estabilidad y disponibilidad técnica del Sitio.</li>
            </ul>
            <p>
              El incumplimiento habilitará a <Brand text="CompraVentaOnline" /> a suspender la cuenta y ejercer las acciones legales y técnicas correspondientes.
            </p>
          </section>

          {/* Section 13 */}
          <section id="anexos" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              13- Anexos
            </h2>
            <p>
              Además de estos Términos y Condiciones, los servicios del Ecosistema <Brand text="CompraVentaOnline" /> se regulan bajo las siguientes políticas anexas:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 font-bold">
              <li>Políticas del Catálogo (Marketplace estándar)</li>
              <li>Políticas de <Brand text="CompraVentaOnline" /> (Vehículos, Inmuebles y Servicios)</li>
              <li>Programa de Reputación y Puntuación del Vendedor</li>
              <li>Declaración de Privacidad y Cookies</li>
            </ul>
          </section>

          {/* Section 14 */}
          <section id="jurisdiccion" className="flex flex-col gap-3 scroll-mt-36">
            <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
              14- Jurisdicción y Ley Aplicable
            </h2>
            <p>
              Estos Términos y Condiciones se rigen por la legislación argentina vigente.
            </p>
            <p>
              Toda controversia derivada de su aplicación, interpretación o validez será resuelta por los tribunales ordinarios competentes con asiento en la **Ciudad de Santa Rosa, provincia de La Pampa, Argentina**, renunciando a cualquier otro fuero de jurisdicción.
            </p>
            
          </section>

          <div className="border-t border-card-border/30 pt-6 mt-4 flex items-center justify-between text-xs">
            <span>© 2026 <Brand text="CompraVentaOnline" /> . Todos los derechos reservados.</span>
            <span>Santa Rosa, La Pampa, Argentina</span>
          </div>

        </div>

      </div>
    </div>
  );
}
