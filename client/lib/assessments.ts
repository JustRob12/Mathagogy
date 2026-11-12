import rawData from '@/data/assessments.json'

export type CognitiveSkill = 'Remembering' | 'Understanding' | 'Applying'

export interface Question {
  id: number
  question: string
  answer: string
  topic: string
  cognitiveSkill: CognitiveSkill
  youtubeLinks: string[]
  options?: string[]
}

export interface AlignedLikertStatement {
  id: number
  topic: string
  statement: string
}

export interface Assessment {
  id: string
  grade: 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10'
  term: 'Term 1' | 'Term 2' | 'Term 3'
  title: string
  totalQuestions: number
  alignedLikertStatements: AlignedLikertStatement[]
  questions: Question[]
}

export interface LikertOption {
  value: number
  label: string
  color: string
}

export const LIKERT_RESPONSE_SCALE: LikertOption[] = [
  { value: 5, label: 'Strongly Agree', color: '#15803d' }, // Deep green
  { value: 4, label: 'Agree', color: '#22c55e' },          // Light green
  { value: 3, label: 'Neutral', color: '#64748b' },        // Slate neutral
  { value: 2, label: 'Disagree', color: '#f97316' },       // Orange
  { value: 1, label: 'Strongly Disagree', color: '#ef4444' }, // Red
]

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
  options: { value: number; label: string }[]
  questions: LikertQuestion[]
}

export interface TOSSkillStats {
  skill: CognitiveSkill
  correct: number
  total: number
  percentage: number
  topics: string[]
}

export type SeverityLevel = 'Critical' | 'Moderate' | 'Mastered'

export interface TopicAssessmentResult {
  topic: string
  correct: number
  total: number
  percentage: number
  severity: SeverityLevel
  severityLabel: string
  cognitiveSkills: CognitiveSkill[]
  perceivedRating: number // 1 - 5 from Likert
  perceivedInterpretation: string
  quadrant: 'Blind Spot' | 'Underconfident' | 'Confirmed Learning Gap' | 'Mastered Competency'
  quadrantAnalysis: string
  studyTip: string
  youtubeLinks: string[]
}

export interface DiagnosticResult {
  score: number
  total: number
  percentage: number
  passed: boolean
  tosStats: Record<CognitiveSkill, TOSSkillStats>
  topicResults: TopicAssessmentResult[]
  likertResponses: Record<number, number>
  averageLikertRating: number
  userAnswers: {
    questionId: number
    userAnswer: string
    isCorrect: boolean
    topic: string
    cognitiveSkill: CognitiveSkill
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
  weak_topics?: any
  category_scores?: any
  tos_stats?: any
  topic_results?: any
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

/**
 * Text normalization for direct open-ended question grading
 */
export function normalizeAnswer(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/[,\.]+\s*$/, '') // remove trailing dot or comma
    .replace(/\s+/g, ' ')
}

export function stripUnits(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/,/g, '') // remove thousands commas (e.g. 1,200 -> 1200)
    .replace(
      /\b(degrees|degree|deg|°|sides|side|meters|meter|m|centimeters|centimeter|cm|square cm|sq cm|cubic cm|cu cm|cubic meters|grams|gram|g|kilograms|kilogram|kg|milliliters|milliliter|ml|liters|liter|l|pesos|peso|cups|cup|inches|inch|feet|ft|pounds|lbs|miles|mile|km|approx|approximately|square|cubic|units|unit|terms|term)\b/g,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Intelligent flexible answer evaluation:
 * Supports case insensitivity, number equivalence, unit tolerance,
 * and alternative forms (e.g., "11.31" vs "8sqrt(2) cm, or approximately 11.31 cm").
 */
export function evaluateAnswer(userRaw: string, canonicalRaw: string): boolean {
  const userNorm = normalizeAnswer(userRaw)
  const canonNorm = normalizeAnswer(canonicalRaw)

  if (!userNorm) return false
  if (userNorm === canonNorm) return true

  // Strip polygon or polygon variants
  const stripPoly = (s: string) => s.replace(/\s+polygon\b/g, '').replace(/-/g, ' ').trim()
  if (stripPoly(userNorm) === stripPoly(canonNorm)) return true

  // Split alternatives in canonical (e.g. '8sqrt(2) cm, or approximately 11.31 cm')
  const alternatives = canonNorm
    .split(/[,;]|\bor\b/)
    .map((s) => s.trim())
    .filter(Boolean)
  alternatives.push(canonNorm)

  for (const alt of alternatives) {
    if (userNorm === alt) return true
    if (stripPoly(userNorm) === stripPoly(alt)) return true

    const cleanUser = stripUnits(userNorm)
    const cleanAlt = stripUnits(alt)

    if (cleanUser && cleanUser === cleanAlt) return true

    // Compare numeric values
    const numUser = parseFloat(cleanUser.replace(/[^\d.-]/g, ''))
    const numAlt = parseFloat(cleanAlt.replace(/[^\d.-]/g, ''))
    if (!isNaN(numUser) && !isNaN(numAlt)) {
      if (Math.abs(numUser - numAlt) < 0.05) return true
    }
  }

  return false
}

export function getLikertInterpretation(rating: number): string {
  if (rating >= 4.5) return 'Strongly Agree'
  if (rating >= 3.5) return 'Agree'
  if (rating >= 2.5) return 'Neutral'
  if (rating >= 1.5) return 'Disagree'
  return 'Strongly Disagree'
}

/**
 * Grade diagnostic test with TOS and Likert comparison
 */
export function gradeDiagnostic(
  assessment: Assessment,
  userAnswersMap: Record<number, string>,
  likertResponses: Record<number, number> = {}
): DiagnosticResult {
  let totalScore = 0

  // TOS Tracking
  const tosStats: Record<CognitiveSkill, { correct: number; total: number; topics: Set<string> }> = {
    Remembering: { correct: 0, total: 0, topics: new Set() },
    Understanding: { correct: 0, total: 0, topics: new Set() },
    Applying: { correct: 0, total: 0, topics: new Set() },
  }

  // Topic Tracking
  const topicMap: Record<
    string,
    {
      correct: number
      total: number
      cognitiveSkills: Set<CognitiveSkill>
      youtubeLinks: string[]
    }
  > = {}

  const userAnswers = assessment.questions.map((q) => {
    const rawInput = userAnswersMap[q.id] ?? ''
    const isCorrect = evaluateAnswer(rawInput, q.answer)

    if (isCorrect) totalScore += 1

    // Update TOS
    const skill = q.cognitiveSkill || 'Applying'
    tosStats[skill].total += 1
    tosStats[skill].topics.add(q.topic)
    if (isCorrect) {
      tosStats[skill].correct += 1
    }

    // Update Topic
    if (!topicMap[q.topic]) {
      topicMap[q.topic] = {
        correct: 0,
        total: 0,
        cognitiveSkills: new Set(),
        youtubeLinks: q.youtubeLinks ?? [],
      }
    }
    topicMap[q.topic].total += 1
    topicMap[q.topic].cognitiveSkills.add(skill)
    if (isCorrect) {
      topicMap[q.topic].correct += 1
    }

    return {
      questionId: q.id,
      userAnswer: rawInput,
      isCorrect,
      topic: q.topic,
      cognitiveSkill: skill,
    }
  })

  const total = assessment.questions.length
  const percentage = Math.round((totalScore / total) * 100 * 10) / 10
  const passed = percentage >= 75 // 75% standard passing threshold

  // Format TOS Breakdown
  const finalTOS: Record<CognitiveSkill, TOSSkillStats> = {
    Remembering: {
      skill: 'Remembering',
      correct: tosStats.Remembering.correct,
      total: tosStats.Remembering.total,
      percentage:
        tosStats.Remembering.total > 0
          ? Math.round((tosStats.Remembering.correct / tosStats.Remembering.total) * 100)
          : 0,
      topics: Array.from(tosStats.Remembering.topics),
    },
    Understanding: {
      skill: 'Understanding',
      correct: tosStats.Understanding.correct,
      total: tosStats.Understanding.total,
      percentage:
        tosStats.Understanding.total > 0
          ? Math.round((tosStats.Understanding.correct / tosStats.Understanding.total) * 100)
          : 0,
      topics: Array.from(tosStats.Understanding.topics),
    },
    Applying: {
      skill: 'Applying',
      correct: tosStats.Applying.correct,
      total: tosStats.Applying.total,
      percentage:
        tosStats.Applying.total > 0
          ? Math.round((tosStats.Applying.correct / tosStats.Applying.total) * 100)
          : 0,
      topics: Array.from(tosStats.Applying.topics),
    },
  }

  // Calculate Average Likert Rating
  const likertVals = Object.values(likertResponses)
  const averageLikertRating =
    likertVals.length > 0
      ? Math.round((likertVals.reduce((a, b) => a + b, 0) / likertVals.length) * 10) / 10
      : 3.0

  // Topic statement mapping (statement index to topic)
  const statementTopicMap: Record<string, number> = {}
  assessment.alignedLikertStatements.forEach((stmt) => {
    statementTopicMap[stmt.topic] = likertResponses[stmt.id] ?? 3
  })

  // Format Topic Results with Severity Levels & Quadrant Comparison
  const topicResults: TopicAssessmentResult[] = Object.entries(topicMap).map(
    ([topic, stats]) => {
      const topicPct = Math.round((stats.correct / stats.total) * 100)
      const perceivedRating = statementTopicMap[topic] ?? 3
      const perceivedInterpretation = getLikertInterpretation(perceivedRating)

      // Severity Level:
      // Critical (<50%), Moderate (50-74%), Mastered (>=75%)
      let severity: SeverityLevel = 'Mastered'
      let severityLabel = 'Low Severity (Mastered)'
      if (topicPct < 50) {
        severity = 'Critical'
        severityLabel = 'High Severity (Critical Gap)'
      } else if (topicPct < 75) {
        severity = 'Moderate'
        severityLabel = 'Moderate Severity (Needs Review)'
      }

      // Likert vs Actual Quadrant Analysis:
      // High confidence = rating >= 3.5, Low confidence = rating < 3.5
      // High performance = topicPct >= 75%, Low performance = topicPct < 75%
      let quadrant: 'Blind Spot' | 'Underconfident' | 'Confirmed Learning Gap' | 'Mastered Competency'
      let quadrantAnalysis = ''
      let studyTip = ''

      if (perceivedRating >= 3.5 && topicPct < 75) {
        quadrant = 'Blind Spot'
        quadrantAnalysis =
          'You felt confident, but the diagnostic performance indicates gaps in execution or underlying misconceptions.'
        studyTip =
          'Review the provided YouTube lesson carefully, solve step-by-step example problems, and verify calculations before submitting.'
      } else if (perceivedRating < 3.5 && topicPct >= 75) {
        quadrant = 'Underconfident'
        quadrantAnalysis =
          'You reported hesitation or lack of confidence, yet your diagnostic performance was strong and met mastery.'
        studyTip =
          'Trust your mathematical abilities. Your foundation is solid; practice explaining your steps to reinforce self-confidence.'
      } else if (perceivedRating < 3.5 && topicPct < 75) {
        quadrant = 'Confirmed Learning Gap'
        quadrantAnalysis =
          'Your perceived difficulty aligns with your test score. This topic represents a high-priority area for remedial intervention.'
        studyTip =
          'Start with foundational concepts from the video tutorial. Break problems into smaller steps and practice daily drills.'
      } else {
        quadrant = 'Mastered Competency'
        quadrantAnalysis =
          'Your confidence and diagnostic accuracy are both high. You have achieved solid mastery of this learning competency.'
        studyTip =
          'Continue applying these skills to more complex word problems and advanced applications.'
      }

      return {
        topic,
        correct: stats.correct,
        total: stats.total,
        percentage: topicPct,
        severity,
        severityLabel,
        cognitiveSkills: Array.from(stats.cognitiveSkills),
        perceivedRating,
        perceivedInterpretation,
        quadrant,
        quadrantAnalysis,
        studyTip,
        youtubeLinks: stats.youtubeLinks,
      }
    }
  )

  // Sort topic results: Critical first, then Moderate, then Mastered
  topicResults.sort((a, b) => a.percentage - b.percentage)

  return {
    score: totalScore,
    total,
    percentage,
    passed,
    tosStats: finalTOS,
    topicResults,
    likertResponses,
    averageLikertRating,
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
