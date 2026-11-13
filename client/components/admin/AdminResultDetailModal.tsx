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
  const isPostTest = attempt.test_type === 'post_test'
  const isRetake = attempt.test_type === 'retake' || attempt.improvement_percentage !== undefined
  const weakTopics: any[] = Array.isArray(attempt.weak_topics) ? attempt.weak_topics : []
  const tosStats = attempt.category_scores
  const postTestAnswers: any[] = Array.isArray(attempt.answers) ? attempt.answers : []

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
              ) : isRetake ? (
                <svg className="w-6 h-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : isPostTest ? (
                <svg className="w-6 h-6 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                  {attempt.grade} • {attempt.term} {isRetake ? `• Take ${attempt.take_number ?? 2} Retake` : isPostTest ? '• Topic Post-Test' : ''}
                </span>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                    isLikert
                      ? 'bg-teal-200 text-teal-900'
                      : isRetake
                      ? attempt.improvement_percentage > 0
                        ? 'bg-emerald-300 text-emerald-950'
                        : 'bg-amber-200 text-amber-950'
                      : isPostTest
                      ? attempt.passed
                        ? 'bg-indigo-200 text-indigo-950'
                        : 'bg-amber-200 text-amber-950'
                      : attempt.passed
                      ? 'bg-emerald-300 text-emerald-950'
                      : 'bg-amber-200 text-amber-950'
                  }`}
                >
                  {isLikert
                    ? 'Likert Survey'
                    : isRetake
                    ? attempt.improvement_percentage > 0
                      ? `+${attempt.improvement_percentage}% Improvement`
                      : `${attempt.percentage}% Retake`
                    : isPostTest
                    ? attempt.passed
                      ? 'Post-Test Passed (≥75%)'
                      : 'Post-Test Needs Review (<75%)'
                    : attempt.passed
                    ? 'Passed (≥75%)'
                    : 'Needs Review (<75%)'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                {studentName} <span className="text-emerald-200 font-normal text-sm">(@{studentUsername})</span>
              </h3>
              {isPostTest && attempt.topic && (
                <p className="text-xs text-emerald-200 font-bold mt-0.5">
                  Topic: {attempt.topic}
                </p>
              )}
              {isRetake && (
                <p className="text-xs text-emerald-200 font-bold mt-0.5">
                  1st Take (Initial): {attempt.initial_percentage ?? 0}% → Take {attempt.take_number ?? 2}: {attempt.percentage}% ({attempt.improvement_percentage > 0 ? `+${attempt.improvement_percentage}%` : `${attempt.improvement_percentage}%`})
                </p>
              )}
              <p className="text-[11px] text-emerald-200/80 mt-0.5">
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
          {/* Summary Badges */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 text-center">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isLikert ? 'Readiness Index' : isRetake ? 'Initial Result' : isPostTest ? 'Questions Solved' : 'Mastery Score'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                {isLikert
                  ? `${(attempt.score / 10).toFixed(1)} / 5.0`
                  : isRetake
                  ? `${attempt.initial_percentage ?? 0}%`
                  : isPostTest
                  ? `${attempt.score} / ${attempt.total_questions}`
                  : `${attempt.percentage}%`}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isRetake ? 'Retake Result' : 'Percentage'}
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                {attempt.percentage}%
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isRetake ? 'Study Gain' : 'Evaluation'}
              </p>
              <p className={`text-xs sm:text-sm font-black mt-2 uppercase ${isRetake && attempt.improvement_percentage > 0 ? 'text-emerald-700 font-extrabold' : 'text-slate-700'}`}>
                {isRetake
                  ? attempt.improvement_percentage > 0
                    ? `+${attempt.improvement_percentage}% GAIN`
                    : `${attempt.improvement_percentage}% DELTA`
                  : isLikert
                  ? 'Completed'
                  : attempt.passed
                  ? 'Passed'
                  : 'Needs Review'}
              </p>
            </div>
          </div>

          {/* DEDICATED RETAKE BREAKDOWN WITH INITIAL VS RETAKE EVIDENCE */}
          {isRetake && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-700 text-white inline-block mb-1">
                  Study Verification
                </span>
                <p className="text-xs text-indigo-950 font-semibold leading-relaxed">
                  {attempt.improvement_percentage > 0
                    ? `Study Progress Verified: The student improved from ${attempt.initial_percentage ?? 0}% to ${attempt.percentage}% (+${attempt.improvement_percentage}% gain) on the questions missed in ${attempt.term}.`
                    : `Retake Completed: Student scored ${attempt.percentage}% on the missed questions. Continued practice is encouraged.`}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Retaken Missed Questions ({postTestAnswers.length} Problems)
                </h4>
                <span className="text-xs font-bold text-emerald-700">
                  {attempt.score} of {attempt.total_questions} Solved Correctly
                </span>
              </div>

              <div className="space-y-3">
                {postTestAnswers.map((ans: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition ${
                      ans.isCorrect
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-white text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                          #{ans.questionId ?? idx + 1}
                        </span>
                        {ans.topic && (
                          <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[200px]">
                            {ans.topic}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          ans.isCorrect
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {ans.isCorrect ? 'Correct on Retake' : 'Needs Review'}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-slate-900 mb-3">
                      {ans.question}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Student&apos;s Retake Answer:
                        </span>
                        <span className={`font-bold ${ans.isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {ans.userAnswer || '(No answer entered)'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Canonical Solution:
                        </span>
                        <span className="font-extrabold text-slate-800">
                          {ans.correctAnswer}
                        </span>
                      </div>
                    </div>

                    {ans.explanation && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-700">Step Explanation:</span> {ans.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DEDICATED TOPIC POST-TEST DETAIL BREAKDOWN */}
          {isPostTest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Topic Post-Test Item Breakdown ({postTestAnswers.length} Problems)
                </h4>
                <span className="text-xs font-semibold text-slate-500">
                  {attempt.topic}
                </span>
              </div>

              {postTestAnswers.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  Detailed question logs are not available for this attempt.
                </div>
              ) : (
                <div className="space-y-3">
                  {postTestAnswers.map((ans: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition ${
                        ans.isCorrect
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="w-6 h-6 rounded-lg bg-white text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                          #{ans.questionId ?? idx + 1}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            ans.isCorrect
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {ans.isCorrect ? 'Correct' : 'Needs Review'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-slate-900 mb-3">
                        {ans.question}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Student&apos;s Answer:
                          </span>
                          <span className={`font-bold ${ans.isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {ans.userAnswer || '(No answer provided)'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Canonical Answer:
                          </span>
                          <span className="font-extrabold text-slate-800">
                            {ans.correctAnswer}
                          </span>
                        </div>
                      </div>

                      {ans.explanation && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                          <span className="font-bold text-slate-700">Step Explanation:</span> {ans.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Table of Specifications (TOS) Breakdown for Diagnostic */}
          {!isLikert && !isPostTest && !isRetake && tosStats && (
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

          {/* Diagnostic Topic Review & Interventions */}
          {!isLikert && !isPostTest && !isRetake && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Topic Review & Interventions
                </h4>
                <span className="text-xs text-slate-400">
                  {weakTopics.length} topic(s) needing review
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
                              wt.percentage >= 75
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {wt.statusLabel || (wt.percentage >= 75 ? 'Benchmark Met (≥75%)' : 'Review Recommended (<75%)')}
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
