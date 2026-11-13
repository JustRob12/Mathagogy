'use client'

import { useState } from 'react'
import type { AssessmentAttempt } from '@/lib/assessments'

interface AssessmentHistoryViewProps {
  attempts: AssessmentAttempt[]
  onRetake: (grade: string, term: string) => void
  onViewResult?: (grade: string, term: string, attempt: AssessmentAttempt) => void
}

export default function AssessmentHistoryView({
  attempts,
  onRetake,
  onViewResult,
}: AssessmentHistoryViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (attempts.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-sm">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Assessment History Yet</h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Choose a Grade above (Grade 7 - 10) and take a diagnostic test or Likert questionnaire. Your scores, competency analysis, and YouTube recommendations will be recorded here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {attempts.map((attempt) => {
        const isExpanded = expandedId === attempt.id
        const isPostTest = attempt.test_type === 'post_test'
        const isLikert = attempt.test_type === 'likert'
        const isRetake = attempt.test_type === 'retake' || attempt.improvement_percentage !== undefined
        const dateStr = new Date(attempt.completed_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        return (
          <div
            key={attempt.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md"
          >
            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Column: Grade, Term, Status */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base shrink-0 border ${
                    isLikert
                      ? 'bg-teal-100 text-teal-800 border-teal-200'
                      : isRetake
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                      : isPostTest
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                      : attempt.passed
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  {isLikert ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ) : isRetake ? (
                    <svg className="w-5 h-5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : isPostTest ? (
                    <svg className="w-5 h-5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : attempt.passed ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {attempt.grade} • {attempt.term} {isRetake ? `• Take ${attempt.take_number ?? 2} Remedial Retake` : isPostTest ? '• Topic Post-Test' : ''}
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isLikert
                          ? 'bg-teal-100 text-teal-800'
                          : isRetake
                          ? (attempt.improvement_percentage ?? 0) > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isPostTest
                          ? attempt.passed
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                          : attempt.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isLikert
                        ? 'Survey'
                        : isRetake
                        ? (attempt.improvement_percentage ?? 0) > 0
                          ? `Studied & Improved (+${attempt.improvement_percentage}%)`
                          : 'Needs Further Study'
                        : isPostTest
                        ? attempt.passed
                          ? 'Post-Test Passed'
                          : 'Post-Test Review'
                        : attempt.passed
                        ? 'Passed'
                        : 'Needs Review'}
                    </span>
                  </div>
                  {isPostTest && attempt.topic && (
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      Topic: {attempt.topic}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {dateStr}
                  </p>
                </div>
              </div>

              {/* Right Column: Score & Action Buttons */}
              <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-left md:text-right">
                  {isLikert ? (
                    <div>
                      <p className="text-base sm:text-lg font-black text-teal-900 leading-none">
                        {(attempt.score / 10).toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Readiness Index</p>
                    </div>
                  ) : isRetake ? (
                    <div>
                      <p className="text-base sm:text-lg font-black text-indigo-950 leading-none">
                        {attempt.percentage}%
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {attempt.score} / {attempt.total_questions} Missed Solved (First: {attempt.initial_percentage ?? 0}%)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-base sm:text-lg font-black text-slate-900 leading-none">
                        {attempt.percentage}%
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {isPostTest
                          ? `${attempt.score} / ${attempt.total_questions} Questions`
                          : attempt.passed
                          ? 'Benchmark Met (≥75%)'
                          : 'Needs Review (<75%)'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isLikert && !isPostTest && !isRetake && onViewResult ? (
                    <button
                      onClick={() => onViewResult(attempt.grade, attempt.term, attempt)}
                      className="px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold transition active:scale-[0.98] shadow-xs"
                    >
                      View Result
                    </button>
                  ) : (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
                      className="px-3 sm:px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-[0.98]"
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </button>
                  )}
                  <button
                    onClick={() => onRetake(attempt.grade, attempt.term)}
                    className="px-3 sm:px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition active:scale-[0.98]"
                  >
                    Retake
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded section: Weak topics & YouTube links OR Post-Test answers */}
            {isExpanded && (
              <div className="p-4 sm:p-6 bg-slate-50/70 border-t border-slate-200 space-y-4">
                {isPostTest && Array.isArray(attempt.answers) && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
                        Topic Post-Test Problem Responses ({attempt.answers.length} Problems)
                      </h4>
                      <span className="text-xs font-semibold text-slate-600">
                        {attempt.topic}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {attempt.answers.map((ans: any, aIdx: number) => (
                        <div
                          key={aIdx}
                          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                            ans.isCorrect
                              ? 'bg-emerald-50/60 border-emerald-200'
                              : 'bg-amber-50/60 border-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">Problem #{aIdx + 1}</span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                ans.isCorrect
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-200'
                              }`}
                            >
                              {ans.isCorrect ? 'Correct' : 'Needs Review'}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900">{ans.question}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <p className="text-slate-600">
                              <span className="font-bold">Your Answer:</span>{' '}
                              <span className={ans.isCorrect ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                                {ans.userAnswer || '(None)'}
                              </span>
                            </p>
                            <p className="text-slate-600">
                              <span className="font-bold">Correct Answer:</span>{' '}
                              <span className="font-extrabold text-slate-800">{ans.correctAnswer}</span>
                            </p>
                          </div>
                          {ans.explanation && (
                            <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                              <span className="font-bold text-slate-600">Explanation:</span> {ans.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {attempt.test_type === 'likert' && attempt.category_scores && (
                  <div>
                    <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-2">
                      Dimension Ratings
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                      {attempt.category_scores.map((cs: any, i: number) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-teal-100 shadow-sm">
                          <p className="text-[11px] font-semibold text-slate-500 truncate">{cs.label}</p>
                          <p className="text-base font-black text-teal-800 mt-1">
                            {cs.score} <span className="text-xs font-normal text-slate-400">/ 5.0</span>
                          </p>
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {cs.interpretation}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Retake Comparison & Problem Breakdown */}
                {isRetake && (
                  <div className="space-y-4">
                    {/* Comparison Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Initial Diagnostic (First Result)
                        </p>
                        <p className="text-xl font-black text-slate-800 mt-1">
                          {attempt.initial_percentage ?? 0}%
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {attempt.initial_score ?? 0} / {attempt.initial_total ?? attempt.total_questions} correct
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                          Take {attempt.take_number ?? 2} Retake (Missed Problems)
                        </p>
                        <p className="text-xl font-black text-indigo-950 mt-1">
                          {attempt.percentage}%
                        </p>
                        <p className="text-[11px] text-indigo-600 mt-0.5">
                          {attempt.score} / {attempt.total_questions} solved
                        </p>
                      </div>

                      <div
                        className={`p-3.5 rounded-xl border ${
                          (attempt.improvement_percentage ?? 0) > 0
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Improvement Delta
                        </p>
                        <p
                          className={`text-xl font-black mt-1 ${
                            (attempt.improvement_percentage ?? 0) > 0
                              ? 'text-emerald-800'
                              : 'text-amber-800'
                          }`}
                        >
                          {(attempt.improvement_percentage ?? 0) > 0
                            ? `+${attempt.improvement_percentage}%`
                            : `${attempt.improvement_percentage ?? 0}%`}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {(attempt.improvement_percentage ?? 0) > 0
                            ? 'Studied & Improved'
                            : 'Needs further study'}
                        </p>
                      </div>
                    </div>

                    {/* Missed questions answered in retake */}
                    {Array.isArray(attempt.answers) && attempt.answers.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
                          Retake Problem Breakdown ({attempt.answers.length} Problems Retaken)
                        </h4>
                        <div className="space-y-2">
                          {attempt.answers.map((ans: any, aIdx: number) => (
                            <div
                              key={aIdx}
                              className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                ans.isCorrect
                                  ? 'bg-emerald-50/60 border-emerald-200'
                                  : 'bg-amber-50/60 border-amber-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-700">
                                  Question #{aIdx + 1} {ans.topic ? `• ${ans.topic}` : ''}
                                </span>
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    ans.isCorrect
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {ans.isCorrect ? 'Correct' : 'Needs Review'}
                                </span>
                              </div>
                              <p className="font-semibold text-slate-900">{ans.question}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <p className="text-slate-600">
                                  <span className="font-bold">Your Retake Answer:</span>{' '}
                                  <span
                                    className={
                                      ans.isCorrect
                                        ? 'text-emerald-700 font-bold'
                                        : 'text-amber-700 font-bold'
                                    }
                                  >
                                    {ans.userAnswer || '(None)'}
                                  </span>
                                </p>
                                <p className="text-slate-600">
                                  <span className="font-bold">Correct Solution:</span>{' '}
                                  <span className="font-extrabold text-slate-800">
                                    {ans.correctAnswer}
                                  </span>
                                </p>
                              </div>
                              {ans.explanation && (
                                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                                  <span className="font-bold text-slate-600">Explanation:</span>{' '}
                                  {ans.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isLikert && !isPostTest && !isRetake && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
                        Recommended Topic Review & Remedial Lessons
                      </h4>
                      <span className="text-xs text-slate-500">
                        {attempt.weak_topics?.length || 0} topic(s) for review
                      </span>
                    </div>

                    {!attempt.weak_topics || attempt.weak_topics.length === 0 ? (
                      <p className="text-xs text-emerald-700 font-semibold">
                        Mastery achieved across all assessed topics.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {attempt.weak_topics.map((wt: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <span
                                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                                  wt.percentage >= 75
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {wt.statusLabel || (wt.percentage >= 75 ? 'Benchmark Met (≥75%)' : 'Review Recommended (<75%)')}
                              </span>
                              <p className="font-bold text-slate-800 text-xs sm:text-sm">
                                {wt.topic}
                              </p>
                              {wt.percentage !== undefined && (
                                <p className="text-[11px] text-slate-500">
                                  Mastery Level: {wt.percentage}%
                                </p>
                              )}
                            </div>

                            {wt.youtubeLinks && wt.youtubeLinks.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 shrink-0">
                                {wt.youtubeLinks.map((url: string, lIdx: number) => (
                                  <a
                                    key={lIdx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition shadow-xs"
                                  >
                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                    </svg>
                                    <span>Lesson {wt.youtubeLinks.length > 1 ? `#${lIdx + 1}` : ''}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
