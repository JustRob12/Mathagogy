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
  test_type: 'diagnostic' | 'likert' | 'post_test' | 'retake'
  topic?: string
  initial_score?: number
  initial_total?: number
  initial_percentage?: number
  improvement_percentage?: number
  score: number
  total_questions: number
  percentage: number
  passed: boolean
  answers: any
  weak_topics?: any
  category_scores?: any
  completed_at: string
  profile?: Profile
}

interface RetakeAttemptWithProfile {
  id: string
  user_id: string
  grade: string
  term: string
  initial_score: number
  initial_total: number
  initial_percentage: number
  score: number
  total_questions: number
  percentage: number
  improvement_percentage: number
  passed: boolean
  answers: any
  completed_at: string
  profile?: Profile
}

interface AdminDashboardProps {
  user: User
  profile: any
}

export default function AdminDashboard({ user, profile }: AdminDashboardProps) {
  const [attempts, setAttempts] = useState<AttemptWithProfile[]>([])
  const [retakes, setRetakes] = useState<RetakeAttemptWithProfile[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'results' | 'retakes' | 'students'>('results')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [termFilter, setTermFilter] = useState('all')
  const [testTypeFilter, setTestTypeFilter] = useState<'all' | 'diagnostic' | 'likert'>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest')

  // Selected attempt for details modal
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null)

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

      // Fetch assessment attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('assessment_attempts')
        .select('*')
        .order('completed_at', { ascending: false })

      if (attemptsError) console.error('Attempts fetch error:', attemptsError)

      // Fetch dedicated retake_attempts
      let retakesRaw: any[] = []
      try {
        const { data: rData, error: rError } = await supabase
          .from('retake_attempts')
          .select('*')
          .order('completed_at', { ascending: false })

        if (!rError && rData) {
          retakesRaw = rData
        }
      } catch (rCatch) {
        console.warn('retake_attempts query error (fallback used):', rCatch)
      }

      // Also gather any fallback retakes from assessment_attempts where test_type = 'retake'
      const rawAttemptsList: any[] = (attemptsData as any[]) ?? []
      const fallbackRetakes = rawAttemptsList
        .filter((a) => a.test_type === 'retake')
        .map((a) => ({
          ...a,
          initial_score: a.initial_score ?? 0,
          initial_total: a.initial_total ?? 0,
          initial_percentage: Number(a.initial_percentage ?? 0),
          improvement_percentage:
            Number(a.improvement_percentage ?? 0) ||
            Math.round((Number(a.percentage) - Number(a.initial_percentage ?? 0)) * 10) / 10,
        }))

      const existingRetakeIds = new Set(retakesRaw.map((r) => r.id))
      const combinedRetakes = [
        ...retakesRaw,
        ...fallbackRetakes.filter((r) => !existingRetakeIds.has(r.id)),
      ]

      // Pair each retake with the student's initial diagnostic attempt if initial_percentage is 0
      combinedRetakes.forEach((rt) => {
        if (!rt.initial_percentage || Number(rt.initial_percentage) === 0) {
          const diag = rawAttemptsList.find(
            (a) =>
              a.user_id === rt.user_id &&
              a.grade === rt.grade &&
              a.term === rt.term &&
              a.test_type !== 'retake' &&
              a.test_type !== 'likert'
          )
          if (diag) {
            rt.initial_score = diag.score
            rt.initial_total = diag.total_questions
            rt.initial_percentage = Number(diag.percentage)
            rt.improvement_percentage =
              Math.round((Number(rt.percentage) - Number(diag.percentage)) * 10) / 10
          }
        }
      })

      const profileList: Profile[] = (profilesData as Profile[]) ?? []
      setProfiles(profileList)

      const profileMap = new Map<string, Profile>()
      profileList.forEach((p) => profileMap.set(p.id, p))

      // Clean retakes list
      const mergedRetakes: RetakeAttemptWithProfile[] = combinedRetakes
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
        .map((rt) => ({
          ...rt,
          initial_score: Number(rt.initial_score ?? 0),
          initial_total: Number(rt.initial_total ?? 0),
          initial_percentage: Number(rt.initial_percentage ?? 0),
          improvement_percentage: Number(rt.improvement_percentage ?? 0),
          profile: profileMap.get(rt.user_id),
        }))
      setRetakes(mergedRetakes)

      // Clean diagnostic & surveys attempts list (excluding retakes which have their own table)
      const diagnosticAndSurveys = rawAttemptsList.filter(
        (a) => a.test_type !== 'retake'
      )
      const mergedAttempts: AttemptWithProfile[] = diagnosticAndSurveys.map((att) => ({
        ...att,
        profile: profileMap.get(att.user_id),
      }))
      setAttempts(mergedAttempts)
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
  const diagnosticAttempts = attempts.filter((a) => a.test_type === 'diagnostic' || !a.test_type)
  const totalAttemptsCount = attempts.length
  const passedAttemptsCount = diagnosticAttempts.filter((a) => a.passed).length
  const overallPassRate =
    diagnosticAttempts.length > 0
      ? Math.round((passedAttemptsCount / diagnosticAttempts.length) * 100)
      : 0
  const avgRetakeImprovement =
    retakes.length > 0
      ? Math.round(
          (retakes.reduce((sum, r) => sum + Number(r.improvement_percentage), 0) / retakes.length) * 10
        ) / 10
      : 0
  const positiveRetakesCount = retakes.filter((r) => r.improvement_percentage > 0).length

  // Filtered Assessment Attempts (Diagnostic & Surveys)
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

        // Test Type filter
        if (testTypeFilter !== 'all' && att.test_type !== testTypeFilter) return false

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
  }, [attempts, searchTerm, gradeFilter, termFilter, testTypeFilter, statusFilter, sortBy])

  // Filtered Retakes (Study Verification Table)
  const filteredRetakes = useMemo(() => {
    return retakes
      .filter((rt) => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase()
          const nameMatch = rt.profile?.name?.toLowerCase().includes(term)
          const usernameMatch = rt.profile?.username?.toLowerCase().includes(term)
          if (!nameMatch && !usernameMatch) return false
        }
        if (gradeFilter !== 'all' && rt.grade !== gradeFilter) return false
        if (termFilter !== 'all' && rt.term !== termFilter) return false
        if (statusFilter === 'passed' && !rt.passed) return false
        if (statusFilter === 'review' && rt.passed) return false
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
  }, [retakes, searchTerm, gradeFilter, termFilter, statusFilter, sortBy])

  // Filtered Students Roster
  const filteredStudents = useMemo(() => {
    return profiles.map((p) => {
      const studentAttempts = attempts.filter((a) => a.user_id === p.id)
      const studentDiagnostics = studentAttempts.filter((a) => a.test_type === 'diagnostic' || !a.test_type)
      const studentRetakes = retakes.filter((r) => r.user_id === p.id)
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
        totalTakes: studentAttempts.length + studentRetakes.length,
        diagnosticTakes: studentDiagnostics.length,
        retakeTakes: studentRetakes.length,
        passedTakes: studentPassed,
        avgScore: studentAvg,
      }
    })
  }, [profiles, attempts, retakes])

  // Export Table Data to CSV
  const handleExportCSV = () => {
    if (activeTab === 'retakes') {
      const headers = [
        'Retake ID',
        'Student Name',
        'Username',
        'Grade Level',
        'Assessment Term',
        'First Result (%)',
        'First Score',
        'Retake Result (%)',
        'Retake Score',
        'Improvement Gain (%)',
        'Study Verified',
        'Completed Date',
      ]

      const rows = filteredRetakes.map((rt) => [
        rt.id,
        `"${rt.profile?.name ?? 'Unknown'}"`,
        `"${rt.profile?.username ?? 'Unknown'}"`,
        `"${rt.grade}"`,
        `"${rt.term}"`,
        `${rt.initial_percentage}%`,
        `${rt.initial_score}/${rt.initial_total}`,
        `${rt.percentage}%`,
        `${rt.score}/${rt.total_questions}`,
        `${rt.improvement_percentage > 0 ? `+${rt.improvement_percentage}%` : `${rt.improvement_percentage}%`}`,
        rt.improvement_percentage > 0 ? 'YES' : 'NO',
        `"${new Date(rt.completed_at).toLocaleString()}"`,
      ])

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute(
        'download',
        `mathagogy_retake_study_verification_${new Date().toISOString().split('T')[0]}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
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
              Diagnostic Takes
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">
              {diagnosticAttempts.length}
            </p>
            <p className="text-[10px] text-emerald-300 mt-0.5">
              {passedAttemptsCount} passed ({overallPassRate}%)
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Remedial Retakes
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">
              {retakes.length}
            </p>
            <p className="text-[10px] text-emerald-300 mt-0.5">
              Study verification takes
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-200">
              Average Score Gain
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1">
              {avgRetakeImprovement > 0 ? `+${avgRetakeImprovement}%` : `${avgRetakeImprovement}%`}
            </p>
            <p className="text-[10px] text-emerald-200 mt-0.5">
              {positiveRetakesCount} learners improved
            </p>
          </div>
        </div>
      </div>

      {/* Main Admin Tabs */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl max-w-2xl w-full">
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
          onClick={() => setActiveTab('retakes')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'retakes'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Retakes & Verification ({retakes.length})</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
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
                  Test Type
                </label>
                <select
                  value={testTypeFilter}
                  onChange={(e) => setTestTypeFilter(e.target.value as any)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Tests</option>
                  <option value="diagnostic">Diagnostic Tests</option>
                  <option value="post_test">Topic Post-Tests</option>
                  <option value="likert">Likert Surveys</option>
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
                    <th className="py-3.5 px-4">Test / Topic</th>
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
                    const isPostTest = attempt.test_type === 'post_test'

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

                        {/* Test / Topic */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                                isLikert
                                  ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                  : isPostTest
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {isPostTest
                                ? `${attempt.term} • Post-Test`
                                : isLikert
                                ? 'Likert Survey'
                                : `${attempt.term} Diagnostic`}
                            </span>
                            {isPostTest && attempt.topic && (
                              <p className="text-[11px] font-semibold text-slate-700 truncate max-w-[220px]">
                                {attempt.topic}
                              </p>
                            )}
                          </div>
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
                                    : isPostTest
                                    ? attempt.passed
                                      ? 'bg-indigo-600'
                                      : 'bg-amber-500'
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
                                : isPostTest
                                ? attempt.passed
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-amber-100 text-amber-800'
                                : attempt.passed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLikert
                                  ? 'bg-teal-600'
                                  : isPostTest
                                  ? attempt.passed
                                    ? 'bg-indigo-600'
                                    : 'bg-amber-600'
                                  : attempt.passed
                                  ? 'bg-emerald-600'
                                  : 'bg-amber-600'
                              }`}
                            />
                            {isLikert
                              ? 'Survey'
                              : isPostTest
                              ? attempt.passed
                                ? 'Post-Test Passed'
                                : 'Post-Test Review'
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

      {/* TAB 2: REMEDIAL RETAKES & STUDY VERIFICATION TABLE */}
      {activeTab === 'retakes' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header Description */}
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-900/10 via-slate-50 to-emerald-900/10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 mb-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Remedial Retake & Study Verification Ledger</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  First Result vs Latest Retake Comparison ({retakes.length})
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                  Compares each student's first diagnostic test score against their latest retake of missed questions.
                  This provides concrete verification that students watched the recommended YouTube video lessons, studied their learning gaps, and improved their mathematical proficiency.
                </p>
              </div>

              {/* Export to CSV Button */}
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-2 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export Retakes CSV ({filteredRetakes.length})</span>
              </button>
            </div>

            {/* Retake Filters */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Search Student
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by student name..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Grade Level
                </label>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Terms</option>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="newest">Most Recent</option>
                  <option value="highest">Highest Retake Score</option>
                  <option value="lowest">Lowest Retake Score</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE FORM DATA FOR RETAKES */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading retake records...</div>
          ) : filteredRetakes.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="font-bold text-slate-700">No retake records match your selected filters.</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                When students complete a diagnostic test with learning gaps and then retake their missed questions after studying the YouTube video recommendations, their first vs latest results will appear in this ledger.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Grade & Term</th>
                    <th className="py-3.5 px-4">First Result (Initial)</th>
                    <th className="py-3.5 px-4">Latest Result (Retake)</th>
                    <th className="py-3.5 px-4">Improvement Gain</th>
                    <th className="py-3.5 px-4">Study Verification</th>
                    <th className="py-3.5 px-4">Retake Date</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredRetakes.map((rt, idx) => {
                    const studentName = rt.profile?.name ?? 'Anonymous Student'
                    const studentUsername = rt.profile?.username ?? 'user'
                    const initial = studentName.charAt(0).toUpperCase()
                    const dateFormatted = new Date(rt.completed_at).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )
                    const improved = rt.improvement_percentage > 0

                    return (
                      <tr
                        key={rt.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Index */}
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                          {idx + 1}
                        </td>

                        {/* Student */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
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

                        {/* Grade & Term */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {rt.grade}
                            </span>
                            <p className="text-[11px] font-semibold text-slate-600">
                              {rt.term}
                            </p>
                          </div>
                        </td>

                        {/* First Result (Initial Diagnostic) */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-700 text-sm">
                              {rt.initial_percentage}%
                            </span>
                            <span className="text-[11px] text-slate-400 block font-medium">
                              {rt.initial_score} / {rt.initial_total} correct
                            </span>
                          </div>
                        </td>

                        {/* Latest Result (Retake) */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-black text-slate-900 text-sm">
                              {rt.percentage}%
                            </span>
                            <span className="text-[11px] text-slate-500 block font-medium">
                              {rt.score} / {rt.total_questions} missed solved
                            </span>
                          </div>
                        </td>

                        {/* Improvement Gain */}
                        <td className="py-3.5 px-4">
                          {improved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                              </svg>
                              +{rt.improvement_percentage}%
                            </span>
                          ) : rt.improvement_percentage === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              0.0%
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              {rt.improvement_percentage}%
                            </span>
                          )}
                        </td>

                        {/* Study Verification */}
                        <td className="py-3.5 px-4">
                          {improved ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Studied & Improved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Needs Further Study</span>
                            </span>
                          )}
                        </td>

                        {/* Retake Date */}
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {dateFormatted}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedAttempt({ ...rt, isRetake: true })}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs transition shadow-xs"
                          >
                            View Retake Details
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
              Showing <strong>{filteredRetakes.length}</strong> of{' '}
              <strong>{retakes.length}</strong> recorded remedial retakes
            </span>
            <span className="font-medium text-slate-400">
              Study Verification Database
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENTS ROSTER */}
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

