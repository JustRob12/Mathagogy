'use client'

import { useState } from 'react'
import type {
  Assessment,
  DiagnosticResult,
  CognitiveSkill,
  SeverityLevel,
} from '@/lib/assessments'
import {
  gradeDiagnostic,
  LIKERT_RESPONSE_SCALE,
  getLikertInterpretation,
} from '@/lib/assessments'
import { createClient } from '@/lib/supabase/client'

interface AssessmentCardQuizProps {
  assessment: Assessment
  userId: string
  initialResult?: DiagnosticResult | null
  onClose: () => void
  onSaved?: () => void
}

export default function AssessmentCardQuiz({
  assessment,
  userId,
  initialResult,
  onClose,
  onSaved,
}: AssessmentCardQuizProps) {
  // If an initialResult is passed (e.g. from View Result in dashboard), start on result
  const [stage, setStage] = useState<'likert' | 'diagnostic' | 'result'>(
    initialResult ? 'result' : 'likert'
  )

  // Stage 1: Likert state
  const [likertIndex, setLikertIndex] = useState(0)
  const [likertResponses, setLikertResponses] = useState<Record<number, number>>(
    initialResult?.likertResponses ?? {}
  )

  // Stage 2: Diagnostic open-ended state
  const [diagIndex, setDiagIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})

  // Stage 3: Result state
  const [result, setResult] = useState<DiagnosticResult | null>(initialResult ?? null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    initialResult ? 'saved' : 'idle'
  )

  const statements = assessment.alignedLikertStatements || []
  const currentStatement = statements[likertIndex]
  const isCurrentLikertAnswered =
    currentStatement && likertResponses[currentStatement.id] !== undefined
  const isLastLikert = likertIndex === statements.length - 1

  const currentQuestion = assessment.questions[diagIndex]
  const currentAnswerText = userAnswers[currentQuestion?.id] ?? ''
  const isCurrentDiagAnswered = currentAnswerText.trim().length > 0
  const isLastDiag = diagIndex === assessment.questions.length - 1

  // Handle Likert Selection
  const handleSelectLikert = (val: number) => {
    if (!currentStatement) return
    setLikertResponses((prev) => ({
      ...prev,
      [currentStatement.id]: val,
    }))
  }

  const handleNextLikert = () => {
    if (!isCurrentLikertAnswered) return
    if (!isLastLikert) {
      setLikertIndex((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Transition to Stage 2: Diagnostic Test
      setStage('diagnostic')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevLikert = () => {
    if (likertIndex > 0) {
      setLikertIndex((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Handle Diagnostic Answer Input
  const handleAnswerChange = (val: string) => {
    if (!currentQuestion) return
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: val,
    }))
  }

  const handleNextDiag = () => {
    if (!isCurrentDiagAnswered) return
    if (!isLastDiag) {
      setDiagIndex((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevDiag = () => {
    if (diagIndex > 0) {
      setDiagIndex((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Submit and Grade Diagnostic Assessment
  const handleSubmitDiagnostic = async () => {
    if (!isCurrentDiagAnswered) return
    setIsSubmitting(true)
    setSaveStatus('saving')

    const graded = gradeDiagnostic(assessment, userAnswers, likertResponses)
    setResult(graded)
    setStage('result')

    try {
      const supabase = createClient()
      const { error } = await supabase.from('assessment_attempts').insert({
        user_id: userId,
        grade: assessment.grade,
        term: assessment.term,
        test_type: 'diagnostic',
        score: graded.score,
        total_questions: graded.total,
        percentage: graded.percentage,
        passed: graded.passed,
        answers: graded.userAnswers,
        weak_topics: graded.topicResults.filter((t) => t.severity !== 'Mastered'),
        category_scores: graded.tosStats,
      })

      if (error) {
        console.error('Error saving assessment attempt:', error)
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        if (onSaved) onSaved()
      }
    } catch (err) {
      console.error('Failed to save assessment attempt:', err)
      setSaveStatus('error')
    } finally {
      setIsSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleRetake = () => {
    setResult(null)
    setStage('likert')
    setLikertIndex(0)
    setDiagIndex(0)
    setLikertResponses({})
    setUserAnswers({})
    setSaveStatus('idle')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // -------------------------------------------------------------
  // STAGE 3: RESULT VIEW (PERCENTAGES ONLY, NO MISSED QUESTIONS)
  // -------------------------------------------------------------
  if (stage === 'result' && result) {
    const criticalTopics = result.topicResults.filter((t) => t.severity === 'Critical')
    const moderateTopics = result.topicResults.filter((t) => t.severity === 'Moderate')
    const masteredTopics = result.topicResults.filter((t) => t.severity === 'Mastered')

    // Find blind spots and underconfident topics for comparative insight
    const blindSpots = result.topicResults.filter((t) => t.quadrant === 'Blind Spot')
    const underconfident = result.topicResults.filter((t) => t.quadrant === 'Underconfident')
    const confirmedGaps = result.topicResults.filter(
      (t) => t.quadrant === 'Confirmed Learning Gap'
    )

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-4xl mx-auto my-3 sm:my-6">
        {/* Result Header Banner */}
        <div
          className={`p-6 sm:p-8 md:p-10 text-center text-white relative overflow-hidden ${
            result.passed
              ? 'bg-gradient-to-br from-emerald-800 via-green-800 to-teal-900'
              : 'bg-gradient-to-br from-amber-700 via-orange-800 to-slate-900'
          }`}
        >
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md mb-3 border border-white/20 shadow-inner">
            {result.passed ? (
              <svg className="w-8 h-8 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            {result.passed ? 'Diagnostic Assessment Passed' : 'Targeted Remediation Recommended'}
          </h2>
          <p className="text-white/80 mt-1 text-xs sm:text-sm font-medium">
            {assessment.grade} • {assessment.term} Comprehensive Diagnostic Report
          </p>

          {/* Key Metric Cards (Percentages Only) */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-center">
            <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <p className="text-[11px] uppercase font-bold tracking-wider text-white/80">
                Diagnostic Mastery
              </p>
              <p className="text-3xl sm:text-4xl font-black mt-1">
                {result.percentage}%
              </p>
              <p className="text-[11px] text-white/70 mt-1 font-medium">
                Standard Benchmark: 75%
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <p className="text-[11px] uppercase font-bold tracking-wider text-white/80">
                Perceived Confidence
              </p>
              <p className="text-3xl sm:text-4xl font-black mt-1">
                {result.averageLikertRating}{' '}
                <span className="text-sm font-normal text-white/70">/ 5.0</span>
              </p>
              <p className="text-[11px] text-white/70 mt-1 font-medium">
                {getLikertInterpretation(result.averageLikertRating)}
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <p className="text-[11px] uppercase font-bold tracking-wider text-white/80">
                Overall Evaluation
              </p>
              <p className="text-xl sm:text-2xl font-black mt-2 uppercase tracking-wide">
                {result.passed ? 'Passed' : 'Needs Review'}
              </p>
              <p className="text-[11px] text-white/70 mt-1 font-medium">
                {result.passed ? 'Competency Achieved' : 'Focus on Remedial Areas'}
              </p>
            </div>
          </div>

          <div className="mt-4 text-xs font-medium">
            {saveStatus === 'saving' && <span className="text-white/80">Recording to history...</span>}
            {saveStatus === 'saved' && <span className="text-emerald-200">Recorded to your assessment history</span>}
            {saveStatus === 'error' && <span className="text-red-200">Could not record to history</span>}
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleRetake}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition shadow-sm text-center"
          >
            Retake Assessment
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs sm:text-sm hover:bg-emerald-800 transition shadow-md text-center"
          >
            Dashboard
          </button>
        </div>

        <div className="p-5 sm:p-8 space-y-8">
          {/* 1. TABLE OF SPECIFICATIONS (TOS) BREAKDOWN */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                TOS
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Table of Specifications (TOS) Cognitive Skills Analysis
                </h3>
                <p className="text-xs text-slate-500">
                  Performance across Remembering, Understanding, and Applying cognitive levels
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(['Remembering', 'Understanding', 'Applying'] as CognitiveSkill[]).map((skill) => {
                const stat = result.tosStats[skill]
                const isGood = stat.percentage >= 75
                const isModerate = stat.percentage >= 50 && stat.percentage < 75

                return (
                  <div
                    key={skill}
                    className={`p-4 rounded-2xl border transition ${
                      isGood
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : isModerate
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-red-50/50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 text-sm">{skill}</span>
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                          isGood
                            ? 'bg-emerald-200 text-emerald-900'
                            : isModerate
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-red-200 text-red-900'
                        }`}
                      >
                        {stat.percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2 mb-3 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isGood ? 'bg-emerald-600' : isModerate ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug">
                      {skill === 'Remembering' &&
                        'Recall of foundational terminology, shapes, formulas, and mathematical facts.'}
                      {skill === 'Understanding' &&
                        'Comprehension of concepts, geometric properties, classifications, and relationships.'}
                      {skill === 'Applying' &&
                        'Computational execution, equation solving, unit conversion, and real-world problem solving.'}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Assessed Topics:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {stat.topics.slice(0, 3).map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[190px]"
                            title={t}
                          >
                            {t}
                          </span>
                        ))}
                        {stat.topics.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-semibold px-1 py-0.5">
                            +{stat.topics.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. TOPIC DIFFICULTY & SEVERITY LEVEL ANALYSIS */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
                GAP
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Topic Difficulties and Severity Levels
                </h3>
                <p className="text-xs text-slate-500">
                  Identified mathematical competencies categorized by urgency and performance percentage
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {result.topicResults.map((tr, idx) => {
                const isCritical = tr.severity === 'Critical'
                const isModerate = tr.severity === 'Moderate'

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-4 sm:p-5 transition ${
                      isCritical
                        ? 'border-red-200 bg-red-50/40 hover:border-red-300'
                        : isModerate
                        ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
                        : 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              isCritical
                                ? 'bg-red-200 text-red-900'
                                : isModerate
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-emerald-200 text-emerald-900'
                            }`}
                          >
                            {tr.severityLabel}
                          </span>

                          <span className="text-[11px] font-bold text-slate-500">
                            Cognitive Skill: {tr.cognitiveSkills.join(', ')}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {tr.topic}
                        </h4>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-xl sm:text-2xl font-black text-slate-900">
                          {tr.percentage}%
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          Diagnostic Mastery
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          isCritical ? 'bg-red-500' : isModerate ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${tr.percentage}%` }}
                      />
                    </div>

                    {/* Quadrant Analysis & Study Tip */}
                    <div className="bg-white/80 rounded-xl p-3 border border-slate-200/70 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-700">Perception Alignment:</span>
                        <span className="font-semibold text-slate-900">
                          Rated {tr.perceivedRating}/5 ({tr.perceivedInterpretation})
                        </span>
                        <span className="text-slate-300">•</span>
                        <span
                          className={`font-black ${
                            tr.quadrant === 'Blind Spot'
                              ? 'text-amber-700'
                              : tr.quadrant === 'Underconfident'
                              ? 'text-blue-700'
                              : tr.quadrant === 'Confirmed Learning Gap'
                              ? 'text-red-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {tr.quadrant}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {tr.quadrantAnalysis}
                      </p>
                      <p className="text-slate-800 text-[11px] font-medium pt-1 border-t border-slate-100">
                        <span className="font-bold text-emerald-800">Practical Recommendation:</span>{' '}
                        {tr.studyTip}
                      </p>
                    </div>

                    {/* Curated YouTube Video Lessons */}
                    {tr.youtubeLinks && tr.youtubeLinks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap gap-2">
                        {tr.youtubeLinks.map((url, linkIdx) => (
                          <a
                            key={linkIdx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold transition shadow-sm"
                          >
                            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            <span>Watch Video Lesson {tr.youtubeLinks.length > 1 ? `#${linkIdx + 1}` : ''}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 3. LIKERT PERCEPTION VS ACTUAL PERFORMANCE MATRIX */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                MX
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Perceived Confidence vs Actual Performance Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Metacognitive comparison comparing student self-efficacy with diagnostic assessment outcomes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Confirmed Gaps */}
              <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-red-950 text-xs sm:text-sm">
                    Confirmed Learning Gaps ({confirmedGaps.length})
                  </h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-200 text-red-900">
                    Highest Priority
                  </span>
                </div>
                <p className="text-[11px] text-red-800 mb-2">
                  Topics where you rated low confidence and scored below 75%.
                </p>
                {confirmedGaps.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No confirmed gaps in this test.</p>
                ) : (
                  <ul className="space-y-1">
                    {confirmedGaps.map((t, i) => (
                      <li key={i} className="text-xs font-semibold text-slate-800 list-disc list-inside">
                        {t.topic} ({t.percentage}%)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Blind Spots */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                    Blind Spots / Execution Gaps ({blindSpots.length})
                  </h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                    Misconceptions
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mb-2">
                  Topics where you felt confident (rated 4-5) but missed accuracy benchmarks (&lt;75%).
                </p>
                {blindSpots.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No blind spots identified.</p>
                ) : (
                  <ul className="space-y-1">
                    {blindSpots.map((t, i) => (
                      <li key={i} className="text-xs font-semibold text-slate-800 list-disc list-inside">
                        {t.topic} ({t.percentage}%)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Underconfident */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-blue-950 text-xs sm:text-sm">
                    Underconfident Mastery ({underconfident.length})
                  </h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                    Latent Strength
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 mb-2">
                  Topics where you felt hesitant or anxious, yet achieved solid passing accuracy (≥75%).
                </p>
                {underconfident.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No underconfident topics identified.</p>
                ) : (
                  <ul className="space-y-1">
                    {underconfident.map((t, i) => (
                      <li key={i} className="text-xs font-semibold text-slate-800 list-disc list-inside">
                        {t.topic} ({t.percentage}%)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Mastered */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">
                    Mastered Competencies ({masteredTopics.length})
                  </h4>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                    Achieved
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 mb-2">
                  High confidence and strong diagnostic performance (≥75%).
                </p>
                {masteredTopics.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No topics fully mastered yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {masteredTopics.map((t, i) => (
                      <li key={i} className="text-xs font-semibold text-slate-800 list-disc list-inside">
                        {t.topic} ({t.percentage}%)
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // STAGE 1: ALIGNED LIKERT PERCEPTION SCALE
  // -------------------------------------------------------------
  if (stage === 'likert') {
    const progressPercent = Math.round(((likertIndex + 1) / statements.length) * 100)

    return (
      <div className="max-w-2xl mx-auto my-2 sm:my-6 px-1">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
              Part 1: Self-Perception Scale
            </span>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              {assessment.grade} • {assessment.term}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition p-1.5 rounded-xl hover:bg-slate-100 text-xs font-bold"
          >
            Exit
          </button>
        </div>

        {/* Required Instructions Box & Response Scale Reference */}
        <div className="mb-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Instructions
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              Instructions: Read each statement carefully and select the button that best represents your level of agreement. Choose only one response for each statement. There are no right or wrong answers. Please answer honestly based on your own knowledge and experience.
            </p>
          </div>

          {/* Response Scale Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 border-b border-slate-200 flex justify-between">
              <span>Response Scale Reference</span>
              <span>5-Point Scale</span>
            </div>
            <div className="grid grid-cols-5 divide-x divide-slate-200 text-center py-2 bg-slate-50/60">
              {LIKERT_RESPONSE_SCALE.slice().reverse().map((opt) => (
                <div key={opt.value} className="px-1">
                  <div
                    className="w-5 h-5 rounded-full text-white font-black text-[10px] mx-auto flex items-center justify-center mb-0.5"
                    style={{ backgroundColor: opt.color }}
                  >
                    {opt.value}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 leading-tight block">
                    {opt.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Likert Progress Bar */}
        <div className="mb-4 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
            <span>
              Statement <span className="text-teal-700 text-sm">{likertIndex + 1}</span> of {statements.length}
            </span>
            <span className="text-teal-700">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Statement Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-7 md:p-8">
          <div className="mb-3">
            <span className="text-[11px] uppercase tracking-wider font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200 inline-block">
              Aligned Competency #{currentStatement.id}
            </span>
          </div>

          <div className="mb-8">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
              &ldquo;{currentStatement.statement}&rdquo;
            </h3>
          </div>

          {/* Horizontally Aligned Response Circles */}
          <div className="mb-8">
            <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Select Your Level of Agreement:
            </p>

            <div className="flex flex-row justify-center items-center gap-2 sm:gap-5">
              {LIKERT_RESPONSE_SCALE.map((opt) => {
                const isSelected = likertResponses[currentStatement.id] === opt.value

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectLikert(opt.value)}
                    className="flex flex-col items-center group focus:outline-none transition-transform active:scale-95"
                  >
                    <div
                      className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-black text-sm sm:text-base text-white transition-all shadow-sm ${
                        isSelected
                          ? 'ring-4 ring-offset-2 ring-slate-800 scale-110 shadow-lg'
                          : 'opacity-85 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: opt.color }}
                    >
                      {opt.value}
                    </div>
                    <span
                      className={`mt-2 text-[10px] sm:text-xs font-bold text-center max-w-[65px] sm:max-w-[80px] leading-tight transition ${
                        isSelected ? 'text-slate-900 font-extrabold' : 'text-slate-500'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrevLikert}
              disabled={likertIndex === 0}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
                likertIndex === 0
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
              }`}
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {!isCurrentLikertAnswered && (
                <span className="text-[11px] text-amber-600 font-semibold hidden sm:inline">
                  Select a rating to proceed
                </span>
              )}

              <button
                type="button"
                onClick={handleNextLikert}
                disabled={!isCurrentLikertAnswered}
                className={`px-6 sm:px-8 py-3 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm ${
                  !isCurrentLikertAnswered
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : isLastLikert
                    ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-700/20 active:scale-[0.98]'
                    : 'bg-teal-700 hover:bg-teal-800 text-white active:scale-[0.98]'
                }`}
              >
                {isLastLikert ? 'Proceed to Diagnostic Test' : 'Next Statement'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // STAGE 2: DIAGNOSTIC TEST (DIRECT INPUT, NO MULTIPLE CHOICE)
  // -------------------------------------------------------------
  const diagProgressPercent = Math.round(
    ((diagIndex + 1) / assessment.questions.length) * 100
  )

  return (
    <div className="max-w-2xl mx-auto my-2 sm:my-6 px-1">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Part 2: Diagnostic Test
          </span>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline truncate max-w-[200px]">
            {assessment.grade} • {assessment.term}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 transition p-1.5 rounded-xl hover:bg-slate-100 text-xs font-bold"
        >
          Exit
        </button>
      </div>

      {/* Progress Card */}
      <div className="mb-4 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
          <span>
            Question <span className="text-emerald-700 text-sm">{diagIndex + 1}</span> of {assessment.questions.length}
          </span>
          <span className="text-emerald-700">{diagProgressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${diagProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-7 md:p-8">
        {/* Topic & Cognitive Domain Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 inline-block">
            {currentQuestion.topic}
          </span>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            Cognitive Domain: {currentQuestion.cognitiveSkill}
          </span>
        </div>

        {/* Question Prompt */}
        <div className="mb-6">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
            <span className="text-emerald-700 mr-2">{currentQuestion.id}.</span>
            {currentQuestion.question}
          </h3>
        </div>

        {/* Direct Text Answer Input (NO Multiple Choice) */}
        <div className="mb-6 space-y-2">
          <label
            htmlFor="answer-input"
            className="block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Your Answer:
          </label>
          <div className="relative">
            <input
              id="answer-input"
              type="text"
              autoFocus
              value={currentAnswerText}
              onChange={(e) => handleAnswerChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (isLastDiag) {
                    handleSubmitDiagnostic()
                  } else {
                    handleNextDiag()
                  }
                }
              }}
              placeholder="Type your answer here..."
              className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3.5 text-base sm:text-lg text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 transition shadow-inner"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Enter your computed numerical value, geometric term, or simplified answer. Press Enter or Next to proceed.
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={handlePrevDiag}
            disabled={diagIndex === 0}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
              diagIndex === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
            }`}
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {!isCurrentDiagAnswered && (
              <span className="text-[11px] text-amber-600 font-semibold hidden sm:inline">
                Enter your answer to proceed
              </span>
            )}

            {isLastDiag ? (
              <button
                type="button"
                onClick={handleSubmitDiagnostic}
                disabled={!isCurrentDiagAnswered || isSubmitting}
                className={`px-6 sm:px-8 py-3 rounded-xl font-black text-xs sm:text-sm transition shadow-md flex items-center gap-2 ${
                  !isCurrentDiagAnswered || isSubmitting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Assessment'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextDiag}
                disabled={!isCurrentDiagAnswered}
                className={`px-6 sm:px-7 py-3 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm ${
                  !isCurrentDiagAnswered
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-[0.98]'
                }`}
              >
                Next Question
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
