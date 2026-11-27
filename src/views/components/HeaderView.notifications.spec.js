import { HeaderViewModel } from '../../viewmodels/components/HeaderViewModel.js';
import { HeaderView } from './HeaderView.js';

describe('HeaderView notifications slot', () => {
  let view;
  let viewModel;
  let slot;

  const actions = () => view.element.querySelector('.q-header-actions');
  const childClasses = () => [...actions().children].map((child) => child.className);

  beforeEach(() => {
    viewModel = new HeaderViewModel();
    view = new HeaderView(viewModel);
    document.body.appendChild(view.render());
    slot = document.createElement('div');
    slot.className = 'q-notif';
  });

  afterEach(() => view.destroy());

  it('ignores the slot until the header is rendered', () => {
    const detached = new HeaderView(new HeaderViewModel());

    expect(() => detached.attachNotifications(slot)).not.toThrow();
    expect(slot.parentNode).toBeNull();
  });

  it('hides the bell for anonymous users and shows it after sign in', () => {
    view.attachNotifications(slot);
    expect(slot.hidden).toBeTrue();

    viewModel.setUser({ id: 'u-1', username: 'gabo' });
    expect(slot.hidden).toBeFalse();

    viewModel.setUser(null);
    expect(slot.hidden).toBeTrue();
  });

  it('sits right before the theme toggle, after the cart', () => {
    view.attachNotifications(slot);
    viewModel.setUser({ id: 'u-1', username: 'gabo' });

    const classes = childClasses();
    const bellIndex = classes.indexOf('q-notif');
    expect(classes[bellIndex - 1]).toContain('q-header-cart-btn');
    expect(classes[bellIndex + 1]).toContain('q-header-theme-btn');
  });

  it('keeps the cart before the bell when the cart is re-created', () => {
    view.attachNotifications(slot);
    viewModel.setUser({ id: 'u-1', username: 'gabo' });

    viewModel.setIsAdmin(true);
    expect(actions().querySelector('.q-header-cart-btn')).toBeNull();

    viewModel.setIsAdmin(false);
    const classes = childClasses();
    expect(classes.indexOf('q-header-cart-btn q-header-icon-btn') === -1).toBeTrue();
    expect(classes.findIndex((name) => name.includes('q-header-cart-btn'))).toBe(
      classes.indexOf('q-notif') - 1
    );
  });

  it('accepts removing the slot', () => {
    view.attachNotifications(null);

    expect(actions().querySelector('.q-notif')).toBeNull();
  });
});
