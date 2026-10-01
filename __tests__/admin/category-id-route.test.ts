/**
 * /admin/categories/<id> used to look a category up by id with no session and
 * no brand check, so any visitor could read any brand's category name. It now
 * reads nothing and forwards to the editor, which loads through the guarded API.
 */
import { redirect } from 'next/navigation';
import AdminCategoryRoute from '@/app/admin/categories/[id]/page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: { findById: jest.fn(), findOne: jest.fn() } }));

describe('admin category id route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwards to the editor without reading the database', async () => {
    await expect(
      AdminCategoryRoute({ params: Promise.resolve({ id: '000000000000000000000c12' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/admin/categories/000000000000000000000c12/edit');

    const dbConnect = jest.requireMock('@/lib/dbConnect').default as jest.Mock;
    const Category = jest.requireMock('@/lib/models/Category').default as { findById: jest.Mock; findOne: jest.Mock };
    expect(dbConnect).not.toHaveBeenCalled();
    expect(Category.findById).not.toHaveBeenCalled();
    expect(Category.findOne).not.toHaveBeenCalled();
  });

  it('encodes a hostile id instead of letting it steer the redirect', async () => {
    await expect(
      AdminCategoryRoute({ params: Promise.resolve({ id: '../../x?y=1' }) }),
    ).rejects.toThrow();

    expect(redirect).toHaveBeenCalledWith('/admin/categories/..%2F..%2Fx%3Fy%3D1/edit');
  });
});
