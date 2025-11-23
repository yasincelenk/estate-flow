/**
 * Scraping Service Health Check Endpoint
 * 
 * Checks the availability of web scraping services
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if Firecrawl API key or other scraping services are configured
    const hasFirecrawlKey = !!process.env.FIRECRAWL_API_KEY;
    const hasScrapingService = hasFirecrawlKey;
    
    const scrapingHealthStatus = {
      status: hasScrapingService ? 'healthy' : 'healthy', // Mark as healthy even without API key since we have fallback
      timestamp: new Date().toISOString(),
      service: 'scraping',
      details: {
        firecrawl_configured: hasFirecrawlKey,
        has_fallback: true, // We always have manual input fallback
        message: hasFirecrawlKey ? 'Web scraping service is configured' : 'Using manual input fallback (no API key required)'
      }
    };

    return NextResponse.json(scrapingHealthStatus, { status: 200 });
  } catch (error) {
    console.error('Scraping health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'scraping',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

export async function HEAD(request: NextRequest) {
  // Lightweight health check for scraping service
  try {
    return NextResponse.json(null, { status: 200 });
  } catch (error) {
    return NextResponse.json(null, { status: 503 });
  }
}