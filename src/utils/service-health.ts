/**
 * Service Health Monitoring and Fallback Utilities
 * 
 * This module provides comprehensive service health monitoring,
 * retry mechanisms, and fallback strategies for handling
 * service unavailability issues.
 */

export interface ServiceHealthConfig {
  maxRetries: number;
  baseTimeout: number;
  timeoutIncrement: number;
  enableLogging: boolean;
  enableMonitoring: boolean;
}

export interface ServiceErrorInfo {
  timestamp: string;
  error: string;
  inputType: string;
  inputLength: number;
  userAgent: string;
  url: string;
  serviceHealth: {
    responseTime: number;
    retryCount: number;
  };
}

export interface ErrorCategory {
  isScrapingError: boolean;
  isTimeoutError: boolean;
  isServiceError: boolean;
  isAIError: boolean;
  isNetworkError: boolean;
}

export const DEFAULT_SERVICE_CONFIG: ServiceHealthConfig = {
  maxRetries: 3,
  baseTimeout: 30000, // 30 seconds
  timeoutIncrement: 10000, // 10 seconds per retry
  enableLogging: true,
  enableMonitoring: true
};

/**
 * Categorize errors for better handling and monitoring
 */
export function categorizeError(errorMessage: string, errorName?: string): ErrorCategory {
  return {
    isScrapingError: errorMessage.includes('Web scraping service unavailable') || 
                     errorMessage.includes('Unable to scrape') || 
                     errorMessage.includes('Real estate sites often block automated access'),
    isTimeoutError: errorMessage.includes('timeout') || errorName === 'AbortError',
    isServiceError: errorMessage.includes('Service Unavailable') || 
                    errorMessage.includes('temporarily unavailable') ||
                    errorMessage.includes('quota') || 
                    errorMessage.includes('billing'),
    isAIError: errorMessage.includes('OpenAI') || errorMessage.includes('AI service'),
    isNetworkError: errorName === 'TypeError' && errorMessage.includes('fetch')
  };
}

/**
 * Get error severity based on category
 */
export function getErrorSeverity(category: ErrorCategory): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (category.isServiceError) return 'HIGH';
  if (category.isScrapingError) return 'MEDIUM';
  return 'LOW';
}

/**
 * Get user-friendly error message based on error category
 */
export function getUserFriendlyMessage(category: ErrorCategory): string {
  if (category.isScrapingError) {
    return 'The web scraping service is currently unavailable. This often happens when real estate websites block automated access. Please paste your property description manually below, or try again in a few minutes.';
  }
  
  if (category.isTimeoutError) {
    return 'The request timed out. The website might be slow or blocking access. Please paste your property description manually, or try a different URL.';
  }
  
  if (category.isServiceError) {
    return 'Service quota exceeded or temporarily unavailable. Please try again later or paste your property description manually.';
  }
  
  if (category.isAIError) {
    return 'AI service is temporarily unavailable. Please paste your property description manually, and we\'ll generate content using our fallback system.';
  }
  
  if (category.isNetworkError) {
    return 'Network connection issue. Please check your internet connection and try again, or paste your property description manually.';
  }
  
  return 'AI content generation service is temporarily unavailable. Please paste your property description manually below, or try again in a few minutes.';
}

/**
 * Get retry advice based on error category
 */
export function getRetryAdvice(category: ErrorCategory): string {
  if (category.isScrapingError) {
    return 'Scraping errors are typically not retryable. Try manual input instead.';
  }
  
  if (category.isTimeoutError) {
    return 'Timeout errors may be retryable. Check your connection and try again.';
  }
  
  if (category.isServiceError) {
    return 'Service errors are often temporary. Retry in a few minutes.';
  }
  
  if (category.isAIError) {
    return 'AI service errors may require quota check or API key verification.';
  }
  
  if (category.isNetworkError) {
    return 'Network errors are usually retryable once connection is restored.';
  }
  
  return 'Unknown error type. Manual retry recommended.';
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(retryCount: number, baseDelay = 1000): number {
  return Math.pow(2, retryCount) * baseDelay;
}

/**
 * Check if error is retryable based on status code and error message
 */
export function isRetryableError(response: Response, errorData?: Record<string, unknown>): boolean {
  return response.status >= 500 || 
         response.status === 429 || 
         String((errorData as { error?: unknown })?.error || '').includes('timeout') ||
         String((errorData as { error?: unknown })?.error || '').includes('unavailable');
}

/**
 * Generate fallback content for social media when services are unavailable
 */
export function generateFallbackContent(input: string, type: 'social' | 'listing' = 'social') {
  const fallbackData = {
    property_title: 'Property Listing',
    property_summary: input.substring(0, 200) + (input.length > 200 ? '...' : ''),
    instagram: `🏡 Check out this amazing property! ${input.substring(0, 150)}${input.length > 150 ? '...' : ''} Don't miss this opportunity! #RealEstate #DreamHome #JustListed`,
    linkedin: `Excited to share this property opportunity: ${input.substring(0, 150)}${input.length > 150 ? '...' : ''} Contact me for more details and market insights. #RealEstate #PropertyInvestment`,
    tiktok: `🎥 Hook: Check out this incredible property! 🏡 Body: ${input.substring(0, 100)}${input.length > 100 ? '...' : ''} CTA: DM me for a private showing! 📲`,
    mls_description: `${input.substring(0, 300)}${input.length > 300 ? '...' : ''}`,
    email_blast: `Subject: 🏡 New Listing Alert

Hi [Client Name],

I wanted to share this exciting new listing with you!

${input.substring(0, 200)}${input.length > 200 ? '...' : ''}

This property offers exceptional value and is perfect for discerning buyers. Don't miss this opportunity!

Best regards,
[Your Name]`,
    marketing_headline: 'Stunning Property with Exceptional Features',
    features: ['Beautiful Property', 'Prime Location', 'Excellent Features']
  };

  if (type === 'listing') {
    return {
      ...fallbackData,
      property_description: input,
      key_features: input.split(',').map(feature => feature.trim()).slice(0, 5),
      neighborhood_highlights: ['Great Location', 'Excellent Schools', 'Easy Access'],
      mls_description: input
    };
  }

  return fallbackData;
}

/**
 * Log service error with detailed information for monitoring
 */
export function logServiceError(
  errorInfo: ServiceErrorInfo, 
  category: ErrorCategory,
  config: ServiceHealthConfig = DEFAULT_SERVICE_CONFIG
): void {
  if (!config.enableLogging) return;

  const severity = getErrorSeverity(category);
  const startTime = Date.now();
  
  // Enhanced error logging with comprehensive details
  const logEntry = {
    timestamp: errorInfo.timestamp,
    level: severity,
    service: 'estateflow-ai',
    operation: errorInfo.inputType,
    error: {
      message: errorInfo.error,
      category: category,
      type: getErrorType(category),
      isRetryable: isRetryableCategory(category),
      stack: new Error().stack
    },
    request: {
      url: errorInfo.url,
      inputType: errorInfo.inputType,
      inputLength: errorInfo.inputLength,
      userAgent: errorInfo.userAgent
    },
    serviceHealth: {
      ...errorInfo.serviceHealth,
      responseTime: Date.now() - startTime,
      maxRetries: config.maxRetries,
      timeout: config.baseTimeout
    },
    context: {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      sessionId: generateSessionId(),
      userId: getCurrentUserId()
    },
    recommendations: {
      retryAdvice: getRetryAdvice(category),
      userMessage: getUserFriendlyMessage(category),
      nextSteps: getNextSteps(category)
    }
  };

  console.error('Service Error Categorized:', logEntry);
  
  // Send to external monitoring if enabled
  if (config.enableMonitoring) {
    sendToMonitoring(logEntry);
  }
}

/**
 * Create service health check function
 */
export async function checkServiceHealth(endpoint: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Health check failed for ${endpoint}:`, errorMessage);
    return false;
  }
}

/**
 * Retry a fetch request with exponential backoff
 */
export async function retryWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000) // 30 second timeout per attempt
      });
      
      // If successful, return response
      if (response.ok) {
        return response;
      }
      
      // Check if error is retryable
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      
      if (attempt < maxRetries && isRetryableError(response, errorData)) {
        const delay = calculateBackoffDelay(attempt, baseDelay);
        console.log(`Attempt ${attempt + 1} failed with status ${response.status}. Retrying in ${delay}ms...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not retryable or last attempt, throw error
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if it's a network error (retryable)
      if (attempt < maxRetries && (
        error instanceof TypeError || 
        error instanceof DOMException ||
        (error instanceof Error && (
          error.name === 'AbortError' ||
          error.message.includes('timeout') ||
          error.message.includes('network')
        ))
      )) {
        const delay = calculateBackoffDelay(attempt, baseDelay);
        console.log(`Network attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not retryable or last attempt, break the loop
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  
  // All retries exhausted
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Generate unique session ID for error tracking
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current user ID if available
 */
function getCurrentUserId(): string | null {
  // This would typically come from your auth system
  // For now, return null or get from localStorage/session
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userId') || sessionStorage.getItem('userId');
  }
  return null;
}

/**
 * Get error type classification
 */
function getErrorType(category: ErrorCategory): string {
  if (category.isScrapingError) return 'SCRAPING_ERROR';
  if (category.isTimeoutError) return 'TIMEOUT_ERROR';
  if (category.isServiceError) return 'SERVICE_ERROR';
  if (category.isAIError) return 'AI_SERVICE_ERROR';
  if (category.isNetworkError) return 'NETWORK_ERROR';
  return 'UNKNOWN_ERROR';
}

/**
 * Check if error category is retryable
 */
function isRetryableCategory(category: ErrorCategory): boolean {
  return category.isScrapingError || category.isTimeoutError || category.isServiceError || category.isNetworkError;
}

/**
 * Get next steps for error resolution
 */
function getNextSteps(category: ErrorCategory): string[] {
  const steps = [];
  
  if (category.isScrapingError) {
    steps.push('Try manual input instead of URL scraping');
    steps.push('Check if the website allows automated access');
    steps.push('Try again in a few minutes');
  }
  
  if (category.isTimeoutError) {
    steps.push('Check your internet connection');
    steps.push('Try again with a shorter timeout');
    steps.push('Contact support if issue persists');
  }
  
  if (category.isServiceError) {
    steps.push('Check service status page');
    steps.push('Try again in a few minutes');
    steps.push('Use fallback content generation');
  }
  
  if (category.isAIError) {
    steps.push('Check AI service quota');
    steps.push('Verify API key configuration');
    steps.push('Contact support for quota issues');
  }
  
  if (category.isNetworkError) {
    steps.push('Check internet connection');
    steps.push('Try refreshing the page');
    steps.push('Check firewall settings');
  }
  
  return steps;
}

/**
 * Send error data to external monitoring service
 */
function sendToMonitoring(logEntry: Record<string, unknown>): void {
  // This would typically send to services like Sentry, LogRocket, etc.
  // For now, we'll just log to console in a structured format
  console.log('[MONITORING]', JSON.stringify(logEntry));
  
  // Example of what you might send to external service:
  // fetch('/api/monitoring/error', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(logEntry)
  // }).catch(err => console.error('Failed to send to monitoring:', err));
}

/**
 * Service status tracker for monitoring multiple services
 */
export class ServiceStatusTracker {
  private status: Map<string, { isHealthy: boolean; lastChecked: Date; responseTime?: number }> = new Map();
  
  async checkService(name: string, endpoint: string, timeout = 5000): Promise<void> {
    const startTime = Date.now();
    const isHealthy = await checkServiceHealth(endpoint, timeout);
    const responseTime = Date.now() - startTime;
    
    this.status.set(name, {
      isHealthy,
      lastChecked: new Date(),
      responseTime
    });
    
    console.log(`Service ${name}: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${responseTime}ms)`);
  }
  
  getServiceStatus(name: string) {
    return this.status.get(name);
  }
  
  getAllStatuses() {
    return Object.fromEntries(this.status);
  }
  
  getHealthyServices() {
    return Array.from(this.status.entries())
      .filter(([, status]) => status.isHealthy)
      .map(([name]) => name);
  }
  
  getUnhealthyServices() {
    return Array.from(this.status.entries())
      .filter(([, status]) => !status.isHealthy)
      .map(([name]) => name);
  }
}
