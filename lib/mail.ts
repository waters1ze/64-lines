import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/verify?token=${token}`
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #333;">Добро пожаловать в Шахматную школу 64 Линии!</h2>
      <p>Для завершения регистрации подтвердите ваш адрес электронной почты.</p>
      <a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">
        Подтвердить почту
      </a>
      <p style="color: #666; font-size: 14px;">Если кнопка не работает, перейдите по этой ссылке:</p>
      <p style="color: #666; font-size: 14px; word-break: break-all;">${verifyUrl}</p>
    </div>
  `

  await transporter.sendMail({
    from: `"Шахматная школа 64 Линии" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: "Подтверждение почты — Шахматная школа 64 Линии",
    html,
  })
}

export async function sendCourseDeliveryEmail(to: string, courseName: string, fileUrl: string, pgnContent?: string | null) {
  const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #333;">Оплата подтверждена! 🎉</h2>
      <p>Вы успешно приобрели дебютный курс <b>${courseName}</b>.</p>
      <p>Материалы курса теперь доступны в вашем личном кабинете на сайте (вкладка "Учебные модули" или "Дебютные курсы").</p>
      ${pgnContent ? '<p>PGN-файл с базой дебютов прикреплен к этому письму. Вы можете открыть его в ChessBase, lichess или любом другом шахматном ПО.</p>' : ''}
      <div style="margin: 30px 0;">
        <a href="${siteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Открыть курс на сайте
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">Спасибо за покупку! Приятного обучения.</p>
    </div>
  `

  const attachments: any[] = []
  if (pgnContent) {
    attachments.push({
      filename: `${courseName.replace(/[^a-zA-Zа-яА-Я0-9 ]/g, '')}.pgn`,
      content: pgnContent,
      contentType: 'application/x-chess-pgn',
    })
  }

  await transporter.sendMail({
    from: `"Шахматная школа 64 Линии" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: `Ваш курс "${courseName}" готов! — Шахматная школа 64 Линии`,
    html,
    attachments,
  })
}
