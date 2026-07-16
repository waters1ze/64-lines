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

export interface RecommendedItem {
  id: string
  title: string
  reason: string
}

export interface WeakThemesWithRecommendations {
  recommendation: string
  recommendedVideos: RecommendedItem[]
  recommendedOpenings: RecommendedItem[]
}

/**
 * Extended analysis: takes pre-filtered lists of videos/openings matching
 * the student's weak themes, asks Groq to pick the most relevant ones.
 */
export async function getWeakThemesWithRecommendations(
  themesFrequency: Record<string, number>,
  studentName: string,
  matchedVideos: { id: string; title: string }[],
  matchedOpenings: { id: string; title: string }[]
): Promise<WeakThemesWithRecommendations> {
  const fallback: WeakThemesWithRecommendations = {
    recommendation: 'Не удалось получить рекомендацию от AI. Обратите внимание на самые частые ошибки.',
    recommendedVideos: matchedVideos.slice(0, 3).map(v => ({ id: v.id, title: v.title, reason: 'Соответствует слабым темам' })),
    recommendedOpenings: matchedOpenings.slice(0, 2).map(o => ({ id: o.id, title: o.title, reason: 'Соответствует слабым темам' })),
  }

  if (!groq) return fallback

  const themesStr = Object.entries(themesFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme, count]) => `${theme}: ${count} ошибок`)
    .join('\n')

  const videosList = matchedVideos.map((v, i) => `${i + 1}. [ID: ${v.id}] ${v.title}`).join('\n')
  const openingsList = matchedOpenings.map((o, i) => `${i + 1}. [ID: ${o.id}] ${o.title}`).join('\n')

  const prompt = `Ты — профессиональный шахматный тренер. Ученик ${studentName} допускает ошибки в следующих темах:
${themesStr}

Из библиотеки уже отобраны материалы, подходящие по тематике.

Видеоуроки (выбери 1-3 наиболее релевантных):
${videosList || '(нет подходящих видеоуроков)'}

Дебютные курсы (выбери 1-2 наиболее релевантных):
${openingsList || '(нет подходящих дебютных курсов)'}

Ответь СТРОГО в формате JSON (без markdown-блоков, только чистый JSON):
{
  "recommendation": "Краткий текст рекомендации для ученика (3-4 предложения на русском)",
  "recommendedVideos": [{"id": "...", "title": "...", "reason": "Краткая причина на русском"}],
  "recommendedOpenings": [{"id": "...", "title": "...", "reason": "Краткая причина на русском"}]
}

Если видео/дебютов нет — верни пустые массивы. Не придумывай ID, используй только те, что в списке выше.`

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Ты профессиональный шахматный тренер. Отвечаешь ТОЛЬКО валидным JSON без markdown.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
    })

    const content = chatCompletion.choices[0]?.message?.content || ''
    // Strip any accidental markdown code fences
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    const parsed = JSON.parse(cleaned) as WeakThemesWithRecommendations
    return {
      recommendation: parsed.recommendation || fallback.recommendation,
      recommendedVideos: Array.isArray(parsed.recommendedVideos) ? parsed.recommendedVideos : [],
      recommendedOpenings: Array.isArray(parsed.recommendedOpenings) ? parsed.recommendedOpenings : [],
    }
  } catch (error) {
    console.error('Groq API Error (recommendations):', error)
    return fallback
  }
}

