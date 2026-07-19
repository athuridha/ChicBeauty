import nodemailer from 'nodemailer'

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_PORT
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS ?? '',
            }
          : undefined,
      })
    : null

export async function sendEmail(to: string, subject: string, text: string) {
  if (!transporter) {
    console.log('[email mock]', { to, subject, text })
    return
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'no-reply@amar.test',
    to,
    subject,
    text,
  })
}
