'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AdminResultDetailModal from './AdminResultDetailModal'

interface Profile {
  id: string
  name: string | null
  username: string
  role: number
  created_at: string
}

interface AttemptWithProfile {
  id: string
  user_id: string
  grade: string
  term: string
  test_type: 'diagnostic' | 'likert'
  score: number
  total_questions: number
  percentage: number
  passed: boolean
  answers: any
  weak_topics: any
  category_scores?: any
  completed_at: string
  profile?: Profile
}

interface AdminDashboardProps {
  user: User
  profile: any
}

export default function AdminDashboard({ user, profile }: AdminDashboardProps) {
  const [attempts, setAttempts] = useState<AttemptWithProfile[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'results' | 'students'>('results')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [termFilter, setTermFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest')

  // Selected attempt for details modal
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptWithProfile | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) console.error('Profiles fetch error:', profilesError)

      // Fetch attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('assessment_attempts')
        .select('*')
        .order('completed_at', { ascending: false })

      if (attemptsError) console.error('Attempts fetch error:', attemptsError)

      const profileList: Profile[] = (profilesData as Profile[]) ?? []
      setProfiles(profileList)

      const profileMap = new Map<string, Profile>()
      profileList.forEach((p) => profileMap.set(p.id, p))

      const merged: AttemptWithProfile[] = ((attemptsData as any[]) ?? []).map((att) => ({
        ...att,
        profile: profileMap.get(att.user_id),
      }))

      setAttempts(merged)
    } catch (e) {
      console.error('Error loading admin data:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // KPI Calculations
  const totalStudents = profiles.filter((p) => p.role === 1).length
  const diagnosticAttempts = attempts.filter((a) => a.test_type === 'diagnostic')
  const totalAttemptsCount = attempts.length
  const passedAttemptsCount = diagnosticAttempts.filter((a) => a.passed).length
  const overallPassRate =
    diagnosticAttempts.length > 0
      ? Math.round((passedAttemptsCount / diagnosticAttempts.length) * 100)
      : 0
  const avgDiagnosticScore =
    diagnosticAttempts.length > 0
      ? Math.round(
          diagnosticAttempts.reduce((sum, a) => sum + Number(a.percentage), 0) /
            diagnosticAttempts.length
        )
      : 0

  // Filtered Assessment Attempts
  const filteredAttempts = useMemo(() => {
    return attempts
      .filter((att) => {
        // Search filter (by name or username)
        if (searchTerm) {
          const term = searchTerm.toLowerCase()
          const nameMatch = att.profile?.name?.toLowerCase().includes(term)
          const usernameMatch = att.profile?.username?.toLowerCase().includes(term)
          if (!nameMatch && !usernameMatch) return false
        }

        // Grade filter
        if (gradeFilter !== 'all' && att.grade !== gradeFilter) return false

        // Term filter
        if (termFilter !== 'all' && att.term !== termFilter) return false

        // Status filter
        if (statusFilter === 'passed' && (!att.passed || att.test_type === 'likert')) return false
        if (statusFilter === 'review' && (att.passed || att.test_type === 'likert')) return false
        if (statusFilter === 'likert' && att.test_type !== 'likert') return false

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        }
        if (sortBy === 'highest') {
          return Number(b.percentage) - Number(a.percentage)
        }
        if (sortBy === 'lowest') {
          return Number(a.percentage) - Number(b.percentage)
        }
        return 0
      })
  }, [attempts, searchTerm, gradeFilter, termFilter, statusFilter, sortBy])

  // Filtered Students Roster
  const filteredStudents = useMemo(() => {
    return profiles.map((p) => {
      const studentAttempts = attempts.filter((a) => a.user_id === p.id)
      const studentDiagnostics = studentAttempts.filter((a) => a.test_type === 'diagnostic')
      const studentAvg =
        studentDiagnostics.length > 0
          ? Math.round(
              studentDiagnostics.reduce((sum, a) => sum + Number(a.percentage), 0) /
                studentDiagnostics.length
            )
          : null
      const studentPassed = studentDiagnostics.filter((a) => a.passed).length

      return {
        ...p,
        totalTakes: studentAttempts.length,
        diagnosticTakes: studentDiagnostics.length,
        passedTakes: studentPassed,
        avgScore: studentAvg,
      }
    })
  }, [profiles, attempts])

  // Export Table Data to CSV
  const handleExportCSV = () => {
    const headers = [
      'Attempt ID',
      'Student Name',
      'Username',
      'Grade Level',
      'Assessment Term',
      'Test Type',
      'Score',
      'Total Questions',
      'Percentage',
      'Passed',
      'Completed Date',
    ]

    const rows = filteredAttempts.map((att) => [
      att.id,
      `"${att.profile?.name ?? 'Unknown'}"`,
      `"${att.profile?.username ?? 'Unknown'}"`,
      `"${att.grade}"`,
      `"${att.term}"`,
      att.test_type,
      att.score,
      att.total_questions,
      `${att.percentage}%`,
      att.passed ? 'YES' : 'NO',
      `"${new Date(att.completed_at).toLocaleString()}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `mathagogy_student_results_${new Date().toISOString().split('T')[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Result Detail Modal */}
      {selectedAttempt && (
        <AdminResultDetailModal
          attempt={selectedAttempt}
          studentName={selectedAttempt.profile?.name ?? 'Student'}
          studentUsername={selectedAttempt.profile?.username ?? 'unknown'}
          onClose={() => setSelectedAttempt(null)}
        />
      )}

      {/* Admin Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 text-white shadow-xl p-6 sm:p-8 md:p-10 border border-emerald-800/40">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-emerald-500/10 pointer-events-none blur-3xl" />
        <div className="absolute -left-16 -bottom-16 w-72 h-72 rounded-full bg-teal-500/10 pointer-events-none blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>ADMINISTRATOR CONSOLE (ROLE = 0)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Student Results & Diagnostic Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Real-time table view of all students taking Grade 7 - 10 diagnostic assessments. Inspect student scores, pass rates, topic weak points, and export data for reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={fetchData}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold border border-white/20 transition flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Data</span>
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition shadow-sm flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
              </svg>
              <span>Student View</span>
            </Link>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Registered Students
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">
              {totalStudents}
            </p>
            <p className="text-[10px] text-emerald-300 mt-0.5">Enrolled learners</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Total Takes Recorded
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">
              {totalAttemptsCount}
            </p>
            <p className="text-[10px] text-emerald-300 mt-0.5">Diagnostic & Likert</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Diagnostic Pass Rate
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1">
              {overallPassRate}%
            </p>
            <p className="text-[10px] text-emerald-200 mt-0.5">
              {passedAttemptsCount} of {diagnosticAttempts.length} passed
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Average Score
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">
              {avgDiagnosticScore}%
            </p>
            <p className="text-[10px] text-emerald-300 mt-0.5">Across all terms</p>
          </div>
        </div>
      </div>

      {/* Main Admin Tabs */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl max-w-md w-full">
        <button
          onClick={() => setActiveTab('results')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'results'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Assessment Results ({attempts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'students'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Students Roster ({profiles.length})</span>
        </button>
      </div>

      {/* TAB 1: ALL ASSESSMENT RESULTS IN TABLE FORM */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/60 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by student name or username..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Export to CSV Button */}
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export CSV ({filteredAttempts.length})</span>
              </button>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Grade Level
                </label>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Grades</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assessment Term
                </label>
                <select
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Terms</option>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                  <option value="Likert Scale">Likert Scale</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Result Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Status</option>
                  <option value="passed">Passed (≥75%)</option>
                  <option value="review">Needs Review (&lt;75%)</option>
                  <option value="likert">Likert Survey</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sort Order
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="newest">Most Recent</option>
                  <option value="highest">Highest Score</option>
                  <option value="lowest">Lowest Score</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE FORM DATA */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading student results...</div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No assessment results match your selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Grade</th>
                    <th className="py-3.5 px-4">Term</th>
                    <th className="py-3.5 px-4">Score</th>
                    <th className="py-3.5 px-4">Percentage</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Completed Date</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredAttempts.map((attempt, idx) => {
                    const studentName = attempt.profile?.name ?? 'Anonymous Student'
                    const studentUsername = attempt.profile?.username ?? 'user'
                    const initial = studentName.charAt(0).toUpperCase()
                    const dateFormatted = new Date(attempt.completed_at).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )

                    const isLikert = attempt.test_type === 'likert'

                    return (
                      <tr
                        key={attempt.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Index */}
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                          {idx + 1}
                        </td>

                        {/* Student */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {initial}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-snug">
                                {studentName}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                @{studentUsername}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Grade */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {attempt.grade}
                          </span>
                        </td>

                        {/* Term */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                              isLikert
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {attempt.term}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="py-3.5 px-4 font-black text-slate-900">
                          {isLikert
                            ? `${(attempt.score / 10).toFixed(1)} / 5.0`
                            : `${attempt.score} / ${attempt.total_questions}`}
                        </td>

                        {/* Percentage */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block">
                              <div
                                className={`h-2 rounded-full ${
                                  isLikert
                                    ? 'bg-teal-600'
                                    : attempt.passed
                                    ? 'bg-emerald-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${attempt.percentage}%` }}
                              />
                            </div>
                            <span className="font-extrabold text-slate-800">
                              {attempt.percentage}%
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isLikert
                                ? 'bg-teal-100 text-teal-800'
                                : attempt.passed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLikert
                                  ? 'bg-teal-600'
                                  : attempt.passed
                                  ? 'bg-emerald-600'
                                  : 'bg-amber-600'
                              }`}
                            />
                            {isLikert
                              ? 'Survey'
                              : attempt.passed
                              ? 'Passed'
                              : 'Needs Review'}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {dateFormatted}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedAttempt(attempt)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs transition shadow-xs"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer Summary */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>
              Showing <strong>{filteredAttempts.length}</strong> of{' '}
              <strong>{attempts.length}</strong> total submissions
            </span>
            <span className="font-medium text-slate-400">
              Mathagogy Assessment Database
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS ROSTER */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registered Students ({profiles.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of all student accounts and their overall diagnostic performance.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Total Takes</th>
                  <th className="py-3.5 px-4">Tests Passed</th>
                  <th className="py-3.5 px-4">Average Score</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredStudents.map((st, idx) => {
                  const initial = (st.name ?? st.username).charAt(0).toUpperCase()
                  const joined = new Date(st.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                              st.role === 0 ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">
                              {st.name ?? 'No Name'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              @{st.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            st.role === 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {st.role === 0 ? 'Admin (0)' : 'Student (1)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {st.totalTakes} takes
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {st.passedTakes} passed
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {st.avgScore !== null ? `${st.avgScore}%` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">{joined}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

