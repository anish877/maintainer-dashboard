'use client'

import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthHeader from '../auth-header'
import AuthImage from '../auth-image'

export default function SignUp() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if user is already signed in
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        router.push('/')
      }
    }
    checkSession()
  }, [router])

  const handleGitHubSignUp = async () => {
    try {
      setIsLoading(true)
      setError('')
      const result = await signIn('github', { 
        callbackUrl: '/',
        redirect: false 
      })
      
      if (result?.error) {
        setError('Failed to sign up with GitHub')
      } else if (result?.ok) {
        router.push('/')
      }
    } catch (err) {
      setError('An error occurred during sign up')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="relative md:flex">
        {/* Content */}
        <div className="md:w-1/2">
          <div className="min-h-[100dvh] h-full flex flex-col after:flex-1">
            <AuthHeader />

            <div className="max-w-sm mx-auto w-full px-4 py-8">
              <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-6">Create your Account</h1>
              
              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* GitHub Sign Up */}
              <div className="space-y-4">
                <button
                  onClick={handleGitHubSignUp}
                  disabled={isLoading}
                  className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isLoading ? 'Creating account...' : 'Sign up with GitHub'}
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">Or continue with email</span>
                </div>
              </div>

              {/* Email form (optional - for future implementation) */}
              <form>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="email">Email Address</label>
                    <input id="email" className="form-input w-full" type="email" disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" htmlFor="name">Full Name</label>
                    <input id="name" className="form-input w-full" type="text" disabled />
                  </div>
                </div>
                <div className="mt-6">
                  <button 
                    type="button" 
                    className="btn w-full bg-gray-200 text-gray-500 cursor-not-allowed" 
                    disabled
                  >
                    Email signup coming soon
                  </button>
                </div>
              </form>

              {/* Footer */}
              <div className="pt-5 mt-6 border-t border-gray-100 dark:border-gray-700/60">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link className="font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" href="/signin">
                    Sign In
                  </Link>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  By signing up, you agree to our{' '}
                  <Link className="font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" href="/terms">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link className="font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" href="/privacy">
                    Privacy Policy
                  </Link>
                </div>
                {/* Info */}
                <div className="mt-5">
                  <div className="bg-violet-500/20 text-violet-700 dark:text-violet-400 px-3 py-2 rounded-lg">
                    <svg className="inline w-3 h-3 shrink-0 fill-current mr-2" viewBox="0 0 12 12">
                      <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                    </svg>
                    <span className="text-sm">
                      Secure authentication powered by GitHub OAuth
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AuthImage />
      </div>
    </main>
  )
}

