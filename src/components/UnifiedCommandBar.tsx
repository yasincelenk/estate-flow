'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe, LayoutTemplate, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import ListingCreationForm from "@/components/ListingCreationForm";
import { toast } from 'sonner';
import { parsePropertyContent, validateParsedData } from "@/lib/propertyParser";

interface UnifiedCommandBarProps {
  onGenerate: (mode: 'link' | 'text' | 'new', input: string) => void;
  isLoading?: boolean;
}

interface ParsedPropertyData {
  propertyType?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;
  description?: string;
  features?: string[];
}

export default function UnifiedCommandBar({ onGenerate, isLoading = false }: UnifiedCommandBarProps) {
  const [activeMode, setActiveMode] = useState<'link' | 'text'>('link');
  const [inputValue, setInputValue] = useState('');
  const [showListingForm, setShowListingForm] = useState(false);
  const [parsedPropertyData, setParsedPropertyData] = useState<ParsedPropertyData | null>(null);

  const modes = [
    {
      id: 'link' as const,
      label: 'Social Media Studio',
      placeholder: 'Paste Zillow or Redfin URL for viral social content...',
      color: 'orange',
      icon: LayoutTemplate,
    },
    {
      id: 'text' as const,
      label: 'Listing Agent',
      placeholder: 'Paste property details for MLS descriptions & emails...',
      color: 'blue',
      icon: UserCog,
    },
  ];

  const currentMode = modes.find(mode => mode.id === activeMode)!;
  
  // Get active mode styling based on color
  const getModeStyles = (modeId: string) => {
    if (modeId === 'link') {
      return {
        bg: 'bg-orange-500',
        hoverBg: 'hover:bg-orange-600',
        text: 'text-orange-600',
        border: 'border-orange-200',
        lightBg: 'bg-orange-50',
      };
    } else {
      return {
        bg: 'bg-blue-500',
        hoverBg: 'hover:bg-blue-600',
        text: 'text-blue-600',
        border: 'border-blue-200',
        lightBg: 'bg-blue-50',
      };
    }
  };

  const handleSubmit = async () => {
    // Add console.log for verification
    console.log('Button clicked', activeMode, inputValue);
    
    if (activeMode === 'text') {
      // NEW LOGIC: For Listing Agent mode, redirect to /create with address parameter
      if (!inputValue.trim()) {
        toast.error('Please paste property details first');
        return;
      }

      // Redirect to wizard page with the input as query parameter
      const encodedInput = encodeURIComponent(inputValue);
      window.location.href = `/create?address=${encodedInput}`;
      return;
    }
    
    if (!inputValue.trim()) return;
    
    onGenerate(activeMode, inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {showListingForm && (
        <ListingCreationForm 
          onClose={() => {
            setShowListingForm(false);
            setInputValue('');
            setParsedPropertyData(null);
          }}
          preFilledData={parsedPropertyData || undefined}
        />
      )}
      {/* Ambient Background Glow */}
      <div className={cn(
        "absolute inset-0 opacity-30 rounded-3xl blur-xl",
        activeMode === 'text' 
          ? "bg-gradient-to-r from-blue-50 to-purple-50" 
          : "bg-gradient-to-r from-orange-50 to-purple-50"
      )}></div>
      
      {/* Main Command Card - Reference Image Design */}
      <div className="relative">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 transition-all duration-300 hover:shadow-2xl backdrop-blur-sm">
          {/* Top Row - URL Input with Globe Icon */}
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
            {/* Globe Icon */}
            <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
            
            {/* Input Area */}
            <div className="flex-1 min-w-0">
              {activeMode === 'text' ? (
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={currentMode.placeholder}
                  disabled={isLoading}
                  className="w-full px-2 py-2 text-base sm:text-lg text-gray-500 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 disabled:opacity-50"
                  rows={1}
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
              ) : (
                <input
                  type={activeMode === 'link' ? 'url' : 'text'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={currentMode.placeholder}
                  disabled={isLoading}
                  className="w-full px-2 py-2 text-base sm:text-lg text-gray-500 bg-transparent border-0 focus:outline-none focus:ring-0 disabled:opacity-50"
                />
              )}
            </div>

            {/* Submit Button - Dynamic Styling */}
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !inputValue.trim()}
              className={cn(
                "rounded-xl p-2.5 sm:p-3 transition-all duration-200 shrink-0 border-0",
                activeMode === 'text' 
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-black hover:bg-gray-900 text-white",
                "disabled:bg-gray-300 disabled:cursor-not-allowed",
                "shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
              )}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
              ) : (
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          </div>

          {/* Divider Line */}
          <div className="border-t border-gray-100"></div>

          {/* Bottom Row - Mode Chips */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-2 sm:p-3">
            {modes.map((mode) => {
              const isActive = activeMode === mode.id;
              const styles = getModeStyles(mode.id);
              
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    setActiveMode(mode.id);
                    setInputValue('');
                  }}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200",
                    "border",
                    isActive 
                      ? cn("bg-white text-gray-900 shadow-sm", styles.border) 
                      : cn("bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700 border-gray-100"),
                    "hover:shadow-xs"
                  )}
                >
                  <mode.icon className={cn("h-3 w-3 sm:h-4 sm:w-4", isActive && styles.text)} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Helper Text */}
        <div className="mt-3 text-center">
          <p className={cn(
            "text-xs sm:text-sm font-medium transition-colors",
            activeMode === 'text' ? "text-blue-600" : "text-gray-400"
          )}>
            {activeMode === 'link' && "📱 Generate viral Instagram & LinkedIn content from any real estate URL"}
            {activeMode === 'text' && "🏠 Paste property details above and click the arrow to auto-process into a listing"}
          </p>
          {activeMode === 'text' && inputValue.trim() && (
            <p className="text-xs text-blue-500 mt-1">
              💡 Tip: Include address, price, bedrooms, bathrooms, and key features for best results
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
