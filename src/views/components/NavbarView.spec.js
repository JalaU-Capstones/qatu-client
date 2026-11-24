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
    const el = view.mount(container);
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
    const el = view.mount(container);
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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('NavbarView additional branches (recovered 1)', () => {
      let view;
      let viewModel;
      let container;
      let extraViews;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        viewModel = new NavbarViewModel();
        view = new NavbarView(viewModel);
        extraViews = [];
      });

      afterEach(() => {
        view?.destroy();
        extraViews.forEach((extraView) => extraView.destroy());
        container.remove();
      });

      it('uses a default NavbarViewModel instance when none is supplied', () => {
        const defaultView = new NavbarView();
        extraViews.push(defaultView);

        expect(defaultView.viewModel).toBeInstanceOf(NavbarViewModel);
        const el = defaultView.render();
        expect(
          Array.from(el.querySelectorAll('.q-navbar-link'), (anchor) => anchor.textContent)
        ).toEqual(['Categorías', 'Tiendas', 'Productos']);
      });

      it('renders custom links with href, link id, route marker and active class', () => {
        const customViewModel = new NavbarViewModel({
          links: [
            { id: 'custom-a', label: 'Alpha', href: '/alpha' },
            { id: 'custom-b', label: 'Beta', href: '/beta' },
          ],
          activeLinkId: 'custom-b',
        });
        const customView = new NavbarView(customViewModel);
        extraViews.push(customView);
        const el = customView.mount(container);
        const anchors = el.querySelectorAll('.q-navbar-link');

        expect(anchors.length).toBe(2);
        expect(anchors[0].getAttribute('href')).toBe('/alpha');
        expect(anchors[0].dataset.linkId).toBe('custom-a');
        expect(anchors[0].getAttribute('data-route')).toBe('');
        expect(anchors[0].classList.contains('is-active')).toBe(false);
        expect(anchors[1].getAttribute('href')).toBe('/beta');
        expect(anchors[1].dataset.linkId).toBe('custom-b');
        expect(anchors[1].getAttribute('data-route')).toBe('');
        expect(anchors[1].classList.contains('is-active')).toBe(true);
      });

      it('renders the burger markup and toggles aria-expanded with the active classes', () => {
        const el = view.mount(container);
        const burger = el.querySelector('.q-navbar-burger');
        const menu = el.querySelector('.q-navbar-menu');

        expect(burger.tagName.toLowerCase()).toBe('button');
        expect(burger.type).toBe('button');
        expect(burger.getAttribute('aria-label')).toBe('Abrir menú de navegación');
        expect(burger.getAttribute('aria-expanded')).toBe('false');
        expect(burger.querySelectorAll('span').length).toBe(3);

        burger.click();
        expect(burger.getAttribute('aria-expanded')).toBe('true');
        expect(burger.classList.contains('is-active')).toBe(true);
        expect(menu.classList.contains('is-active')).toBe(true);

        burger.click();
        expect(burger.getAttribute('aria-expanded')).toBe('false');
        expect(burger.classList.contains('is-active')).toBe(false);
        expect(menu.classList.contains('is-active')).toBe(false);
      });

      it('calls toggleMenu once and stops propagation on burger clicks', () => {
        const toggleSpy = spyOn(viewModel, 'toggleMenu');
        const containerClickSpy = jasmine.createSpy('containerClick');
        container.addEventListener('click', containerClickSpy);
        const el = view.mount(container);

        el.querySelector('.q-navbar-burger').dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );

        expect(toggleSpy).toHaveBeenCalledTimes(1);
        expect(containerClickSpy).not.toHaveBeenCalled();
      });

      it('reuses the same element across render and mount calls', () => {
        const first = view.render();

        expect(view.render()).toBe(first);
        expect(viewModel._listeners.size).toBe(1);
        expect(view.mount(container)).toBe(first);
        expect(view.mount(container)).toBe(first);
      });

      it('updates the active link on anchor click while allowing the event to bubble', () => {
        const containerClickSpy = jasmine.createSpy('containerClick');
        container.addEventListener('click', containerClickSpy);
        const el = view.mount(container);
        const anchors = el.querySelectorAll('.q-navbar-link');

        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        anchors[1].dispatchEvent(clickEvent);

        expect(clickEvent.defaultPrevented).toBe(true);
        expect(containerClickSpy).toHaveBeenCalledTimes(1);
        expect(viewModel.activeLinkId).toBe('nav-tiendas');
        expect(anchors[1].classList.contains('is-active')).toBe(true);
        expect(anchors[0].classList.contains('is-active')).toBe(false);
      });

      it('closes the menu on an outside document click only while the menu is open', () => {
        const el = view.mount(container);
        const burger = el.querySelector('.q-navbar-burger');
        const closeSpy = spyOn(viewModel, 'closeMenu').and.callThrough();

        container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(closeSpy).not.toHaveBeenCalled();

        burger.click();
        expect(viewModel.isMenuOpen).toBe(true);

        container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(viewModel.isMenuOpen).toBe(false);
        expect(burger.getAttribute('aria-expanded')).toBe('false');
      });

      it('does not close the menu for clicks inside the navbar', () => {
        const el = view.mount(container);
        const closeSpy = spyOn(viewModel, 'closeMenu').and.callThrough();

        el.querySelector('.q-navbar-burger').click();
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(closeSpy).not.toHaveBeenCalled();
        expect(viewModel.isMenuOpen).toBe(true);
      });

      it('removes active link classes when the active id changes to null', () => {
        const el = view.mount(container);
        const anchors = el.querySelectorAll('.q-navbar-link');

        anchors[0].click();
        expect(anchors[0].classList.contains('is-active')).toBe(true);

        viewModel.setActiveLink(null);
        expect(Array.from(anchors, (anchor) => anchor.classList.contains('is-active'))).toEqual([
          false,
          false,
          false,
        ]);
      });

      it('unsubscribes, removes DOM and is safe to destroy twice', () => {
        const el = view.mount(container);

        expect(viewModel._listeners.size).toBe(1);
        view.destroy();
        expect(viewModel._listeners.size).toBe(0);
        expect(view.element).toBeNull();
        expect(container.querySelector('.q-navbar')).toBeNull();
        expect(document.body.contains(el)).toBe(false);
        expect(() => view.destroy()).not.toThrow();
      });

      it('ignores document clicks after destroy', () => {
        const el = view.mount(container);

        el.querySelector('.q-navbar-burger').click();
        expect(viewModel.isMenuOpen).toBe(true);

        view.destroy();
        container.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(viewModel.isMenuOpen).toBe(true);
      });
    });
  })();
})();
