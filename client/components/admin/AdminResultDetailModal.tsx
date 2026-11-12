'use client'

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
  const dateStr = new Date(attempt.completed_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const isLikert = attempt.test_type === 'likert'
  const weakTopics: any[] = Array.isArray(attempt.weak_topics) ? attempt.weak_topics : []
  const tosStats = attempt.category_scores

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-green-800 to-teal-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-sm shrink-0 border border-white/20">
              {isLikert ? (
                <svg className="w-6 h-6 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ) : attempt.passed ? (
                <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
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
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Badges (Percentages Only) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 text-center">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isLikert ? 'Readiness Index' : 'Mastery Score'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                {isLikert ? `${(attempt.score / 10).toFixed(1)} / 5.0` : `${attempt.percentage}%`}
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
                Evaluation
              </p>
              <p className="text-xs sm:text-sm font-black text-slate-700 mt-2 uppercase">
                {isLikert ? 'Completed' : attempt.passed ? 'Passed' : 'Needs Review'}
              </p>
            </div>
          </div>

          {/* Table of Specifications (TOS) Breakdown for Diagnostic */}
          {!isLikert && tosStats && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Table of Specifications (TOS) Cognitive Breakdown
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {['Remembering', 'Understanding', 'Applying'].map((skill) => {
                  const stat = tosStats[skill]
                  if (!stat) return null
                  return (
                    <div key={skill} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-slate-800">{skill}</span>
                        <span className="text-xs font-black text-slate-900">{stat.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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

          {/* Diagnostic Topic Difficulties & Severity Levels */}
          {!isLikert && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Topic Learning Difficulties & Severity
                </h4>
                <span className="text-xs text-slate-400">
                  {weakTopics.length} topic(s) flagged
                </span>
              </div>

              {weakTopics.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                  Mastery achieved across all topics assessed in this test.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {weakTopics.map((wt: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              wt.severity === 'Critical'
                                ? 'bg-red-100 text-red-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {wt.severityLabel || 'Review Required'}
                          </span>
                          {wt.percentage !== undefined && (
                            <span className="text-xs font-black text-slate-800">
                              {wt.percentage}% Accuracy
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900">
                          {wt.topic}
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
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
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
