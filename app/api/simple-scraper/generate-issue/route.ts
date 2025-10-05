import { NextRequest, NextResponse } from 'next/server';
import { generateIssueFromResult } from '@/lib/ai/repository-keyword-generator';

export async function POST(request: NextRequest) {
  try {
    const { repository, result } = await request.json();
    
    if (!repository || !result) {
      return NextResponse.json({ error: 'Repository and result are required' }, { status: 400 });
    }

    console.log(`Generating issue for repository: ${repository}`);

    // Generate issue using AI
    const issue = await generateIssueFromResult(repository, result);
    
    return NextResponse.json({
      success: true,
      issue
    });

  } catch (error) {
    console.error('Error generating issue:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
