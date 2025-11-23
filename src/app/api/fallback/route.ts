import { NextRequest, NextResponse } from 'next/server';
import { generateFallbackContent } from '@/utils/service-health';

/**
 * Fallback API endpoint for content generation when primary services are unavailable
 * This provides basic content generation without external service dependencies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, type = 'social', modules = ['social'], propertyData } = body;
    
    // Handle different input formats
    let inputText = '';
    if (input && typeof input === 'string') {
      inputText = input;
    } else if (propertyData) {
      // Extract text from property data
      if (typeof propertyData === 'string') {
        inputText = propertyData;
      } else if (propertyData.address && propertyData.description) {
        inputText = `${propertyData.address}: ${propertyData.description}`;
      } else if (propertyData.address) {
        inputText = propertyData.address;
      } else if (propertyData.description) {
        inputText = propertyData.description;
      }
    }
    
    if (!inputText) {
      return NextResponse.json(
        { error: 'Input text or property data is required' },
        { status: 400 }
      );
    }
    
    // Generate fallback content using local utilities
    const fallbackData = generateFallbackContent(inputText, type);
    
    // Structure the response to match the main API format
    const response = {
      success: true,
      data: fallbackData,
      modules: modules,
      source: 'fallback',
      timestamp: new Date().toISOString(),
      message: 'Content generated using fallback system'
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Fallback API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Fallback content generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for fallback service
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'fallback-content',
    timestamp: new Date().toISOString(),
    capabilities: ['social-content', 'listing-content', 'basic-formatting']
  });
}