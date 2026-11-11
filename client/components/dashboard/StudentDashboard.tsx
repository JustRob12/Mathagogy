'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  GRADES,
  type GradeLevel,
  getAssessmentsByGrade,
  type Assessment,
  type AssessmentAttempt,
  type DiagnosticResult,
} from '@/lib/assessments'
import AssessmentCardQuiz from '@/components/assessment/AssessmentCardQuiz'
import LikertCardQuiz from '@/components/assessment/LikertCardQuiz'
import AssessmentHistoryView from '@/components/assessment/AssessmentHistoryView'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  name: string | null
  username: string | null
  role: number | null
}

interface StudentDashboardProps {
  user: User
  profile: Profile | null
}

export default function StudentDashboard({ user, profile }: StudentDashboardProps) {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('Grade 7')
  const [activeTab, setActiveTab] = useState<'assessments' | 'history'>('assessments')
  const [activeAssessment, setActiveAssessment] = useState<{
    assessment: Assessment
    initialResult?: DiagnosticResult | null
  } | null>(null)
  const [isLikertActive, setIsLikertActive] = useState(false)
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([])
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(true)

  const gradeAssessments = useMemo(
    () => getAssessmentsByGrade(selectedGrade),
    [selectedGrade]
  )

  // Fetch assessment history from Supabase
  const fetchHistory = useCallback(async () => {
    setIsLoadingAttempts(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (error) {
        console.warn('Could not load assessment attempts:', error.message)
      } else if (data) {
        setAttempts(data as AssessmentAttempt[])
      }
    } catch (e) {
      console.warn('Database fetch error:', e)
    } finally {
      setIsLoadingAttempts(false)
    }
  }, [user.id])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Summary statistics
  const diagnosticAttempts = attempts.filter((a) => a.test_type === 'diagnostic')
  const passedCount = diagnosticAttempts.filter((a) => a.passed).length
  const avgPercentage =
    diagnosticAttempts.length > 0
      ? Math.round(
          diagnosticAttempts.reduce((sum, a) => sum + Number(a.percentage), 0) /
            diagnosticAttempts.length
        )
      : 0

  // Start a fresh test or retake
  const handleStartOrRetake = (assessment: Assessment) => {
    setActiveAssessment({ assessment, initialResult: null })
  }

  // View the result page of an already-completed assessment
  const handleViewResult = (assessment: Assessment, attempt: AssessmentAttempt) => {
    const diagnosticResult: DiagnosticResult = {
      score: attempt.score,
      total: attempt.total_questions,
      percentage: Number(attempt.percentage),
      passed: attempt.passed,
      weakTopics: attempt.weak_topics ?? [],
      userAnswers:
        Array.isArray(attempt.answers) && attempt.answers.length > 0
          ? attempt.answers
          : assessment.questions.map((q) => {
              const selectedIdx = attempt.answers?.[q.id]
              const isCorrect = selectedIdx === q.correctIndex
              return {
                questionId: q.id,
                selectedOption:
                  selectedIdx !== undefined && q.options[selectedIdx]
                    ? q.options[selectedIdx]
                    : '',
                selectedIndex: selectedIdx ?? -1,
                correctOption: q.options[q.correctIndex],
                correctIndex: q.correctIndex,
                isCorrect,
                topic: q.topic,
              }
            }),
    }

    setActiveAssessment({
      assessment,
      initialResult: diagnosticResult,
    })
  }

  // Handle retake from history view
  const handleRetakeFromHistory = (grade: string, term: string) => {
    if (term === 'Likert Scale') {
      setSelectedGrade(grade as GradeLevel)
      setIsLikertActive(true)
      setActiveAssessment(null)
    } else {
      const found = getAssessmentsByGrade(grade).find((a) => a.term === term)
      if (found) {
        setSelectedGrade(grade as GradeLevel)
        setActiveAssessment({ assessment: found, initialResult: null })
        setIsLikertActive(false)
      }
    }
  }

  // Handle view result from history view
  const handleViewResultFromHistory = (
    grade: string,
    term: string,
    attempt: AssessmentAttempt
  ) => {
    const found = getAssessmentsByGrade(grade).find((a) => a.term === term)
    if (found) {
      setSelectedGrade(grade as GradeLevel)
      handleViewResult(found, attempt)
    }
  }

  // If a test or result page is active, show the AssessmentCardQuiz
  if (activeAssessment) {
    return (
      <AssessmentCardQuiz
        assessment={activeAssessment.assessment}
        initialResult={activeAssessment.initialResult}
        userId={user.id}
        onClose={() => {
          setActiveAssessment(null)
          fetchHistory()
        }}
        onSaved={fetchHistory}
      />
    )
  }

  if (isLikertActive) {
    return (
      <LikertCardQuiz
        grade={selectedGrade}
        userId={user.id}
        onClose={() => {
          setIsLikertActive(false)
          fetchHistory()
        }}
        onSaved={fetchHistory}
      />
    )
  }

  const termThemes = {
    'Term 1': {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      btn: 'bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-500',
      accent: 'border-emerald-100 hover:border-emerald-200',
      dot: 'bg-emerald-500',
    },
    'Term 2': {
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      btn: 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-500',
      accent: 'border-blue-100 hover:border-blue-200',
      dot: 'bg-blue-500',
    },
    'Term 3': {
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      btn: 'bg-indigo-700 hover:bg-indigo-800 focus:ring-indigo-500',
      accent: 'border-indigo-100 hover:border-indigo-200',
      dot: 'bg-indigo-500',
    },
  }

  // Likert attempts for the selected grade
  const likertAttempts = attempts.filter(
    (a) => a.grade === selectedGrade && a.term === 'Likert Scale'
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 text-white shadow-lg p-6 sm:p-8 md:p-10 border border-emerald-700/50">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-2xl" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-500/10 pointer-events-none blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md border border-white/20 text-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Interactive Diagnostic Questionnaires</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Welcome, {profile?.name ?? profile?.username ?? 'Student'} 👋
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
              Select your grade level to take diagnostic tests. Each test runs as interactive question cards, grades your answers, records your history, and provides targeted YouTube video lessons for topics that need review.
            </p>
          </div>

          {/* Quick summary stats pills */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/15 shadow-inner">
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-emerald-200">
                Completed
              </p>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {attempts.length}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/15 shadow-inner">
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-emerald-200">
                Passed
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
                {passedCount}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/15 shadow-inner">
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-emerald-200">
                Avg Score
              </p>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {avgPercentage}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs: Questionnaires vs History */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl max-w-md w-full">
        <button
          onClick={() => setActiveTab('assessments')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'assessments'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>📝</span>
          <span>Assessments</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>📈</span>
          <span>History ({attempts.length})</span>
        </button>
      </div>

      {/* TAB 1: ASSESSMENTS */}
      {activeTab === 'assessments' && (
        <div className="space-y-6">
          {/* Grade Selector (Grade 7 - 10) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Step 1: Choose Your Grade Level
              </label>
              <span className="text-xs text-emerald-700 font-semibold">
                Active: {selectedGrade}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
              {GRADES.map((grade) => {
                const isSelected = selectedGrade === grade
                return (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    type="button"
                    className={`relative p-3.5 sm:p-4 rounded-2xl font-bold text-left transition-all duration-200 flex flex-col justify-between border-2 shadow-sm ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-md ring-4 ring-emerald-500/20 translate-y-[-1px]'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-2xl">🎓</span>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-white text-emerald-800 flex items-center justify-center text-xs font-black shadow-sm">
                          ✓
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-200" />
                      )}
                    </div>
                    <div>
                      <p className="text-base sm:text-lg font-extrabold leading-tight">
                        {grade}
                      </p>
                      <p
                        className={`text-[11px] font-medium mt-0.5 ${
                          isSelected ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        Terms 1, 2, 3 + Survey
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Assessment Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Step 2: Select Questionnaire to Apply
              </label>
              <span className="text-xs text-slate-400">
                {selectedGrade} Questionnaires
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {/* Term Diagnostic Tests */}
              {gradeAssessments.map((assessment) => {
                // Get all attempts for this specific term
                const termAttempts = attempts.filter(
                  (a) => a.grade === assessment.grade && a.term === assessment.term
                )
                const latest = termAttempts[0]
                const theme =
                  termThemes[assessment.term as keyof typeof termThemes] ??
                  termThemes['Term 1']

                return (
                  <div
                    key={assessment.id}
                    className={`bg-white rounded-3xl border shadow-sm p-5 sm:p-6 transition-all hover:shadow-md flex flex-col justify-between ${theme.accent}`}
                  >
                    <div>
                      {/* Term Card Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${theme.badge}`}
                        >
                          {assessment.term} Diagnostic
                        </span>

                        {latest ? (
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              latest.passed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                latest.passed ? 'bg-emerald-600' : 'bg-amber-600'
                              }`}
                            />
                            Latest: {latest.percentage}% • {latest.passed ? 'Passed ✓' : 'Needs Review'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            Not taken yet
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mb-1 leading-snug">
                        {assessment.title}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                        50 sequential question cards with answer validation and targeted YouTube lesson links for weak topics.
                      </p>

                      {/* Topic chips preview */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {Array.from(new Set(assessment.questions.map((q) => q.topic)))
                          .slice(0, 3)
                          .map((topic, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-100 truncate max-w-[200px]"
                            >
                              {topic}
                            </span>
                          ))}
                        <span className="text-[11px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100 font-medium">
                          +more
                        </span>
                      </div>
                    </div>

                    {/* HISTORY OF TAKES DIRECTLY INSIDE THIS TERM CONTAINER */}
                    <div className="mt-2 pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <span>📋</span>
                          <span>Take History ({termAttempts.length})</span>
                        </span>
                        {termAttempts.length > 0 && (
                          <span className="text-[11px] text-emerald-700 font-bold">
                            Best: {Math.max(...termAttempts.map((a) => Number(a.percentage)))}%
                          </span>
                        )}
                      </div>

                      {termAttempts.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {termAttempts.map((attempt, aIdx) => {
                            const takeNumber = termAttempts.length - aIdx
                            const dateStr = new Date(attempt.completed_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })

                            return (
                              <div
                                key={attempt.id}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/70 transition gap-2"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-6 h-6 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center font-black text-[11px] shrink-0">
                                    #{takeNumber}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-extrabold text-slate-900 text-xs">
                                        {attempt.score}/{attempt.total_questions} ({attempt.percentage}%)
                                      </span>
                                      <span
                                        className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                                          attempt.passed
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {attempt.passed ? 'Passed ✓' : 'Needs Review'}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                      {dateStr}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleViewResult(assessment, attempt)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition shrink-0 shadow-xs active:scale-[0.98]"
                                >
                                  View Result
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                          No previous takes yet. Take your first diagnostic test!
                        </div>
                      )}

                      {/* Retake / Start button */}
                      <button
                        onClick={() => handleStartOrRetake(assessment)}
                        className={`w-full py-3 px-4 rounded-2xl text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] mt-2 ${theme.btn}`}
                      >
                        <span>{termAttempts.length > 0 ? '🔄 Retake Assessment' : '🚀 Start Assessment'}</span>
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Likert Scale Questionnaire Card */}
              <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-5 sm:p-6 transition-all hover:shadow-md flex flex-col justify-between hover:border-teal-200">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                      Survey / Experiences
                    </span>
                    {likertAttempts.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 border border-teal-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                        Latest Rating: {(likertAttempts[0].score / 10).toFixed(1)} / 5.0
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        Not taken yet
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-1 leading-snug">
                    Mathematics Learning Experiences Questionnaire
                  </h3>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                    24-statement Likert questionnaire evaluating Math Anxiety, Academic Mindset, Motivation, and Mathematics Self-Efficacy.
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {['Math Anxiety', 'Academic Mindset', 'Motivation', 'Self-Efficacy'].map(
                      (dim, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg border border-teal-100 font-medium"
                        >
                          {dim}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* HISTORY OF LIKERT TAKES DIRECTLY INSIDE THIS CONTAINER */}
                <div className="mt-2 pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span>📋</span>
                      <span>Survey Takes ({likertAttempts.length})</span>
                    </span>
                  </div>

                  {likertAttempts.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {likertAttempts.map((attempt, aIdx) => {
                        const takeNumber = likertAttempts.length - aIdx
                        const dateStr = new Date(attempt.completed_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })

                        return (
                          <div
                            key={attempt.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50/50 border border-teal-200/70 text-xs gap-2"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-teal-200 text-teal-800 flex items-center justify-center font-black text-[11px] shrink-0">
                                #{takeNumber}
                              </span>
                              <div>
                                <span className="font-extrabold text-teal-900 text-xs">
                                  Rating: {(attempt.score / 10).toFixed(1)} / 5.0
                                </span>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {dateStr}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-900">
                              Completed
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                      No survey taken yet for {selectedGrade}.
                    </div>
                  )}

                  <button
                    onClick={() => setIsLikertActive(true)}
                    className="w-full py-3 px-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
                  >
                    <span>📊</span>
                    <span>
                      {likertAttempts.length > 0
                        ? '🔄 Retake Questionnaire'
                        : '🚀 Start Questionnaire'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900">
              Your Complete Assessment History
            </h2>
            <button
              onClick={fetchHistory}
              className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1"
            >
              <span>🔄</span> Refresh
            </button>
          </div>

          {isLoadingAttempts ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              Loading your attempts...
            </div>
          ) : (
            <AssessmentHistoryView
              attempts={attempts}
              onRetake={handleRetakeFromHistory}
              onViewResult={handleViewResultFromHistory}
            />
          )}
        </div>
      )}
    </div>
  )
}
