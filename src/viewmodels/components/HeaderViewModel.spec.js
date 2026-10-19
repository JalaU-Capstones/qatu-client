import { HeaderViewModel } from './HeaderViewModel.js';

describe('HeaderViewModel', () => {
  let viewModel;

  beforeEach(() => {
    viewModel = new HeaderViewModel();
  });

  it("should initialize with default brand name Q'atu", () => {
    expect(viewModel.logoText).toBe("Q'atu");
    expect(viewModel.logoHref).toBe('/');
  });

  it('should initialize with default login text and cart count of 0', () => {
    expect(viewModel.loginText).toBe('Iniciar sesión');
    expect(viewModel.cartCount).toBe(0);
  });

  it('should update cart count and notify subscribers', () => {
    let updatedCount = null;
    viewModel.subscribe((vm) => {
      updatedCount = vm.cartCount;
    });

    viewModel.setCartCount(3);
    expect(viewModel.cartCount).toBe(3);
    expect(updatedCount).toBe(3);
  });

  it('should trigger login callback when provided', () => {
    let loginTriggered = false;
    const customVM = new HeaderViewModel({
      onLoginClick: () => {
        loginTriggered = true;
      },
    });

    customVM.triggerLogin();
    expect(loginTriggered).toBe(true);
  });

  it('should trigger cart callback when provided', () => {
    let cartTriggered = false;
    const customVM = new HeaderViewModel({
      onCartClick: () => {
        cartTriggered = true;
      },
    });

    customVM.triggerCart();
    expect(cartTriggered).toBe(true);
  });
});
