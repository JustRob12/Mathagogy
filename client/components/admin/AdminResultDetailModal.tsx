'use client'

import { useState } from 'react'

interface AdminResultDetailModalProps {
  attempt: any
  studentName: string
  studentUsername: string
  onClose: () => void
}

export default function AdminResultDetailModal({
  attempt,
  studentName,
  studentUsername,
  onClose,
}: AdminResultDetailModalProps) {
  const [filter, setFilter] = useState<'all' | 'incorrect' | 'correct'>('all')

  const dateStr = new Date(attempt.completed_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const isLikert = attempt.test_type === 'likert'
  const userAnswers: any[] = Array.isArray(attempt.answers) ? attempt.answers : []
  const weakTopics: any[] = Array.isArray(attempt.weak_topics) ? attempt.weak_topics : []

  const filteredAnswers = userAnswers.filter((ua: any) => {
    if (filter === 'incorrect') return !ua.isCorrect
    if (filter === 'correct') return ua.isCorrect
    return true
  })

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-green-800 to-teal-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl font-bold shrink-0 border border-white/20">
              {isLikert ? '📊' : attempt.passed ? '✓' : '✗'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-100">
                  {attempt.grade} • {attempt.term}
                </span>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                    isLikert
                      ? 'bg-teal-200 text-teal-900'
                      : attempt.passed
                      ? 'bg-emerald-300 text-emerald-950'
                      : 'bg-amber-200 text-amber-950'
                  }`}
                >
                  {isLikert
                    ? 'Likert Survey'
                    : attempt.passed
                    ? 'Passed (≥75%)'
                    : 'Needs Review (<75%)'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                {studentName} <span className="text-emerald-200 font-normal text-sm">(@{studentUsername})</span>
              </h3>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                Completed on {dateStr}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
          >
            <span className="text-xl font-bold">✕</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Badges */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 text-center">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Score
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                {isLikert ? `${(attempt.score / 10).toFixed(1)} / 5.0` : `${attempt.score} / ${attempt.total_questions}`}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Percentage
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                {attempt.percentage}%
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Result
              </p>
              <p className="text-xs sm:text-sm font-black text-slate-700 mt-2">
                {isLikert ? 'Completed' : attempt.passed ? 'PASSED ✓' : 'NEEDS REVIEW'}
              </p>
            </div>
          </div>

          {/* If Likert: Dimensions */}
          {isLikert && attempt.category_scores && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Learning Experience Dimensions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attempt.category_scores.map((cs: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-teal-100 bg-teal-50/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800 text-xs">{cs.label}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-teal-200 text-teal-900">
                        {cs.interpretation}
                      </span>
                    </div>
                    <p className="text-lg font-black text-teal-800">{cs.score} / 5.0</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If Diagnostic: Weak Topics & YouTube Links */}
          {!isLikert && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span>📺</span>
                <span>Topics with Errors & Suggested YouTube Lessons ({weakTopics.length})</span>
              </h4>

              {weakTopics.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                  ✓ Perfect Score! Student had 0 mistakes across all topics.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {weakTopics.map((wt: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900">
                          {wt.topic}
                        </p>
                        <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                          {wt.incorrectCount} of {wt.totalCount} question{wt.totalCount > 1 ? 's' : ''} missed
                        </p>
                      </div>

                      {wt.youtubeLinks && wt.youtubeLinks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          {wt.youtubeLinks.map((url: string, uIdx: number) => (
                            <a
                              key={uIdx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition shadow-xs"
                            >
                              <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                              <span>Video {wt.youtubeLinks.length > 1 ? `#${uIdx + 1}` : ''}</span>
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

          {/* Question by Question Breakdown */}
          {!isLikert && userAnswers.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Question Responses ({userAnswers.length} Questions)
                </h4>
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-2.5 py-0.5 rounded-md transition ${
                      filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    All ({userAnswers.length})
                  </button>
                  <button
                    onClick={() => setFilter('incorrect')}
                    className={`px-2.5 py-0.5 rounded-md transition ${
                      filter === 'incorrect' ? 'bg-red-500 text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Missed ({userAnswers.filter((a: any) => !a.isCorrect).length})
                  </button>
                  <button
                    onClick={() => setFilter('correct')}
                    className={`px-2.5 py-0.5 rounded-md transition ${
                      filter === 'correct' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Correct ({userAnswers.filter((a: any) => a.isCorrect).length})
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredAnswers.map((ua: any, qIdx: number) => (
                  <div
                    key={qIdx}
                    className={`p-3 rounded-xl border text-xs ${
                      ua.isCorrect
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-red-50/50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        Question #{ua.questionId}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                          ua.isCorrect ? 'bg-emerald-200 text-emerald-950' : 'bg-red-200 text-red-950'
                        }`}
                      >
                        {ua.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-col sm:flex-row sm:gap-4 gap-0.5 text-xs">
                      <p className={ua.isCorrect ? 'text-emerald-800' : 'text-red-800'}>
                        <span className="font-bold">Student Choice:</span> {ua.selectedOption || '(None)'}
                      </p>
                      {!ua.isCorrect && (
                        <p className="text-slate-700">
                          <span className="font-bold">Correct:</span> {ua.correctOption}
                        </p>
                      )}
                    </div>
                    {ua.topic && (
                      <p className="text-[10px] text-slate-400 mt-1">Topic: {ua.topic}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs sm:text-sm hover:bg-slate-900 transition shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}

