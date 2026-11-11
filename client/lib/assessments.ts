import rawData from '@/data/assessments.json'

export interface Question {
  id: number
  question: string
  options: string[]
  correctIndex: number
  answer: string
  topic: string
  youtubeLinks: string[]
}

export interface Assessment {
  id: string
  grade: 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10'
  term: 'Term 1' | 'Term 2' | 'Term 3'
  title: string
  totalQuestions: number
  questions: Question[]
}

export interface LikertOption {
  value: number
  label: string
}

export interface LikertQuestion {
  id: number
  category: 'anxiety' | 'mindset' | 'motivation' | 'self_efficacy'
  categoryLabel: string
  statement: string
}

export interface LikertScale {
  id: string
  title: string
  totalQuestions: number
  options: LikertOption[]
  questions: LikertQuestion[]
}

export interface WeakTopic {
  topic: string
  incorrectCount: number
  totalCount: number
  youtubeLinks: string[]
}

export interface DiagnosticResult {
  score: number
  total: number
  percentage: number
  passed: boolean
  weakTopics: WeakTopic[]
  userAnswers: {
    questionId: number
    selectedOption: string
    selectedIndex: number
    correctOption: string
    correctIndex: number
    isCorrect: boolean
    topic: string
  }[]
}

export interface LikertResult {
  totalAverage: number
  categories: {
    key: string
    label: string
    score: number // average 1-5
    interpretation: string
  }[]
  responses: Record<number, number>
}

export interface AssessmentAttempt {
  id: string
  user_id: string
  grade: string
  term: string
  test_type: 'diagnostic' | 'likert'
  score: number
  total_questions: number
  percentage: number
  passed: boolean
  answers: any
  weak_topics: WeakTopic[]
  category_scores?: any
  completed_at: string
}

export const ALL_ASSESSMENTS: Assessment[] = rawData.assessments as Assessment[]
export const LIKERT_SCALE: LikertScale = rawData.likertScale as LikertScale

export const GRADES = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'] as const
export type GradeLevel = (typeof GRADES)[number]

export function getAssessmentsByGrade(grade: string): Assessment[] {
  return ALL_ASSESSMENTS.filter((a) => a.grade === grade)
}

export function getAssessmentById(id: string): Assessment | undefined {
  return ALL_ASSESSMENTS.find((a) => a.id === id)
}

export function gradeDiagnostic(
  assessment: Assessment,
  selectedIndices: Record<number, number>
): DiagnosticResult {
  let score = 0
  const topicMap: Record<
    string,
    { incorrect: number; total: number; urls: string[] }
  > = {}

  const userAnswers = assessment.questions.map((q) => {
    const selectedIdx = selectedIndices[q.id]
    const isCorrect = selectedIdx === q.correctIndex
    if (isCorrect) score += 1

    if (!topicMap[q.topic]) {
      topicMap[q.topic] = {
        incorrect: 0,
        total: 0,
        urls: q.youtubeLinks ?? [],
      }
    }
    topicMap[q.topic].total += 1
    if (!isCorrect) {
      topicMap[q.topic].incorrect += 1
    }

    return {
      questionId: q.id,
      selectedOption: selectedIdx !== undefined ? q.options[selectedIdx] : '',
      selectedIndex: selectedIdx ?? -1,
      correctOption: q.options[q.correctIndex],
      correctIndex: q.correctIndex,
      isCorrect,
      topic: q.topic,
    }
  })

  const total = assessment.questions.length
  const percentage = Math.round((score / total) * 100 * 100) / 100
  const passed = percentage >= 75 // 75% standard passing rate

  // Identify weak topics (any topic with mistakes, sorted by most mistakes)
  const weakTopics: WeakTopic[] = Object.entries(topicMap)
    .filter(([_, stats]) => stats.incorrect > 0)
    .sort((a, b) => b[1].incorrect - a[1].incorrect)
    .map(([topic, stats]) => ({
      topic,
      incorrectCount: stats.incorrect,
      totalCount: stats.total,
      youtubeLinks: stats.urls,
    }))

  return {
    score,
    total,
    percentage,
    passed,
    weakTopics,
    userAnswers,
  }
}

export function scoreLikert(responses: Record<number, number>): LikertResult {
  const catSums: Record<string, { sum: number; count: number; label: string }> =
    {
      anxiety: { sum: 0, count: 0, label: 'Math Anxiety' },
      mindset: {
        sum: 0,
        count: 0,
        label: 'Academic Mindset About Mathematics',
      },
      motivation: {
        sum: 0,
        count: 0,
        label: 'Motivation to Learn Mathematics',
      },
      self_efficacy: { sum: 0, count: 0, label: 'Mathematics Self-Efficacy' },
    }

  LIKERT_SCALE.questions.forEach((q) => {
    const val = responses[q.id] || 3
    if (catSums[q.category]) {
      catSums[q.category].sum += val
      catSums[q.category].count += 1
    }
  })

  const categories = Object.entries(catSums).map(([key, data]) => {
    const avg =
      data.count > 0 ? Math.round((data.sum / data.count) * 100) / 100 : 0
    let interpretation = 'Moderate'
    if (key === 'anxiety') {
      if (avg >= 3.5) interpretation = 'High Anxiety'
      else if (avg <= 2.5) interpretation = 'Low Anxiety'
    } else {
      if (avg >= 4.0) interpretation = 'Strong'
      else if (avg >= 3.0) interpretation = 'Moderate'
      else interpretation = 'Needs Encouragement'
    }

    return {
      key,
      label: data.label,
      score: avg,
      interpretation,
    }
  })

  const totalSum = Object.values(catSums).reduce((acc, c) => acc + c.sum, 0)
  const totalCount = Object.values(catSums).reduce((acc, c) => acc + c.count, 0)
  const totalAverage =
    totalCount > 0 ? Math.round((totalSum / totalCount) * 100) / 100 : 0

  return {
    totalAverage,
    categories,
    responses,
  }
}

