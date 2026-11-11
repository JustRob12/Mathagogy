'use client'

import { useState } from 'react'
import type { Assessment, DiagnosticResult } from '@/lib/assessments'
import { gradeDiagnostic } from '@/lib/assessments'
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<DiagnosticResult | null>(initialResult ?? null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    initialResult ? 'saved' : 'idle'
  )
  const [showAnswerReview, setShowAnswerReview] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'correct'>('all')

  const currentQuestion = assessment.questions[currentIndex]
  const isAnswered = selectedAnswers[currentQuestion.id] !== undefined
  const isLastQuestion = currentIndex === assessment.questions.length - 1
  const progressPercent = Math.round(
    ((currentIndex + 1) / assessment.questions.length) * 100
  )

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
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

    const graded = gradeDiagnostic(assessment, selectedAnswers)
    setResult(graded)

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
        weak_topics: graded.weakTopics,
      })

      if (error) {
        console.error('Error saving assessment attempt:', error)
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        if (onSaved) onSaved()
      }
    } catch (err) {
      console.error('Failed to save assessment:', err)
      setSaveStatus('error')
    } finally {
      setIsSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // --- RESULT VIEW ---
  if (result) {
    const filteredAnswers = result.userAnswers.filter((ua) => {
      if (reviewFilter === 'incorrect') return !ua.isCorrect
      if (reviewFilter === 'correct') return ua.isCorrect
      return true
    })

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-4xl mx-auto my-3 sm:my-6 animate-fadeIn">
        {/* Score Hero Banner */}
        <div
          className={`p-6 sm:p-8 md:p-10 text-center text-white relative overflow-hidden ${
            result.passed
              ? 'bg-gradient-to-br from-emerald-700 via-green-700 to-teal-800'
              : 'bg-gradient-to-br from-amber-600 via-orange-600 to-red-700'
          }`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md mb-4 text-3xl sm:text-4xl shadow-inner">
            {result.passed ? '🎉' : '📚'}
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            {result.passed ? 'Assessment Passed!' : 'Needs Review & Practice'}
          </h2>
          <p className="text-white/90 mt-1.5 text-xs sm:text-sm font-medium">
            {assessment.title}
          </p>

          {/* Stats Badges */}
          <div className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-4 max-w-lg mx-auto">
            <div className="bg-white/15 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/20">
              <p className="text-[10px] sm:text-xs uppercase font-semibold text-white/80">
                Score
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-black mt-0.5">
                {result.score} <span className="text-xs sm:text-sm font-normal text-white/70">/ {result.total}</span>
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/20">
              <p className="text-[10px] sm:text-xs uppercase font-semibold text-white/80">
                Percentage
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-black mt-0.5">
                {result.percentage}%
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/20">
              <p className="text-[10px] sm:text-xs uppercase font-semibold text-white/80">
                Status
              </p>
              <p className="text-sm sm:text-base md:text-lg font-black mt-1.5 uppercase">
                {result.passed ? 'Passed ✓' : 'Failed ✗'}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-white/80">
            Passing threshold: 75% ({Math.ceil(result.total * 0.75)} out of {result.total} correct)
          </p>

          <div className="mt-2 text-xs font-medium">
            {saveStatus === 'saving' && <span className="text-white/80">💾 Recording to your history...</span>}
            {saveStatus === 'saved' && <span className="text-emerald-200">✓ Recorded to your assessment history</span>}
            {saveStatus === 'error' && <span className="text-red-200">⚠ Could not connect to history table</span>}
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => {
              setResult(null)
              setCurrentIndex(0)
              setSelectedAnswers({})
              setSaveStatus('idle')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition shadow-sm text-center"
          >
            🔄 Retake Assessment
          </button>
          <div className="flex w-full sm:w-auto gap-2">
            <button
              onClick={() => setShowAnswerReview(!showAnswerReview)}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-emerald-300 bg-white text-emerald-800 font-bold text-xs sm:text-sm hover:bg-emerald-50 transition shadow-sm text-center"
            >
              {showAnswerReview ? 'Hide Answers' : '📋 Review Answers'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs sm:text-sm hover:bg-emerald-800 transition shadow-md text-center"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* YouTube Video Lessons Section */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xl shrink-0">
              📺
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {result.passed
                  ? 'Recommended Video Lessons for Improvement'
                  : 'Targeted YouTube Lessons (Based on Missed Topics)'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {result.weakTopics.length > 0
                  ? `Focus on the ${result.weakTopics.length} topic${result.weakTopics.length > 1 ? 's' : ''} where you had errors:`
                  : 'Perfect score across all topics! No video review needed.'}
              </p>
            </div>
          </div>

          {result.weakTopics.length === 0 ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-emerald-800 font-semibold text-sm">
              🌟 Outstanding! You answered 100% of questions correctly across every topic.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:gap-4">
              {result.weakTopics.map((wt, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5 hover:border-amber-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-200 text-amber-900 mb-1">
                        {wt.incorrectCount} of {wt.totalCount} question{wt.totalCount > 1 ? 's' : ''} missed
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {wt.topic}
                      </h4>
                    </div>
                  </div>

                  {wt.youtubeLinks && wt.youtubeLinks.length > 0 ? (
                    <div className="pt-2 border-t border-amber-200/60 flex flex-wrap gap-2">
                      {wt.youtubeLinks.map((url, linkIdx) => (
                        <a
                          key={linkIdx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold transition shadow-sm"
                        >
                          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <span>Watch Video Lesson {wt.youtubeLinks.length > 1 ? `#${linkIdx + 1}` : ''}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Review your notes and textbook on this topic.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Detailed Question Review */}
          {showAnswerReview && (
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="text-base sm:text-lg font-bold text-slate-900">
                  Question Review ({filteredAnswers.length} shown)
                </h4>
                {/* Filter Pills */}
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setReviewFilter('all')}
                    className={`px-3 py-1 rounded-lg transition ${
                      reviewFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All ({result.userAnswers.length})
                  </button>
                  <button
                    onClick={() => setReviewFilter('incorrect')}
                    className={`px-3 py-1 rounded-lg transition ${
                      reviewFilter === 'incorrect'
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Missed ({result.total - result.score})
                  </button>
                  <button
                    onClick={() => setReviewFilter('correct')}
                    className={`px-3 py-1 rounded-lg transition ${
                      reviewFilter === 'correct'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Correct ({result.score})
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {filteredAnswers.map((ua) => {
                  const q = assessment.questions[ua.questionId - 1]
                  return (
                    <div
                      key={ua.questionId}
                      className={`p-4 rounded-2xl border text-xs sm:text-sm ${
                        ua.isCorrect
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-red-50/60 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-slate-900">
                          <span className="font-bold mr-1">{q.id}.</span> {q.question}
                        </p>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-black shrink-0 ${
                            ua.isCorrect
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-red-200 text-red-900'
                          }`}
                        >
                          {ua.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs flex flex-col sm:flex-row sm:gap-6 gap-1">
                        <p className={ua.isCorrect ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                          <span className="font-bold text-slate-700">Your choice:</span> {ua.selectedOption || '(None)'}
                        </p>
                        {!ua.isCorrect && (
                          <p className="text-slate-800 font-semibold">
                            <span className="font-bold text-slate-700">Correct answer:</span> {ua.correctOption}
                          </p>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        Topic: {ua.topic}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- QUIZ CARD VIEW ---
  return (
    <div className="max-w-2xl mx-auto my-2 sm:my-6 px-1">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {assessment.grade} • {assessment.term}
          </span>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline truncate max-w-[200px]">
            {assessment.title}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 transition p-1.5 rounded-xl hover:bg-slate-100"
          title="Exit to Dashboard"
        >
          <span className="text-sm font-bold">✕ Exit</span>
        </button>
      </div>

      {/* Progress Card */}
      <div className="mb-4 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
          <span>
            Question <span className="text-emerald-700 text-sm">{currentIndex + 1}</span> of {assessment.questions.length}
          </span>
          <span className="text-emerald-700">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card Body */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-7 md:p-8 transition-all">
        {/* Topic Tag */}
        <div className="mb-3">
          <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 inline-block">
            {currentQuestion.topic}
          </span>
        </div>

        {/* Question Prompt */}
        <div className="mb-6">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
            <span className="text-emerald-700 mr-1.5">{currentQuestion.id}.</span>
            {currentQuestion.question}
          </h3>
        </div>

        {/* Options Cards (A, B, C, D) */}
        <div className="space-y-2.5 sm:space-y-3 mb-6">
          {currentQuestion.options.map((opt, optIdx) => {
            const isSelected = selectedAnswers[currentQuestion.id] === optIdx
            const optLetter = String.fromCharCode(65 + optIdx)

            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-center gap-3 sm:gap-4 active:scale-[0.99] ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/90 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 shadow-sm'
                }`}
              >
                {/* Option Letter */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition ${
                    isSelected
                      ? 'bg-emerald-700 text-white shadow'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {optLetter}
                </div>

                {/* Option Text */}
                <span
                  className={`flex-1 text-xs sm:text-sm md:text-base leading-snug ${
                    isSelected ? 'font-bold text-emerald-950' : 'font-medium text-slate-800'
                  }`}
                >
                  {opt}
                </span>

                {/* Check icon */}
                {isSelected && (
                  <span className="text-emerald-700 font-bold text-base sm:text-lg shrink-0">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Navigation & Submission Controls */}
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
                Tap an option to proceed
              </span>
            )}

            {isLastQuestion ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isAnswered || isSubmitting}
                className={`px-6 sm:px-8 py-3 rounded-xl font-black text-xs sm:text-sm transition shadow-md flex items-center gap-2 ${
                  !isAnswered || isSubmitting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-green-700 text-white hover:from-emerald-700 hover:to-green-800 active:scale-[0.98] shadow-emerald-700/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Grading...</span>
                  </>
                ) : (
                  <span>Submit Assessment ✓</span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isAnswered}
                className={`px-6 sm:px-7 py-3 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm flex items-center gap-1.5 ${
                  !isAnswered
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-[0.98]'
                }`}
              >
                <span>Next Question</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
