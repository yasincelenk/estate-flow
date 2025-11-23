'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ResultData {
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

interface ScrapedData {
  title: string;
  description: string;
  image: string;
  images?: string[];
  url?: string;
}

interface BrandSettings {
  agentName: string;
  agentTitle: string;
  agentPhone: string;
  agentEmail: string;
  agentPhoto: string;
  brokerageName: string;
  brokerageLogo: string;
  includeHeadshot: boolean;
  includeLogo: boolean;
  includeContact: boolean;
}

interface ResultsContextType {
  resultData: ResultData | null;
  scrapedData: ScrapedData | null;
  editableContent: {
    instagram: string;
    linkedin: string;
    tiktok: string;
    mls_description: string;
    email_blast: string;
    marketing_headline: string;
    features: string[];
  } | null;
  brandSettings: BrandSettings;
  generatedModules: string[];
  setResults: (data: { resultData: ResultData; scrapedData: ScrapedData; modules?: string[] }) => void;
  updateEditableContent: (platform: 'instagram' | 'linkedin' | 'tiktok' | 'mls_description' | 'email_blast' | 'marketing_headline' | 'features', content: string | string[]) => void;
  updateBrandSettings: (settings: Partial<BrandSettings>) => void;
  updateGeneratedModules: (modules: string[]) => void;
  clearResults: () => void;
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

export function ResultsProvider({ children }: { children: ReactNode }) {
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [editableContent, setEditableContent] = useState<{
    instagram: string;
    linkedin: string;
    tiktok: string;
    mls_description: string;
    email_blast: string;
    marketing_headline: string;
    features: string[];
  } | null>(null);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    agentName: 'Your Name',
    agentTitle: 'Real Estate Agent',
    agentPhone: '(555) 123-4567',
    agentEmail: 'your.email@realestate.com',
    agentPhoto: '',
    brokerageName: 'Your Brokerage',
    brokerageLogo: '',
    includeHeadshot: true,
    includeLogo: true,
    includeContact: true,
  });
  const [generatedModules, setGeneratedModules] = useState<string[]>([]);

  const setResults = (data: { resultData: ResultData; scrapedData: ScrapedData; modules?: string[] }) => {
    setResultData(data.resultData);
    setScrapedData(data.scrapedData);
    // Initialize editable content with the generated content
    setEditableContent({
      instagram: data.resultData.instagram,
      linkedin: data.resultData.linkedin,
      tiktok: data.resultData.tiktok,
      mls_description: data.resultData.mls_description,
      email_blast: data.resultData.email_blast,
      marketing_headline: data.resultData.marketing_headline,
      features: data.resultData.features,
    });
    // Set generated modules if provided
    if (data.modules) {
      setGeneratedModules(data.modules);
    }
  };

  const updateEditableContent = (platform: 'instagram' | 'linkedin' | 'tiktok' | 'mls_description' | 'email_blast' | 'marketing_headline' | 'features', content: string | string[]) => {
    setEditableContent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [platform]: content
      };
    });
  };

  const updateBrandSettings = (settings: Partial<BrandSettings>) => {
    setBrandSettings(prev => ({ ...prev, ...settings }));
  };

  const updateGeneratedModules = (modules: string[]) => {
    setGeneratedModules(modules);
  };

  const clearResults = () => {
    setResultData(null);
    setScrapedData(null);
    setEditableContent(null);
    setGeneratedModules([]);
    // Reset brand settings to defaults
    setBrandSettings({
      agentName: 'Your Name',
      agentTitle: 'Real Estate Agent',
      agentPhone: '(555) 123-4567',
      agentEmail: 'your.email@realestate.com',
      agentPhoto: '',
      brokerageName: 'Your Brokerage',
      brokerageLogo: '',
      includeHeadshot: true,
      includeLogo: true,
      includeContact: true,
    });
  };

  return (
    <ResultsContext.Provider value={{ 
      resultData, 
      scrapedData, 
      editableContent, 
      brandSettings,
      generatedModules,
      setResults, 
      updateEditableContent, 
      updateBrandSettings,
      updateGeneratedModules,
      clearResults 
    }}>
      {children}
    </ResultsContext.Provider>
  );
}

export function useResults() {
  const context = useContext(ResultsContext);
  if (context === undefined) {
    throw new Error('useResults must be used within a ResultsProvider');
  }
  return context;
}