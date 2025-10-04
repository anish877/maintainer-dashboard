import { NextRequest, NextResponse } from 'next/server'
import { BackgroundMonitorService } from '@/lib/services/background-monitor'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting assignment monitoring cron job...')
    
    const monitor = new BackgroundMonitorService()
    await monitor.runMonitoringCycle()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Assignment monitoring cycle completed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Monitoring cycle failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
