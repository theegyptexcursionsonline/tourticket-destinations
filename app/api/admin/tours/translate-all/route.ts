// app/api/admin/tours/translate-all/route.ts
// Bulk translation endpoint for all published tours
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { translateAllTours } from '@/lib/translation/translateService';
// Note: For individual entity translation (tour/destination/category),
// use the new /api/admin/translate endpoint which leverages lib/i18n/autoTranslate.ts

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'OPENAI_API_KEY is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { tenantId, force = false, batchSize = 5 } = body;

    const result = await translateAllTours({ tenantId, force, batchSize });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Translation complete: ${result.translated} translated, ${result.failed} failed, ${result.skipped} skipped`,
    });
  } catch (error) {
    console.error('[TranslateAll] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
