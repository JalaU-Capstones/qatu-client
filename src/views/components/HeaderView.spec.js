import { HeaderViewModel } from '../../viewmodels/components/HeaderViewModel.js';
import { HeaderView } from './HeaderView.js';

describe('HeaderView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new HeaderViewModel();
    view = new HeaderView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render header element with brand logo and actions', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('header');
    expect(el.classList.contains('q-header')).toBe(true);

    const logo = el.querySelector('.q-brand-logo');
    expect(logo).not.toBeNull();
    expect(logo.textContent).toBe("Q'atu");

    const loginBtn = el.querySelector('.q-header-login-btn');
    expect(loginBtn).not.toBeNull();
    expect(loginBtn.textContent).toBe('Iniciar sesión');

    const cartBtn = el.querySelector('.q-header-cart-btn');
    expect(cartBtn).not.toBeNull();
  });

  it('should include the navbar navigation inside header', () => {
    const el = view.render();
    const nav = el.querySelector('.q-navbar');
    expect(nav).not.toBeNull();

    const links = el.querySelectorAll('.q-navbar-link');
    expect(links.length).toBe(3);
  });

  it('should render cart badge when cartCount > 0 and update reactively', () => {
    const el = view.render();
    let badge = el.querySelector('.q-header-cart-badge');
    expect(badge).toBeNull();

    viewModel.setCartCount(2);
    badge = el.querySelector('.q-header-cart-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('2');

    viewModel.setCartCount(0);
    badge = el.querySelector('.q-header-cart-badge');
    expect(badge).toBeNull();
  });

  it('should trigger onLoginClick callback when login button is clicked', () => {
    let clicked = false;
    const customVM = new HeaderViewModel({
      onLoginClick: () => {
        clicked = true;
      },
    });
    const customView = new HeaderView(customVM);
    const el = customView.mount(container);

    const loginBtn = el.querySelector('.q-header-login-btn');
    loginBtn.click();
    expect(clicked).toBe(true);
    customView.destroy();
  });

  it('should render circular default avatar placeholder when user is logged in without avatarUrl', () => {
    const loggedInVM = new HeaderViewModel({
      user: { username: 'camilam', full_name: 'Camila Morales' },
    });
    const loggedInView = new HeaderView(loggedInVM);
    const el = loggedInView.render();

    expect(el.querySelector('.q-header-login-btn')).toBeNull();
    const avatar = el.querySelector('.q-header-user-avatar');
    expect(avatar).not.toBeNull();
    expect(avatar.querySelector('.q-header-avatar-placeholder')).not.toBeNull();
    loggedInView.destroy();
  });

  it('should render image avatar when user has avatarUrl', () => {
    const loggedInVM = new HeaderViewModel({
      user: {
        username: 'camilam',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    });
    const loggedInView = new HeaderView(loggedInVM);
    const el = loggedInView.render();

    const img = el.querySelector('.q-header-avatar-img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
    loggedInView.destroy();
  });

  it('should reactively transition from login button to avatar when user logs in', () => {
    const el = view.render();
    expect(el.querySelector('.q-header-login-btn')).not.toBeNull();
    expect(el.querySelector('.q-header-user-avatar')).toBeNull();

    viewModel.setUser({ username: 'roberto' });
    expect(el.querySelector('.q-header-login-btn')).toBeNull();
    expect(el.querySelector('.q-header-user-avatar')).not.toBeNull();

    viewModel.setUser(null);
    expect(el.querySelector('.q-header-login-btn')).not.toBeNull();
    expect(el.querySelector('.q-header-user-avatar')).toBeNull();
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-header')).not.toBeNull();
  });
});
