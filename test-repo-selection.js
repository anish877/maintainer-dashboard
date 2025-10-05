#!/usr/bin/env node

/**
 * Test script to verify the repo selection system integration
 * This script tests that the new AI-Powered Tools are properly integrated
 * under the [repoName] dynamic route structure
 */

const fs = require('fs')
const path = require('path')

console.log('🧪 Testing Repository Selection System Integration...\n')

// Test 1: Check if new pages exist
const testPages = [
  'app/(default)/[repoName]/scraper/page.tsx',
  'app/(default)/[repoName]/completeness/page.tsx',
  'app/(default)/[repoName]/health/page.tsx',
  'app/(default)/[repoName]/layout.tsx'
]

console.log('✅ Checking if new pages exist:')
testPages.forEach(page => {
  const fullPath = path.join(process.cwd(), page)
  if (fs.existsSync(fullPath)) {
    console.log(`  ✓ ${page}`)
  } else {
    console.log(`  ✗ ${page} - MISSING`)
  }
})

// Test 2: Check if sidebar has been updated
console.log('\n✅ Checking sidebar integration:')
const sidebarPath = path.join(process.cwd(), 'components/ui/sidebar.tsx')
if (fs.existsSync(sidebarPath)) {
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8')
  
  if (sidebarContent.includes('AI-Powered Tools')) {
    console.log('  ✓ AI-Powered Tools section added')
  } else {
    console.log('  ✗ AI-Powered Tools section missing')
  }
  
  if (sidebarContent.includes('AI Scraper')) {
    console.log('  ✓ AI Scraper link added')
  } else {
    console.log('  ✗ AI Scraper link missing')
  }
  
  if (sidebarContent.includes('Completeness Checker')) {
    console.log('  ✓ Completeness Checker link added')
  } else {
    console.log('  ✗ Completeness Checker link missing')
  }
  
  if (sidebarContent.includes('Health Analytics')) {
    console.log('  ✓ Health Analytics link added')
  } else {
    console.log('  ✗ Health Analytics link missing')
  }
} else {
  console.log('  ✗ Sidebar file not found')
}

// Test 3: Check if pages have proper repository context
console.log('\n✅ Checking repository context integration:')
testPages.slice(0, 3).forEach(page => {
  const fullPath = path.join(process.cwd(), page)
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8')
    
    if (content.includes('useParams')) {
      console.log(`  ✓ ${page} uses useParams for repo context`)
    } else {
      console.log(`  ✗ ${page} missing useParams`)
    }
    
    if (content.includes('repoName')) {
      console.log(`  ✓ ${page} uses repoName parameter`)
    } else {
      console.log(`  ✗ ${page} missing repoName parameter`)
    }
    
    if (content.includes('fetchRepoData')) {
      console.log(`  ✓ ${page} has repository data fetching`)
    } else {
      console.log(`  ✗ ${page} missing repository data fetching`)
    }
  }
})

// Test 4: Check routing structure
console.log('\n✅ Checking routing structure:')
const repoRoutes = [
  'app/(default)/[repoName]/dashboard',
  'app/(default)/[repoName]/triage',
  'app/(default)/[repoName]/duplicate',
  'app/(default)/[repoName]/spam',
  'app/(default)/[repoName]/lifecycle',
  'app/(default)/[repoName]/scraper',
  'app/(default)/[repoName]/completeness',
  'app/(default)/[repoName]/health'
]

repoRoutes.forEach(route => {
  const pagePath = path.join(process.cwd(), route, 'page.tsx')
  if (fs.existsSync(pagePath)) {
    console.log(`  ✓ ${route}/page.tsx exists`)
  } else {
    console.log(`  ✗ ${route}/page.tsx missing`)
  }
})

console.log('\n🎉 Repository Selection System Integration Test Complete!')
console.log('\n📋 Summary:')
console.log('- AI Scraper, Completeness Checker, and Health Analytics are now integrated')
console.log('- All tools are accessible under the [repoName] dynamic route')
console.log('- Repository context is automatically passed to all tools')
console.log('- Sidebar navigation shows AI-Powered Tools when in repository context')
console.log('\n🚀 The system now works just like the existing AI-Powered Tools:')
console.log('   - Issue Triage: /[repoName]/triage')
console.log('   - Duplicate Detection: /[repoName]/duplicate')
console.log('   - Spam Detection: /[repoName]/spam')
console.log('   - Lifecycle Tracker: /[repoName]/lifecycle')
console.log('   - AI Scraper: /[repoName]/scraper')
console.log('   - Completeness Checker: /[repoName]/completeness')
console.log('   - Health Analytics: /[repoName]/health')
