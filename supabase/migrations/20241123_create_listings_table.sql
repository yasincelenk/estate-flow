-- Create listings table
CREATE TABLE listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Property Information
  property_type VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_feet INTEGER,
  lot_size INTEGER,
  year_built INTEGER,
  
  -- Agent Information
  agent_name VARCHAR(200) NOT NULL,
  license_number VARCHAR(50) NOT NULL,
  agent_phone VARCHAR(20) NOT NULL,
  agent_email VARCHAR(255) NOT NULL,
  brokerage VARCHAR(200),
  
  -- Listing Details
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  
  -- Status and Timestamps
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  view_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false
);

-- Create indexes for better performance
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_location ON listings(city, state);
CREATE INDEX idx_listings_property_type ON listings(property_type);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_agent_email ON listings(agent_email);

-- Enable Row Level Security (RLS)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (read-only for non-authenticated users)
CREATE POLICY "Public can view active listings" ON listings
  FOR SELECT USING (status = 'active');

-- Create policy for authenticated users to create listings
CREATE POLICY "Authenticated users can create listings" ON listings
  FOR INSERT WITH CHECK (true);

-- Create policy for agents to update their own listings
CREATE POLICY "Agents can update their own listings" ON listings
  FOR UPDATE USING (agent_email = auth.jwt() ->> 'email');

-- Create policy for agents to delete their own listings
CREATE POLICY "Agents can delete their own listings" ON listings
  FOR DELETE USING (agent_email = auth.jwt() ->> 'email');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON listings TO anon;
GRANT INSERT ON listings TO authenticated;
GRANT UPDATE ON listings TO authenticated;
GRANT DELETE ON listings TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();