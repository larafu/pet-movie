/**
 * Pet Identification Test API
 * POST /api/pet-video/identify-pet
 *
 * Test endpoint to verify Evolink Chat API pet identification functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { createEvolinkClient } from '@/extensions/ai/providers/evolink/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid imageUrl format' },
        { status: 400 }
      );
    }

    // Create Evolink client
    const evolinkClient = createEvolinkClient();

    // Identify pet characteristics
    const petDescription = await evolinkClient.identifyPet(imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl,
      petDescription,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pet identification error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
