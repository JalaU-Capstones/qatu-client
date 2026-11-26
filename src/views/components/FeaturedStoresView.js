import { FeaturedStoresViewModel } from '../../viewmodels/components/FeaturedStoresViewModel.js';
import { renderStoreCard } from './storeCard.js';

export class FeaturedStoresView {
  constructor(viewModel = new FeaturedStoresViewModel()) {
    this.viewModel = viewModel;
    this.element = null;
    this._unsubscribe = null;
    this._gridElement = null;
  }

  render() {
    if (this.element) return this.element;

    const section = document.createElement('section');
    section.className = 'q-featured-stores';
    section.setAttribute('aria-labelledby', 'q-featured-stores-title');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    const header = document.createElement('div');
    header.className = 'q-featured-stores__header';
    const titleGroup = document.createElement('div');
    titleGroup.className = 'q-featured-stores__title-group';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-featured-stores__eyebrow';
    eyebrow.textContent = this.viewModel.eyebrow;

    const title = document.createElement('h2');
    title.id = 'q-featured-stores-title';
    title.className = 'q-featured-stores__title';
    title.textContent = this.viewModel.title;
    titleGroup.append(eyebrow, title);

    const subtitle = document.createElement('p');
    subtitle.className = 'q-featured-stores__subtitle';
    subtitle.textContent = this.viewModel.subtitle;
    titleGroup.appendChild(subtitle);

    const seeAll = document.createElement('a');
    seeAll.className = 'q-featured-stores__see-all';
    seeAll.href = this.viewModel.seeAllHref;
    seeAll.dataset.route = '';
    seeAll.textContent = `${this.viewModel.seeAllLabel} →`;
    seeAll.addEventListener('click', (event) => {
      event.preventDefault();
      if (this.viewModel.onSeeAll) {
        event.stopPropagation();
        this.viewModel.onSeeAll();
      }
    });

    header.append(titleGroup, seeAll);

    const grid = document.createElement('ul');
    grid.className = 'q-featured-stores__grid';
    this._gridElement = grid;

    container.append(header, grid);
    section.appendChild(container);
    this.element = section;
    this._update(this.viewModel);

    this._unsubscribe = this.viewModel.subscribe((vm) => this._update(vm));
    return section;
  }

  mount(container) {
    const element = this.render();
    container.appendChild(element);
    void this.viewModel.load();
    return element;
  }

  _update(vm) {
    if (!this.element || !this._gridElement) return;
    const grid = this._gridElement;
    grid.replaceChildren();

    if (vm.isLoading && vm.sellers.length === 0) {
      this.element.hidden = false;
      for (let index = 0; index < 3; index += 1) {
        const item = document.createElement('li');
        item.className = 'q-store-card-item';
        const card = document.createElement('article');
        card.className = 'q-store-card q-store-card--skeleton';
        card.setAttribute('aria-hidden', 'true');
        item.appendChild(card);
        grid.appendChild(item);
      }
      return;
    }

    if (vm.errorMessage && vm.sellers.length === 0) {
      this.element.hidden = false;
      const item = document.createElement('li');
      item.className = 'q-featured-stores__message';
      item.setAttribute('role', 'alert');
      const message = document.createElement('p');
      message.textContent = vm.errorMessage;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'q-btn q-btn--neutral';
      retry.textContent = 'Reintentar';
      retry.addEventListener('click', () => void vm.load());
      item.append(message, retry);
      grid.appendChild(item);
      return;
    }

    if (vm.sellers.length === 0 && !vm.isLoading) {
      this.element.hidden = true;
      return;
    }

    this.element.hidden = false;
    vm.sellers.forEach((seller) =>
      grid.appendChild(renderStoreCard(seller, { onClick: vm.onStoreClick }))
    );
  }

  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this.element?.remove();
    this.element = null;
    this._gridElement = null;
  }
}
