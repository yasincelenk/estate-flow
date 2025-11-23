import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with error handling
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

/**
 * HEAD handler for health checks
 * Returns 200 OK if the service is available
 */
export async function HEAD() {
  try {
    // For health checks, we just verify the endpoint is accessible
    // The service can still function without OpenAI key (it has fallback content generation)
    return new Response(null, { 
      status: 200,
      statusText: 'OK'
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(null, { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

interface ScrapedData {
  title: string;
  description: string;
  image: string;
  content: string;
  url: string;
  isFallback?: boolean;
  markdownContent?: string;
  images?: string[];
}

interface GeneratedContent {
  property_title: string;
  property_summary: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
  mls_description: string;
  email_blast: string;
  marketing_headline: string;
  features: string[];
}

// Module types for selective generation
type ModuleType = 'social' | 'listing' | 'all';

// List of common real estate platforms and their patterns
const REAL_ESTATE_PATTERNS = {
  zillow: /zillow\.com/,
  realtor: /realtor\.com/,
  redfin: /redfin\.com/,
  trulia: /trulia\.com/,
  apartments: /apartments\.com/,
  homes: /homes\.com/,
};

function detectPlatform(url: string): string {
  for (const [platform, pattern] of Object.entries(REAL_ESTATE_PATTERNS)) {
    if (pattern.test(url)) {
      return platform;
    }
  }
  return 'unknown';
}

async function scrapeWithFirecrawl(url: string): Promise<ScrapedData> {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Test Firecrawl API availability first
    console.log('Testing Firecrawl API availability...');
    
    // Use Firecrawl API to scrape the web page
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown']
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!firecrawlResponse.ok) {
      const errorBody = await firecrawlResponse.text();
      console.error(`Firecrawl API error: HTTP ${firecrawlResponse.status}`, errorBody);
      
      if (firecrawlResponse.status === 503) {
        throw new Error(`Firecrawl service unavailable (HTTP 503). The scraping service is temporarily down or rate limited.`);
      } else if (firecrawlResponse.status === 429) {
        throw new Error(`Firecrawl rate limit exceeded (HTTP 429). Too many requests, please try again later.`);
      } else if (firecrawlResponse.status === 401) {
        throw new Error(`Firecrawl authentication failed (HTTP 401). Invalid API key configuration.`);
      } else if (firecrawlResponse.status >= 500) {
        throw new Error(`Firecrawl server error (HTTP ${firecrawlResponse.status}). The service is experiencing technical difficulties.`);
      }
      
      throw new Error(`Firecrawl API error: HTTP ${firecrawlResponse.status} - ${errorBody}`);
    }

    const firecrawlData = await firecrawlResponse.json();

    // Validate the Firecrawl response
    if (!firecrawlData.success) {
      throw new Error(`Firecrawl scraping failed: ${firecrawlData.error || 'Unknown error'}`);
    }

    if (!firecrawlData.data || !firecrawlData.data.markdown) {
      throw new Error('No markdown content returned from Firecrawl');
    }

    const markdownContent = firecrawlData.data.markdown;

    // Validate content quality
    if (!markdownContent || markdownContent.length < 100) {
      throw new Error('Insufficient content returned from Firecrawl');
    }

    if (markdownContent.includes('Access Denied') || 
        markdownContent.includes('403 Forbidden') ||
        markdownContent.includes('blocked') ||
        markdownContent.includes('robot')) {
      throw new Error('Content blocked or access denied by target website');
    }

    // Extract basic info from markdown for metadata
    const title = extractTitleFromMarkdown(markdownContent) || 'Real Estate Listing';
    const description = extractDescriptionFromMarkdown(markdownContent) || 'Beautiful property listing';
    const images = extractImagesFromMarkdown(markdownContent);

    return {
      title,
      description,
      image: images[0] || '', // Use first image as primary
      content: markdownContent,
      url,
      isFallback: false,
      markdownContent,
      images
    };

  } catch (error) {
    console.error('Firecrawl scraping error:', error);
    
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('The website is taking too long to respond. Please try a different property URL or paste the description manually.');
      } else if (error.message.includes('403') || error.message.includes('blocked')) {
        throw new Error('This website is blocking access. Please try a different property URL or paste the description manually.');
      } else if (error.message.includes('404')) {
        throw new Error('The property URL could not be found. Please check the URL and try again.');
      } else if (error.message.includes('Network') || error.message.includes('fetch')) {
        throw new Error('Network error occurred. The Firecrawl service may be temporarily unavailable. Please try again or paste the description manually.');
      }
    }
    
    // If Firecrawl fails, throw error to trigger manual text input
    throw new Error('Unable to scrape the website. Please paste the property description manually.');
  }
}

function extractTitleFromMarkdown(markdown: string): string {
  // Try to extract title from markdown (first # heading or first meaningful line)
  const lines = markdown.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.replace('# ', '').trim();
    }
    const trimmed = line.trim();
    if (trimmed && trimmed.length > 10 && trimmed.length < 100 && !trimmed.startsWith('!')) {
      return trimmed;
    }
  }
  return 'Real Estate Listing';
}

function extractDescriptionFromMarkdown(markdown: string): string {
  // Extract first meaningful paragraph
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && trimmed.length > 20) {
      return trimmed.substring(0, 150) + (trimmed.length > 150 ? '...' : '');
    }
  }
  return 'Beautiful property with excellent features';
}

function extractImagesFromMarkdown(markdown: string): string[] {
  // Extract image URLs from markdown using regex pattern ![alt text](url)
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  const rawImages: string[] = [];
  let match;
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    const url = match[1].trim();
    rawImages.push(url);
  }
  
  // Apply smart filtering to remove noise and focus on property photos
  return filterPropertyImages(rawImages);
}

function filterPropertyImages(imageUrls: string[]): string[] {
  // SMART FILTERING: Updated to block specific UI junk seen in results
  // Keep property photos but block Google Play, App Store, flags, housing logos, etc.
  
  // Filter 1: Updated negative keywords - block specific UI junk
  const negativeKeywords = [
    'logo', 'icon', 'svg', 'gif', 'data:image', 'profile', 'avatar',
    'google', 'play', 'app', 'store', 'apple', 'android',
    'flag', 'housing', 'opportunity', 'banner', 'button', 'footer', 'social'
  ];
  
  let filteredImages = imageUrls.filter(url => {
    const urlLower = url.toLowerCase();
    return !negativeKeywords.some(keyword => urlLower.includes(keyword));
  });
  
  // Filter 2: Basic quality check - remove obviously problematic URLs
  filteredImages = filteredImages.filter(url => {
    // Remove URLs that are too short (likely icons or tracking pixels)
    if (url.length < 15) return false;
    
    // Remove base64 encoded images (usually UI elements)
    if (url.includes('data:image') || url.includes('base64')) return false;
    
    // Remove URLs with double slashes in path (usually malformed)
    if (url.includes('//') && !url.startsWith('http')) return false;
    
    return true;
  });
  
  // Filter 3: Positive signal boosting - prioritize property-related images
  const positiveSignals = ['photo', 'img', 'image', 'media', 'gallery', 'static'];
  
  // Score images based on positive signals (but don't exclude if no signals)
  const scoredImages = filteredImages.map(url => {
    const urlLower = url.toLowerCase();
    const score = positiveSignals.reduce((acc, keyword) => 
      acc + (urlLower.includes(keyword) ? 1 : 0), 0
    );
    return { url, score };
  });
  
  // Sort by score (higher score = more likely property photo)
  scoredImages.sort((a, b) => b.score - a.score);
  
  // Filter 4: Deduplication - remove exact duplicates
  const uniqueImages = [...new Set(scoredImages.map(item => item.url))];
  
  // Filter 5: Remove similar URLs (same image with different parameters)
  const finalImages = removeSimilarUrls(uniqueImages);
  
  // Filter 6: Limit to maximum 50 images to avoid overwhelming the UI
  const limitedImages = finalImages.slice(0, 50);
  
  return limitedImages;
}

function removeSimilarUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const url of urls) {
    // Extract base URL without query parameters for comparison
    const baseUrl = url.split('?')[0].toLowerCase();
    
    if (!seen.has(baseUrl)) {
      seen.add(baseUrl);
      result.push(url);
    }
  }
  
  return result;
}

async function generateSocialMediaContent(listingData: ScrapedData, modules: ModuleType[] = ['all']): Promise<GeneratedContent> {
  try {
    // Check if OpenAI is available
    if (!openai) {
      console.warn('OpenAI not available, using fallback content generation');
      throw new Error('OpenAI service unavailable - using fallback');
    }

    const platformContext = detectPlatform(listingData.url);

    // Build modular system prompt based on requested modules
    let systemPrompt = `You are an expert Real Estate Social Media Manager with years of experience creating viral content for real estate agents.

You are analyzing a property listing from ${platformContext}. The listing content is provided in Markdown format below.

Your task is to:
1. Extract key property details from the Markdown content (beds, baths, sqft, price, location, features, amenities)
2. Generate a JSON response with the requested fields based on the modules parameter.

`;

    // Add module-specific instructions
    if (modules.includes('all') || modules.includes('social')) {
      systemPrompt += `For SOCIAL MEDIA content (Instagram, LinkedIn, TikTok):
- 'instagram': A complete, catchy caption string with emojis and hashtags that will engage potential buyers and generate leads. Include property highlights, emotional appeal, and a clear call-to-action. Return as a single string.
- 'linkedin': A professional post string highlighting investment potential, neighborhood insights, and market trends. Position the agent as a market expert. Return as a single string.
- 'tiktok': A short, punchy video script string with Hook, Body, and Call to Action sections. Make it engaging and shareable. Return as a single string.

`;
    }

    if (modules.includes('all') || modules.includes('listing')) {
      systemPrompt += `For LISTING AGENT content (MLS Description, Email Blast, Marketing Headline, Features):
- 'marketing_headline': A short, catchy marketing headline (max 10 words) that captures the property's main appeal and would grab attention in listings or advertisements. Make it compelling and benefit-focused.
- 'features': An array of strings containing the property's key features (e.g., ['3 Beds', '2 Baths', 'Pool', 'Garage', 'Updated Kitchen']). Extract these from the listing content and include only the most important features that buyers care about. Keep it to 6-8 key features maximum.
- 'mls_description': An official, professional MLS description that follows real estate industry standards. This should be a comprehensive property description suitable for MLS listings, including key features, amenities, and property highlights in a formal tone. Make it detailed and compelling for professional use.
- 'email_blast': A newsletter-style email campaign draft for real estate agents to send to their client database. This should be engaging, informative, and include a clear call-to-action. Format it as a complete email with subject line suggestion and professional tone.

`
    }

    // Removed MICROSITE content generation to enforce 2-product structure

    // Always include these base fields
    systemPrompt += `ALWAYS include these base fields:
- 'property_title': Extract and return the clean, professional title/name of the property (e.g., "Forma Miami Apartments", "Downtown Boston Condo", "Suburban Family Home"). Avoid raw markdown artifacts like "Skip to content" or "Started a loan application".
- 'property_summary': A concise, 1-2 sentence summary of the property highlighting its key features and appeal. Make it sound professional and enticing.

IMPORTANT: Return all values as simple strings. Extract clean, professional property information from the markdown content - ignore navigation elements, loan application prompts, or other website artifacts.

Keep each platform's content appropriate for its audience and format. Make the content compelling and actionable based on the actual property details provided.

Property Listing Content (Markdown):
${listingData.content}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Generate social media content for this ${platformContext} listing`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    const parsedResponse = JSON.parse(responseText);
    
    // Validate the response structure and ensure all values are strings
    if (!parsedResponse.property_title || !parsedResponse.property_summary || !parsedResponse.instagram || !parsedResponse.linkedin || !parsedResponse.tiktok || !parsedResponse.mls_description || !parsedResponse.email_blast || !parsedResponse.marketing_headline || !parsedResponse.features) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Ensure all values are strings
    const property_title = String(parsedResponse.property_title);
    const property_summary = String(parsedResponse.property_summary);
    const instagram = typeof parsedResponse.instagram === 'string' ? parsedResponse.instagram : String(parsedResponse.instagram);
    const linkedin = typeof parsedResponse.linkedin === 'string' ? parsedResponse.linkedin : String(parsedResponse.linkedin);
    const tiktok = typeof parsedResponse.tiktok === 'string' ? parsedResponse.tiktok : String(parsedResponse.tiktok);
    const mls_description = typeof parsedResponse.mls_description === 'string' ? parsedResponse.mls_description : String(parsedResponse.mls_description);
    const email_blast = typeof parsedResponse.email_blast === 'string' ? parsedResponse.email_blast : String(parsedResponse.email_blast);
    const marketing_headline = typeof parsedResponse.marketing_headline === 'string' ? parsedResponse.marketing_headline : String(parsedResponse.marketing_headline);
    
    // Ensure features is an array of strings
    const features = Array.isArray(parsedResponse.features) 
      ? parsedResponse.features.map((f: unknown) => String(f).trim()).filter((f: string) => f.length > 0)
      : [];
    
    // Limit features to maximum 8 items
    const limitedFeatures = features.slice(0, 8);

    return {
      property_title: property_title,
      property_summary: property_summary,
      instagram: instagram,
      linkedin: linkedin,
      tiktok: tiktok,
      mls_description: mls_description,
      email_blast: email_blast,
      marketing_headline: marketing_headline,
      features: limitedFeatures
    };
  } catch (error) {
    console.error('OpenAI generation error:', error);
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key is invalid or missing. Please check your configuration.');
      } else if (error.message.includes('rate limit')) {
        throw new Error('OpenAI rate limit exceeded. Please try again in a few moments.');
      } else if (error.message.includes('timeout')) {
        throw new Error('OpenAI service is taking too long to respond. Please try again.');
      } else if (error.message.includes('insufficient_quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your account billing.');
      }
    }
    
    // Return fallback content if AI generation fails
    return {
      property_title: listingData.title || 'Beautiful Property',
      property_summary: listingData.description || 'Stunning property with excellent features and prime location.',
      instagram: `Check out this amazing property! ${listingData.title} - ${listingData.description} Don't miss this opportunity! #RealEstate #DreamHome #JustListed`,
      linkedin: `Excited to share this property opportunity: ${listingData.title}. ${listingData.description} Contact me for more details and market insights. #RealEstate #PropertyInvestment`,
      tiktok: `🎥 Hook: Check out this incredible property! 🏡 Body: ${listingData.title} - ${listingData.description} CTA: DM me for a private showing! 📲`,
      mls_description: `${listingData.title || 'Beautiful Property'}. ${listingData.description || 'Stunning property with excellent features and prime location.'} This property offers exceptional value and is perfect for discerning buyers seeking quality and convenience.`,
      email_blast: `Subject: 🏡 New Listing Alert: ${listingData.title || 'Beautiful Property'}

Hi [Client Name],

I wanted to share this exciting new listing with you!

${listingData.title || 'Beautiful Property'} - ${listingData.description || 'Stunning property with excellent features and prime location.'}

This property offers exceptional value and is perfect for discerning buyers. Don't miss this opportunity!

Best regards,
[Your Name]`,
      marketing_headline: 'Stunning Property with Exceptional Features',
      features: ['Beautiful Property', 'Prime Location', 'Excellent Features']
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, manualText, modules = ['all'] } = body;

    // Validate modules parameter
    const validModules = ['social', 'listing', 'all'];
    const requestedModules = Array.isArray(modules) ? modules : [modules];
    const invalidModules = requestedModules.filter((m: string) => !validModules.includes(m));
    
    if (invalidModules.length > 0) {
      return NextResponse.json(
        { error: `Invalid modules: ${invalidModules.join(', ')}. Valid modules: ${validModules.join(', ')}` },
        { status: 400 }
      );
    }

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format (skip validation for manual text mode)
    if (!manualText && url !== 'manual') {
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    // Detect platform for better error messages
    const platform = detectPlatform(url);

    let scrapedData: ScrapedData;

    // Check if manual text is provided
    if (manualText && manualText.trim()) {
      // Use manual text instead of scraping
      scrapedData = {
        title: extractTitleFromMarkdown(manualText) || 'Real Estate Listing',
        description: extractDescriptionFromMarkdown(manualText) || 'Beautiful property listing',
        image: '',
        content: manualText,
        url,
        isFallback: false,
        markdownContent: manualText,
        images: [] // No images for manual text
      };
    } else {
      // Scrape the real estate listing using Firecrawl
      scrapedData = await scrapeWithFirecrawl(url);
    }
    
    // Generate social media content using OpenAI with modular support
    const generatedContent = await generateSocialMediaContent(scrapedData, requestedModules as ModuleType[]);

    return NextResponse.json({
      success: true,
      data: generatedContent,
      modules: requestedModules,
      scrapedData: {
        title: generatedContent.property_title, // Use AI-extracted clean title
        description: generatedContent.property_summary, // Use AI-extracted clean summary
        image: scrapedData.image,
        platform: platform,
        isFallback: scrapedData.isFallback,
        contentLength: scrapedData.content.length,
        isManualText: !!manualText,
        images: scrapedData.images || [], // Include extracted images
        url: url // Include the submitted URL
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    // Enhanced service availability error handling
    let statusCode = 500;
    let userMessage = errorMessage;
    let serviceStatus = 'unknown';
    
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('temporarily unavailable')) {
      userMessage = 'Service temporarily unavailable. This usually happens when real estate websites block automated access or the scraping service is overloaded.';
      statusCode = 503;
      serviceStatus = 'unavailable';
    } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      userMessage = 'Too many requests. The service is rate limited. Please try again in a few minutes.';
      statusCode = 429;
      serviceStatus = 'rate_limited';
    } else if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
      userMessage = 'Service authentication failed. Please contact support.';
      statusCode = 503;
      serviceStatus = 'auth_failed';
    } else if (errorMessage.includes('timeout')) {
      userMessage = 'Request timeout. The website might be slow or blocking access.';
      statusCode = 504;
      serviceStatus = 'timeout';
    } else if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
      userMessage = 'Service quota exceeded. Please try again later.';
      statusCode = 429;
      serviceStatus = 'quota_exceeded';
    } else if (errorMessage.includes('Firecrawl') || errorMessage.includes('scrape')) {
      userMessage = 'Web scraping service unavailable. Real estate sites often block automated access.';
      statusCode = 503;
      serviceStatus = 'scraping_failed';
    } else if (errorMessage.includes('OpenAI') || errorMessage.includes('AI')) {
      userMessage = 'AI content generation service temporarily unavailable.';
      statusCode = 503;
      serviceStatus = 'ai_unavailable';
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        serviceStatus: serviceStatus,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        timestamp: new Date().toISOString(),
        fallbackAvailable: true // Indicate that manual input is available
      },
      { status: statusCode }
    );
  }
}
