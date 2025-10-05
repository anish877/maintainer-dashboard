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
    <main className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://github.blog/wp-content/uploads/2023/10/Collaboration-DarkMode-3.png?fit=1200%2C630"
          alt="GitHub Collaboration"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Create your Account</h1>
            <p className="text-white/80">Join the maintainer community</p>
          </div>

          {/* Signup Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 text-red-100 border border-red-500/30 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* GitHub Sign Up */}
            <div className="space-y-6">
              <button
                onClick={handleGitHubSignUp}
                disabled={isLoading}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                )}
                {isLoading ? 'Creating account...' : 'Sign up with GitHub'}
              </button>
            </div>

            {/* Footer */}
            <div className="pt-6 mt-8 border-t border-white/20">
              <div className="text-sm text-white/70 text-center mb-4">
                Already have an account?{' '}
                <Link className="font-medium text-white hover:text-white/80 underline" href="/signin">
                  Sign In
                </Link>
              </div>
              
              <div className="text-sm text-white/70 text-center">
                By signing up, you agree to our{' '}
                <Link className="font-medium text-white hover:text-white/80 underline" href="/terms">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link className="font-medium text-white hover:text-white/80 underline" href="/privacy">
                  Privacy Policy
                </Link>
              </div>
              
              {/* Info */}
              <div className="mt-6">
                <div className="bg-white/10 text-white/90 px-4 py-3 rounded-xl border border-white/20">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 12 12">
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
      </div>
    </main>
  )
}

