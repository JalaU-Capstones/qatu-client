import { AuthPageView } from './AuthPageView.js';

describe('AuthPageView', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should default mode to "register" when constructed without arguments', () => {
    const view = new AuthPageView();
    expect(view.mode).toBe('register');
    view.destroy();
  });

  it('should use the provided mode option', () => {
    const view = new AuthPageView({ mode: 'login' });
    expect(view.mode).toBe('login');
    view.destroy();
  });

  it('should expose mode getter that reflects the underlying viewModel mode', () => {
    const view = new AuthPageView({ mode: 'register' });
    expect(view.mode).toBe(view.viewModel.mode);
    view.destroy();
  });

  it('should delegate setMode to the viewModel', () => {
    const view = new AuthPageView({ mode: 'register' });
    const spy = spyOn(view.viewModel, 'setMode').and.callThrough();
    view.setMode('login');
    expect(spy).toHaveBeenCalledWith('login');
    view.destroy();
  });

  it('should update mode after setMode is called', () => {
    const view = new AuthPageView({ mode: 'register' });
    view.setMode('login');
    expect(view.mode).toBe('login');
    view.destroy();
  });

  it('should mount auth content into the container', () => {
    const view = new AuthPageView({ mode: 'login' });
    view.mount(container);

    // AuthView renders an auth panel — verify something was appended
    expect(container.children.length).toBeGreaterThan(0);

    // No shell elements should be created by the page view
    expect(container.querySelector('header, .q-header')).toBeNull();
    expect(container.querySelector('footer, .q-footer')).toBeNull();
    expect(container.querySelector('main')).toBeNull();

    view.destroy();
  });

  it('should delegate mount to the internal AuthView', () => {
    const view = new AuthPageView({ mode: 'login' });
    const spy = spyOn(view.view, 'mount').and.callThrough();
    view.mount(container);
    expect(spy).toHaveBeenCalledWith(container);
    view.destroy();
  });

  it('should delegate destroy to the internal AuthView', () => {
    const view = new AuthPageView({ mode: 'login' });
    view.mount(container);
    const spy = spyOn(view.view, 'destroy').and.callThrough();
    view.destroy();
    expect(spy).toHaveBeenCalled();
  });

  it('should remove auth content from DOM after destroy()', () => {
    const view = new AuthPageView({ mode: 'login' });
    view.mount(container);
    expect(container.children.length).toBeGreaterThan(0);
    view.destroy();
    expect(container.children.length).toBe(0);
  });
});
