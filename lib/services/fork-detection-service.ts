import { Octokit } from '@octokit/rest'
import { prisma } from '@/lib/prisma'
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
      console.log(`Detecting forks for assignment: ${assignment.repositoryName}#${assignment.issueNumber}`)
      
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
      
      if (assigneeFork) {
        console.log(`Found fork: ${assigneeFork.full_name}`)
        
        // Cache fork information
        await this.cacheForkInfo(assignment.repositoryId, assigneeFork)
        
        // Update assignment with fork info
        await prisma.assignment.update({
          where: { id: assignment.id },
          data: {
            forkUrl: assigneeFork.html_url,
            forkOwner: assigneeFork.owner.login,
            forkBranch: assigneeFork.default_branch
          }
        })
        
        return assigneeFork
      }
      
      console.log(`No fork found for assignee: ${assignment.assigneeLogin}`)
      return null
    } catch (error) {
      console.error('Fork detection error:', error)
      return null
    }
  }

  async checkForkActivity(assignment: any) {
    try {
      console.log(`Checking fork activity for assignment: ${assignment.id}`)
      
      const forkInfo = await this.getCachedForkInfo(assignment.repositoryId, assignment.assigneeLogin)
      
      if (!forkInfo) {
        console.log('No cached fork info, attempting to detect forks')
        await this.detectForksForAssignment(assignment)
        return
      }
      
      if (forkInfo.isPrivate) {
        console.log('Fork is private, skipping activity check')
        return
      }
      
      // Get commits since last activity
      const commits = await this.octokit.repos.listCommits({
        owner: forkInfo.owner.login,
        repo: forkInfo.name,
        since: assignment.lastActivityAt.toISOString(),
        per_page: 100
      })
      
      // Filter commits by assignee
      const assigneeCommits = commits.data.filter(commit => 
        commit.author?.login === assignment.assigneeLogin ||
        commit.committer?.login === assignment.assigneeLogin
      )
      
      console.log(`Found ${assigneeCommits.length} commits by assignee since last activity`)
      
      // Update activity if new commits found
      if (assigneeCommits.length > 0) {
        const latestCommit = assigneeCommits[0]
        
        await this.assignmentService.updateActivity(
          assignment.id,
          'FORK_COMMIT',
          'FORK',
          {
            commitSha: latestCommit.sha,
            commitMessage: latestCommit.commit.message,
            commitCount: assigneeCommits.length,
            commits: assigneeCommits.map(c => ({
              sha: c.sha,
              message: c.commit.message,
              author: c.author?.login,
              date: c.commit.author.date
            }))
          }
        )
        
        console.log(`Updated activity for assignment ${assignment.id} with fork commits`)
      }
    } catch (error) {
      console.error('Fork activity check error:', error)
      
      // Mark assignment as unknown on persistent failures
      if (this.isPersistentError(error)) {
        await this.assignmentService.updateStatus(assignment.id, 'UNKNOWN')
      }
    }
  }

  async checkAllActiveAssignments() {
    try {
      const assignments = await this.assignmentService.getActiveAssignments()
      console.log(`Checking fork activity for ${assignments.length} active assignments`)
      
      for (const assignment of assignments) {
        try {
          await this.checkForkActivity(assignment)
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`Error checking fork activity for assignment ${assignment.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error checking all fork activities:', error)
    }
  }

  private async cacheForkInfo(repositoryId: string, fork: any) {
    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 12) // Cache for 12 hours
      
      await prisma.forkCache.upsert({
        where: {
          repositoryId_forkOwner: {
            repositoryId,
            forkOwner: fork.owner.login
          }
        },
        update: {
          forkId: fork.id.toString(),
          forkName: fork.name,
          defaultBranch: fork.default_branch,
          isPrivate: fork.private,
          lastChecked: new Date(),
          expiresAt
        },
        create: {
          repositoryId,
          forkOwner: fork.owner.login,
          forkId: fork.id.toString(),
          forkName: fork.name,
          defaultBranch: fork.default_branch,
          isPrivate: fork.private,
          lastChecked: new Date(),
          expiresAt
        }
      })
      
      console.log(`Cached fork info for ${fork.owner.login}`)
    } catch (error) {
      console.error('Error caching fork info:', error)
    }
  }

  private async getCachedForkInfo(repositoryId: string, forkOwner: string) {
    try {
      const cached = await prisma.forkCache.findUnique({
        where: {
          repositoryId_forkOwner: {
            repositoryId,
            forkOwner
          }
        }
      })
      
      if (cached && cached.expiresAt > new Date()) {
        return {
          id: cached.forkId,
          name: cached.forkName,
          owner: { login: forkOwner },
          default_branch: cached.defaultBranch,
          private: cached.isPrivate
        }
      }
      
      return null
    } catch (error) {
      console.error('Error getting cached fork info:', error)
      return null
    }
  }

  private isPersistentError(error: any): boolean {
    // Check for persistent API errors that should mark assignment as unknown
    if (error.status === 404) return true // Fork not found
    if (error.status === 403) return true // Access denied
    if (error.status >= 500) return true // Server errors
    
    return false
  }
}
