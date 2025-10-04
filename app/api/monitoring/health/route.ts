import { NextResponse } from 'next/server';
import { getSystemHealth, sendHealthAlert } from '@/lib/monitoring/health';

export async function GET() {
  try {
    const health = await getSystemHealth();
    
    // Send alerts for critical issues
    if (health.overall === 'critical') {
      await sendHealthAlert(health);
    }

    return NextResponse.json({ health });

  } catch (error) {
    console.error('Error getting system health:', error);
    return NextResponse.json(
      { error: 'Failed to get system health' },
      { status: 500 }
    );
  }
}
