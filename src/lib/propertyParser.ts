export interface ParsedPropertyData {
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

export const parsePropertyContent = (content: string): ParsedPropertyData => {
  const data: ParsedPropertyData = {};
  const text = content.toLowerCase();
  
  // Parse price - look for various price formats
  const priceMatch = content.match(/\$?([\d,]+(?:\.\d{2})?)/g);
  if (priceMatch) {
    const prices = priceMatch.map(p => parseFloat(p.replace(/[$,]/g, '')));
    const mainPrice = prices.find(p => p > 50000); // Assume main price is > 50k
    if (mainPrice) data.price = mainPrice;
  }
  
  // Parse property type
  if (text.includes('single family') || text.includes('single-family')) data.propertyType = 'single-family';
  else if (text.includes('condo') || text.includes('condominium')) data.propertyType = 'condo';
  else if (text.includes('townhouse') || text.includes('town home')) data.propertyType = 'townhouse';
  else if (text.includes('multi-family') || text.includes('multi family')) data.propertyType = 'multi-family';
  else if (text.includes('land') || text.includes('lot')) data.propertyType = 'land';
  
  // Parse bedrooms
  const bedroomMatch = text.match(/(\d+)\s*(?:bedroom|bed|br)/i);
  if (bedroomMatch) data.bedrooms = parseInt(bedroomMatch[1]);
  
  // Parse bathrooms
  const bathroomMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:bathroom|bath|ba)/i);
  if (bathroomMatch) data.bathrooms = parseFloat(bathroomMatch[1]);
  
  // Parse square footage
  const sqftMatch = text.match(/(\d+(?:,\d+)?)\s*(?:sq\.?\s*ft\.?|square\s*feet|sqft)/i);
  if (sqftMatch) data.squareFeet = parseInt(sqftMatch[1].replace(/,/g, ''));
  
  // Parse year built
  const yearMatch = text.match(/(?:built\s*in|year\s*built)\s*(\d{4})/i);
  if (yearMatch) data.yearBuilt = parseInt(yearMatch[1]);
  
  // Parse address - look for common address patterns
  const addressMatch = content.match(/(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|place|pl|way|circle|cir)\b\.?)/i);
  if (addressMatch) data.address = addressMatch[1].trim();
  
  // Parse city and state
  const cityStateMatch = content.match(/([A-Z][a-zA-Z\s]+),?\s*([A-Z]{2})\b/);
  if (cityStateMatch) {
    data.city = cityStateMatch[1].trim();
    data.state = cityStateMatch[2];
  }
  
  // Parse ZIP code
  const zipMatch = content.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zipMatch) data.zipCode = zipMatch[1];
  
  // Parse features
  const features: string[] = [];
  const featureKeywords = [
    'swimming pool', 'pool', 'garage', 'fireplace', 'hardwood floors', 'hardwood',
    'central ac', 'ac', 'dishwasher', 'washer/dryer', 'balcony', 'garden',
    'basement', 'attic', 'walk-in closet', 'granite countertop', 'stainless steel'
  ];
  
  featureKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      features.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });
  
  if (features.length > 0) data.features = features;
  
  // Parse description - extract meaningful text
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length > 0) {
    data.description = sentences.slice(0, 3).join('. ').trim() + '.';
  }
  
  return data;
};

export const validateParsedData = (data: ParsedPropertyData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.address) errors.push('Address could not be determined');
  if (!data.price || data.price <= 0) errors.push('Price could not be determined');
  if (!data.propertyType) errors.push('Property type could not be determined');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};