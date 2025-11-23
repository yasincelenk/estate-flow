/**
 * AI Service Health Check Endpoint
 * 
 * Checks the availability of AI services (OpenAI)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    
    const aiHealthStatus = {
      status: hasOpenAIKey ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'ai',
      details: {
        openai_configured: hasOpenAIKey,
        message: hasOpenAIKey ? 'AI service is properly configured' : 'OpenAI API key not configured'
      }
    };

    return NextResponse.json(aiHealthStatus, { 
      status: hasOpenAIKey ? 200 : 503 
    });
  } catch (error) {
    console.error('AI health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'ai',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

export async function HEAD(request: NextRequest) {
  // Lightweight health check for AI service
  try {
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    return NextResponse.json(null, { status: hasOpenAIKey ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(null, { status: 503 });
  }
}