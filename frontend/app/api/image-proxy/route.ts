import { NextRequest, NextResponse } from 'next/server';

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9-_\.]/g, '_');
}

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Parametro url mancante' }, { status: 400 });
  }

  try {
    const parsedUrl = new URL(imageUrl);

    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Impossibile recuperare l'immagine (${response.status})` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const filename = sanitizeFilename(parsedUrl.pathname.split('/').pop() || 'image');

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Errore durante il download dell\'immagine' },
      { status: 500 }
    );
  }
}
