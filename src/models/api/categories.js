// TODO(api): expose product_count on GET /v1/categories

export function normalizeCategoriesResponse(response) {
  const list = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];

  return list.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    product_count:
      category.product_count !== undefined
        ? Number(category.product_count) || 0
        : category.products_count !== undefined
          ? Number(category.products_count) || 0
          : null,
  }));
}

export async function getCategoriesWithCounts(apiFetchFn) {
  const response = await apiFetchFn('/categories?page=1&limit=100');
  let body = response;
  if (typeof response?.json === 'function') {
    body = await response.json();
  }
  return normalizeCategoriesResponse(body);
}

export async function getTopCategories(limit = 5, apiFetchFn) {
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 5;
  const categories = await getCategoriesWithCounts(apiFetchFn);
  const hasCounts = categories.some((category) => category.product_count !== null);

  if (!hasCounts) {
    // eslint-disable-next-line no-console
    console.warn('No hay conteo de productos disponible para las categorías.');
  }

  return [...categories]
    .sort((a, b) => {
      if (hasCounts) {
        const countDifference = (b.product_count || 0) - (a.product_count || 0);
        if (countDifference !== 0) return countDifference;
      }
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    })
    .slice(0, safeLimit);
}
