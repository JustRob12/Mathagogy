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
                    attempt.test_type === 'likert'
                      ? 'bg-teal-100 text-teal-800 border-teal-200'
                      : attempt.passed
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  {attempt.test_type === 'likert' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                      {attempt.grade} • {attempt.term}
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        attempt.test_type === 'likert'
                          ? 'bg-teal-100 text-teal-800'
                          : attempt.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {attempt.test_type === 'likert'
                        ? 'Survey'
                        : attempt.passed
                        ? 'Passed'
                        : 'Needs Review'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {dateStr}
                  </p>
                </div>
              </div>

              {/* Right Column: Score & Action Buttons */}
              <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-left md:text-right">
                  {attempt.test_type === 'likert' ? (
                    <div>
                      <p className="text-base sm:text-lg font-black text-teal-900 leading-none">
                        {(attempt.score / 10).toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Readiness Index</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-base sm:text-lg font-black text-slate-900 leading-none">
                        {attempt.percentage}%
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {attempt.passed ? 'Benchmark Met (≥75%)' : 'Needs Review (<75%)'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {attempt.test_type !== 'likert' && onViewResult ? (
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

            {/* Expanded section: Weak topics & YouTube links */}
            {isExpanded && (
              <div className="p-4 sm:p-6 bg-slate-50/70 border-t border-slate-200 space-y-4">
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

                {attempt.test_type !== 'likert' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
                        Identified Learning Gaps & Remedial Lessons
                      </h4>
                      <span className="text-xs text-slate-500">
                        {attempt.weak_topics?.length || 0} topic(s) needing practice
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
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 inline-block">
                                {wt.severityLabel || 'Review Required'}
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
