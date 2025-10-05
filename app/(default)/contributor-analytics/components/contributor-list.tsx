'use client'

import { useState } from 'react'
import { ContributorDetails } from './contributor-details'

interface Contributor {
  id: string
  username: string
  totalContributions: number
  issuesCreated: number
  prsCreated: number
  commitsCount: number
  commentsCount: number
  isFirstTime: boolean
  isAtRisk: boolean
  isRisingStar: boolean
  retentionScore: number
  engagementScore: number
  burnoutRisk: number
  location?: string
  timezone?: string
  country?: string
  firstContributionAt?: string
  lastContributionAt?: string
  avgTimeBetweenContributions?: number
  contributionPattern?: any
  dayOfWeekPattern?: any
  avgResponseTime?: number
  codeReviewScore?: number
  collaborationScore?: number
  contributionStreak: number
  longestStreak: number
  decliningActivity: boolean
  longAbsence: boolean
  negativeFeedback: boolean
  recentActivity: any[]
}

interface ContributorListProps {
  contributors: Contributor[]
  repository: {
    id: string
    fullName: string
    owner: string
    name: string
  }
  timeRange: string
}

export function ContributorList({ contributors, repository, timeRange }: ContributorListProps) {
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'contributions' | 'retention' | 'engagement' | 'username'>('contributions')
  const [filterBy, setFilterBy] = useState<'all' | 'first-time' | 'at-risk' | 'rising-stars'>('all')

  // Sort contributors
  const sortedContributors = [...contributors].sort((a, b) => {
    switch (sortBy) {
      case 'contributions':
        return b.totalContributions - a.totalContributions
      case 'retention':
        return b.retentionScore - a.retentionScore
      case 'engagement':
        return b.engagementScore - a.engagementScore
      case 'username':
        return a.username.localeCompare(b.username)
      default:
        return 0
    }
  })

  // Filter contributors
  const filteredContributors = sortedContributors.filter(contributor => {
    switch (filterBy) {
      case 'first-time':
        return contributor.isFirstTime
      case 'at-risk':
        return contributor.isAtRisk
      case 'rising-stars':
        return contributor.isRisingStar
      default:
        return true
    }
  })

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-blue-600 dark:text-blue-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20'
    if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/20'
    if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  const getStatusBadge = (contributor: Contributor) => {
    if (contributor.isRisingStar) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          🌟 Rising Star
        </span>
      )
    }
    if (contributor.isAtRisk) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
          ⚠️ At Risk
        </span>
      )
    }
    if (contributor.isFirstTime) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          🎉 First Time
        </span>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Filters and Sorting */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter Contributors
            </label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="form-input w-full"
            >
              <option value="all">All Contributors</option>
              <option value="first-time">First-time Contributors</option>
              <option value="at-risk">At-risk Contributors</option>
              <option value="rising-stars">Rising Stars</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="form-input w-full"
            >
              <option value="contributions">Total Contributions</option>
              <option value="retention">Retention Score</option>
              <option value="engagement">Engagement Score</option>
              <option value="username">Username</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredContributors.length} of {contributors.length} contributors
            </div>
          </div>
        </div>
      </div>

      {/* Contributors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredContributors.map((contributor) => (
          <div
            key={contributor.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedContributor(contributor.id)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {contributor.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {contributor.username}
                  </h3>
                  {contributor.location && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      📍 {contributor.location}
                    </p>
                  )}
                </div>
              </div>
              {getStatusBadge(contributor)}
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              {/* Total Contributions */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Contributions</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {contributor.totalContributions}
                </span>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {contributor.issuesCreated}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Issues</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {contributor.prsCreated}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">PRs</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {contributor.commitsCount}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Commits</div>
                </div>
              </div>

              {/* Health Scores */}
              <div className="space-y-2">
                {/* Retention Score */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Retention</span>
                    <span className={`text-xs font-semibold ${getHealthColor(contributor.retentionScore)}`}>
                      {contributor.retentionScore.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${getHealthBgColor(contributor.retentionScore)}`}
                      style={{ width: `${Math.min(100, contributor.retentionScore)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Engagement Score */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Engagement</span>
                    <span className={`text-xs font-semibold ${getHealthColor(contributor.engagementScore)}`}>
                      {contributor.engagementScore.toFixed(0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${getHealthBgColor(contributor.engagementScore)}`}
                      style={{ width: `${Math.min(100, contributor.engagementScore)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {contributor.firstContributionAt && (
                    <>Joined {new Date(contributor.firstContributionAt).toLocaleDateString()}</>
                  )}
                </span>
                <span>
                  {contributor.contributionStreak > 0 && (
                    <>🔥 {contributor.contributionStreak} week streak</>
                  )}
                </span>
              </div>

              {/* Click indicator */}
              <div className="text-center pt-2">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Click for details →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredContributors.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No contributors found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your filter criteria to see more contributors.
          </p>
        </div>
      )}

      {/* Contributor Details Modal */}
      {selectedContributor && (
        <ContributorDetails
          contributorId={selectedContributor}
          repository={repository}
          timeRange={timeRange}
          onClose={() => setSelectedContributor(null)}
        />
      )}
    </div>
  )
}
