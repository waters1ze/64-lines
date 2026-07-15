import Groq from 'groq-sdk'

// Prevent error if GROQ_API_KEY is not set (e.g. during build)
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null

export async function getWeakThemesRecommendation(themesFrequency: Record<string, number>, studentName: string) {
  if (!groq) {
    return 'Учитель еще не настроил AI (GROQ_API_KEY). Рекомендуем обратить внимание на самые частые ошибки.'
  }

  const themesStr = Object.entries(themesFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([theme, count]) => `${theme}: ${count} ошибок`)
    .join('\n')

  const prompt = `Ты — профессиональный шахматный тренер. Твой ученик по имени ${studentName} часто ошибается в следующих тактических темах:\n${themesStr}\n\nТвоя задача: дать краткую, ободряющую и профессиональную рекомендацию (не более 3-4 предложений) о том, как ученику подтянуть эти темы. Пиши по-русски, обращайся к ученику по имени.`

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Ты профессиональный шахматный тренер. Пишешь кратко и по делу.'
        },
        {
          role: 'user',
          content: prompt,
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    })

    return chatCompletion.choices[0]?.message?.content || 'Не удалось получить рекомендацию.'
  } catch (error) {
    console.error('Groq API Error:', error)
    return 'Ошибка получения рекомендации от AI.'
  }
}
