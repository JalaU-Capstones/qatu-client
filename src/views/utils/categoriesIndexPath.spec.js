import { getCategoriesIndexPath } from './categoriesIndexPath.js';

describe('getCategoriesIndexPath', () => {
  it('routes admins to category management', () => {
    expect(getCategoriesIndexPath('admin')).toBe('/admin/categories');
  });

  it('routes all non-admin roles to the public categories page', () => {
    expect(getCategoriesIndexPath('buyer')).toBe('/categories');
    expect(getCategoriesIndexPath('seller')).toBe('/categories');
    expect(getCategoriesIndexPath(null)).toBe('/categories');
  });
});
