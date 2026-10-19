export function renderCategoryCard(category) {
  return `
    <div class="column is-2-desktop is-4-tablet is-6-mobile">
      <div class="card p-4 is-clickable has-shadow-hover" style="border: 1px solid #e5e7eb; border-radius: 8px;">
        <div class="image-placeholder mb-3 has-background-light is-flex is-justify-content-center is-align-items-center" style="height: 110px; border-radius: 6px;">
          <span class="has-text-grey-light is-size-4">✕</span>
        </div>
        <h3 class="has-text-weight-bold is-size-6 mb-1">${category.name}</h3>
        <p class="is-size-7 has-text-grey">${category.productCount} productos</p>
        <p class="has-text-right is-size-9 has-text-grey">&rarr;</p>
      </div>
    </div>
  `;
}

export function renderCategoriesSection(categories) {
  const container = document.createElement('section');
  container.className = 'section py-5';

  container.innerHTML = `
    <div class="container">
      <div class="is-flex is-justify-content-space-between is-align-items-flex-end mb-4">
        <div>
          <h2 class="title is-4 mb-1">Explora por categoría</h2>
          <p class="subtitle is-6 has-text-grey">Encuentra tu próximo favorito</p>
        </div>
        <a href="#/categories" class="has-text-weight-medium is-size-6 has-text-dark">Ver todas &rarr;</a>
      </div>

      <div class="columns is-multiline is-variable is-3">
        ${categories.map((cat) => renderCategoryCard(cat)).join('')}
      </div>
    </div>
  `;

  return container;
}
