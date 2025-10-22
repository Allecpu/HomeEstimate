import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL è richiesto' },
        { status: 400 }
      );
    }

    // Forward request to FastAPI backend
    const response = await fetch(`${BACKEND_URL}/api/scraper/parse-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail || 'Errore nel parsing' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Parse URL error:', error);
    return NextResponse.json(
      { error: 'Errore del server' },
      { status: 500 }
    );
  }
}
