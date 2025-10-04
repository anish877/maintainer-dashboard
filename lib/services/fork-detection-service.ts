// Fork detection service without database dependency
import { Octokit } from '@octokit/rest'
import { AssignmentService } from './assignment-service'

export class ForkDetectionService {
  private octokit: Octokit
  private assignmentService: AssignmentService

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    })
    this.assignmentService = new AssignmentService()
  }

  async detectForksForAssignment(assignment: any) {
    try {
      console.log(`🍴 Detecting forks for assignment: ${assignment.repositoryName}#${assignment.issueNumber}`)
      
      // List repository forks
      const [owner, repo] = assignment.repositoryName.split('/')
      const forks = await this.octokit.repos.listForks({
        owner,
        repo,
        per_page: 100
      })
      
      // Find fork owned by assignee
      const assigneeFork = forks.data.find(fork => 
        fork.owner.login === assignment.assigneeLogin
      )
      
      if (!assigneeFork) {
        console.log(`❌ No fork found for assignee ${assignment.assigneeLogin}`)
        return null
      }
      
      console.log(`✅ Found fork for assignee: ${assigneeFork.full_name}`)
      
      // Cache fork information (simulated)
      const forkInfo = {
        repositoryId: assignment.repositoryId,
        forkOwner: assigneeFork.owner.login,
        forkId: assigneeFork.id.toString(),
        defaultBranch: assigneeFork.default_branch,
        isPrivate: assigneeFork.private,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
      }
      
      console.log(`💾 Cached fork info for ${assignment.assigneeLogin}`)
      return forkInfo
    } catch (error) {
      console.error(`❌ Error detecting forks for assignment ${assignment.id}:`, error)
      return null
    }
  }

  async checkForkActivity(assignment: any) {
    try {
      console.log(`🔍 Checking fork activity for assignment ${assignment.id}`)
      
      // Get fork information
      const forkInfo = await this.detectForksForAssignment(assignment)
      
      if (!forkInfo) {
        console.log(`❌ No fork found for assignment ${assignment.id}`)
        return { hasNewCommits: false, commits: [] }
      }
      
      // Check for new commits since last activity
      const lastActivity = new Date(assignment.lastActivityAt)
      const commits = await this.getCommitsSince(forkInfo, lastActivity)
      
      if (commits.length > 0) {
        console.log(`📝 Found ${commits.length} new commits in fork`)
        
        // Update assignment activity
        await this.assignmentService.updateActivity(
          assignment.id,
          'FORK_COMMIT',
          'FORK_REPO',
          {
            commits: commits,
            timestamp: new Date()
          }
        )
        
        return { hasNewCommits: true, commits }
      } else {
        console.log(`📭 No new commits found in fork`)
        return { hasNewCommits: false, commits: [] }
      }
    } catch (error) {
      console.error(`❌ Error checking fork activity for assignment ${assignment.id}:`, error)
      return { hasNewCommits: false, commits: [] }
    }
  }

  private async getCommitsSince(forkInfo: any, since: Date) {
    try {
      console.log(`📊 Getting commits since ${since.toISOString()} for fork ${forkInfo.forkOwner}/${forkInfo.forkId}`)
      
      const commits = await this.octokit.repos.listCommits({
        owner: forkInfo.forkOwner,
        repo: forkInfo.forkId,
        since: since.toISOString(),
        per_page: 50
      })
      
      const commitData = commits.data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || 'Unknown',
        date: commit.commit.author?.date || new Date().toISOString(),
        url: commit.html_url
      }))
      
      console.log(`📝 Retrieved ${commitData.length} commits from fork`)
      return commitData
    } catch (error) {
      console.error(`❌ Error getting commits from fork:`, error)
      return []
    }
  }

  async checkAllForks(assignments: any[]) {
    console.log(`🍴 Checking forks for ${assignments.length} assignments`)
    
    const results = []
    
    for (const assignment of assignments) {
      try {
        const forkActivity = await this.checkForkActivity(assignment)
        results.push({
          assignmentId: assignment.id,
          hasNewCommits: forkActivity.hasNewCommits,
          commitCount: forkActivity.commits.length
        })
      } catch (error) {
        console.error(`❌ Error checking fork for assignment ${assignment.id}:`, error)
        results.push({
          assignmentId: assignment.id,
          hasNewCommits: false,
          commitCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    console.log(`✅ Fork check completed for ${assignments.length} assignments`)
    return results
  }

  async getForkCache(repositoryId: string, forkOwner: string) {
    try {
      console.log(`💾 Getting fork cache for ${repositoryId}/${forkOwner}`)
      
      // Simulate cache retrieval
      return null
    } catch (error) {
      console.error(`❌ Error getting fork cache:`, error)
      return null
    }
  }

  async setForkCache(forkInfo: any) {
    try {
      console.log(`💾 Setting fork cache for ${forkInfo.repositoryId}/${forkInfo.forkOwner}`)
      
      // Simulate cache storage
      console.log(`✅ Fork cache stored`)
      return true
    } catch (error) {
      console.error(`❌ Error setting fork cache:`, error)
      return false
    }
  }
}