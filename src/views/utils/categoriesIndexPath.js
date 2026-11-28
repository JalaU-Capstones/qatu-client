export function getCategoriesIndexPath(role) {
  return role === 'admin' ? '/admin/categories' : '/categories';
}
