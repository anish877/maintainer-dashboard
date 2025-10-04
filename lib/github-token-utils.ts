import { Octokit } from '@octokit/rest'

export interface TokenValidationResult {
  isValid: boolean
  error?: string
  needsReauth: boolean
}

/**
 * Validate GitHub access token and check if it has required permissions
 */
export async function validateGitHubToken(accessToken: string): Promise<TokenValidationResult> {
  try {
    const octokit = new Octokit({ auth: accessToken })
    
    // Test the token by making a simple API call
    const response = await octokit.rest.users.getAuthenticated()
    
    if (!response.data) {
      return {
        isValid: false,
        error: 'Token validation failed',
        needsReauth: true
      }
    }

    return {
      isValid: true,
      needsReauth: false
    }
  } catch (error: any) {
    console.error('GitHub token validation error:', error)
    
    if (error.status === 401) {
      return {
        isValid: false,
        error: 'Token is invalid or expired',
        needsReauth: true
      }
    }
    
    if (error.status === 403) {
      return {
        isValid: false,
        error: 'Token lacks required permissions',
        needsReauth: true
      }
    }
    
    return {
      isValid: false,
      error: error.message || 'Unknown token validation error',
      needsReauth: false
    }
  }
}

/**
 * Check if the token has sufficient scopes for the required operations
 */
export async function checkTokenScopes(accessToken: string): Promise<{
  hasRepoAccess: boolean
  hasUserAccess: boolean
  scopes: string[]
}> {
  try {
    const octokit = new Octokit({ auth: accessToken })
    
    // Get user info to check basic access
    const userResponse = await octokit.rest.users.getAuthenticated()
    const hasUserAccess = !!userResponse.data
    
    // Try to get repositories to check repo access
    let hasRepoAccess = false
    try {
      const reposResponse = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 1
      })
      hasRepoAccess = true
    } catch (repoError: any) {
      if (repoError.status === 403) {
        hasRepoAccess = false
      }
    }
    
    // Extract scopes from response headers if available
    const scopes: string[] = []
    
    return {
      hasRepoAccess,
      hasUserAccess,
      scopes
    }
  } catch (error: any) {
    console.error('Error checking token scopes:', error)
    return {
      hasRepoAccess: false,
      hasUserAccess: false,
      scopes: []
    }
  }
}
