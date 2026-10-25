import { AuthViewModel } from '../../viewmodels/components/AuthViewModel.js';
import { AuthView } from '../components/AuthView.js';

/**
 * Auth page content view (login + register). Mounts INSIDE the persistent
 * <main class="q-main">. Owns an AuthViewModel and an AuthView; exposes
 * setMode() so the app shell can switch modes without remounting
 * (preserves the sliding animation between login and register).
 */
export class AuthPageView {
  /**
   * @param {Object} [options]
   * @param {'login'|'register'} [options.mode='register']
   * @param {Object} [options.authApi]
   * @param {Object} [options.authStore]
   * @param {Function} [options.onNavigate] Path-based navigation callback (e.g. router.navigate)
   * @param {Function} [options.onModeChange] Called with the new mode after a mode change
   */
  constructor({
    mode = 'register',
    authApi,
    authStore,
    onNavigate = () => {},
    onModeChange = () => {},
  } = {}) {
    this.viewModel = new AuthViewModel({
      initialMode: mode,
      authApi,
      authStore,
      onNavigate,
      onModeChange,
    });
    this.view = new AuthView(this.viewModel);
  }

  /** @returns {'login'|'register'} */
  get mode() {
    return this.viewModel.mode;
  }

  /** @param {'login'|'register'} mode */
  setMode(mode) {
    this.viewModel.setMode(mode);
  }

  /** @param {HTMLElement} container */
  mount(container) {
    this.view.mount(container);
  }

  destroy() {
    this.view.destroy();
  }
}
