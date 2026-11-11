'use client'

import { useState } from 'react'
import { LIKERT_SCALE, scoreLikert, type LikertResult } from '@/lib/assessments'
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
  const isAnswered = responses[currentQuestion.id] !== undefined
  const isLastQuestion = currentIndex === questions.length - 1
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100)

  const handleSelectValue = (val: number) => {
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-3xl mx-auto my-3 sm:my-6 animate-fadeIn">
        <div className="p-6 sm:p-8 md:p-10 text-center text-white bg-gradient-to-br from-teal-700 via-emerald-700 to-green-800">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md mb-4 text-3xl sm:text-4xl shadow-inner">
            📊
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
            <p className="text-2xl sm:text-3xl font-black mt-0.5">
              {result.totalAverage} <span className="text-sm font-normal text-white/70">/ 5.0</span>
            </p>
          </div>

          <div className="mt-3 text-xs">
            {saveStatus === 'saving' && <span className="text-white/80">💾 Recording to history...</span>}
            {saveStatus === 'saved' && <span className="text-teal-200">✓ Recorded to your assessment history</span>}
            {saveStatus === 'error' && <span className="text-red-200">⚠ Could not connect to history table</span>}
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
                  <span className="text-xl sm:text-2xl font-black text-teal-900">
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

  // Option colors
  const optionColors: Record<number, { bg: string; text: string; activeRing: string }> = {
    1: { bg: 'border-rose-200 bg-rose-50/40 hover:bg-rose-50', text: 'text-rose-900', activeRing: 'border-rose-600 bg-rose-100 ring-rose-500/20' },
    2: { bg: 'border-amber-200 bg-amber-50/40 hover:bg-amber-50', text: 'text-amber-900', activeRing: 'border-amber-600 bg-amber-100 ring-amber-500/20' },
    3: { bg: 'border-slate-200 bg-slate-50/40 hover:bg-slate-50', text: 'text-slate-800', activeRing: 'border-slate-600 bg-slate-100 ring-slate-500/20' },
    4: { bg: 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50', text: 'text-emerald-900', activeRing: 'border-emerald-600 bg-emerald-100 ring-emerald-500/20' },
    5: { bg: 'border-teal-200 bg-teal-50/40 hover:bg-teal-50', text: 'text-teal-900', activeRing: 'border-teal-600 bg-teal-100 ring-teal-500/20' },
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
          className="text-slate-400 hover:text-slate-700 transition p-1.5 rounded-xl hover:bg-slate-100"
        >
          <span className="text-sm font-bold">✕ Exit</span>
        </button>
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-7 md:p-8 transition-all">
        <div className="mb-3">
          <span className="text-[11px] uppercase tracking-wider font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200 inline-block">
            Category: {currentQuestion.categoryLabel}
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
            <span className="text-teal-700 mr-1.5">{currentQuestion.id}.</span>
            &ldquo;{currentQuestion.statement}&rdquo;
          </h3>
        </div>

        {/* 5-point Likert Options */}
        <div className="space-y-2.5 sm:space-y-3 mb-6">
          {LIKERT_SCALE.options.map((opt) => {
            const isSelected = responses[currentQuestion.id] === opt.value
            const style = optionColors[opt.value] || optionColors[3]

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectValue(opt.value)}
                className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center gap-3 sm:gap-4 active:scale-[0.99] ${
                  isSelected
                    ? `${style.activeRing} shadow-md ring-2`
                    : `${style.bg} shadow-sm`
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition ${
                    isSelected
                      ? 'bg-teal-700 text-white shadow'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  {opt.value}
                </div>
                <span
                  className={`flex-1 text-xs sm:text-sm md:text-base ${
                    isSelected ? 'font-bold text-slate-950' : 'font-medium text-slate-800'
                  }`}
                >
                  {opt.label}
                </span>
                {isSelected && (
                  <span className="text-teal-700 font-bold text-base sm:text-lg shrink-0">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
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
            ← Prev
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
                {isSubmitting ? 'Submitting...' : 'Submit Questionnaire ✓'}
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
                <span>Next</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
