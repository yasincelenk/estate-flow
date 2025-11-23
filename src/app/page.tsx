'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Wand2, Loader2, AlertCircle, Check, LayoutTemplate, UserCog, Sparkles, Link, Cpu, Share2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useResults } from '@/context/results-context';
import UnifiedCommandBar from '@/components/UnifiedCommandBar';
import { ServiceHealthIndicator } from '@/components/ServiceHealth';
import { 
  categorizeError, 
  getUserFriendlyMessage, 
  generateFallbackContent,
  logServiceError,
  DEFAULT_SERVICE_CONFIG,
  retryWithBackoff 
} from '@/utils/service-health';

export default function Home() {
  const router = useRouter();
  const { setResults } = useResults();
  const [manualText, setManualText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  const handleGenerate = async (mode: 'link' | 'text' | 'new', input: string) => {
    if (mode === 'new') {
      router.push('/create');
      return;
    }
    
    if (!input.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Use retry mechanism with exponential backoff
      const response = await retryWithBackoff('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: mode === 'link' ? input : 'manual',
          manualText: mode === 'text' ? input : undefined,
          modules: ['social'] // Generate only social content from home page
        }),
      }, 3, 1000); // Max 3 retries, base delay of 1 second

      const data = await response.json();

      // Save results to context and navigate to results page
      setResults({
        resultData: data.data,
        scrapedData: data.scrapedData,
        modules: data.modules || ['social']
      });
      
      router.push('/results?tab=social'); // Navigate to results page with social tab active
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Use the new service health utilities for comprehensive error handling
      const errorCategory = categorizeError(errorMessage, error instanceof Error ? error.name : undefined);
      const userFriendlyMessage = getUserFriendlyMessage(errorCategory);
      
      // Log the error with retry information
      logServiceError(
        {
          timestamp: new Date().toISOString(),
          error: errorMessage,
          inputType: mode === 'link' ? 'url' : 'text',
          inputLength: input.length,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          url: window.location.href,
          serviceHealth: {
            responseTime: 0, // Will be calculated by the logging function
            retryCount: 3 // Max retries attempted
          }
        },
        errorCategory,
        DEFAULT_SERVICE_CONFIG
      );
      
      // Handle specific service unavailability cases
      if (errorMessage.includes('Web scraping service unavailable') || 
          errorMessage.includes('Real estate sites often block automated access')) {
        console.log('Web scraping service unavailable after retries - showing manual input option');
        setError('The web scraping service is currently unavailable after multiple retry attempts. This often happens when real estate websites block automated access. Please paste your property description manually below, or try again in a few minutes.');
        setShowManualInput(true);
        return;
      }
      
      // Handle timeout errors after retries
      if (errorMessage.includes('timeout') || errorMessage.includes('Max retries exceeded')) {
        setError('The service is taking longer than expected to respond after multiple retry attempts. Please paste your property description manually below, or try again in a few minutes.');
        setShowManualInput(true);
        return;
      }
      
      // For other errors, show the user-friendly message
      setError(userFriendlyMessage);
      setShowManualInput(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-gray-50 py-12 sm:py-16 lg:py-24 xl:py-32 bg-dot-pattern">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Service Health Indicator */}
          <div className="flex justify-center mb-4">
            <ServiceHealthIndicator showDetailed={false} hideWhenHealthy={true} />
          </div>
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-3 sm:mb-4 lg:mb-6">
              Turn Listings into
              <span className="text-primary"> Leads</span>
              <span className="block text-gray-900 relative mt-1 sm:mt-2">
                <span className="text-primary">Instantly.</span>
                <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 w-16 sm:w-20 md:w-24 h-0.5 sm:h-1 bg-primary rounded-full"></div>
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 lg:mb-12 leading-relaxed">
              Transform any property listing into viral social media content with AI. Paste a URL, text, or start fresh.
            </p>
          </div>
          
          {/* Unified Command Bar */}
          <div className="max-w-4xl mx-auto mb-4">
            <UnifiedCommandBar 
              onGenerate={handleGenerate}
              isLoading={isLoading}
            />
          </div>

          {/* Manual Input Section */}
          {showManualInput && (
            <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Manual Input Required</h3>
              </div>
              <p className="text-gray-600 mb-4">{error}</p>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste your property description here..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => {
                    if (manualText.trim()) {
                      handleGenerate('text', manualText);
                    }
                  }}
                  disabled={!manualText.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Generate Content
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowManualInput(false);
                    setError(null);
                    setManualText('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && !showManualInput && (
            <div className="max-w-2xl mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need to Market Properties</h2>
            <p className="text-lg text-gray-600">From social media to email campaigns, we've got you covered</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Social Media Content</h3>
              <p className="text-gray-600">Generate viral posts for Instagram, LinkedIn, TikTok, and more</p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <LayoutTemplate className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Email Campaigns</h3>
              <p className="text-gray-600">Create compelling email blasts that convert</p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered</h3>
              <p className="text-gray-600">Advanced AI that understands real estate marketing</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}