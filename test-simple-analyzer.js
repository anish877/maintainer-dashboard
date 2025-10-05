#!/usr/bin/env node

/**
 * Test script for Simple Repository Analyzer
 * Tests the keyword generation and analysis pipeline
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testKeywordGeneration() {
  console.log('🧪 Testing Simple Repository Analyzer...\n');

  try {
    // Test 1: Generate keywords for a known repository
    console.log('1️⃣ Testing keyword generation for Next.js repository...');
    
    const keywordResponse = await fetch(`${BASE_URL}/api/ai/generate-keywords?repository=vercel/next.js`);
    
    if (!keywordResponse.ok) {
      throw new Error(`Keyword generation failed: ${keywordResponse.status}`);
    }
    
    const keywordData = await keywordResponse.json();
    
    if (keywordData.success) {
      console.log('✅ Keyword generation successful');
      console.log(`📊 Generated ${keywordData.keywords.length} keywords`);
      console.log(`🎯 Confidence: ${Math.round(keywordData.confidence * 100)}%`);
      console.log(`💭 Reasoning: ${keywordData.reasoning}`);
      console.log(`🔍 Sample keywords: ${keywordData.keywords.slice(0, 10).join(', ')}`);
      
      // Check if repository name is included
      const hasRepoName = keywordData.keywords.some(keyword => 
        keyword.toLowerCase().includes('next') || keyword.toLowerCase().includes('nextjs')
      );
      
      if (hasRepoName) {
        console.log('✅ Repository name included in keywords');
      } else {
        console.log('⚠️ Repository name not found in keywords');
      }
    } else {
      console.log('❌ Keyword generation failed:', keywordData.error);
    }

    // Test 2: Test analysis pipeline
    console.log('\n2️⃣ Testing analysis pipeline...');
    
    const analysisResponse = await fetch(`${BASE_URL}/api/simple-scraper/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repository: 'vercel/next.js',
        sources: ['reddit', 'stackoverflow']
      })
    });
    
    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }
    
    const analysisData = await analysisResponse.json();
    
    if (analysisData.success) {
      console.log('✅ Analysis pipeline successful');
      console.log(`📊 Results: ${analysisData.results.length} posts found`);
      console.log(`🐛 Bugs: ${analysisData.stats.bugs}`);
      console.log(`😤 Complaints: ${analysisData.stats.complaints}`);
      console.log(`📈 Total: ${analysisData.stats.total}`);
      
      if (analysisData.results.length > 0) {
        console.log('\n📝 Sample result:');
        const sample = analysisData.results[0];
        console.log(`   Title: ${sample.title}`);
        console.log(`   Source: ${sample.source}`);
        console.log(`   Severity: ${sample.severity}`);
        console.log(`   Confidence: ${Math.round(sample.confidence * 100)}%`);
      }
    } else {
      console.log('❌ Analysis failed:', analysisData.error);
    }

    console.log('\n🎉 Simple Repository Analyzer tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testKeywordGeneration();
