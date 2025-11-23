import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AgentData {
  agentName: string;
  agentEmail: string;
  licenseNumber: string;
}

interface ListingData {
  title: string;
  address: string;
  price: number;
  photos: string[];
}

// Email configuration - sends confirmation email to agent
const sendAgentConfirmationEmail = async (agentData: AgentData, listingData: ListingData) => {
  try {
    console.log('📧 Sending confirmation email to:', agentData.agentEmail);
    console.log('🏠 Listing created:', listingData.title);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_SECRET_KEY || 'dev-key'}` // Add basic auth in production
      },
      body: JSON.stringify({
        to: agentData.agentEmail,
        subject: `✅ Your Listing "${listingData.title}" Has Been Created Successfully`,
        template: 'listing-confirmation',
        data: {
          agentName: agentData.agentName,
          agentEmail: agentData.agentEmail,
          licenseNumber: agentData.licenseNumber,
          title: listingData.title,
          address: listingData.address,
          price: listingData.price,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Email service error:', errorData);
      throw new Error(`Email service failed: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Email notification sent successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Email notification failed:', error);
    // Don't throw the error - we don't want email failures to break the listing creation
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract form data
    const listingData: Record<string, any> = {
      property_type: formData.get('propertyType'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      zip_code: formData.get('zipCode'),
      price: parseFloat(formData.get('price') as string),
      bedrooms: formData.get('bedrooms') ? parseInt(formData.get('bedrooms') as string) : null,
      bathrooms: formData.get('bathrooms') ? parseInt(formData.get('bathrooms') as string) : null,
      square_feet: formData.get('squareFeet') ? parseInt(formData.get('squareFeet') as string) : null,
      lot_size: formData.get('lotSize') ? parseInt(formData.get('lotSize') as string) : null,
      year_built: formData.get('yearBuilt') ? parseInt(formData.get('yearBuilt') as string) : null,
      agent_name: formData.get('agentName'),
      license_number: formData.get('licenseNumber'),
      agent_phone: formData.get('agentPhone'),
      agent_email: formData.get('agentEmail'),
      brokerage: formData.get('brokerage'),
      title: formData.get('title'),
      description: formData.get('description'),
      features: JSON.parse(formData.get('features') as string || '[]'),
      photos: [] as string[],
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Validate required fields
    const errors: Record<string, string> = {};
    
    if (!listingData.property_type) errors.propertyType = 'Property type is required';
    if (!listingData.address) errors.address = 'Address is required';
    if (!listingData.city) errors.city = 'City is required';
    if (!listingData.state) errors.state = 'State is required';
    if (!listingData.zip_code) errors.zipCode = 'ZIP code is required';
    if (!listingData.price || listingData.price <= 0) errors.price = 'Price must be a positive number';
    if (!listingData.agent_name) errors.agentName = 'Agent name is required';
    if (!listingData.license_number) errors.licenseNumber = 'License number is required';
    if (!listingData.agent_phone) errors.agentPhone = 'Phone number is required';
    if (!listingData.agent_email) errors.agentEmail = 'Email is required';
    if (!listingData.title) errors.title = 'Listing title is required';
    if (!listingData.description) errors.description = 'Description is required';
    
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Handle photo uploads
    const photos = formData.getAll('photos') as File[];
    const photoUrls: string[] = [];
    
    for (const photo of photos) {
      if (photo instanceof File) {
        const fileName = `${uuidv4()}-${photo.name}`;
        const filePath = `listings/${fileName}`;
        
        try {
          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('listings')
            .upload(filePath, photo);
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('listings')
            .getPublicUrl(filePath);
          
          if (publicUrl) {
            photoUrls.push(publicUrl);
          }
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
        }
      }
    }

    // Update listing data with photo URLs
    listingData.photos = photoUrls;

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

    // Send confirmation email to agent
    try {
      await sendAgentConfirmationEmail(
        {
          agentName: listingData.agent_name,
          agentEmail: listingData.agent_email,
          licenseNumber: listingData.license_number,
        },
        {
          title: listingData.title,
          address: listingData.address,
          price: listingData.price,
          photos: listingData.photos,
        }
      );
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      listing: insertedListing,
      message: 'Listing created successfully!'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch listings', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ listings });

  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}