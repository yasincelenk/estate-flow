'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Upload, MapPin, DollarSign, User, Phone, Mail, Hash, Home, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast, Toaster } from 'sonner';

interface FormData {
  // Property Information
  propertyType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  lotSize: string;
  yearBuilt: string;
  
  // Agent Information
  agentName: string;
  licenseNumber: string;
  agentPhone: string;
  agentEmail: string;
  brokerage: string;
  
  // Listing Details
  title: string;
  description: string;
  features: string[];
  photos: File[];
}

interface FormErrors {
  [key: string]: string;
}

const PROPERTY_TYPES = [
  { value: 'single-family', label: 'Single Family Home' },
  { value: 'condo', label: 'Condominium' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi-family', label: 'Multi-Family' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
];

const COMMON_FEATURES = [
  'Swimming Pool', 'Garage', 'Fireplace', 'Hardwood Floors', 
  'Central AC', 'Dishwasher', 'Washer/Dryer', 'Balcony',
  'Garden', 'Basement', 'Attic', 'Walk-in Closet'
];

interface ListingCreationFormProps {
  onClose: () => void;
  preFilledData?: {
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
  };
}

export default function ListingCreationForm({ onClose, preFilledData }: ListingCreationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    propertyType: preFilledData?.propertyType || '',
    address: preFilledData?.address || '',
    city: preFilledData?.city || '',
    state: preFilledData?.state || '',
    zipCode: preFilledData?.zipCode || '',
    price: preFilledData?.price ? preFilledData.price.toString() : '',
    bedrooms: preFilledData?.bedrooms ? preFilledData.bedrooms.toString() : '',
    bathrooms: preFilledData?.bathrooms ? preFilledData.bathrooms.toString() : '',
    squareFeet: preFilledData?.squareFeet ? preFilledData.squareFeet.toString() : '',
    lotSize: '',
    yearBuilt: preFilledData?.yearBuilt ? preFilledData.yearBuilt.toString() : '',
    agentName: '',
    licenseNumber: '',
    agentPhone: '',
    agentEmail: '',
    brokerage: '',
    title: '',
    description: preFilledData?.description || '',
    features: preFilledData?.features || [],
    photos: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeSection, setActiveSection] = useState<'property' | 'agent' | 'details'>('property');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Property Information Validation
    if (!formData.propertyType) newErrors.propertyType = 'Property type is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!formData.price.trim()) newErrors.price = 'Price is required';
    else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) newErrors.price = 'Price must be a positive number';
    
    // Agent Information Validation
    if (!formData.agentName.trim()) newErrors.agentName = 'Agent name is required';
    if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
    else if (isNaN(Number(formData.licenseNumber)) || Number(formData.licenseNumber) <= 0) newErrors.licenseNumber = 'License number must be a positive number';
    if (!formData.agentPhone.trim()) newErrors.agentPhone = 'Phone number is required';
    else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.agentPhone)) newErrors.agentPhone = 'Please enter a valid phone number';
    if (!formData.agentEmail.trim()) newErrors.agentEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.agentEmail)) newErrors.agentEmail = 'Please enter a valid email address';
    
    // Listing Details Validation
    if (!formData.title.trim()) newErrors.title = 'Listing title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    else if (formData.description.trim().length < 50) newErrors.description = 'Description must be at least 50 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string | string[] | File[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFeatureToggle = (feature: string) => {
    const updatedFeatures = formData.features.includes(feature)
      ? formData.features.filter(f => f !== feature)
      : [...formData.features, feature];
    handleInputChange('features', updatedFeatures);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const totalPhotos = formData.photos.length + files.length;
    if (totalPhotos > 10) {
      alert('Maximum 10 photos allowed');
      return;
    }
    handleInputChange('photos', [...formData.photos, ...files] as File[]);
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = formData.photos.filter((_, i) => i !== index);
    handleInputChange('photos', updatedPhotos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Show error toast for validation failures
      const firstError = Object.keys(errors)[0];
      const errorMessages = Object.values(errors);
      toast.error('Please fix the following errors:', {
        description: errorMessages.join(', '),
        duration: 5000,
      });
      
      // Scroll to first error
      const errorElement = document.querySelector(`[name="${firstError}"]`);
      errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    // Show submitting toast
    const submittingToast = toast.loading('Creating your listing...', {
      description: 'Please wait while we process your submission.',
    });

    try {
      const formDataToSend = new FormData();
      
      // Append all form data
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'photos' && Array.isArray(value)) {
          value.forEach(photo => formDataToSend.append('photos', photo));
        } else if (key === 'features' && Array.isArray(value)) {
          formDataToSend.append(key, JSON.stringify(value));
        } else {
          formDataToSend.append(key, value as string);
        }
      });

      const response = await fetch('/api/listings', {
        method: 'POST',
        body: formDataToSend,
      });

      const responseData = await response.json();

      if (response.ok) {
        // Dismiss submitting toast and show success
        toast.dismiss(submittingToast);
        toast.success('🎉 Listing created successfully!', {
          description: `Your listing "${formData.title}" has been published. A confirmation email has been sent to ${formData.agentEmail}.`,
          duration: 6000,
          action: {
            label: 'View Details',
            onClick: () => console.log('View listing details:', responseData.listing),
          },
        });
        
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        // Dismiss submitting toast and show error
        toast.dismiss(submittingToast);
        
        if (responseData.errors) {
          setErrors(responseData.errors);
          const errorMessages = Object.values(responseData.errors);
          toast.error('Validation Error', {
            description: errorMessages.join(', '),
            duration: 5000,
          });
        } else {
          toast.error('Submission Failed', {
            description: responseData.error || 'An unexpected error occurred. Please try again.',
            duration: 5000,
          });
        }
        
        setSubmitStatus('error');
      }
    } catch (error) {
      // Dismiss submitting toast and show error
      toast.dismiss(submittingToast);
      
      console.error('Error submitting listing:', error);
      toast.error('Network Error', {
        description: 'Unable to connect to the server. Please check your connection and try again.',
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: () => handleSubmit(e),
        },
      });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSectionStatus = (section: 'property' | 'agent' | 'details') => {
    const sectionFields = {
      property: ['propertyType', 'address', 'city', 'state', 'zipCode', 'price'],
      agent: ['agentName', 'licenseNumber', 'agentPhone', 'agentEmail'],
      details: ['title', 'description']
    };
    
    const hasErrors = sectionFields[section].some(field => errors[field]);
    const isComplete = sectionFields[section].every(field => {
      const value = formData[field as keyof FormData];
      return value && (typeof value === 'string' ? value.trim() : true);
    });
    
    if (hasErrors) return 'error';
    if (isComplete) return 'complete';
    return 'incomplete';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create New Listing</h2>
              <p className="text-blue-100 mt-1">Add your property to our premium database</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20"
            >
              ×
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-gray-50 p-4 border-b">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { id: 'property', label: 'Property Info', icon: Home },
              { id: 'agent', label: 'Agent Info', icon: User },
              { id: 'details', label: 'Details', icon: FileText }
            ].map(({ id, label, icon: Icon }) => {
              const status = getSectionStatus(id as 'property' | 'agent' | 'details');
              const isActive = activeSection === id;
              
              return (
                <button
                  key={id}
                  onClick={() => setActiveSection(id as 'property' | 'agent' | 'details')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    isActive && "bg-blue-100 text-blue-700 font-medium",
                    status === 'complete' && "text-green-600",
                    status === 'error' && "text-red-600",
                    !isActive && "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{label}</span>
                  {status === 'complete' && <CheckCircle2 className="h-4 w-4" />}
                  {status === 'error' && <AlertCircle className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">Listing created successfully! Redirecting...</p>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">Error creating listing. Please check your information.</p>
              </div>
            </div>
          )}

          {/* Property Information Section */}
          {activeSection === 'property' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Property Information
                  </CardTitle>
                  <CardDescription>Basic details about the property</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="propertyType">Property Type *</Label>
                      <Select
                        value={formData.propertyType}
                        onValueChange={(value) => handleInputChange('propertyType', value)}
                      >
                        <SelectTrigger className={cn(errors.propertyType && "border-red-500")}>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.propertyType && <p className="text-red-500 text-sm mt-1">{errors.propertyType}</p>}
                    </div>

                    <div>
                      <Label htmlFor="price">Price *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="price"
                          type="number"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', e.target.value)}
                          className={cn("pl-10", errors.price && "border-red-500")}
                          placeholder="500000"
                        />
                      </div>
                      {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className={cn("pl-10", errors.address && "border-red-500")}
                        placeholder="123 Main Street"
                      />
                    </div>
                    {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className={cn(errors.city && "border-red-500")}
                        placeholder="Los Angeles"
                      />
                      {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                    </div>

                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className={cn(errors.state && "border-red-500")}
                        placeholder="CA"
                        maxLength={2}
                      />
                      {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                    </div>

                    <div>
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        className={cn(errors.zipCode && "border-red-500")}
                        placeholder="90210"
                      />
                      {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                        placeholder="3"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        value={formData.bathrooms}
                        onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                        placeholder="2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="squareFeet">Square Feet</Label>
                      <Input
                        id="squareFeet"
                        type="number"
                        value={formData.squareFeet}
                        onChange={(e) => handleInputChange('squareFeet', e.target.value)}
                        placeholder="2000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="yearBuilt">Year Built</Label>
                      <Input
                        id="yearBuilt"
                        type="number"
                        value={formData.yearBuilt}
                        onChange={(e) => handleInputChange('yearBuilt', e.target.value)}
                        placeholder="2020"
                        min="1800"
                        max={new Date().getFullYear()}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Agent Information Section */}
          {activeSection === 'agent' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Agent Information
                  </CardTitle>
                  <CardDescription>Your professional details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="agentName">Agent Name *</Label>
                      <Input
                        id="agentName"
                        value={formData.agentName}
                        onChange={(e) => handleInputChange('agentName', e.target.value)}
                        className={cn(errors.agentName && "border-red-500")}
                        placeholder="John Doe"
                      />
                      {errors.agentName && <p className="text-red-500 text-sm mt-1">{errors.agentName}</p>}
                    </div>

                    <div>
                      <Label htmlFor="licenseNumber">License Number *</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="licenseNumber"
                          type="number"
                          value={formData.licenseNumber}
                          onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                          className={cn("pl-10", errors.licenseNumber && "border-red-500")}
                          placeholder="123456"
                        />
                      </div>
                      {errors.licenseNumber && <p className="text-red-500 text-sm mt-1">{errors.licenseNumber}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="agentPhone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="agentPhone"
                          type="tel"
                          value={formData.agentPhone}
                          onChange={(e) => handleInputChange('agentPhone', e.target.value)}
                          className={cn("pl-10", errors.agentPhone && "border-red-500")}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      {errors.agentPhone && <p className="text-red-500 text-sm mt-1">{errors.agentPhone}</p>}
                    </div>

                    <div>
                      <Label htmlFor="agentEmail">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="agentEmail"
                          type="email"
                          value={formData.agentEmail}
                          onChange={(e) => handleInputChange('agentEmail', e.target.value)}
                          className={cn("pl-10", errors.agentEmail && "border-red-500")}
                          placeholder="john.doe@email.com"
                        />
                      </div>
                      {errors.agentEmail && <p className="text-red-500 text-sm mt-1">{errors.agentEmail}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="brokerage">Brokerage</Label>
                    <Input
                      id="brokerage"
                      value={formData.brokerage}
                      onChange={(e) => handleInputChange('brokerage', e.target.value)}
                      placeholder="ABC Realty"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Listing Details Section */}
          {activeSection === 'details' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Listing Details
                  </CardTitle>
                  <CardDescription>Complete your listing with compelling details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="title">Listing Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={cn(errors.title && "border-red-500")}
                      placeholder="Beautiful 3-Bedroom Home in Prime Location"
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className={cn("min-h-[120px]", errors.description && "border-red-500")}
                      placeholder="Describe your property in detail... Include unique features, neighborhood highlights, and what makes this property special."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.description.length}/1000 characters (minimum 50)
                    </p>
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                  </div>

                  <div>
                    <Label>Property Features</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                      {COMMON_FEATURES.map(feature => (
                        <button
                          key={feature}
                          type="button"
                          onClick={() => handleFeatureToggle(feature)}
                          className={cn(
                            "p-3 text-sm rounded-lg border transition-all",
                            formData.features.includes(feature)
                              ? "bg-blue-100 border-blue-300 text-blue-700"
                              : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          {feature}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Property Photos</Label>
                    <div className="mt-2">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">Upload up to 10 photos</p>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label
                          htmlFor="photo-upload"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                        >
                          Choose Photos
                        </label>
                      </div>
                      
                      {formData.photos.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          {formData.photos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={URL.createObjectURL(photo)}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <div>
              {activeSection !== 'property' && (
                <Button
                  type="button"
                  onClick={() => {
                    const sections: readonly ('property' | 'agent' | 'details')[] = ['property', 'agent', 'details'];
                    const currentIndex = sections.indexOf(activeSection);
                    if (currentIndex > 0) {
                      setActiveSection(sections[currentIndex - 1]);
                    }
                  }}
                  variant="outline"
                >
                  Previous
                </Button>
              )}
            </div>
            
            <div>
              {activeSection !== 'details' ? (
                <Button
                  type="button"
                  onClick={() => {
                    const sections: readonly ('property' | 'agent' | 'details')[] = ['property', 'agent', 'details'];
                    const currentIndex = sections.indexOf(activeSection);
                    if (currentIndex < sections.length - 1) {
                      setActiveSection(sections[currentIndex + 1]);
                    }
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating Listing...
                    </>
                  ) : (
                    'Create Listing'
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
      
      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        expand={false}
        richColors
        closeButton
        duration={4000}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
        }}
      />
    </div>
  );
}