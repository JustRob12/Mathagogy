'use client'

import { useState } from 'react'
import {
  LIKERT_SCALE,
  scoreLikert,
  type LikertResult,
  LIKERT_RESPONSE_SCALE,
} from '@/lib/assessments'
import { createClient } from '@/lib/supabase/client'

interface LikertCardQuizProps {
  grade: string
  userId: string
  onClose: () => void
  onSaved?: () => void
}

export default function LikertCardQuiz({
  grade,
  userId,
  onClose,
  onSaved,
}: LikertCardQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Record<number, number>>({})
  const [result, setResult] = useState<LikertResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const questions = LIKERT_SCALE.questions
  const currentQuestion = questions[currentIndex]
  const isAnswered = currentQuestion && responses[currentQuestion.id] !== undefined
  const isLastQuestion = currentIndex === questions.length - 1
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100)

  const handleSelectValue = (val: number) => {
    if (!currentQuestion) return
    setResponses((prev) => ({
      ...prev,
      [currentQuestion.id]: val,
    }))
  }

  const handleNext = () => {
    if (!isAnswered) return
    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    if (!isAnswered) return
    setIsSubmitting(true)
    setSaveStatus('saving')

    const scored = scoreLikert(responses)
    setResult(scored)

    try {
      const supabase = createClient()
      const { error } = await supabase.from('assessment_attempts').insert({
        user_id: userId,
        grade,
        term: 'Likert Scale',
        test_type: 'likert',
        score: Math.round(scored.totalAverage * 10),
        total_questions: questions.length,
        percentage: Math.round((scored.totalAverage / 5) * 100),
        passed: true,
        answers: responses,
        category_scores: scored.categories,
      })

      if (error) {
        console.error('Error saving Likert assessment:', error)
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        if (onSaved) onSaved()
      }
    } catch (err) {
      console.error('Failed to save Likert assessment:', err)
      setSaveStatus('error')
    } finally {
      setIsSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // --- RESULT VIEW ---
  if (result) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-3xl mx-auto my-3 sm:my-6">
        <div className="p-6 sm:p-8 md:p-10 text-center text-white bg-gradient-to-br from-teal-800 via-emerald-800 to-slate-900">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md mb-3 border border-white/20 shadow-inner">
            <svg className="w-8 h-8 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Mathematics Learning Profile
          </h2>
          <p className="text-white/80 mt-1 text-xs sm:text-sm font-medium">
            Experiences Questionnaire • {grade}
          </p>

          <div className="mt-6 inline-block bg-white/15 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-white/20">
            <p className="text-[11px] uppercase font-bold tracking-wider text-white/80">
              Overall Readiness Index
            </p>
            <p className="text-3xl sm:text-4xl font-black mt-0.5">
              {result.totalAverage} <span className="text-sm font-normal text-white/70">/ 5.0</span>
            </p>
          </div>

          <div className="mt-3 text-xs font-medium">
            {saveStatus === 'saving' && <span className="text-white/80">Recording to history...</span>}
            {saveStatus === 'saved' && <span className="text-teal-200">Recorded to your assessment history</span>}
            {saveStatus === 'error' && <span className="text-red-200">Could not connect to history table</span>}
          </div>
        </div>

        <div className="p-5 sm:p-8 space-y-6">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Dimension Breakdown & Interpretations
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {result.categories.map((cat) => (
              <div
                key={cat.key}
                className="p-4 sm:p-5 rounded-2xl border border-teal-100 bg-teal-50/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate mr-2">
                    {cat.label}
                  </h4>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-teal-200 text-teal-900 shrink-0">
                    {cat.interpretation}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-black text-teal-900">
                    {cat.score}
                  </span>
                  <span className="text-xs text-slate-400">/ 5.0</span>
                </div>
                {/* Visual bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(cat.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2.5">
            <button
              onClick={() => {
                setResult(null)
                setCurrentIndex(0)
                setResponses({})
                setSaveStatus('idle')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition text-center"
            >
              Retake Questionnaire
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs sm:text-sm hover:bg-teal-800 transition shadow-md text-center"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- CARD VIEW ---
  return (
    <div className="max-w-2xl mx-auto my-2 sm:my-6 px-1">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            {grade} • Likert Survey
          </span>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            Learning Experiences
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 transition p-1.5 rounded-xl hover:bg-slate-100 text-xs font-bold"
        >
          Exit
        </button>
      </div>

      {/* Instructions Box & Response Scale Reference */}
      <div className="mb-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
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

      {/* Progress */}
      <div className="mb-4 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
          <span>
            Statement <span className="text-teal-700 text-sm">{currentIndex + 1}</span> of {questions.length}
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

      {/* Card Body */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-7 md:p-8">
        <div className="mb-3">
          <span className="text-[11px] uppercase tracking-wider font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200 inline-block">
            Category: {currentQuestion.categoryLabel}
          </span>
        </div>

        <div className="mb-8">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
            <span className="text-teal-700 mr-1.5">{currentQuestion.id}.</span>
            &ldquo;{currentQuestion.statement}&rdquo;
          </h3>
        </div>

        {/* Horizontally Aligned Response Circles */}
        <div className="mb-8">
          <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            Select Your Rating:
          </p>

          <div className="flex flex-row justify-center items-center gap-2 sm:gap-5">
            {LIKERT_RESPONSE_SCALE.map((opt) => {
              const isSelected = responses[currentQuestion.id] === opt.value

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectValue(opt.value)}
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
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
              currentIndex === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
            }`}
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {!isAnswered && (
              <span className="text-[11px] text-amber-600 font-semibold hidden sm:inline">
                Select your rating to proceed
              </span>
            )}

            {isLastQuestion ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isAnswered || isSubmitting}
                className={`px-6 sm:px-8 py-3 rounded-xl font-black text-xs sm:text-sm transition shadow-md ${
                  !isAnswered || isSubmitting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-teal-700 text-white hover:bg-teal-800 active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Questionnaire'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isAnswered}
                className={`px-6 sm:px-7 py-3 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm ${
                  !isAnswered
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-teal-700 text-white hover:bg-teal-800 active:scale-[0.98]'
                }`}
              >
                Next Statement
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
