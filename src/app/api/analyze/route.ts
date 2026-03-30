import { NextRequest, NextResponse } from 'next/server';
import { analyzeWebsite } from '@/lib/analyzer';
import { validateUrl } from '@/lib/analyzer/page-fetcher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, include_raw } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL не указан' },
        { status: 400 }
      );
    }

    // Pre-validate URL format
    const validation = validateUrl(url);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Run analysis
    const result = await analyzeWebsite(url);

    // Remove raw data if not requested
    if (!include_raw) {
      result.raw_data = {
        extracted_content: {
          title: result.raw_data.extracted_content.title,
          h1: result.raw_data.extracted_content.h1,
          h2: result.raw_data.extracted_content.h2,
          h3: [],
          meta_description: result.raw_data.extracted_content.meta_description,
          text_content: '',
          links: [],
          images: [],
          forms: result.raw_data.extracted_content.forms,
          buttons: result.raw_data.extracted_content.buttons.slice(0, 20),
          iframes: result.raw_data.extracted_content.iframes,
          menus: result.raw_data.extracted_content.menus,
          scripts: [],
          styles: []
        },
        all_scores: {}
      };
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка при анализе сайта' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Website Feature Analyzer API',
    version: '1.0.0',
    endpoints: {
      'POST /api/analyze': {
        description: 'Analyze a website',
        body: {
          url: 'string (required) - URL of the website to analyze',
          include_raw: 'boolean (optional) - Include raw extracted data'
        }
      }
    }
  });
}
