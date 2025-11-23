import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { 
      propertyType, address, city, state, zipCode, price, bedrooms, bathrooms, 
      squareFeet, yearBuilt, description, features, agentName, agentEmail, 
      licenseNumber, title, status, source, originalContent, parsedAt 
    } = body;

    // Basic validation
    if (!propertyType || !address || !price) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyType, address, and price are required' },
        { status: 400 }
      );
    }

    // Prepare data for database insertion
    const listingData = {
      property_type: propertyType,
      address: address,
      city: city || null,
      state: state || null,
      zip_code: zipCode || null,
      price: parseFloat(price),
      bedrooms: bedrooms ? parseInt(bedrooms.toString()) : null,
      bathrooms: bathrooms ? parseFloat(bathrooms.toString()) : null,
      square_feet: squareFeet ? parseInt(squareFeet.toString()) : null,
      year_built: yearBuilt ? parseInt(yearBuilt.toString()) : null,
      agent_name: agentName || 'Auto Generated',
      license_number: licenseNumber || '000000',
      agent_email: agentEmail || 'auto@estateflow.ai',
      agent_phone: null,
      brokerage: null,
      title: title || `${propertyType} at ${address}`,
      description: description || originalContent?.substring(0, 1000) || 'Auto-generated from parsed content',
      features: features || [],
      photos: [],
      status: status || 'pending_review',
      source: source || 'auto_parsed',
      original_content: originalContent || null,
      parsed_at: parsedAt || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert into database
    const { data: insertedListing, error: dbError } = await supabase
      .from('listings')
      .insert(listingData)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create listing', details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      listing: insertedListing,
      message: 'Listing created successfully from parsed content!'
    });

  } catch (error) {
    console.error('Unexpected error in /create endpoint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'auto_parsed';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('source', source)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch auto-parsed listings', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ listings });

  } catch (error) {
    console.error('Error fetching auto-parsed listings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}