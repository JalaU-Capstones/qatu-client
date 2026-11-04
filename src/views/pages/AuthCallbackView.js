import { AuthApi } from '../../models/api/AuthApi.js';
import { supabase } from '../../models/api/client.js';
import { authStore } from '../../store/authStore.js';

export class AuthCallbackView {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'q-auth-callback q-glass-panel';
    this.element.style.padding = '10px';
    this.element.style.textAlign = 'center';
    this.element.innerHTML = '<h3>Verificando inicio de sesión...</h3><p>Por favor, espera.</p>';
    this.authApi = new AuthApi();
  }

  render() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          const { data } = await this.authApi.exchangeOAuthToken(
            session.access_token,
            session.refresh_token
          );

          authStore.setSession({
            user: data.user,
            profile: data.profile,
            roles: data.roles,
          });

          supabase.auth.stopAutoRefresh();

          // Handoff complete. The backend now owns the session (HttpOnly
          // cookies), so discard the browser-side Supabase session WITHOUT
          // calling signOut() — that endpoint would revoke the very session
          // the backend cookie holds.
          Object.keys(window.localStorage)
            .filter((key) => key.startsWith('sb-'))
            .forEach((key) => window.localStorage.removeItem(key));

          window.location.replace('/');
        } catch (error) {
          console.error('Error en handoff OAuth', error);
          window.location.replace('/login?error=oauth_failed');
        }
      }
    });

    return this.element;
  }
}
