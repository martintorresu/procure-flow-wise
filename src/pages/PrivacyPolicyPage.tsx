import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Mail, Server, MessageCircle, UserCheck, Calendar } from "lucide-react";
import inhrLogo from "@/assets/inhr-logo.png";

export default function PrivacyPolicyPage() {
  return (
    <>
      <SEO
        title="Política de Privacidad | Pro.Curem Flow"
        description="Política de privacidad de Pro.Curem Flow. Conoce qué datos recopilamos, cómo los usamos y cuáles son tus derechos."
        path="/privacy"
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-6 py-6 flex items-center gap-3">
            <img
              src={inhrLogo}
              alt="InovaHR"
              className="h-8 w-auto"
            />
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Pro.Curem Flow
              </h1>
              <p className="text-sm text-muted-foreground">
                Política de Privacidad
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-3xl mx-auto px-6 py-10">
          <Card className="shadow-sm">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Política de Privacidad
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Última actualización: agosto de 2026
                  </p>
                </div>
              </div>

              <p className="text-foreground/90 leading-relaxed">
                En <strong>InovaHR</strong>, operadora de la plataforma{" "}
                <strong>Pro.Curem Flow</strong>, respetamos tu privacidad y nos
                comprometemos a proteger los datos personales que nos
                confías. Esta política describe de manera transparente qué
                información recopilamos, con qué finalidad la utilizamos, cómo
                la protegemos y cuáles son tus derechos como usuario.
              </p>

              <Separator />

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  1. Responsable del tratamiento
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  El responsable del tratamiento de los datos personales es{" "}
                  <strong>InovaHR</strong>, empresa desarrolladora y operadora
                  de Pro.Curem Flow. Para cualquier consulta relacionada con
                  esta política o el ejercicio de tus derechos, puedes
                  contactarnos en{" "}
                  <a
                    href="mailto:contacto@inovahr.com"
                    className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    contacto@inovahr.com
                  </a>
                  .
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  2. Datos que recopilamos
                </h3>
                <p className="text-foreground/90 leading-relaxed mb-3">
                  Para prestarte nuestros servicios de gestión de procesos de
                  compra industriales, recopilamos y tratamos los siguientes
                  datos personales:
                </p>
                <ul className="list-disc pl-6 space-y-1.5 text-foreground/90">
                  <li>
                    <strong>Datos de identificación y contacto:</strong> nombre
                    completo, correo electrónico, número de teléfono y RUT o
                    identificación fiscal.
                  </li>
                  <li>
                    <strong>Datos de cuenta:</strong> credenciales de acceso,
                    rol asignado, empresa o tenant al que perteneces y
                    preferencias de notificación.
                  </li>
                  <li>
                    <strong>Datos de procesos de compra:</strong> información
                    técnica, comercial, de proveedores, cotizaciones,
                    compromisos, permisos y cualquier dato que ingreses o
                    generees dentro de la plataforma en el marco de tus
                    procesos de compra.
                  </li>
                  <li>
                    <strong>Datos de uso:</strong> registros de actividad
                    mínimos necesarios para la seguridad y el correcto
                    funcionamiento del servicio.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  3. Finalidad del tratamiento
                </h3>
                <p className="text-foreground/90 leading-relaxed mb-3">
                  Utilizamos tus datos exclusivamente para las siguientes
                  finalidades:
                </p>
                <ul className="list-disc pl-6 space-y-1.5 text-foreground/90">
                  <li>
                    Gestionar tu acceso y uso de Pro.Curem Flow.
                  </li>
                  <li>
                    Permitir la creación, seguimiento y administración de
                    procesos de compra, compromisos y permisos.
                  </li>
                  <li>
                    Enviarte alertas y notificaciones operativas relevantes
                    sobre tus procesos.
                  </li>
                  <li>
                    Mantener la seguridad, integridad y disponibilidad de la
                    plataforma.
                  </li>
                  <li>
                    Cumplir con obligaciones legales o regulatorias aplicables.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  4. Uso de WhatsApp Business API
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  Pro.Curem Flow utiliza la <strong>WhatsApp Business API</strong>{" "}
                  para enviar alertas y notificaciones operativas relacionadas
                  con tus procesos de compra (por ejemplo, avances de etapa,
                  vencimientos de compromisos o permisos). Para ello,
                  compartimos únicamente el número de teléfono registrado, el
                  nombre del destinatario y el contenido estrictamente
                  necesario para personalizar el mensaje. Meta Platforms, Inc.
                  (operadora de WhatsApp) actúa como encargado del tratamiento
                  bajo sus propias condiciones de servicio y política de
                  privacidad.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  5. Almacenamiento y seguridad
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  Los datos se almacenan en servidores seguros gestionados por{" "}
                  <strong>Supabase</strong>, infraestructura cloud con altos
                  estándares de seguridad, cifrado en tránsito y en reposo,
                  autenticación robusta y control de acceso basado en roles.
                  Aplicamos medidas técnicas y organizativas apropiadas para
                  proteger tu información contra accesos no autorizados,
                  pérdida o alteración, incluyendo políticas de seguridad a
                  nivel de filas (RLS) que garantizan el aislamiento entre
                  empresas o tenants.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  6. Compartición con terceros
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  <strong>No vendemos ni compartimos tus datos personales</strong>{" "}
                  con terceros para fines comerciales o publicitarios. La única
                  excepción es el envío de notificaciones a través de{" "}
                  <strong>Meta/WhatsApp</strong>, descrito en la sección
                  anterior, siempre limitado a la información estrictamente
                  necesaria para dicho envío. Podemos revelar datos únicamente
                  cuando exista una obligación legal o una orden judicial
                  válida.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  7. Derechos de los usuarios
                </h3>
                <p className="text-foreground/90 leading-relaxed mb-3">
                  Como usuario de Pro.Curem Flow tienes los siguientes
                  derechos sobre tus datos personales:
                </p>
                <ul className="list-disc pl-6 space-y-1.5 text-foreground/90">
                  <li>
                    <strong>Acceso:</strong> conocer qué datos personales
                    tenemos sobre ti.
                  </li>
                  <li>
                    <strong>Rectificación:</strong> solicitar la corrección de
                    datos inexactos o desactualizados.
                  </li>
                  <li>
                    <strong>Eliminación:</strong> pedir la supresión de tus
                    datos cuando ya no sean necesarios para las finalidades
                    descritas, salvo obligación legal de conservarlos.
                  </li>
                  <li>
                    <strong>Oposición y limitación:</strong> solicitar que
                    dejemos de tratar tus datos en determinadas circunstancias
                    o que limitemos su uso.
                  </li>
                </ul>
                <p className="mt-3 text-foreground/90 leading-relaxed">
                  Para ejercer cualquiera de estos derechos, escríbenos a{" "}
                  <a
                    href="mailto:contacto@inovahr.com"
                    className="text-primary hover:underline font-medium"
                  >
                    contacto@inovahr.com
                  </a>{" "}
                  indicando tu solicitud. Responderemos en un plazo razonable.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  8. Conservación de la información
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  Conservamos tus datos personales únicamente durante el tiempo
                  necesario para cumplir con las finalidades descritas en esta
                  política, para mantener la disponibilidad histórica de tus
                  procesos de compra y para atender obligaciones legales. Una
                  vez que tus datos ya no sean necesarios, los eliminamos o
                  anonimizamos de forma segura.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  9. Cambios en esta política
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  Podemos actualizar esta Política de Privacidad ocasionalmente
                  para reflejar cambios en nuestros servicios, en la normativa
                  aplicable o en nuestras prácticas de tratamiento de datos.
                  Te notificaremos sobre cambios materiales a través de la
                  plataforma o por correo electrónico. La fecha de última
                  actualización se indica al inicio de este documento.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  10. Contacto
                </h3>
                <p className="text-foreground/90 leading-relaxed">
                  Si tienes preguntas, comentarios o deseas ejercer tus
                  derechos, puedes contactarnos:
                </p>
                <div className="mt-3 p-4 rounded-lg bg-muted/50 border">
                  <p className="text-foreground/90">
                    <strong>Empresa:</strong> InovaHR
                  </p>
                  <p className="text-foreground/90">
                    <strong>Plataforma:</strong> Pro.Curem Flow
                  </p>
                  <p className="text-foreground/90">
                    <strong>Correo electrónico:</strong>{" "}
                    <a
                      href="mailto:contacto@inovahr.com"
                      className="text-primary hover:underline font-medium"
                    >
                      contacto@inovahr.com
                    </a>
                  </p>
                </div>
              </section>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} InovaHR. Todos los derechos
            reservados.
          </p>
        </main>
      </div>
    </>
  );
}
