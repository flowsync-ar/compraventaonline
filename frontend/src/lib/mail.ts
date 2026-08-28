import "server-only"
import nodemailer from "nodemailer"

const HOST = process.env.SMTP_HOST ?? "smtp.gmail.com"
const PORT = Number(process.env.SMTP_PORT ?? 587)
const USER = process.env.SMTP_USER
const PASS = process.env.SMTP_PASSWORD

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function isMailConfigured(): boolean {
  return Boolean(USER && PASS)
}

function createMailTransporter() {
  return nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465,
    auth: { user: USER!, pass: PASS! },
  })
}

function fromAddress() {
  return `"CompraVentaOnline" <${USER}>`
}

export type SendResult = { sent: true } | { sent: false; reason: string }

export async function sendConfirmationEmail(params: {
  to: string
  fullName: string
  confirmUrl: string
  logoUrl: string
}): Promise<SendResult> {
  if (!isMailConfigured()) {
    console.warn("[mail] SMTP not configured: set SMTP_USER and SMTP_PASSWORD")
    return { sent: false, reason: "SMTP not configured" }
  }

  const { to, fullName, confirmUrl, logoUrl } = params
  const safeName = escapeHtml(fullName)

  try {
    const transporter = createMailTransporter()
    await transporter.sendMail({
      from: fromAddress(),
      to,
      subject: "Confirmá tu cuenta en CompraVentaOnline",
      text: [
        `Hola ${fullName},`,
        ``,
        `Gracias por registrarte en CompraVentaOnline.`,
        `Para activar tu cuenta, hacé clic en el siguiente enlace:`,
        ``,
        confirmUrl,
        ``,
        `Si no creaste esta cuenta, ignorá este correo.`,
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #f3e0c2;">
          <div style="background-color:#ffffff;padding:20px 48px;text-align:center;border-bottom:1px solid #f3e0c2;">
            <img src="${logoUrl}" alt="CompraVentaOnline" width="260" style="display:block;width:260px;height:auto;margin:0 auto;" />
          </div>

          <div style="padding:32px;">
            <h2 style="color:#d97706;margin-top:0;font-size:22px;">
              ¡Revisá tu correo!
            </h2>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin-bottom:8px;">
              Hola ${safeName},
            </p>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              Gracias por registrarte en <strong>CompraVentaOnline</strong>.
              Hacé clic en el botón para activar tu cuenta y empezar a publicar:
            </p>
            <div style="margin:28px 0;text-align:center;">
              <a
                href="${confirmUrl}"
                style="background-color:#2A6BC5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:15px;letter-spacing:0.02em;"
              >
                Confirmar mi cuenta
              </a>
            </div>
            <p style="color:#6B7280;font-size:12px;line-height:1.5;">
              Si el botón no funciona, copiá este enlace en tu navegador:<br/>
              <a href="${confirmUrl}" style="color:#d97706;word-break:break-all;">${confirmUrl}</a>
            </p>
          </div>

          <div style="background:#fef6e7;padding:16px 32px;border-top:1px solid #f3e0c2;text-align:center;">
            <p style="color:#9CA3AF;font-size:11px;margin:0;">
              Si no creaste esta cuenta, ignorá este correo.<br/>© 2026 CompraVentaOnline · La Pampa
            </p>
          </div>
        </div>
      `,
    })
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendPasswordResetEmail(params: {
  to: string
  resetUrl: string
  logoUrl: string
}): Promise<SendResult> {
  if (!isMailConfigured()) {
    console.warn("[mail] SMTP not configured: set SMTP_USER and SMTP_PASSWORD")
    return { sent: false, reason: "SMTP not configured" }
  }

  const { to, resetUrl, logoUrl } = params

  try {
    const transporter = createMailTransporter()
    await transporter.sendMail({
      from: fromAddress(),
      to,
      subject: "Restablecé tu contraseña de CompraVentaOnline",
      text: [
        `Hola,`,
        ``,
        `Recibimos un pedido para restablecer la contraseña de tu cuenta en CompraVentaOnline.`,
        `Para elegir una nueva contraseña, hacé clic en el siguiente enlace:`,
        ``,
        resetUrl,
        ``,
        `Si vos no pediste esto, ignorá este correo — tu contraseña actual sigue siendo válida.`,
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #f3e0c2;">
          <div style="background-color:#ffffff;padding:20px 48px;text-align:center;border-bottom:1px solid #f3e0c2;">
            <img src="${logoUrl}" alt="CompraVentaOnline" width="260" style="display:block;width:260px;height:auto;margin:0 auto;" />
          </div>

          <div style="padding:32px;">
            <h2 style="color:#d97706;margin-top:0;font-size:22px;">
              Restablecé tu contraseña
            </h2>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              Recibimos un pedido para restablecer la contraseña de tu cuenta.
              Hacé clic en el botón para elegir una nueva:
            </p>
            <div style="margin:28px 0;text-align:center;">
              <a
                href="${resetUrl}"
                style="background-color:#2A6BC5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:15px;letter-spacing:0.02em;"
              >
                Elegir nueva contraseña
              </a>
            </div>
            <p style="color:#6B7280;font-size:12px;line-height:1.5;">
              Si el botón no funciona, copiá este enlace en tu navegador:<br/>
              <a href="${resetUrl}" style="color:#d97706;word-break:break-all;">${resetUrl}</a>
            </p>
          </div>

          <div style="background:#fef6e7;padding:16px 32px;border-top:1px solid #f3e0c2;text-align:center;">
            <p style="color:#9CA3AF;font-size:11px;margin:0;">
              Si vos no pediste esto, ignorá este correo.<br/>© 2026 CompraVentaOnline · La Pampa
            </p>
          </div>
        </div>
      `,
    })
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendQuestionEmailToSeller(params: {
  to: string
  sellerName: string
  buyerName: string
  productName: string
  question: string
  listingUrl: string
  logoUrl: string
}): Promise<SendResult> {
  if (!isMailConfigured()) {
    console.warn("[mail] SMTP not configured: set SMTP_USER and SMTP_PASSWORD")
    return { sent: false, reason: "SMTP not configured" }
  }

  const { to, sellerName, buyerName, productName, question, listingUrl, logoUrl } = params
  const safeSellerName = escapeHtml(sellerName)
  const safeBuyerName = escapeHtml(buyerName)
  const safeProductName = escapeHtml(productName)
  const safeQuestion = escapeHtml(question)

  try {
    const transporter = createMailTransporter()
    await transporter.sendMail({
      from: fromAddress(),
      to,
      subject: `Tenés una pregunta sobre "${productName}"`,
      text: [
        `Hola ${sellerName},`,
        ``,
        `${buyerName} te dejó una pregunta sobre tu publicación "${productName}":`,
        ``,
        question,
        ``,
        `Para responder, entrá a la publicación:`,
        listingUrl,
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #f3e0c2;">
          <div style="background-color:#ffffff;padding:20px 48px;text-align:center;border-bottom:1px solid #f3e0c2;">
            <img src="${logoUrl}" alt="CompraVentaOnline" width="260" style="display:block;width:260px;height:auto;margin:0 auto;" />
          </div>

          <div style="padding:32px;">
            <h2 style="color:#d97706;margin-top:0;font-size:22px;">
              Tenés una nueva pregunta
            </h2>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin-bottom:8px;">
              Hola ${safeSellerName},
            </p>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              <strong>${safeBuyerName}</strong> te dejó una pregunta sobre tu publicación <strong>${safeProductName}</strong>:
            </p>
            <div style="margin:16px 0;padding:12px 16px;background:#f9fafb;border-left:3px solid #d97706;border-radius:4px;">
              <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${safeQuestion}</p>
            </div>
            <div style="margin:28px 0;text-align:center;">
              <a
                href="${listingUrl}"
                style="background-color:#2A6BC5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:15px;letter-spacing:0.02em;"
              >
                Ver la publicación
              </a>
            </div>
            <p style="color:#6B7280;font-size:12px;line-height:1.5;">
              Si el botón no funciona, copiá este enlace en tu navegador:<br/>
              <a href="${listingUrl}" style="color:#d97706;word-break:break-all;">${listingUrl}</a>
            </p>
          </div>

          <div style="background:#fef6e7;padding:16px 32px;border-top:1px solid #f3e0c2;text-align:center;">
            <p style="color:#9CA3AF;font-size:11px;margin:0;">
              © 2026 CompraVentaOnline · La Pampa
            </p>
          </div>
        </div>
      `,
    })
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendAnswerEmailToBuyer(params: {
  to: string
  buyerName: string
  sellerName: string
  productName: string
  question: string
  answer: string
  listingUrl: string
  logoUrl: string
}): Promise<SendResult> {
  if (!isMailConfigured()) {
    console.warn("[mail] SMTP not configured: set SMTP_USER and SMTP_PASSWORD")
    return { sent: false, reason: "SMTP not configured" }
  }

  const { to, buyerName, sellerName, productName, question, answer, listingUrl, logoUrl } = params
  const safeBuyerName = escapeHtml(buyerName)
  const safeSellerName = escapeHtml(sellerName)
  const safeProductName = escapeHtml(productName)
  const safeQuestion = escapeHtml(question)
  const safeAnswer = escapeHtml(answer)

  try {
    const transporter = createMailTransporter()
    await transporter.sendMail({
      from: fromAddress(),
      to,
      subject: `Te respondieron sobre "${productName}"`,
      text: [
        `Hola ${buyerName},`,
        ``,
        `${sellerName} respondió tu pregunta sobre "${productName}":`,
        ``,
        `Tu pregunta: ${question}`,
        `Respuesta: ${answer}`,
        ``,
        `Para ver la publicación:`,
        listingUrl,
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #f3e0c2;">
          <div style="background-color:#ffffff;padding:20px 48px;text-align:center;border-bottom:1px solid #f3e0c2;">
            <img src="${logoUrl}" alt="CompraVentaOnline" width="260" style="display:block;width:260px;height:auto;margin:0 auto;" />
          </div>

          <div style="padding:32px;">
            <h2 style="color:#d97706;margin-top:0;font-size:22px;">
              Te respondieron tu pregunta
            </h2>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin-bottom:8px;">
              Hola ${safeBuyerName},
            </p>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              <strong>${safeSellerName}</strong> respondió tu pregunta sobre <strong>${safeProductName}</strong>:
            </p>
            <div style="margin:16px 0;padding:12px 16px;background:#f9fafb;border-left:3px solid #9CA3AF;border-radius:4px;">
              <p style="color:#6B7280;font-size:12px;margin:0 0 4px;font-weight:700;">Tu pregunta</p>
              <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${safeQuestion}</p>
            </div>
            <div style="margin:16px 0;padding:12px 16px;background:#f9fafb;border-left:3px solid #d97706;border-radius:4px;">
              <p style="color:#6B7280;font-size:12px;margin:0 0 4px;font-weight:700;">Respuesta</p>
              <p style="color:#374151;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${safeAnswer}</p>
            </div>
            <div style="margin:28px 0;text-align:center;">
              <a
                href="${listingUrl}"
                style="background-color:#2A6BC5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;font-size:15px;letter-spacing:0.02em;"
              >
                Ver la publicación
              </a>
            </div>
            <p style="color:#6B7280;font-size:12px;line-height:1.5;">
              Si el botón no funciona, copiá este enlace en tu navegador:<br/>
              <a href="${listingUrl}" style="color:#d97706;word-break:break-all;">${listingUrl}</a>
            </p>
          </div>

          <div style="background:#fef6e7;padding:16px 32px;border-top:1px solid #f3e0c2;text-align:center;">
            <p style="color:#9CA3AF;font-size:11px;margin:0;">
              © 2026 CompraVentaOnline · La Pampa
            </p>
          </div>
        </div>
      `,
    })
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) }
  }
}
