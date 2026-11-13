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

export interface RemedialQuestion {
  id: number
  question: string
  answer: string
  cognitiveSkill: CognitiveSkill
  userAnswer: string
  explanation: string
  topic?: string
}

export interface TopicAssessmentResult {
  topic: string
  correct: number
  total: number
  percentage: number
  status: 'Mastered' | 'Review Recommended'
  statusLabel: string
  cognitiveSkills: CognitiveSkill[]
  perceivedRating: number // 1 - 5 from Likert
  perceivedInterpretation: string
  quadrant: 'Blind Spot' | 'Underconfident' | 'Confirmed Learning Gap' | 'Mastered Competency'
  quadrantAnalysis: string
  studyTip: string
  youtubeLinks: string[]
  missedQuestions: RemedialQuestion[]
}

export interface PercentageAdvice {
  tier: 'exemplary' | 'proficient' | 'developing' | 'foundational'
  title: string
  badge: string
  advice: string
  recommendations: string[]
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
  percentageAdvice: PercentageAdvice
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

export interface RetakeAttempt {
  id: string
  user_id: string
  grade: string
  term: string
  initial_score: number
  initial_total: number
  initial_percentage: number
  score: number
  total_questions: number
  percentage: number
  improvement_percentage: number
  passed: boolean
  answers: {
    questionId: number
    question: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    explanation: string
  }[]
  completed_at: string
}

export interface PostTestAttempt {
  id: string
  user_id: string
  grade: string
  term: string
  topic: string
  score: number
  total_questions: number
  percentage: number
  passed: boolean
  answers: {
    questionId: number
    question: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    explanation: string
  }[]
  completed_at: string
}

export interface AssessmentAttempt {
  id: string
  user_id: string
  grade: string
  term: string
  test_type: 'diagnostic' | 'likert' | 'post_test' | 'retake'
  topic?: string
  initial_score?: number
  initial_total?: number
  initial_percentage?: number
  improvement_percentage?: number
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
 * Generates tailored pedagogical advice based on diagnostic test percentage
 */
export function getAdviceByPercentage(percentage: number): PercentageAdvice {
  if (percentage >= 90) {
    return {
      tier: 'exemplary',
      title: 'Exemplary Mastery',
      badge: `${percentage}% Score • Advanced`,
      advice:
        'Outstanding work! You have shown superior conceptual understanding and procedural fluency across this term\'s mathematics competencies. Your high accuracy indicates you are ready for advanced enrichment challenges.',
      recommendations: [
        'Challenge yourself with higher-level non-routine problems and mathematical olympiad questions.',
        'Deepen your mastery by explaining problem-solving strategies to classmates or study groups.',
        'Preview upcoming term topics to maintain momentum and stay ahead in the curriculum.',
      ],
    }
  } else if (percentage >= 75) {
    return {
      tier: 'proficient',
      title: 'Proficient Mastery (Benchmark Met)',
      badge: `${percentage}% Score • Proficient`,
      advice:
        'Great job! You have achieved the standard 75% mastery benchmark and established a solid working foundation. With focused attention on the few missed areas below, you can reach top-tier performance.',
      recommendations: [
        'Review the specific practice questions below for topics where minor errors occurred.',
        'Practice writing down intermediate calculation steps to prevent careless arithmetic or sign slips.',
        'Consolidate your recall of key geometric formulas and algebraic properties through quick periodic reviews.',
      ],
    }
  } else if (percentage >= 50) {
    return {
      tier: 'developing',
      title: 'Developing Competency (Review Needed)',
      badge: `${percentage}% Score • Review Needed`,
      advice:
        'You have grasped key foundational principles, but there are inconsistent gaps in computation and concept application. Targeted remedial review will help you reach full benchmark passing.',
      recommendations: [
        'Watch the provided YouTube video lessons for each topic that scored below 75%.',
        'Solve each remedial practice problem provided below, following the step-by-step guidance provided.',
        'Focus on understanding the mathematical reasoning behind each formula instead of relying on rote memorization.',
      ],
    }
  } else {
    return {
      tier: 'foundational',
      title: 'Foundational Support Required',
      badge: `${percentage}% Score • Foundational Focus`,
      advice:
        'This diagnostic assessment indicates that fundamental concepts and procedural skills need structured review. Remember that a diagnostic test is not a final grade—it is a roadmap showing exactly where to focus your effort.',
      recommendations: [
        'Start with the curated video tutorials; pause frequently, take notes, and work through example problems alongside the instructor.',
        'Tackle the remedial practice questions below one at a time, reviewing the step-by-step solutions.',
        'Dedicate 20 to 30 minutes of daily practice and seek guidance from your math teacher or tutor on challenging topics.',
      ],
    }
  }
}

/**
 * Generates advice for the Likert Experiences Questionnaire based on readiness percentage
 */
export function getLikertAdviceByPercentage(percentage: number) {
  if (percentage >= 80) {
    return {
      title: 'High Confidence & Growth Mindset',
      badge: `${percentage}% Readiness Index`,
      advice:
        'Your survey responses reflect exceptional mathematics self-efficacy, a strong growth mindset, and healthy academic motivation. You view challenges as opportunities to learn and feel capable when tackling new math problems.',
      tips: [
        'Leverage your high self-efficacy to embrace challenging, multi-step problem sets.',
        'Share your strategies and positive mindset with peers who may experience math anxiety.',
        'Keep tracking your learning progress to maintain your enthusiasm throughout the academic term.',
      ],
    }
  } else if (percentage >= 60) {
    return {
      title: 'Moderate Readiness & Constructive Attitude',
      badge: `${percentage}% Readiness Index`,
      advice:
        'You demonstrate a constructive attitude toward mathematics and believe in your capacity to improve. However, occasional hesitation or anxiety may arise when encountering unfamiliar question formats.',
      tips: [
        'Break complex problems into smaller, manageable sub-steps to reduce anxiety.',
        'Normalize making mistakes—in mathematics, errors are valuable indicators of where learning happens.',
        'Ask questions promptly during class or review whenever a concept feels ambiguous.',
      ],
    }
  } else {
    return {
      title: 'High Math Anxiety & Support Needed',
      badge: `${percentage}% Readiness Index`,
      advice:
        'Your responses indicate heightened mathematics anxiety, hesitation, or self-doubt. It is important to know that mathematical ability is not fixed—it develops continuously with the right strategies and encouragement.',
      tips: [
        'Practice relaxation techniques such as slow breathing before starting a math test or homework.',
        'Begin each study session with accessible, straightforward exercises to build positive momentum and confidence.',
        'Focus on personal improvement and progress rather than comparing your speed with others.',
      ],
    }
  }
}

/**
 * Generates tailored advice based on topic post-test percentage score
 */
export function getPostTestAdviceByPercentage(percentage: number): {
  badge: string
  title: string
  advice: string
  tier: 'mastered' | 'review' | 'needed'
} {
  if (percentage >= 80) {
    return {
      tier: 'mastered',
      badge: `${percentage}% Score • Remediation Successful`,
      title: 'Remedial Mastery Achieved',
      advice:
        'Great job! You have successfully mastered these concepts after reviewing the video tutorials and practicing your problem solving.',
    }
  } else if (percentage >= 60) {
    return {
      tier: 'review',
      badge: `${percentage}% Score • Progress Made`,
      title: 'Approaching Full Mastery',
      advice:
        'Good progress! You have resolved several misconceptions. Consider re-watching the specific video tutorials and retaking the missed problems.',
    }
  } else {
    return {
      tier: 'needed',
      badge: `${percentage}% Score • Further Review Needed`,
      title: 'Additional Review Recommended',
      advice:
        'You still have some learning gaps. Replay the recommended video tutorials slowly, inspect the worked step-by-step solutions below, and retry.',
    }
  }
}

/**
 * Generates concise step-by-step mathematical explanations for missed questions
 */
export function getQuestionExplanation(
  question: string,
  answer: string,
  topic: string,
  skill: CognitiveSkill
): string {
  const qLower = question.toLowerCase()

  if (qLower.includes('polygon with five sides')) {
    return 'A polygon with 5 sides and 5 interior angles is called a pentagon.'
  }
  if (qLower.includes('polygon with six sides')) {
    return 'A polygon with 6 sides and 6 interior angles is called a hexagon.'
  }
  if (qLower.includes('sides does an octagon')) {
    return 'An octagon has 8 sides, 8 vertices, and 8 interior angles.'
  }
  if (qLower.includes('sides does a decagon')) {
    return 'A decagon has 10 sides, 10 vertices, and 10 interior angles.'
  }
  if (
    qLower.includes('convert') &&
    (qLower.includes('meter') || qLower.includes('gram') || qLower.includes('liter'))
  ) {
    return `Standard metric conversion: apply the appropriate conversion factor (1 km = 1,000 m; 1 kg = 1,000 g; 1 L = 1,000 mL). Correct result: ${answer}.`
  }
  if (
    qLower.includes('commission') ||
    qLower.includes('discount') ||
    qLower.includes('sales tax') ||
    qLower.includes('interest')
  ) {
    return `Apply the percentage formula: multiply the base quantity by the rate (in decimal or fractional form). Correct result: ${answer}.`
  }
  if (qLower.includes('interior angle') && qLower.includes('regular')) {
    return `Formula for each interior angle of a regular n-sided polygon: ((n - 2) * 180°) / n. Correct value: ${answer}.`
  }
  if (qLower.includes('volume of a cylinder') || qLower.includes('cylinder')) {
    return `Cylinder volume formula: V = π * r² * h. Using the given radius and height yields ${answer}.`
  }
  if (qLower.includes('pyramid') && qLower.includes('volume')) {
    return `Pyramid volume formula: V = (1/3) * Base Area * height. Correct volume: ${answer}.`
  }
  if (
    qLower.includes('chips') ||
    qLower.includes('zero pair') ||
    qLower.includes('number line')
  ) {
    return `Integer model rules: positive and negative units combine into zero pairs. The net remaining value is ${answer}.`
  }
  if (skill === 'Remembering') {
    return `Recall of mathematical definitions and facts: the canonical correct term or value is "${answer}".`
  }
  if (skill === 'Understanding') {
    return `Conceptual reasoning: analyzing the properties and definitions of this topic leads to "${answer}".`
  }
  return `Procedural calculation: follow the step-by-step arithmetic or algebraic operations to arrive at the solution: ${answer}.`
}

/**
 * Grade diagnostic test with TOS, percentage advice, and remedial practice questions based on missed items
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
      missedQuestions: RemedialQuestion[]
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
        missedQuestions: [],
      }
    }
    topicMap[q.topic].total += 1
    topicMap[q.topic].cognitiveSkills.add(skill)

    if (isCorrect) {
      topicMap[q.topic].correct += 1
    } else {
      // Record missed question for targeted remedial practice
      topicMap[q.topic].missedQuestions.push({
        id: q.id,
        question: q.question,
        answer: q.answer,
        cognitiveSkill: skill,
        userAnswer: rawInput,
        topic: q.topic,
        explanation: getQuestionExplanation(q.question, q.answer, q.topic, skill),
      })
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

  // Format Topic Results without "difficulty" labels, focusing on interventions and practice
  const topicResults: TopicAssessmentResult[] = Object.entries(topicMap).map(
    ([topic, stats]) => {
      const topicPct = Math.round((stats.correct / stats.total) * 100)
      const perceivedRating = statementTopicMap[topic] ?? 3
      const perceivedInterpretation = getLikertInterpretation(perceivedRating)

      const isMastered = topicPct >= 75
      const status: 'Mastered' | 'Review Recommended' = isMastered
        ? 'Mastered'
        : 'Review Recommended'
      const statusLabel = isMastered
        ? 'Benchmark Met (≥75%)'
        : 'Review Recommended (<75%)'

      // Likert vs Actual Quadrant Analysis
      let quadrant: 'Blind Spot' | 'Underconfident' | 'Confirmed Learning Gap' | 'Mastered Competency'
      let quadrantAnalysis = ''
      let studyTip = ''

      if (perceivedRating >= 3.5 && topicPct < 75) {
        quadrant = 'Blind Spot'
        quadrantAnalysis =
          'You felt confident, but the diagnostic performance indicates gaps in execution or underlying misconceptions.'
        studyTip =
          'Review the provided YouTube lesson carefully, solve the practice problems below step-by-step, and verify calculations.'
      } else if (perceivedRating < 3.5 && topicPct >= 75) {
        quadrant = 'Underconfident'
        quadrantAnalysis =
          'You reported hesitation or lack of confidence, yet your diagnostic performance was strong and met mastery.'
        studyTip =
          'Trust your mathematical abilities. Your foundation is solid; practice explaining your steps to reinforce self-confidence.'
      } else if (perceivedRating < 3.5 && topicPct < 75) {
        quadrant = 'Confirmed Learning Gap'
        quadrantAnalysis =
          'Your perceived confidence aligns with your test score. This topic represents a high-priority area for remedial intervention.'
        studyTip =
          'Start with foundational concepts from the video tutorial. Work through the remedial practice problems below.'
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
        status,
        statusLabel,
        cognitiveSkills: Array.from(stats.cognitiveSkills),
        perceivedRating,
        perceivedInterpretation,
        quadrant,
        quadrantAnalysis,
        studyTip,
        youtubeLinks: stats.youtubeLinks,
        missedQuestions: stats.missedQuestions,
      }
    }
  )

  // Sort topic results: topics with missed items first, then mastered topics
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
    percentageAdvice: getAdviceByPercentage(percentage),
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
