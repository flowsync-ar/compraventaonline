"use client";

import { useEffect, useState, type ReactNode } from "react";
import Brand from "@/components/Brand";

const SECTION_IDS = [
  "resumen",
  "descripcion",
  "aceptacion",
  "capacidad",
  "registro",
  "validacion",
  "publicaciones",
  "prohibidas",
  "compra-venta",
  "seguridad",
  "reputacion",
  "privacidad",
  "comercial",
  "planes",
  "sanciones",
  "reportes",
  "responsabilidad",
  "intelectual",
  "automatizado",
  "uso-adecuado",
  "indemnidad",
  "disponibilidad",
  "comunicaciones",
  "eliminacion",
  "anexos",
  "fraude",
  "jurisdiccion",
  "contacto",
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-3 scroll-mt-36">
      <h2 className="font-heading text-base font-extrabold text-foreground border-b border-card-border/30 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState("resumen");

  const sections = [
    { id: "resumen", label: "Resumen" },
    { id: "descripcion", label: "1. CompraVentaOnline" },
    { id: "aceptacion", label: "2. Aceptación" },
    { id: "capacidad", label: "3. Capacidad" },
    { id: "registro", label: "4. Registro y Cuenta" },
    { id: "validacion", label: "5. Validación de identidad" },
    { id: "publicaciones", label: "6. Publicaciones" },
    { id: "prohibidas", label: "7. Productos prohibidos" },
    { id: "compra-venta", label: "8. Compra y venta" },
    { id: "seguridad", label: "9. Seguridad" },
    { id: "reputacion", label: "10. Reputación" },
    { id: "privacidad", label: "11. Privacidad" },
    { id: "comercial", label: "12. Estadísticas" },
    { id: "planes", label: "13. Planes Destacados" },
    { id: "sanciones", label: "14. Sanciones" },
    { id: "reportes", label: "15. Reportes" },
    { id: "responsabilidad", label: "16. Responsabilidad" },
    { id: "intelectual", label: "17. Propiedad intelectual" },
    { id: "automatizado", label: "18. Uso automatizado" },
    { id: "uso-adecuado", label: "19. Uso adecuado" },
    { id: "indemnidad", label: "20. Indemnidad" },
    { id: "disponibilidad", label: "21. Disponibilidad" },
    { id: "comunicaciones", label: "22. Comunicaciones" },
    { id: "eliminacion", label: "23. Eliminación de cuenta" },
    { id: "anexos", label: "24. Políticas complementarias" },
    { id: "fraude", label: "25. Prevención de fraude" },
    { id: "jurisdiccion", label: "26. Legislación y jurisdicción" },
    { id: "contacto", label: "27. Contacto" },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const HEADER_OFFSET = 230;

    const updateActiveSection = () => {
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActiveSection(SECTION_IDS[SECTION_IDS.length - 1]);
        return;
      }

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
      <div className="border-b border-card-border pb-6 mb-10">
        <span className="text-3xl">⚖️</span>
        <h1 className="font-heading text-3xl font-extrabold text-foreground mt-3">
          Términos y Condiciones de <Brand text="CompraVentaOnline" />
        </h1>
        <p className="text-text-muted text-xs mt-1">
          Última actualización: 31 de agosto de 2026
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
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

        <div className="flex-1 rounded-2xl border border-card-border bg-card-bg-solid p-6 md:p-8 shadow-xl flex flex-col gap-8 text-sm text-text-muted leading-relaxed">
          <Section id="resumen" title="Resumen">
            <p>
              <Brand text="CompraVentaOnline" /> es una plataforma de clasificados y comercio electrónico
              que conecta personas y comercios para comprar, vender y publicitar bienes o servicios permitidos.
              No es propietaria de los productos publicados y, salvo que se indique lo contrario para un servicio
              particular, no administra de forma obligatoria el pago ni la entrega.
            </p>
            <p>
              Solo pueden registrarse y operar personas mayores de 18 años con capacidad legal para contratar.
              Publicar, vender o usar ciertas funciones de contacto comercial exige completar la validación de
              identidad prevista en estos Términos.
            </p>
            <p>
              Al crear una cuenta, el Usuario declara haber leído y aceptado estos Términos y Condiciones, la
              Declaración de Privacidad y las políticas complementarias aplicables.
            </p>
          </Section>

          <Section id="descripcion" title="1. CompraVentaOnline">
            <p>
              <Brand text="CompraVentaOnline" /> es una plataforma tecnológica de clasificados y comercio electrónico
              orientada principalmente a conectar personas y comercios interesados en comprar, vender y publicitar
              productos, vehículos, inmuebles y otros bienes o servicios permitidos dentro de la plataforma.
            </p>
            
            <p>
              <Brand text="CompraVentaOnline" /> facilita el contacto entre potenciales compradores y vendedores.
            </p>
            <p>
              Salvo que expresamente se indique lo contrario para algún servicio particular,{" "}
              <Brand text="CompraVentaOnline" /> no es propietaria de los productos publicados, no interviene como
              parte de la compraventa y no administra obligatoriamente el pago ni la entrega de los productos.
            </p>
            <p>
              Los usuarios acuerdan directamente entre ellos las condiciones de pago, entrega, retiro, envío y demás
              aspectos de cada operación.
            </p>
          </Section>

          <Section id="aceptacion" title="2. Aceptación de los Términos y Condiciones">
            <p>
              Estos Términos y Condiciones regulan la relación entre <Brand text="CompraVentaOnline" /> y todas las
              personas que accedan, se registren o utilicen sus servicios, en adelante los “Usuarios”.
            </p>
            <p>
              Al crear una cuenta, el Usuario declara haber leído, comprendido y aceptado estos Términos y
              Condiciones, la Declaración de Privacidad, las políticas de publicación y demás normas aplicables
              dentro de la plataforma.
            </p>
            <p>
              Para realizar acciones que requieran identificación, incluyendo publicar productos, vender o utilizar
              determinadas funcionalidades de contacto o interacción comercial, el Usuario deberá completar los
              mecanismos de validación de identidad establecidos por <Brand text="CompraVentaOnline" />.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá modificar estos Términos y Condiciones cuando resulte necesario
              por cambios en sus servicios, cuestiones técnicas, comerciales, de seguridad o modificaciones en la
              legislación aplicable.
            </p>
            <p>Cuando corresponda, los cambios relevantes serán informados con una anticipación razonable.</p>
            <p>
              El Usuario podrá finalizar su relación con <Brand text="CompraVentaOnline" /> solicitando la eliminación
              de su cuenta, sin perjuicio de las obligaciones pendientes que pudiera mantener con otros Usuarios o
              con la plataforma.
            </p>
          </Section>

          <Section id="capacidad" title="3. Capacidad">
            <p>
              Podrán registrarse y utilizar los servicios de <Brand text="CompraVentaOnline" /> únicamente personas
              mayores de 18 años que tengan capacidad legal para contratar.
            </p>
            <p>
              No está permitido el registro, creación o utilización de cuentas por personas menores de 18 años, aun
              cuando cuenten con autorización de sus padres, tutores o representantes legales.
            </p>
            <p>
              En consecuencia, los menores de 18 años no podrán publicar productos, comprar, vender, contactar con
              fines comerciales ni realizar operaciones dentro de <Brand text="CompraVentaOnline" />.
            </p>
            <p>
              Quien utilice <Brand text="CompraVentaOnline" /> en representación de una empresa, comercio u otra
              persona jurídica deberá ser mayor de 18 años y contar con facultades suficientes para actuar en su
              representación.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá solicitar información y/o documentación destinada a comprobar
              la edad e identidad de sus Usuarios.
            </p>
            <p>
              Si se detectara que una cuenta pertenece o es utilizada por una persona menor de 18 años,{" "}
              <Brand text="CompraVentaOnline" /> podrá suspenderla o inhabilitarla.
            </p>
          </Section>

          <Section id="registro" title="4. Registro y Cuenta">
            <p>
              Para utilizar las funcionalidades que requieran registración, el Usuario deberá completar el formulario
              correspondiente proporcionando información verdadera, exacta, completa y actualizada.
            </p>
            <p>Cada cuenta será personal, única e intransferible.</p>
            <p>El Usuario no podrá vender, prestar, alquilar, transferir ni ceder su cuenta a otra persona.</p>
            <p>
              El Usuario será responsable de mantener la confidencialidad de sus credenciales de acceso y de las
              actividades realizadas desde su cuenta.
            </p>
            <p>
              Si detectara un acceso no autorizado, deberá comunicarlo a <Brand text="CompraVentaOnline" /> tan pronto
              como sea posible.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá aplicar mecanismos destinados a detectar cuentas duplicadas,
              falsas, automatizadas o utilizadas de manera contraria a estos Términos y Condiciones.
            </p>
            <p>
              Cuando existan razones objetivas relacionadas con seguridad, fraude, incumplimientos, requerimientos
              legales o protección de otros Usuarios, <Brand text="CompraVentaOnline" /> podrá limitar, suspender o
              inhabilitar una cuenta.
            </p>
            <p>
              Las personas que hayan sido inhabilitadas definitivamente por incumplimientos graves no podrán crear
              nuevas cuentas con el objetivo de eludir dicha medida.
            </p>
          </Section>

          <Section id="validacion" title="5. Validación de identidad">
            <p>
              Uno de los objetivos de <Brand text="CompraVentaOnline" /> es promover una comunidad de compra y venta
              basada en la confianza, transparencia y trazabilidad de los Usuarios.
            </p>
            <p>
              Por este motivo, para acceder a determinadas funcionalidades de compra, venta, publicación o contacto,{" "}
              <Brand text="CompraVentaOnline" /> podrá requerir que el Usuario haya completado satisfactoriamente un
              proceso de validación de identidad.
            </p>
            <p>
              Dependiendo del mecanismo implementado, <Brand text="CompraVentaOnline" /> podrá solicitar datos y/o
              documentación necesaria para verificar identidad y mayoría de edad, así como utilizar sistemas propios
              o servicios proporcionados por terceros especializados.
            </p>
            <p>
              El Usuario se compromete a proporcionar exclusivamente información y documentación auténtica
              correspondiente a su propia identidad.
            </p>
            <p>Queda expresamente prohibido:</p>
            <List
              items={[
                "Utilizar datos pertenecientes a otra persona.",
                "Suplantar la identidad de terceros.",
                "Presentar documentación falsa, adulterada o ajena.",
                "Crear cuentas destinadas a ocultar la identidad real del Usuario.",
                "Utilizar una cuenta validada perteneciente a otra persona.",
              ]}
            />
            <p>
              <Brand text="CompraVentaOnline" /> podrá restringir funcionalidades, impedir publicaciones, suspender
              cuentas o solicitar verificaciones adicionales cuando no resulte posible validar la identidad del
              Usuario o existan inconsistencias o indicios razonables de fraude o suplantación.
            </p>
            <p>
              La existencia de una cuenta o identidad validada no significa que <Brand text="CompraVentaOnline" />{" "}
              garantice la conducta, solvencia, buena fe o cumplimiento futuro de ese Usuario.
            </p>
            <p>
              La validación constituye una medida destinada a mejorar la seguridad y confianza dentro de la
              comunidad, pero no elimina completamente los riesgos propios de las operaciones realizadas entre
              particulares.
            </p>
          </Section>

          <Section id="publicaciones" title="6. Publicaciones">
            <p>
              Los Usuarios habilitados podrán publicar productos, bienes o servicios permitidos por las políticas de{" "}
              <Brand text="CompraVentaOnline" />.
            </p>
            <p>
              El Usuario que realiza una publicación será exclusivamente responsable de la información incorporada en
              ella.
            </p>
            <p>Las publicaciones deberán contener información verdadera y suficientemente clara sobre el producto ofrecido.</p>
            <p>El Usuario deberá procurar que:</p>
            <List
              items={[
                "El producto publicado exista y se encuentre legítimamente bajo su disponibilidad.",
                "Las fotografías correspondan al producto ofrecido.",
                "El precio informado sea real.",
                "La descripción no resulte deliberadamente engañosa.",
                "El estado del producto sea informado correctamente.",
                "No se oculten intencionalmente características relevantes conocidas.",
                "El producto no se encuentre prohibido por la legislación vigente o por las políticas de CompraVentaOnline.",
              ]}
            />
            <p>
              No deberán utilizarse precios ficticios, simbólicos o deliberadamente engañosos con el objetivo de
              obtener mayor visibilidad o evitar informar el verdadero valor del producto.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá solicitar modificaciones, limitar, pausar o eliminar
              publicaciones que incumplan estas condiciones.
            </p>
          </Section>

          <Section id="prohibidas" title="7. Productos y publicaciones prohibidas">
            <p>
              No podrán publicarse productos, bienes o servicios cuya comercialización se encuentre prohibida por la
              legislación argentina o por las políticas internas de <Brand text="CompraVentaOnline" />.
            </p>
            <p>
              A modo enunciativo y no taxativo, está prohibido publicar, ofrecer, solicitar o promocionar, entre otros:
            </p>
            <List
              items={[
                "Drogas, estupefacientes, psicotrópicos, precursores químicos y cualquier sustancia controlada, así como elementos destinados a su producción, consumo o tráfico.",
                "Armas de fuego, municiones, explosivos, pirotecnia, armas blancas de uso prohibido, imitación de armas, chalecos antibala y artículos de defensa personal (por ejemplo, pistolas de electrochoque o aerosoles incapacitantes) cuando su comercialización no esté expresamente habilitada y acreditada conforme a la normativa aplicable.",
                "Animales vivos (domésticos, de granja o silvestres), partes de animales, especies protegidas, fauna nativa y cualquier oferta que implique maltrato o tráfico de fauna.",
                "Servicios o contenidos pornográficos, eróticos o de índole sexual, incluyendo escorts, acompañantes, masajes con fines sexuales, material para adultos y cualquier oferta de encuentro o prestación sexual.",
                "Cualquier contenido, imagen o servicio de índole sexual que involucre a personas menores de 18 años. Está absolutamente prohibido.",
                "Medicamentos de venta bajo receta, recetas médicas, productos farmacéuticos sin autorización, tratamientos milagro y dispositivos de uso médico restringido.",
                "Bienes robados, de origen ilícito, adulterados, clonados o cuya titularidad no pueda acreditarse de manera razonable.",
                "Productos falsificados, réplicas presentadas como originales y copias ilegales de software, películas, música, libros u otras obras protegidas por propiedad intelectual.",
                "Documentos de identidad, licencias, títulos, sellos, dinero, cheques o cualquier documento público o privado falso, adulterado o ajeno.",
                "Datos personales, bases de contactos, cuentas de terceros, credenciales de acceso y cualquier información obtenida de manera ilegítima.",
                "Servicios financieros no autorizados, préstamos informales abusivos, esquemas piramidales, apuestas ilegales, loterías no habilitadas y ofertas que razonablemente constituyan estafa.",
                "Residuos peligrosos, materiales tóxicos, radioactivos, inflamables de alta peligrosidad y productos retirados del mercado por riesgo para la salud o la seguridad.",
                "Publicaciones que promuevan odio, discriminación, violencia, acoso, explotación laboral o trata de personas.",
    
              ]}
            />
            <p>
              Tampoco se permiten publicaciones engañosas, señuelo, con precios ficticios, fotos que no correspondan
              al bien ofrecido, ni anuncios cuyo único fin sea redirigir a otro sitio, captar datos o hacer spam.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá establecer y actualizar una Política de Publicaciones y
              Productos Prohibidos complementaria a estos Términos y Condiciones. La lista precedente no agota las
              prohibiciones: también aplican la legislación vigente y las normas de la comunidad.
            </p>
            <p>
              La plataforma podrá retirar publicaciones, restringir cuentas y, cuando corresponda, denunciar ante
              autoridades competentes cuando existan razones fundadas para considerar que se infringe la legislación,
              derechos de terceros o las normas de la comunidad.
            </p>
          </Section>

          <Section id="compra-venta" title="8. Compra y venta entre Usuarios">
            <p>
              <Brand text="CompraVentaOnline" /> proporciona herramientas tecnológicas destinadas a facilitar el
              encuentro y comunicación entre compradores y vendedores.
            </p>
            <p>La decisión de realizar una operación corresponde exclusivamente a los Usuarios involucrados.</p>
            <p>Antes de concretar una operación, recomendamos verificar cuidadosamente:</p>
            <List
              items={[
                "Identidad y reputación de la contraparte.",
                "Estado y características del producto.",
                "Precio acordado.",
                "Forma de pago.",
                "Lugar y modalidad de entrega.",
                "Cualquier otra condición relevante de la operación.",
              ]}
            />
            <p>
              Salvo cuando <Brand text="CompraVentaOnline" /> ofrezca expresamente un servicio específico que indique
              lo contrario, los pagos se realizan directamente entre comprador y vendedor.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> no recibe, custodia ni administra el dinero correspondiente a dichas
              operaciones.
            </p>
            <p>De igual manera, la entrega o envío del producto será acordada directamente entre las partes.</p>
          </Section>

          <Section id="seguridad" title="9. Seguridad de las operaciones">
            <p>
              <Brand text="CompraVentaOnline" /> podrá implementar diferentes herramientas destinadas a mejorar la
              seguridad de su comunidad, incluyendo:
            </p>
            <List
              items={[
                "Validación de identidad.",
                "Sistemas de reputación.",
                "Calificaciones entre Usuarios.",
                "Reportes de comportamiento.",
                "Moderación de publicaciones.",
                "Detección de actividad sospechosa.",
                "Restricciones preventivas.",
                "Sistemas automáticos destinados a detectar posibles fraudes.",
              ]}
            />
            <p>
              Estas herramientas tienen carácter preventivo y no constituyen una garantía absoluta respecto de una
              persona, publicación o transacción.
            </p>
            <p>
              Los Usuarios deberán adoptar medidas razonables de seguridad antes de realizar cualquier operación.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá advertir, limitar o suspender cuentas cuando detecte
              comportamientos que razonablemente puedan representar un riesgo para otros Usuarios o para la
              plataforma.
            </p>
          </Section>

          <Section id="reputacion" title="10. Sistema de reputación">
            <p>
              <Brand text="CompraVentaOnline" /> podrá disponer de un sistema de reputación mediante el cual
              compradores y vendedores puedan calificarse después de sus interacciones u operaciones.
            </p>
            <p>Las calificaciones deberán realizarse de buena fe y reflejar experiencias reales.</p>
            <p>
              No estará permitido manipular artificialmente la reputación mediante cuentas falsas, operaciones
              simuladas, acuerdos entre Usuarios u otros mecanismos destinados a alterar el sistema.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá eliminar calificaciones fraudulentas, abusivas o
              manifiestamente falsas y aplicar sanciones cuando corresponda.
            </p>
            <p>
              La reputación constituye información orientativa para otros Usuarios y no representa una garantía de{" "}
              <Brand text="CompraVentaOnline" /> sobre futuras operaciones.
            </p>
          </Section>

          <Section id="privacidad" title="11. Privacidad y datos personales">
            <p>
              <Brand text="CompraVentaOnline" /> realizará el tratamiento de los datos personales de sus Usuarios
              conforme a la legislación argentina aplicable y a su Declaración de Privacidad.
            </p>
            <p>Los datos podrán ser utilizados, según corresponda, para:</p>
            <List
              items={[
                "Gestionar las cuentas.",
                "Validar la identidad de los Usuarios.",
                "Prevenir fraude y abuso.",
                "Proporcionar funcionalidades del Sitio.",
                "Mejorar la seguridad.",
                "Gestionar publicaciones.",
                "Atender consultas y reclamos.",
                "Cumplir obligaciones legales.",
                "Elaborar estadísticas y mejorar los servicios.",
              ]}
            />
            <p>
              La información y documentación utilizada para procesos de validación deberá ser tratada aplicando
              medidas razonables de seguridad y de acuerdo con la Declaración de Privacidad.
            </p>
            <p>
              La Declaración de Privacidad deberá informar de manera específica qué datos son recopilados, con qué
              finalidad, durante cuánto tiempo se conservan y, cuando corresponda, qué terceros participan del
              proceso.
            </p>
          </Section>

          <Section id="comercial" title="12. Información comercial y estadísticas">
            <p>
              <Brand text="CompraVentaOnline" /> podrá generar información estadística relacionada con la utilización
              de la plataforma, incluyendo, entre otros:
            </p>
            <List
              items={[
                "Cantidad de publicaciones.",
                "Categorías consultadas.",
                "Precios publicados.",
                "Visualizaciones.",
                "Interacciones.",
                "Tendencias de búsqueda.",
                "Actividad general del marketplace.",
              ]}
            />
            <p>
              <Brand text="CompraVentaOnline" /> podrá utilizar información agregada o no identificatoria con fines
              estadísticos, analíticos, comerciales y de mejora del servicio, respetando la legislación aplicable en
              materia de protección de datos personales.
            </p>
          </Section>

          <Section id="planes" title="13. Planes Destacados">
            <p>
              El registro y las funcionalidades estándar de <Brand text="CompraVentaOnline" /> estarán sujetas a las
              condiciones vigentes informadas en el Sitio.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá ofrecer servicios opcionales denominados “Planes Destacados”,
              destinados principalmente a otorgar mayor visibilidad o posicionamiento a determinadas publicaciones.
            </p>
            <p>Los Planes Destacados podrán tener diferentes características, duración, ubicación, alcance y precio.</p>
            <p>Toda esta información será presentada al Usuario antes de confirmar la contratación.</p>
            <p>
              La contratación de un Plan Destacado no garantiza la venta del producto ni una determinada cantidad de
              visualizaciones, consultas, contactos u operaciones.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá crear, modificar o discontinuar modalidades de destaque y
              realizar promociones o bonificaciones.
            </p>
            <p>
              Los Planes Destacados ya contratados se regirán por las condiciones informadas al Usuario al momento de
              su contratación, salvo que la normativa aplicable disponga lo contrario.
            </p>
            <p>
              Cuando corresponda, <Brand text="CompraVentaOnline" /> emitirá la documentación fiscal correspondiente.
            </p>
          </Section>

          <Section id="sanciones" title="14. Sanciones y suspensión de cuentas">
            <p>
              <Brand text="CompraVentaOnline" /> podrá adoptar medidas cuando un Usuario incumpla estos Términos y
              Condiciones, las políticas de la plataforma o la legislación aplicable.
            </p>
            <p>Dependiendo de la gravedad y circunstancias del caso, podrá:</p>
            <List
              items={[
                "Advertir al Usuario.",
                "Solicitar información adicional.",
                "Solicitar una nueva validación de identidad.",
                "Pausar o eliminar publicaciones.",
                "Restringir determinadas funcionalidades.",
                "Suspender temporalmente una cuenta.",
                "Inhabilitar definitivamente una cuenta.",
              ]}
            />
            <p>Entre otras situaciones, podrán aplicarse medidas frente a:</p>
            <List
              items={[
                "Intentos de fraude.",
                "Suplantación de identidad.",
                "Documentación falsa.",
                "Publicaciones engañosas.",
                "Productos prohibidos.",
                "Manipulación del sistema de reputación.",
                "Acoso, amenazas o comportamiento abusivo.",
                "Intentos de vulnerar la seguridad de la plataforma.",
                "Utilización automatizada no autorizada.",
                "Incumplimientos reiterados de las normas de la comunidad.",
              ]}
            />
            <p>Las medidas deberán guardar relación razonable con la gravedad del incumplimiento detectado.</p>
          </Section>

          <Section id="reportes" title="15. Reportes de Usuarios y publicaciones">
            <p>
              Los Usuarios podrán reportar publicaciones, perfiles o comportamientos que consideren fraudulentos,
              ilegales, engañosos o contrarios a las normas de <Brand text="CompraVentaOnline" />.
            </p>
            <p>
              La presentación de un reporte no implica automáticamente que el Usuario denunciado haya cometido una
              infracción.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá analizar los antecedentes disponibles y adoptar las medidas que
              considere razonablemente necesarias.
            </p>
            <p>Los Usuarios deberán utilizar las herramientas de denuncia de buena fe.</p>
            <p>El abuso deliberado del sistema de reportes también podrá generar restricciones.</p>
          </Section>

          <Section id="responsabilidad" title="16. Responsabilidad de CompraVentaOnline">
            <p>
              <Brand text="CompraVentaOnline" /> actúa principalmente como intermediario tecnológico que facilita la
              publicación de clasificados y el contacto entre Usuarios.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> no es propietaria ni poseedora de los productos publicados por
              terceros.
            </p>
            <p>
              Tampoco controla físicamente cada producto ni puede garantizar de manera absoluta:
            </p>
            <List
              items={[
                "Su existencia.",
                "Estado.",
                "Calidad.",
                "Autenticidad.",
                "Seguridad.",
                "Legalidad.",
                "Procedencia.",
                "Cumplimiento de la entrega.",
                "Cumplimiento del pago.",
                "Conducta futura de compradores o vendedores.",
              ]}
            />
            <p>Cada Usuario es responsable de evaluar las condiciones de la operación antes de concretarla.</p>
            <p>
              <Brand text="CompraVentaOnline" /> será responsable por la prestación de sus propios servicios en los
              casos y con el alcance que establezca la legislación argentina aplicable.
            </p>
            <p>
              Nada de lo establecido en estos Términos y Condiciones deberá interpretarse como una exclusión o
              limitación de derechos que legalmente no puedan ser renunciados por los Usuarios.
            </p>
          </Section>

          <Section id="intelectual" title="17. Propiedad intelectual">
            <p>
              <Brand text="CompraVentaOnline" /> es titular o legítima licenciataria, según corresponda, de los
              derechos sobre sus marcas, logos, nombres comerciales, diseños, interfaces, software, código, bases de
              datos y demás elementos propios de la plataforma.
            </p>
            <p>La utilización del Sitio no otorga a los Usuarios derechos de propiedad sobre dichos elementos.</p>
            <p>
              Los Usuarios conservarán los derechos que les correspondan sobre las fotografías, textos y demás
              contenidos propios que incorporen a sus publicaciones.
            </p>
            <p>
              Al publicar contenido en <Brand text="CompraVentaOnline" />, el Usuario autoriza a la plataforma a
              mostrarlo, reproducirlo y adaptarlo técnicamente en la medida necesaria para prestar, promocionar y
              mejorar los servicios del marketplace, mientras corresponda conforme a la finalidad de la publicación y
              la normativa aplicable.
            </p>
            <p>El Usuario declara contar con los derechos necesarios sobre el contenido que publique.</p>
          </Section>

          <Section id="automatizado" title="18. Uso automatizado del Sitio">
            <p>
              Queda prohibido utilizar, sin autorización expresa de <Brand text="CompraVentaOnline" />, sistemas
              automatizados tales como:
            </p>
            <List
              items={["Bots.", "Scrapers.", "Crawlers.", "Spiders.", "Sistemas automatizados de extracción de información."]}
            />
            <p>
              No podrán utilizarse estas herramientas para acceder, copiar, almacenar, reutilizar, reproducir o
              distribuir contenidos del Sitio de manera no autorizada.
            </p>
            <p>Esta prohibición resulta especialmente aplicable respecto de:</p>
            <List
              items={[
                "Datos personales.",
                "Información disponible únicamente después de iniciar sesión.",
                "Fotografías y descripciones de publicaciones.",
                "Bases de datos.",
                "Código fuente.",
                "Contenido protegido por propiedad intelectual.",
                "Operaciones automatizadas que puedan afectar la estabilidad o seguridad del servicio.",
              ]}
            />
            <p>
              <Brand text="CompraVentaOnline" /> podrá implementar medidas técnicas destinadas a impedir estas
              actividades.
            </p>
          </Section>

          <Section id="uso-adecuado" title="19. Uso adecuado de la plataforma">
            <p>
              Los Usuarios se comprometen a utilizar <Brand text="CompraVentaOnline" /> de manera lícita y respetuosa.
            </p>
            <p>No estará permitido utilizar el servicio para:</p>
            <List
              items={[
                "Realizar actividades ilegales.",
                "Estafar o intentar engañar a otros Usuarios.",
                "Suplantar identidades.",
                "Amenazar, acosar o discriminar.",
                "Distribuir malware o contenido malicioso.",
                "Obtener datos personales de otros Usuarios de manera ilegítima.",
                "Vulnerar sistemas de seguridad.",
                "Manipular artificialmente estadísticas o reputaciones.",
                "Realizar spam.",
                "Utilizar información obtenida del Sitio para actividades ilícitas.",
              ]}
            />
          </Section>

          <Section id="indemnidad" title="20. Indemnidad">
            <p>
              En la medida permitida por la legislación aplicable, el Usuario será responsable por los daños y
              reclamos derivados de sus propias publicaciones, actividades ilegales, infracciones de derechos de
              terceros o incumplimientos de estos Términos y Condiciones.
            </p>
            <p>
              El Usuario deberá mantener indemne a <Brand text="CompraVentaOnline" /> frente a reclamos de terceros
              directamente derivados de conductas ilegales o incumplimientos que le sean imputables, sin afectar los
              derechos irrenunciables reconocidos por la legislación argentina.
            </p>
          </Section>

          <Section id="disponibilidad" title="21. Disponibilidad del servicio">
            <p>
              <Brand text="CompraVentaOnline" /> procurará mantener el Sitio disponible y funcionando correctamente.
            </p>
            <p>
              Sin embargo, podrán producirse interrupciones temporales debido a mantenimiento, actualizaciones,
              problemas técnicos, fallas de proveedores, situaciones de fuerza mayor u otras circunstancias.
            </p>
            <p>
              <Brand text="CompraVentaOnline" /> podrá modificar, actualizar o discontinuar funcionalidades cuando
              resulte necesario, respetando los derechos adquiridos y obligaciones que correspondan conforme a la
              legislación aplicable.
            </p>
          </Section>

          <Section id="comunicaciones" title="22. Comunicaciones">
            <p>
              <Brand text="CompraVentaOnline" /> podrá comunicarse con los Usuarios mediante los datos de contacto
              proporcionados durante el registro, incluyendo correo electrónico, notificaciones dentro del Sitio u
              otros canales autorizados por el Usuario.
            </p>
            <p>
              Las comunicaciones relacionadas con seguridad, funcionamiento de la cuenta, operaciones, cambios
              contractuales o cuestiones legales podrán considerarse comunicaciones de servicio.
            </p>
            <p>
              Las comunicaciones comerciales se regirán por las preferencias del Usuario y la normativa aplicable.
            </p>
          </Section>

          <Section id="eliminacion" title="23. Eliminación de la cuenta">
            <p>
              El Usuario podrá solicitar la eliminación de su cuenta mediante los mecanismos habilitados por{" "}
              <Brand text="CompraVentaOnline" />.
            </p>
            <p>La eliminación podrá estar sujeta a la conservación de determinada información cuando resulte necesaria para:</p>
            <List
              items={[
                "Cumplir obligaciones legales.",
                "Resolver controversias.",
                "Prevenir fraude.",
                "Investigar incumplimientos.",
                "Cumplir requerimientos de autoridades competentes.",
              ]}
            />
            <p>
              La eliminación de la cuenta no extinguirá obligaciones pendientes que el Usuario pudiera mantener con
              otros Usuarios o con <Brand text="CompraVentaOnline" />.
            </p>
          </Section>

          <Section id="anexos" title="24. Políticas complementarias">
            <p>
              Estos Términos y Condiciones se complementan con las políticas específicas que{" "}
              <Brand text="CompraVentaOnline" /> publique para regular determinados servicios.
            </p>
            <p>Entre ellas podrán encontrarse:</p>
            <List
              items={[
                "Política de Publicaciones y Productos Prohibidos.",
                "Políticas aplicables a Vehículos, Inmuebles y Servicios.",
                "Programa de Reputación y Puntuación.",
                "Política de Validación de Identidad.",
                "Declaración de Privacidad y Cookies.",
                "Condiciones de los Planes Destacados.",
                "Normas de la Comunidad.",
              ]}
            />
            <p>
              Estas políticas formarán parte del marco de utilización del Ecosistema{" "}
              <Brand text="CompraVentaOnline" /> cuando resulten aplicables.
            </p>
          </Section>

          <Section id="fraude" title="25. Prevención de fraude y colaboración con autoridades">
            <p>
              <Brand text="CompraVentaOnline" /> podrá implementar medidas técnicas y operativas destinadas a prevenir
              fraude, suplantación de identidad, publicaciones ilícitas y otras actividades contrarias a estos
              Términos y Condiciones.
            </p>
            <p>
              Cuando exista un requerimiento válido de una autoridad competente, <Brand text="CompraVentaOnline" />{" "}
              podrá proporcionar la información que legalmente corresponda de acuerdo con la legislación argentina y
              su Declaración de Privacidad.
            </p>
            <p>
              La plataforma podrá conservar determinados registros cuando resulte necesario para atender obligaciones
              legales, investigaciones de seguridad, prevención de fraude o resolución de controversias, conforme a
              los plazos permitidos por la normativa aplicable.
            </p>
          </Section>

          <Section id="jurisdiccion" title="26. Legislación aplicable y jurisdicción">
            <p>
              Estos Términos y Condiciones se regirán por las leyes vigentes de la República Argentina.
            </p>
            <p>
              Cualquier controversia relacionada con la utilización de <Brand text="CompraVentaOnline" /> será
              sometida a los tribunales que resulten competentes de acuerdo con la legislación argentina aplicable.
            </p>
            <p>
              Cuando resulte aplicable normativa de defensa del consumidor, se respetarán los derechos y
              jurisdicciones que dicha normativa reconozca al consumidor, sin que estos Términos puedan interpretarse
              como una renuncia anticipada a derechos irrenunciables.
            </p>
          </Section>

          <Section id="contacto" title="27. Contacto">
            <p>
              Para consultas relacionadas con estos Términos y Condiciones, funcionamiento de la cuenta, seguridad o
              utilización de la plataforma, los Usuarios podrán comunicarse mediante los canales oficiales publicados
              por <Brand text="CompraVentaOnline" />.
            </p>
            <p>
              Sitio web:{" "}
              <a href="https://compraventaonline.com.ar" className="text-accent-blue font-bold hover:underline">
                compraventaonline.com.ar
              </a>
            </p>
            <p>
              WhatsApp:{" "}
              <a
                href="https://wa.me/5492954504660"
                className="text-accent-blue font-bold hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                2954 504660
              </a>
            </p>
            <p className="font-bold text-foreground pt-2">Aceptación</p>
            <p>
              Al registrarse y utilizar <Brand text="CompraVentaOnline" />, el Usuario declara haber leído y aceptado
              estos Términos y Condiciones y las políticas complementarias que correspondan.
            </p>
          </Section>

          <div className="border-t border-card-border/30 pt-6 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <span>
              © 2026 <Brand text="CompraVentaOnline" /> — 100% Pampeano
            </span>
            <span>Santa Rosa, La Pampa, Argentina</span>
          </div>
        </div>
      </div>
    </div>
  );
}
