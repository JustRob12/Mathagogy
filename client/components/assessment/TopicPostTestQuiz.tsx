'use client'

import { useState } from 'react'
import type { RemedialQuestion } from '@/lib/assessments'
import {
  evaluateAnswer,
  getPostTestAdviceByPercentage,
} from '@/lib/assessments'
import { createClient } from '@/lib/supabase/client'

interface TopicPostTestQuizProps {
  grade: string
  term: string
  topic: string
  questions: RemedialQuestion[]
  userId: string
  onClose: () => void
  onSaved?: () => void
}

interface PostTestResultData {
  score: number
  total: number
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
}

export default function TopicPostTestQuiz({
  grade,
  term,
  topic,
  questions,
  userId,
  onClose,
  onSaved,
}: TopicPostTestQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [result, setResult] = useState<PostTestResultData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const currentQ = questions[currentIndex]
  const currentAnswerText = currentQ ? userAnswers[currentQ.id] ?? '' : ''
  const isCurrentAnswered = currentAnswerText.trim().length > 0
  const isLastQuestion = currentIndex === questions.length - 1
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100)

  const handleAnswerChange = (val: string) => {
    if (!currentQ) return
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: val,
    }))
  }

  const handleNext = () => {
    if (!isCurrentAnswered) return
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
    if (!isCurrentAnswered) return
    setIsSubmitting(true)
    setSaveStatus('saving')

    let score = 0
    const gradedAnswers = questions.map((q) => {
      const rawInput = userAnswers[q.id] ?? ''
      const isCorrect = evaluateAnswer(rawInput, q.answer)
      if (isCorrect) score += 1
      return {
        questionId: q.id,
        question: q.question,
        userAnswer: rawInput,
        correctAnswer: q.answer,
        isCorrect,
        explanation: q.explanation,
      }
    })

    const total = questions.length
    const percentage = total > 0 ? Math.round((score / total) * 100 * 10) / 10 : 0
    const passed = percentage >= 75

    const postTestResult: PostTestResultData = {
      score,
      total,
      percentage,
      passed,
      answers: gradedAnswers,
    }

    setResult(postTestResult)

    // Save to Supabase (primary table: post_test_attempts, fallback: assessment_attempts)
    try {
      const supabase = createClient()

      // 1. Try inserting into public.post_test_attempts
      const { error: postTestError } = await supabase.from('post_test_attempts').insert({
        user_id: userId,
        grade,
        term,
        topic,
        score,
        total_questions: total,
        percentage,
        passed,
        answers: gradedAnswers,
      })

      if (postTestError) {
        console.warn('Could not insert to post_test_attempts (running fallback):', postTestError.message)
        // Fallback to assessment_attempts with test_type = 'post_test'
        const { error: fallbackError } = await supabase.from('assessment_attempts').insert({
          user_id: userId,
          grade,
          term,
          test_type: 'post_test',
          topic,
          score,
          total_questions: total,
          percentage,
          passed,
          answers: gradedAnswers,
        })

        if (fallbackError) {
          console.error('Error saving post test attempt to fallback:', fallbackError)
          setSaveStatus('error')
        } else {
          setSaveStatus('saved')
          if (onSaved) onSaved()
        }
      } else {
        setSaveStatus('saved')
        if (onSaved) onSaved()
      }
    } catch (err) {
      console.error('Failed to save post-test attempt:', err)
      setSaveStatus('error')
    } finally {
      setIsSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleRetake = () => {
    setResult(null)
    setCurrentIndex(0)
    setUserAnswers({})
    setSaveStatus('idle')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // -------------------------------------------------------------
  // POST-TEST RESULT SCREEN
  // -------------------------------------------------------------
  if (result) {
    const postTestAdvice = getPostTestAdviceByPercentage(result.percentage)

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-3xl mx-auto my-3 sm:my-6 animate-fadeIn">
        {/* Header Hero */}
        <div
          className={`p-6 sm:p-8 md:p-10 text-center text-white relative overflow-hidden ${
            result.passed
              ? 'bg-gradient-to-br from-purple-800 via-indigo-800 to-slate-900'
              : 'bg-gradient-to-br from-amber-700 via-orange-800 to-slate-900'
          }`}
        >
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md mb-3 border border-white/20 shadow-inner">
            {result.passed ? (
              <svg className="w-8 h-8 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {result.passed ? 'Topic Post-Test Passed' : 'Further Practice Recommended'}
          </h2>
          <p className="text-white/80 mt-1 text-xs sm:text-sm font-medium max-w-lg mx-auto">
            {grade} • {term} • {topic}
          </p>

          <div className="mt-6 inline-block bg-white/15 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-white/20 text-center">
            <p className="text-[11px] uppercase font-bold tracking-wider text-white/80">
              Post-Test Score
            </p>
            <p className="text-3xl sm:text-4xl font-black mt-0.5">
              {result.percentage}%
            </p>
            <p className="text-[11px] text-white/70 mt-0.5">
              {result.score} of {result.total} answered correctly
            </p>
          </div>

          <div className="mt-3 text-xs font-medium">
            {saveStatus === 'saving' && <span className="text-white/80">Recording to post-test history...</span>}
            {saveStatus === 'saved' && <span className="text-purple-200">Recorded to your post-test history</span>}
            {saveStatus === 'error' && <span className="text-red-200">Could not record post-test</span>}
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleRetake}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition shadow-sm text-center"
          >
            Retake Post-Test
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-700 text-white font-bold text-xs sm:text-sm hover:bg-purple-800 transition shadow-md text-center"
          >
            Return to Assessment Report
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-8 space-y-6">
          {/* Advice based on percentage */}
          <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Post-Test Evaluation
              </span>
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-950 self-start sm:self-auto">
                {postTestAdvice.badge}
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">
              {postTestAdvice.title}
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {postTestAdvice.advice}
            </p>
          </div>

          {/* Detailed Question Review with Canonical Answers and Explanations */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Post-Test Questions Review ({result.answers.length} Questions)
            </h4>

            <div className="space-y-3">
              {result.answers.map((ans, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-2.5 ${
                    ans.isCorrect
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-extrabold text-slate-900">
                      Question #{ans.questionId}: {ans.question}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${
                        ans.isCorrect
                          ? 'bg-emerald-200 text-emerald-950'
                          : 'bg-amber-200 text-amber-950'
                      }`}
                    >
                      {ans.isCorrect ? 'Correct' : 'Needs Review'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:gap-6 gap-1 text-xs">
                    <p className={ans.isCorrect ? 'text-emerald-800' : 'text-slate-700'}>
                      <span className="font-bold">Your answer:</span> {ans.userAnswer || '(Blank)'}
                    </p>
                    <p className="text-slate-800">
                      <span className="font-bold">Correct answer:</span> {ans.correctAnswer}
                    </p>
                  </div>

                  {ans.explanation && (
                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-700">Explanation:</span> {ans.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // POST-TEST QUIZ QUESTION CARDS
  // -------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto my-2 sm:my-6 px-1 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Topic Post-Test
          </span>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline truncate max-w-[200px]">
            {grade} • {term}
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
            Question <span className="text-purple-700 text-sm">{currentIndex + 1}</span> of {questions.length}
          </span>
          <span className="text-purple-700">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-7 md:p-8">
        <div className="mb-3">
          <span className="text-[11px] uppercase tracking-wider font-bold text-purple-800 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200 inline-block">
            {topic}
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
            <span className="text-purple-700 mr-2">#{currentQ.id}.</span>
            {currentQ.question}
          </h3>
        </div>

        {/* Direct Text Answer Input */}
        <div className="mb-6 space-y-2">
          <label
            htmlFor="post-test-input"
            className="block text-xs font-bold uppercase tracking-wider text-slate-600"
          >
            Your Post-Test Answer:
          </label>
          <input
            id="post-test-input"
            type="text"
            autoFocus
            value={currentAnswerText}
            onChange={(e) => handleAnswerChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (isLastQuestion) {
                  handleSubmit()
                } else {
                  handleNext()
                }
              }
            }}
            placeholder="Type your answer here..."
            className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3.5 text-base sm:text-lg text-slate-900 placeholder-slate-400 font-semibold focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-600 transition shadow-inner"
          />
          <p className="text-[11px] text-slate-400">
            Enter your computed answer or term. Press Enter or Next to proceed.
          </p>
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
            {!isCurrentAnswered && (
              <span className="text-[11px] text-amber-600 font-semibold hidden sm:inline">
                Enter your answer to proceed
              </span>
            )}

            {isLastQuestion ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isCurrentAnswered || isSubmitting}
                className={`px-6 sm:px-8 py-3 rounded-xl font-black text-xs sm:text-sm transition shadow-md flex items-center gap-2 ${
                  !isCurrentAnswered || isSubmitting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-purple-700 hover:bg-purple-800 text-white active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Post-Test'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isCurrentAnswered}
                className={`px-6 sm:px-7 py-3 rounded-xl font-bold text-xs sm:text-sm transition shadow-sm ${
                  !isCurrentAnswered
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-purple-700 text-white hover:bg-purple-800 active:scale-[0.98]'
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

