'use client'

import { useState } from 'react'
import type {
  Assessment,
  DiagnosticResult,
  CognitiveSkill,
  TopicAssessmentResult,
} from '@/lib/assessments'
import {
  gradeDiagnostic,
  evaluateAnswer,
  LIKERT_RESPONSE_SCALE,
  getLikertInterpretation,
} from '@/lib/assessments'
import { createClient } from '@/lib/supabase/client'
import TermRetakeQuiz from './TermRetakeQuiz'

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

  // Dedicated Term Retake State (combines all missed questions across the term)
  const [isRetakeActive, setIsRetakeActive] = useState(false)
  const [retakeTakeNumber, setRetakeTakeNumber] = useState<number>(2)

  // Determine next take number from previous retake attempts
  useEffect(() => {
    async function determineTakeNumber() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('retake_attempts')
          .select('id, take_number')
          .eq('user_id', userId)
          .eq('grade', assessment.grade)
          .eq('term', assessment.term)

        if (!error && data && data.length > 0) {
          const maxTake = Math.max(...data.map((d: any) => d.take_number || 2))
          setRetakeTakeNumber(maxTake + 1)
        } else {
          setRetakeTakeNumber(2)
        }
      } catch (e) {
        setRetakeTakeNumber(2)
      }
    }
    determineTakeNumber()
  }, [userId, assessment.grade, assessment.term])

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
        weak_topics: graded.topicResults.filter((t) => t.status !== 'Mastered'),
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
    setIsRetakeActive(false)
    setSaveStatus('idle')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // -------------------------------------------------------------
  // DEDICATED TERM RETAKE QUIZ (COMBINES ALL MISSED QUESTIONS)
  // -------------------------------------------------------------
  if (isRetakeActive && result) {
    const allMissedQuestions = result.topicResults.flatMap((tr) => tr.missedQuestions)

    return (
      <TermRetakeQuiz
        grade={assessment.grade}
        term={assessment.term}
        takeNumber={retakeTakeNumber}
        initialScore={result.score}
        initialTotal={result.total}
        initialPercentage={result.percentage}
        missedQuestions={allMissedQuestions}
        userId={userId}
        onClose={() => {
          setIsRetakeActive(false)
          if (onSaved) onSaved()
        }}
        onSaved={onSaved}
      />
    )
  }

  // -------------------------------------------------------------
  // STAGE 3: RESULT VIEW (PERCENTAGES ONLY, ADVICE BASED ON PERCENTAGE,
  // NO MATH DIFFICULTIES LABELING, POST-TEST BUTTON PER TOPIC)
  // -------------------------------------------------------------
  if (stage === 'result' && result) {
    const advice = result.percentageAdvice

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
            {result.passed ? 'Diagnostic Assessment Passed' : 'Targeted Review Recommended'}
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
                {result.passed ? 'Benchmark Met' : 'Review Interventions Below'}
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
          {/* 1. TARGETED REMEDIAL RETAKE & TOPIC VIDEO LESSONS (DISPLAYED DIRECTLY ON SUBMIT) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
                RTK
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Targeted Remedial Retake & Video Lesson Resources
                </h3>
                <p className="text-xs text-slate-500">
                  Review the video tutorials below, then retake all questions you missed in {assessment.term}
                </p>
              </div>
            </div>

            {/* RETAKE ACTION CARD BEFORE YOUTUBE LINKS */}
            {(() => {
              const allMissedQuestions = result.topicResults.flatMap((tr) => tr.missedQuestions)

              return (
                <div className="p-5 sm:p-6 rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-purple-50/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-700 text-white">
                        Take {retakeTakeNumber} Remedial Retake
                      </span>
                      <span className="text-xs font-bold text-indigo-950">
                        {allMissedQuestions.length} Questions Missed Across {assessment.term}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                      Retake Missed Questions for {assessment.term} (Take {retakeTakeNumber})
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      This retake combines all {allMissedQuestions.length} questions you answered incorrectly. Watch the recommended topic videos below, then start your retake to verify your learning.
                    </p>
                  </div>

                  <div className="shrink-0">
                    {allMissedQuestions.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setIsRetakeActive(true)}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white text-xs sm:text-sm font-extrabold transition shadow-md active:scale-[0.98]"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Start Take {retakeTakeNumber} Retake ({allMissedQuestions.length} Questions)</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold">
                        <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>100% Mastery • No Retake Needed</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* TOPIC VIDEO LESSONS (NO BUTTON PER TOPIC) */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">
                Recommended Video Tutorials by Topic:
              </h4>

              {result.topicResults.map((tr, idx) => {
                const hasMissed = tr.missedQuestions && tr.missedQuestions.length > 0

                return (
                  <div
                    key={idx}
                    className={`rounded-3xl border p-5 sm:p-6 transition shadow-xs ${
                      hasMissed
                        ? 'border-slate-300 bg-slate-50/60'
                        : 'border-emerald-200 bg-emerald-50/30'
                    }`}
                  >
                    {/* Topic Header & Mastery Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              tr.status === 'Mastered'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {tr.statusLabel}
                          </span>
                          <span className="text-xs text-slate-400">
                            Cognitive Skill: {tr.cognitiveSkills.join(', ')}
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1">
                          {tr.topic}
                        </h4>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-2xl font-black text-slate-900">{tr.percentage}%</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Topic Mastery</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-4 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          tr.percentage >= 75 ? 'bg-emerald-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${tr.percentage}%` }}
                      />
                    </div>

                    {/* Practical Recommendation / Study Strategy */}
                    <div className="bg-white rounded-xl p-3.5 border border-slate-200 text-xs space-y-1 mb-4">
                      <p className="font-bold text-slate-700">Study Tip & Concept Guidance:</p>
                      <p className="text-slate-600 leading-relaxed">{tr.studyTip}</p>
                    </div>

                    {/* Curated YouTube Video Lessons (Only Video Links, No Button per Topic) */}
                    <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-1">
                        Video Lessons:
                      </span>
                      {tr.youtubeLinks && tr.youtubeLinks.length > 0 ? (
                        tr.youtubeLinks.map((url, linkIdx) => (
                          <a
                            key={linkIdx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold transition shadow-xs"
                          >
                            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                            <span>Watch Video Lesson {tr.youtubeLinks.length > 1 ? `#${linkIdx + 1}` : ''}</span>
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No external video required. Review class notes for this concept.
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. PERSONALIZED ADVICE BASED ON PERCENTAGE */}
          <div
            className={`p-5 sm:p-6 rounded-3xl border ${
              advice.tier === 'exemplary'
                ? 'bg-emerald-50/70 border-emerald-200'
                : advice.tier === 'proficient'
                ? 'bg-teal-50/70 border-teal-200'
                : advice.tier === 'developing'
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-rose-50/70 border-rose-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    advice.tier === 'exemplary'
                      ? 'bg-emerald-700 text-white'
                      : advice.tier === 'proficient'
                      ? 'bg-teal-700 text-white'
                      : advice.tier === 'developing'
                      ? 'bg-amber-700 text-white'
                      : 'bg-rose-700 text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Personalized Advice (Based on Your Score: {result.percentage}%)
                  </h3>
                  <p className="text-xs text-slate-500">{advice.title}</p>
                </div>
              </div>

              <span
                className={`text-xs font-black px-3 py-1 rounded-full self-start sm:self-auto ${
                  advice.tier === 'exemplary'
                    ? 'bg-emerald-200 text-emerald-950'
                    : advice.tier === 'proficient'
                    ? 'bg-teal-200 text-teal-950'
                    : advice.tier === 'developing'
                    ? 'bg-amber-200 text-amber-950'
                    : 'bg-rose-200 text-rose-950'
                }`}
              >
                {advice.badge}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium mb-4">
              {advice.advice}
            </p>

            <div className="bg-white/90 rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Recommended Study Action Plan:
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {advice.recommendations.map((rec, rIdx) => (
                  <li key={rIdx} className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold shrink-0">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3. TABLE OF SPECIFICATIONS (TOS) COGNITIVE BREAKDOWN */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                TOS
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Table of Specifications (TOS) Cognitive Skills Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  Mastery percentage across Remembering, Understanding, and Applying domains
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
                        : 'bg-rose-50/50 border-rose-200'
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
                            : 'bg-rose-200 text-rose-900'
                        }`}
                      >
                        {stat.percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2 mb-3 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isGood ? 'bg-emerald-600' : isModerate ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug">
                      {skill === 'Remembering' &&
                        'Recall of foundational terminology, shapes, formulas, and mathematical conventions.'}
                      {skill === 'Understanding' &&
                        'Comprehension of concepts, geometric properties, classifications, and relationships.'}
                      {skill === 'Applying' &&
                        'Computational execution, equation solving, unit conversion, and real-world word problems.'}
                    </p>
                  </div>
                )
              })}
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
  // STAGE 2: DIAGNOSTIC TEST (DIRECT INPUT, NO MULTIPLE CHOICE,
  // NO DIFFICULTY LABELS)
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
        {/* Topic Badge (No difficulty labels) */}
        <div className="mb-3">
          <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 inline-block">
            {currentQuestion.topic}
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
