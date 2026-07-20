import { NextRequest, NextResponse } from 'next/server';
import {
  canAccessTenant,
  requireAdminAuth,
  tenantForbiddenResponse,
} from '@/lib/auth/adminAuth';
import {
  autoTranslateTour,
  autoTranslateDestination,
  autoTranslateCategory,
  autoTranslateAttractionPage,
} from '@/lib/i18n/autoTranslate';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import type { Model } from 'mongoose';

const VALID_MODEL_TYPES = ['tour', 'destination', 'category', 'attraction-page'] as const;
type ModelType = (typeof VALID_MODEL_TYPES)[number];

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request, {
    permissions: ['manageTours', 'manageContent'],
    requireAll: false,
  });
  if (auth instanceof NextResponse) return auth;

  try {
    const { modelType, id } = (await request.json()) as { modelType: ModelType; id: string };
    if (!modelType || !VALID_MODEL_TYPES.includes(modelType)) {
      return NextResponse.json(
        { success: false, error: `Invalid modelType. Must be one of: ${VALID_MODEL_TYPES.join(', ')}` },
        { status: 400 },
      );
    }
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    await dbConnect();
    const models = {
      tour: Tour,
      destination: Destination,
      category: Category,
      'attraction-page': AttractionPage,
    } as const;
    const model = models[modelType] as Model<Record<string, unknown>>;
    const target = await model.findById(id).select('tenantId').lean() as { tenantId?: string } | null;
    if (!target) {
      return NextResponse.json({ success: false, error: `${modelType} not found` }, { status: 404 });
    }
    if (!canAccessTenant(auth, String(target.tenantId || 'default'))) return tenantForbiddenResponse();

    const translators: Record<ModelType, (entityId: string) => Promise<void>> = {
      tour: autoTranslateTour,
      destination: autoTranslateDestination,
      category: autoTranslateCategory,
      'attraction-page': autoTranslateAttractionPage,
    };
    await translators[modelType](id);

    return NextResponse.json({
      success: true,
      message: `Translations generated for ${modelType} ${id}`,
    });
  } catch (error) {
    console.error('[Translate] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 },
    );
  }
}
