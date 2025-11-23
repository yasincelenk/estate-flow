'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, Home, Building, MapPin, DollarSign, Bed, Bath, Square, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResults } from '@/context/results-context';
import Navbar from "@/components/Navbar";
import { retryWithBackoff, logServiceError, categorizeError } from '@/utils/service-health';

interface WizardData {
  address: string;
  propertyType: 'house' | 'condo' | 'apartment' | '';
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  features: string[];
  photos: File[];
}

const propertyTypes = [
  { id: 'house', label: 'House', icon: Home, description: 'Single family home' },
  { id: 'condo', label: 'Condo', icon: Building, description: 'Condominium unit' },
  { id: 'apartment', label: 'Apartment', icon: Building, description: 'Rental unit' },
];

const featureOptions = [
  'Pool', 'View', 'Modern', 'Garden', 'Renovated', 'Garage',
  'Balcony', 'Fireplace', 'Walk-in Closet', 'Hardwood Floors',
  'Stainless Steel Appliances', 'Granite Countertops', 'Open Floor Plan'
];

function WizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setResults } = useResults();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardData, setWizardData] = useState<WizardData>({
    address: '',
    propertyType: '',
    price: '',
    beds: '',
    baths: '',
    sqft: '',
    features: [],
    photos: []
  });

  // Auto-fill address from query parameter on load
  useEffect(() => {
    const addressParam = searchParams.get('address');
    if (addressParam) {
      setWizardData(prev => ({
        ...prev,
        address: decodeURIComponent(addressParam)
      }));
    }
  }, [searchParams]);

  const totalSteps = 3;

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const handleNext = () => {
    console.log('Step 1 Data:', { address: wizardData.address, propertyType: wizardData.propertyType });
    
    // Validate current step before proceeding
    if (!isStepValid()) {
      const newErrors: {[key: string]: string} = {};
      
      if (currentStep === 1) {
        if (!wizardData.address.trim()) {
          newErrors.address = 'Address is required';
        }
        if (!wizardData.propertyType) {
          newErrors.propertyType = 'Please select a property type';
        }
      } else if (currentStep === 2) {
        if (!wizardData.price.trim()) {
          newErrors.price = 'Price is required';
        }
        if (!wizardData.beds.trim()) {
          newErrors.beds = 'Number of bedrooms is required';
        }
        if (!wizardData.baths.trim()) {
          newErrors.baths = 'Number of bathrooms is required';
        }
      }
      
      setErrors(newErrors);
      console.log('Validation errors:', newErrors);
      return;
    }
    
    // Clear errors and proceed
    setErrors({});
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (field: keyof WizardData, value: string | string[] | File[]) => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };

  const toggleFeature = (feature: string) => {
    setWizardData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handlePhotoUpload = (files: FileList) => {
    const newPhotos = Array.from(files);
    setWizardData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos]
    }));
  };

  const removePhoto = (index: number) => {
    setWizardData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleGenerate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 1. Construct the Prompt String
      const prompt = `Create a listing for a ${wizardData.propertyType} at ${wizardData.address}.
Price: $${wizardData.price}
Bedrooms: ${wizardData.beds}
Bathrooms: ${wizardData.baths}
Square Feet: ${wizardData.sqft}
Features: ${wizardData.features.join(', ')}

Please generate compelling property descriptions for social media platforms.`;

      // 2. Call API for Listing Content Only with retry mechanism
      const response = await retryWithBackoff('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: 'manual', // Required parameter for manual text mode
          manualText: prompt,
          modules: ['listing'] // Generate only listing content from wizard
        }),
      }, 3, 1000); // Max 3 retries, base delay of 1 second

      const aiData = await response.json();

      // 3. Convert local photo files to preview URLs (Client Side)
      const imagePreviewUrls = wizardData.photos.map(photo => URL.createObjectURL(photo));

      // 4. Save Text Data AND Local Images to Context
      setResults({
        resultData: aiData.data,
        scrapedData: {
          title: `New ${wizardData.propertyType} listing`,
          description: prompt,
          image: imagePreviewUrls[0] || '', // Use first image as primary
          images: imagePreviewUrls, // Store local blob URLs directly in context
          url: 'wizard-generated'
        },
        modules: aiData.modules || ['listing']
      });

      // 5. Redirect to listing tab
      router.push('/results?tab=listing');
      
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate listing';
      
      // Log the error with comprehensive details
      const errorCategory = categorizeError(errorMessage);
      logServiceError(
        {
          timestamp: new Date().toISOString(),
          error: errorMessage,
          inputType: 'wizard',
          inputLength: prompt.length,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          url: window.location.href,
          serviceHealth: {
            responseTime: 0, // Will be calculated by the logging function
            retryCount: 3 // Max retries attempted
          }
        },
        errorCategory,
        { enableLogging: true, baseTimeout: 30000, maxRetries: 3, enableMonitoring: true, timeoutIncrement: 2000 }
      );
      
      // Enhanced error handling for service unavailability
      if (errorMessage.includes('Web scraping service unavailable') || 
          errorMessage.includes('Real estate sites often block automated access') ||
          errorMessage.includes('Max retries exceeded')) {
        setError('The AI content generation service is temporarily unavailable after multiple retry attempts. This happens when real estate websites block automated access or when service quotas are exceeded. Your listing will be generated using our fallback system, which creates professional content based on your property details.');
        
        // Use fallback content generation
        try {
          const fallbackData = {
            property_title: `New ${wizardData.propertyType} Listing`,
            property_summary: `Beautiful ${wizardData.propertyType} located at ${wizardData.address} with ${wizardData.beds} bedrooms and ${wizardData.baths} bathrooms.`,
            instagram: `🏡 New ${wizardData.propertyType} listing! Located at ${wizardData.address}. ${wizardData.beds} bed • ${wizardData.baths} bath • $${parseInt(wizardData.price).toLocaleString()}. Don't miss this opportunity! #RealEstate #DreamHome #JustListed`,
            linkedin: `Excited to share this new ${wizardData.propertyType} listing: Located at ${wizardData.address} with ${wizardData.beds} bedrooms, ${wizardData.baths} bathrooms. Priced at $${parseInt(wizardData.price).toLocaleString()}. Contact me for more details and market insights. #RealEstate #PropertyInvestment`,
            tiktok: `🎥 Hook: Check out this amazing ${wizardData.propertyType}! 🏡 Body: Located at ${wizardData.address} • ${wizardData.beds} bed • ${wizardData.baths} bath • $${parseInt(wizardData.price).toLocaleString()} CTA: DM me for a private showing! 📲`,
            mls_description: `${wizardData.propertyType.charAt(0).toUpperCase() + wizardData.propertyType.slice(1)} located at ${wizardData.address}. This property features ${wizardData.beds} bedrooms, ${wizardData.baths} bathrooms, and approximately ${wizardData.sqft} square feet. ${wizardData.features.length > 0 ? 'Additional features include: ' + wizardData.features.join(', ') + '.' : ''} Priced at $${parseInt(wizardData.price).toLocaleString()}. This property offers exceptional value and is perfect for discerning buyers.`,
            email_blast: `Subject: 🏡 New ${wizardData.propertyType} Listing: ${wizardData.address}

Hi [Client Name],

I wanted to share this exciting new ${wizardData.propertyType} listing with you!

Located at ${wizardData.address}, this property features ${wizardData.beds} bedrooms, ${wizardData.baths} bathrooms, and approximately ${wizardData.sqft} square feet. ${wizardData.features.length > 0 ? 'Additional features include: ' + wizardData.features.join(', ') + '.' : ''}

Priced at $${parseInt(wizardData.price).toLocaleString()}.

This property offers exceptional value and is perfect for discerning buyers. Don't miss this opportunity!

Best regards,
[Your Name]`,
            marketing_headline: `Beautiful ${wizardData.propertyType} with ${wizardData.beds} bedrooms`,
            features: [`${wizardData.beds} Bedrooms`, `${wizardData.baths} Bathrooms`, `$${parseInt(wizardData.price).toLocaleString()}`].concat(wizardData.features.slice(0, 5))
          };

          const imagePreviewUrls = wizardData.photos.map(photo => URL.createObjectURL(photo));
          const prompt = `Create a listing for a ${wizardData.propertyType} at ${wizardData.address}. Price: $${wizardData.price} Bedrooms: ${wizardData.beds} Bathrooms: ${wizardData.baths} Square Feet: ${wizardData.sqft} Features: ${wizardData.features.join(', ')}`;

          setResults({
            resultData: fallbackData,
            scrapedData: {
              title: `New ${wizardData.propertyType} listing`,
              description: prompt,
              image: imagePreviewUrls[0] || '',
              images: imagePreviewUrls,
              url: 'wizard-generated-fallback'
            },
            modules: ['listing']
          });

          router.push('/results?tab=listing');
        } catch (fallbackError) {
          setError('Unable to generate listing content at this time. Please try again later or contact support if the issue persists.');
        }
      } else if (errorMessage.includes('timeout')) {
        setError('The request timed out. This might be due to high server load. Please try again in a few moments.');
      } else if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
        setError('Service quota exceeded. The AI service is temporarily unavailable. Using fallback content generation instead.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return wizardData.address.trim() && wizardData.propertyType;
      case 2:
        return wizardData.price.trim() && wizardData.beds.trim() && wizardData.baths.trim();
      case 3:
        return true; // Photos are optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-white bg-dot-pattern">
      {/* Header - Integrated from main page */}
      <Navbar />
      
      {/* Main Content */}
      <main className="bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Wizard Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Create <span className="text-primary">New Listing</span>
              </h1>
              <p className="text-gray-600">
                Step {currentStep} of {totalSteps}: {currentStep === 1 ? 'The Basics' : currentStep === 2 ? 'The Details' : 'Visuals'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all duration-300",
                      step <= currentStep
                        ? "bg-primary text-white"
                        : "bg-gray-200 text-gray-500"
                    )}
                  >
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                ))}
              </div>
              <div className="relative">
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                  <div
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 mb-8">
              {/* Step 1: The Basics */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="inline w-4 h-4 mr-1" />
                      Property Address *
                    </label>
                    <input
                      type="text"
                      value={wizardData.address}
                      onChange={(e) => {
                        handleInputChange('address', e.target.value);
                        if (errors.address) {
                          setErrors(prev => ({ ...prev, address: '' }));
                        }
                      }}
                      placeholder="123 Main St, City, State 12345"
                      className={cn(
                        "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all",
                        errors.address ? "border-red-500 bg-red-50" : "border-gray-300"
                      )}
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Property Type *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {propertyTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => {
                            handleInputChange('propertyType', type.id);
                            if (errors.propertyType) {
                              setErrors(prev => ({ ...prev, propertyType: '' }));
                            }
                          }}
                          className={cn(
                            "p-4 border-2 rounded-xl transition-all duration-200 text-center",
                            wizardData.propertyType === type.id
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-200 hover:border-gray-300 text-gray-700",
                            errors.propertyType && !wizardData.propertyType ? "border-red-500" : ""
                          )}
                        >
                          <type.icon className="w-8 h-8 mx-auto mb-2" />
                          <div className="font-semibold">{type.label}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </button>
                      ))}
                    </div>
                    {errors.propertyType && (
                      <p className="mt-2 text-sm text-red-600 text-center">{errors.propertyType}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: The Details */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="inline w-4 h-4 mr-1" />
                        Price *
                      </label>
                      <input
                        type="number"
                        value={wizardData.price}
                        onChange={(e) => {
                          handleInputChange('price', e.target.value);
                          if (errors.price) {
                            setErrors(prev => ({ ...prev, price: '' }));
                          }
                        }}
                        placeholder="500000"
                        className={cn(
                          "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent",
                          errors.price ? "border-red-500 bg-red-50" : "border-gray-300"
                        )}
                      />
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Square className="inline w-4 h-4 mr-1" />
                        Square Feet
                      </label>
                      <input
                        type="number"
                        value={wizardData.sqft}
                        onChange={(e) => handleInputChange('sqft', e.target.value)}
                        placeholder="2000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Bed className="inline w-4 h-4 mr-1" />
                        Bedrooms *
                      </label>
                      <input
                        type="number"
                        value={wizardData.beds}
                        onChange={(e) => {
                          handleInputChange('beds', e.target.value);
                          if (errors.beds) {
                            setErrors(prev => ({ ...prev, beds: '' }));
                          }
                        }}
                        placeholder="3"
                        className={cn(
                          "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent",
                          errors.beds ? "border-red-500 bg-red-50" : "border-gray-300"
                        )}
                      />
                      {errors.beds && (
                        <p className="mt-1 text-sm text-red-600">{errors.beds}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Bath className="inline w-4 h-4 mr-1" />
                        Bathrooms *
                      </label>
                      <input
                        type="number"
                        value={wizardData.baths}
                        onChange={(e) => {
                          handleInputChange('baths', e.target.value);
                          if (errors.baths) {
                            setErrors(prev => ({ ...prev, baths: '' }));
                          }
                        }}
                        placeholder="2"
                        className={cn(
                          "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent",
                          errors.baths ? "border-red-500 bg-red-50" : "border-gray-300"
                        )}
                      />
                      {errors.baths && (
                        <p className="mt-1 text-sm text-red-600">{errors.baths}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Features & Amenities
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {featureOptions.map((feature) => (
                        <button
                          key={feature}
                          onClick={() => toggleFeature(feature)}
                          className={cn(
                            "px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                            wizardData.features.includes(feature)
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                          )}
                        >
                          {feature}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Visuals */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Property Photos
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">Drag and drop photos here, or click to browse</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                      >
                        Choose Photos
                      </label>
                    </div>
                  </div>

                  {/* Photo Thumbnails */}
                  {wizardData.photos.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Selected Photos ({wizardData.photos.length})
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {wizardData.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(photo)}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <span className="sr-only">Remove photo</span>
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium mb-1">Service Notice</p>
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-primary hover:bg-orange-700"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="flex items-center gap-2 bg-primary hover:bg-orange-700"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Listing
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Enhanced with social media and functional links */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>EstateFlow</h3>
              <p className="text-sm text-gray-600">
                © 2024 EstateFlow AI. All rights reserved.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="flex space-x-4">
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-500 transition-colors"
                  aria-label="Twitter"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-700 transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-pink-500 transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
              <div className="flex space-x-6">
                <a href="/privacy" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Privacy Policy
                </a>
                <a href="/terms" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Terms of Service
                </a>
                <a href="/contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function CreateWizard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <WizardContent />
    </Suspense>
  );
}