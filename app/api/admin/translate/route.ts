// app/api/admin/translate/route.ts
// Generic translation endpoint for any entity type
import { NextRequest, NextResponse } from 'next/server';
import { canAccessTenant, requireAdminAuth, tenantForbiddenResponse } from '@/lib/auth/adminAuth';
import { autoTranslateTour, autoTranslateDestination, autoTranslateCategory } from '@/lib/i18n/autoTranslate';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';

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
    const { modelType, id } = await request.json();

    if (!modelType || !id) {
      return NextResponse.json(
        { success: false, error: 'modelType and id are required' },
        { status: 400 }
      );
    }
    const models: Record<string, any> = { tour: Tour, destination: Destination, category: Category };
    const model = models[modelType];
    if (!model) return NextResponse.json({ success: false, error: 'Unknown model type' }, { status: 400 });
    await dbConnect();
    const target = await model.findById(id).select('tenantId').lean();
    if (!target) return NextResponse.json({ success: false, error: `${modelType} not found` }, { status: 404 });
    if (!canAccessTenant(auth, String(target.tenantId || 'default'))) return tenantForbiddenResponse();

    let result;
    switch (modelType) {
      case 'tour':
        result = await autoTranslateTour(id);
        break;
      case 'destination':
        result = await autoTranslateDestination(id);
        break;
      case 'category':
        result = await autoTranslateCategory(id);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown model type: ${modelType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully translated ${modelType} ${id}`,
    });
  } catch (error) {
    console.error('[Translate] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
