'use client'

import { useState } from 'react'
import type { RemedialQuestion } from '@/lib/assessments'
import {
  evaluateAnswer,
  getPostTestAdviceByPercentage,
} from '@/lib/assessments'
import { createClient } from '@/lib/supabase/client'

interface TermRetakeQuizProps {
  grade: string
  term: string
  takeNumber?: number // 2 = 2nd take (1st retake), 3 = 3rd take, 4 = 4th take, etc.
  initialScore: number
  initialTotal: number
  initialPercentage: number
  previousPercentage?: number
  missedQuestions: RemedialQuestion[]
  userId: string
  onClose: () => void
  onSaved?: () => void
}

interface RetakeResultData {
  takeNumber: number
  score: number
  total: number
  percentage: number
  improvementPercentage: number
  passed: boolean
  remainingMissed: RemedialQuestion[]
  answers: {
    questionId: number
    question: string
    topic: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    explanation: string
  }[]
}

export default function TermRetakeQuiz({
  grade,
  term,
  takeNumber = 2,
  initialScore,
  initialTotal,
  initialPercentage,
  previousPercentage,
  missedQuestions,
  userId,
  onClose,
  onSaved,
}: TermRetakeQuizProps) {
  const [currentTakeNumber, setCurrentTakeNumber] = useState<number>(takeNumber)
  const [activeMissedQuestions, setActiveMissedQuestions] = useState<RemedialQuestion[]>(missedQuestions)
  const [lastTakeScore, setLastTakeScore] = useState<number>(previousPercentage ?? initialPercentage)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [result, setResult] = useState<RetakeResultData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false)

  const currentQ = activeMissedQuestions[currentIndex]
  const currentAnswerText = currentQ ? userAnswers[currentQ.id] ?? '' : ''
  const isCurrentAnswered = currentAnswerText.trim().length > 0
  const isLastQuestion = currentIndex === activeMissedQuestions.length - 1
  const progressPercent = activeMissedQuestions.length > 0
    ? Math.round(((currentIndex + 1) / activeMissedQuestions.length) * 100)
    : 100

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
    const gradedAnswers = activeMissedQuestions.map((q) => {
      const rawInput = userAnswers[q.id] ?? ''
      const isCorrect = evaluateAnswer(rawInput, q.answer)
      if (isCorrect) score += 1
      return {
        questionId: q.id,
        question: q.question,
        topic: q.topic ?? 'Mathematics',
        userAnswer: rawInput,
        correctAnswer: q.answer,
        isCorrect,
        explanation: q.explanation,
      }
    })

    const total = activeMissedQuestions.length
    const percentage = total > 0 ? Math.round((score / total) * 100 * 10) / 10 : 0
    const improvementPercentage = Math.round((percentage - initialPercentage) * 10) / 10
    const passed = percentage >= 75

    // Find questions still missed
    const remainingMissed = activeMissedQuestions.filter((q) => {
      const match = gradedAnswers.find((a) => a.questionId === q.id)
      return !match || !match.isCorrect
    })

    const retakeResult: RetakeResultData = {
      takeNumber: currentTakeNumber,
      score,
      total,
      percentage,
      improvementPercentage,
      passed,
      remainingMissed,
      answers: gradedAnswers,
    }

    setResult(retakeResult)

    // Save to Supabase (primary: retake_attempts, fallback: assessment_attempts)
    try {
      const supabase = createClient()

      // 1. Primary insert to public.retake_attempts
      const { error: retakeError } = await supabase.from('retake_attempts').insert({
        user_id: userId,
        grade,
        term,
        take_number: currentTakeNumber,
        initial_score: initialScore,
        initial_total: initialTotal,
        initial_percentage: initialPercentage,
        previous_score: initialScore,
        previous_percentage: lastTakeScore,
        score,
        total_questions: total,
        percentage,
        improvement_percentage: improvementPercentage,
        passed,
        answers: gradedAnswers,
        completed_at: new Date().toISOString(),
      })

      if (retakeError) {
        console.warn('retake_attempts insert error, attempting fallback to assessment_attempts:', retakeError.message)
        // 2. Fallback insert to assessment_attempts
        const { error: fallbackError } = await supabase.from('assessment_attempts').insert({
          user_id: userId,
          grade,
          term,
          test_type: 'retake',
          take_number: currentTakeNumber,
          initial_score: initialScore,
          initial_total: initialTotal,
          initial_percentage: initialPercentage,
          improvement_percentage: improvementPercentage,
          score,
          total_questions: total,
          percentage,
          passed,
          answers: gradedAnswers,
          completed_at: new Date().toISOString(),
        })

        if (fallbackError) {
          console.error('Fallback insert failed as well:', fallbackError)
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
      console.error('Failed to record retake attempt:', err)
      setSaveStatus('error')
    } finally {
      setIsSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // -------------------------------------------------------------
  // RESULT VIEW FOR RETAKE
  // -------------------------------------------------------------
  if (result) {
    const advice = getPostTestAdviceByPercentage(result.percentage)
    const isImproved = result.improvementPercentage > 0

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-3xl mx-auto my-3 sm:my-6">
        {/* Header Banner */}
        <div
          className={`p-6 sm:p-8 text-center text-white relative overflow-hidden ${
            result.passed
              ? 'bg-gradient-to-br from-indigo-900 via-blue-900 to-emerald-950'
              : 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900'
          }`}
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md mb-3 border border-white/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white mb-2">
            {grade} • {term} • Take {result.takeNumber} Retake
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Take {result.takeNumber} Retake Completed
          </h2>

          <p className="text-white/80 mt-1 text-xs sm:text-sm font-medium">
            Evaluation of Take {result.takeNumber} Missed Questions
          </p>

          {/* 3 Metric Cards: Initial Take vs Retake vs Improvement */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 text-left">
            {/* Card 1: Initial Result */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block">
                1st Take (Initial Diagnostic)
              </span>
              <p className="text-2xl sm:text-3xl font-black mt-1 text-white">
                {initialPercentage}%
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {initialScore} / {initialTotal} on full test
              </p>
            </div>

            {/* Card 2: Retake Result */}
            <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 block">
                Take {result.takeNumber} Score
              </span>
              <p className="text-2xl sm:text-3xl font-black mt-1 text-emerald-300">
                {result.percentage}%
              </p>
              <p className="text-[11px] text-emerald-200/90 mt-0.5">
                {result.score} of {result.total} solved correctly
              </p>
            </div>

            {/* Card 3: Study Improvement Delta */}
            <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200 block">
                Study Verification
              </span>
              <p className={`text-2xl sm:text-3xl font-black mt-1 ${isImproved ? 'text-emerald-300' : 'text-amber-300'}`}>
                {isImproved ? `+${result.improvementPercentage}%` : `${result.improvementPercentage}%`}
              </p>
              <p className="text-[11px] text-white/90 mt-0.5 font-medium">
                {isImproved ? 'Evidence of study verified' : 'Continue studying lessons'}
              </p>
            </div>
          </div>

          <div className="mt-4 text-xs font-medium">
            {saveStatus === 'saving' && <span className="text-white/80">Saving Take {result.takeNumber} verification to Supabase...</span>}
            {saveStatus === 'saved' && (
              <span className="text-emerald-200 font-bold">
                Take {result.takeNumber} successfully recorded to study verification history
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-200">Could not record Take {result.takeNumber} history</span>
            )}
          </div>
        </div>

        {/* Next Retake Action Card (Take N+1) */}
        {result.remainingMissed.length > 0 ? (
          <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-purple-50/90 border-b border-indigo-200 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-700 text-white">
                Next Retake Ready
              </span>
              <span className="text-xs font-bold text-indigo-900">
                Take {result.takeNumber + 1}
              </span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900">
              {result.remainingMissed.length} Question{result.remainingMissed.length > 1 ? 's' : ''} Still Need Review
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              You solved {result.score} of {result.total} questions. You can retake the remaining {result.remainingMissed.length} missed question{result.remainingMissed.length > 1 ? 's' : ''} right now for Take {result.takeNumber + 1}, or review the YouTube video lessons first until you pass the term.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setLastTakeScore(result.percentage)
                  setActiveMissedQuestions(result.remainingMissed)
                  setCurrentTakeNumber((prev) => prev + 1)
                  setCurrentIndex(0)
                  setUserAnswers({})
                  setResult(null)
                  setSaveStatus('idle')
                  setIsSolutionsOpen(false)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Start Take {result.takeNumber + 1} ({result.remainingMissed.length} Questions)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition text-center"
              >
                Review YouTube Video Lessons
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 bg-emerald-50 border-b border-emerald-200 text-center space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-700 text-white">
              100% Term Mastery Achieved
            </span>
            <h4 className="text-base sm:text-lg font-black text-emerald-950">
              Outstanding! All Previously Missed Questions Solved
            </h4>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              You have mastered every single question across {term} on Take {result.takeNumber}.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-sm"
              >
                Complete & Return to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => {
              setResult(null)
              setCurrentIndex(0)
              setUserAnswers({})
              setSaveStatus('idle')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition shadow-xs text-center"
          >
            Retake Current Set Again
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs sm:text-sm hover:bg-slate-900 transition shadow-sm text-center"
          >
            Return to Assessment Report
          </button>
        </div>

        {/* Retake Advice & Questions Breakdown */}
        <div className="p-5 sm:p-8 space-y-6">
          {/* Advice card based on retake score */}
          <div
            className={`p-5 rounded-2xl border ${
              advice.tier === 'mastered'
                ? 'bg-emerald-50/70 border-emerald-200'
                : advice.tier === 'review'
                ? 'bg-teal-50/70 border-teal-200'
                : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                {advice.title}
              </h4>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  advice.tier === 'mastered'
                    ? 'bg-emerald-200 text-emerald-950'
                    : advice.tier === 'review'
                    ? 'bg-teal-200 text-teal-950'
                    : 'bg-amber-200 text-amber-950'
                }`}
              >
                {advice.badge}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {advice.advice}
            </p>
          </div>

          {/* Question-by-Question Solution Breakdown (Toggleable) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Detailed Solutions for Take {result.takeNumber} ({result.answers.length} Problems)
              </h4>
              <button
                type="button"
                onClick={() => setIsSolutionsOpen(!isSolutionsOpen)}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 transition"
              >
                <span>{isSolutionsOpen ? 'Hide Solutions' : 'View Solutions'}</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${isSolutionsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {isSolutionsOpen && (
              <div className="space-y-3.5 pt-1">
                {result.answers.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition shadow-xs space-y-2.5 ${
                      item.isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-white text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 truncate max-w-[200px]">
                          {item.topic}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          item.isCorrect
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {item.isCorrect ? 'Correct' : 'Needs Review'}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                      {item.question}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                      <p className="text-slate-600">
                        <span className="font-bold">Your Take {result.takeNumber} Answer:</span>{' '}
                        <span className={item.isCorrect ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                          {item.userAnswer || '(None)'}
                        </span>
                      </p>
                      <p className="text-slate-600">
                        <span className="font-bold">Correct Solution:</span>{' '}
                        <span className="font-extrabold text-slate-800">{item.correctAnswer}</span>
                      </p>
                    </div>

                    {item.explanation && (
                      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/40 leading-relaxed">
                        <span className="font-bold text-slate-600">Step-by-Step Explanation:</span>{' '}
                        {item.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // RETAKE QUIZ QUESTION CARDS (Sequential free text input)
  // -------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto my-3 sm:my-6 px-2 sm:px-0">
      {/* Quiz Top Navigation Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {grade} • {term} • Take {currentTakeNumber} Retake
              </span>
              <span className="text-xs text-slate-500 font-semibold truncate max-w-[220px]">
                {currentQ?.topic ?? 'Mathematics'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">
              Retake Question {currentIndex + 1} of {activeMissedQuestions.length}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition shrink-0"
          >
            Cancel Retake
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-700 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
              Item #{currentQ.id}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              {currentQ.cognitiveSkill}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Problem Statement:
            </label>
            <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
              {currentQ.question}
            </p>
          </div>

          {/* Solution Input */}
          <div className="space-y-2">
            <label
              htmlFor="retake-answer-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Your Solution / Answer:
            </label>
            <input
              id="retake-answer-input"
              type="text"
              autoFocus
              value={currentAnswerText}
              onChange={(e) => handleAnswerChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isCurrentAnswered) {
                  if (isLastQuestion) {
                    handleSubmit()
                  } else {
                    handleNext()
                  }
                }
              }}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 focus:outline-none text-sm sm:text-base font-semibold text-slate-900 transition shadow-inner"
            />
            <p className="text-[11px] text-slate-400">
              You must provide an answer to proceed to the next question.
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition ${
                currentIndex === 0
                  ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Previous
            </button>

            {isLastQuestion ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isCurrentAnswered || isSubmitting}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition flex items-center gap-2 ${
                  !isCurrentAnswered || isSubmitting
                    ? 'opacity-40 cursor-not-allowed bg-indigo-400'
                    : 'bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900'
                }`}
              >
                <span>{isSubmitting ? 'Grading Retake...' : 'Submit Retake Assessment'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isCurrentAnswered}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition flex items-center gap-2 ${
                  !isCurrentAnswered
                    ? 'opacity-40 cursor-not-allowed bg-indigo-400'
                    : 'bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900'
                }`}
              >
                <span>Next Question</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
