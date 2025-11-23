'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { useResults } from '@/context/results-context';
import { useState, useEffect, Suspense } from 'react';
import Navbar from "@/components/Navbar";

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resultData, scrapedData, editableContent, updateEditableContent, generatedModules } = useResults();
  const [activeTab, setActiveTab] = useState('social');
  const [isLoading, setIsLoading] = useState(false);

  // Set active tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  if (!resultData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No results found. Please generate content first.</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const renderSocialContent = () => {
    if (!resultData.instagram && !resultData.linkedin && !resultData.tiktok) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No social media content generated yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {resultData.instagram && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Instagram Post</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{resultData.instagram}</p>
          </div>
        )}
        
        {resultData.linkedin && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">LinkedIn Post</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{resultData.linkedin}</p>
          </div>
        )}
        
        {resultData.tiktok && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">TikTok Script</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{resultData.tiktok}</p>
          </div>
        )}
      </div>
    );
  };

  const renderEmailContent = () => {
    if (!resultData.email_blast) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No email content generated yet.</p>
        </div>
      );
    }

    return (
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-3">Email Blast</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{resultData.email_blast}</p>
      </div>
    );
  };

  const renderListingContent = () => {
    if (!resultData.mls_description) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No listing content generated yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {resultData.property_title && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Property Title</h3>
            <p className="text-gray-700">{resultData.property_title}</p>
          </div>
        )}
        
        {resultData.mls_description && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">MLS Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{resultData.mls_description}</p>
          </div>
        )}
        
        {resultData.property_summary && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Property Summary</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{resultData.property_summary}</p>
          </div>
        )}
        
        {resultData.features && Array.isArray(resultData.features) && resultData.features.length > 0 && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Features</h3>
            <ul className="list-disc list-inside space-y-1">
              {resultData.features.map((feature, index) => (
                <li key={index} className="text-gray-700">{feature}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 max-w-7xl py-8">
        <div className="mb-6">
          <Button onClick={() => router.push('/')} variant="outline" className="mb-4">
            ← Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Generated Content</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white p-1 rounded-lg border">
          <button
            onClick={() => setActiveTab('social')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'social'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Social Media
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'email'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Email Blast
          </button>
          <button
            onClick={() => setActiveTab('listing')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'listing'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Listing Details
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'social' && renderSocialContent()}
          {activeTab === 'email' && renderEmailContent()}
          {activeTab === 'listing' && renderListingContent()}
        </div>
      </div>
    </div>
  );
}

function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}

export default ResultsPage;