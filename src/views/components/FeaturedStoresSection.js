export function renderStoreCard(store) {
  return `
    <div class="column is-4-desktop is-12-mobile">
      <div class="card p-5" style="border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: none;">
        <div class="is-flex is-flex-direction-column mb-4">
          <div class="mr-3 is-flex is-justify-content-center is-align-items-center has-background-light" 
               style="width: 52px; height: 52px; border-radius: 50%;">
            <span class="has-text-grey-light is-size-5">✕</span>
          </div>
          <div>
            <h3 class="has-text-weight-bold is-size-5 mb-0">${store.name}</h3>
            <p class="is-size-7 has-text-grey mb-1">${store.category}</p>
            <div class="is-size-7 has-text-grey">
              <span class="has-text-warning">★</span> <strong>${store.rating}</strong> · ${store.reviewCount} reseñas
            </div>
          </div>
        </div>
        <button class="button is-fullwidth is-outlined is-dark has-text-weight-medium" style="border-radius: 6px;">
          Visit store
        </button>
      </div>
    </div>
  `;
}

export function renderFeaturedStoresSection(stores) {
  const container = document.createElement('section');
  container.className = 'section py-5';

  container.innerHTML = `
    <div class="container">
      <div class="is-flex is-justify-content-space-between is-align-items-flex-end mb-4">
        <div>
          <h2 class="title is-4 mb-1">Tiendas destacadas</h2>
          <p class="subtitle is-6 has-text-grey">Conoce a quienes crean</p>
        </div>
        <a href="#/stores" class="has-text-weight-medium is-size-6 has-text-dark">Ver todas &rarr;</a>
      </div>

      <div class="columns is-variable is-4">
        ${stores.map((store) => renderStoreCard(store)).join('')}
      </div>
    </div>
  `;

  return container;
}
