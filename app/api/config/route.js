import { NextResponse } from 'next/server';
import { getConfigStatus } from '../../../lib/checkConfig';

/**
 * GET handler to check application configuration
 */
export async function GET() {
  try {
    const configStatus = getConfigStatus();
    
    return NextResponse.json({
      status: 'ok',
      config: configStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking configuration:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 