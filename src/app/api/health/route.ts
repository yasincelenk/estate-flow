/**
 * Health Check API Endpoint
 * 
 * Provides service health monitoring capabilities
 * for the main application services
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Basic health check - can be extended to check database, external services, etc.
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: 'healthy',
        database: 'healthy', // Add actual DB check if needed
        externalServices: 'healthy' // Add external service checks if needed
      },
      version: process.env.npm_package_version || '1.0.0'
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

export async function HEAD(request: NextRequest) {
  // Lightweight health check for monitoring
  try {
    // Quick checks only - no heavy operations
    return NextResponse.json(null, { status: 200 });
  } catch (error) {
    return NextResponse.json(null, { status: 503 });
  }
}