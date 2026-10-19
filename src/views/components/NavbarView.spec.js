import { NavbarViewModel } from '../../viewmodels/components/NavbarViewModel.js';
import { NavbarView } from './NavbarView.js';

describe('NavbarView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new NavbarViewModel();
    view = new NavbarView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render nav element with role and links', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('nav');
    expect(el.classList.contains('q-navbar')).toBe(true);

    const links = el.querySelectorAll('.q-navbar-link');
    expect(links.length).toBe(3);
    expect(links[0].textContent).toBe('Categorías');
    expect(links[1].textContent).toBe('Tiendas');
    expect(links[2].textContent).toBe('Productos');
  });

  it('should toggle burger and menu on burger click', () => {
    const el = view.render();
    const burger = el.querySelector('.q-navbar-burger');
    const menu = el.querySelector('.q-navbar-menu');

    expect(burger.classList.contains('is-active')).toBe(false);
    expect(menu.classList.contains('is-active')).toBe(false);

    burger.click();
    expect(burger.classList.contains('is-active')).toBe(true);
    expect(menu.classList.contains('is-active')).toBe(true);

    burger.click();
    expect(burger.classList.contains('is-active')).toBe(false);
    expect(menu.classList.contains('is-active')).toBe(false);
  });

  it('should set active link on click', () => {
    const el = view.render();
    const links = el.querySelectorAll('.q-navbar-link');

    links[1].click();
    expect(links[1].classList.contains('is-active')).toBe(true);
    expect(viewModel.activeLinkId).toBe('nav-tiendas');
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-navbar')).not.toBeNull();
  });
});
