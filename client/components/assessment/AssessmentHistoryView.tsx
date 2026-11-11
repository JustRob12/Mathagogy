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
        <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
          📝
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Assessment History Yet</h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Choose a Grade above (Grade 7 - 10) and take a diagnostic test or Likert questionnaire. Your scores, answers, and YouTube recommendations will be recorded here!
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
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold shrink-0 ${
                    attempt.test_type === 'likert'
                      ? 'bg-teal-100 text-teal-800 border border-teal-200'
                      : attempt.passed
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {attempt.test_type === 'likert' ? '📊' : attempt.passed ? '✓' : '✗'}
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
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Readiness</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-base sm:text-lg font-black text-slate-900 leading-none">
                        {attempt.score} <span className="text-xs text-slate-400 font-normal">/ {attempt.total_questions}</span> ({attempt.percentage}%)
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Score</p>
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
              <div className="p-4 sm:p-6 bg-slate-50/70 border-t border-slate-200 space-y-4 animate-fadeIn">
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
                          <span className="text-[10px] font-bold text-teal-600 block mt-0.5">
                            {cs.interpretation}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {attempt.test_type !== 'likert' && (
                  <div>
                    <h4 className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-2">
                      Topics Missed & Recommended YouTube Lessons
                    </h4>
                    {(!attempt.weak_topics || attempt.weak_topics.length === 0) ? (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-semibold">
                        ✓ 100% correct across all topics! No video review needed.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {attempt.weak_topics.map((wt: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 sm:p-4 bg-white rounded-xl border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {wt.topic}
                              </p>
                              <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                                {wt.incorrectCount} question{wt.incorrectCount > 1 ? 's' : ''} missed
                              </p>
                            </div>
                            {wt.youtubeLinks && wt.youtubeLinks.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {wt.youtubeLinks.map((url: string, uIdx: number) => (
                                  <a
                                    key={uIdx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold transition shadow-sm"
                                  >
                                    <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                    <span>Watch Video {wt.youtubeLinks.length > 1 ? `#${uIdx + 1}` : ''}</span>
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
