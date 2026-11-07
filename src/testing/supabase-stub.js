/**
 * Test double for `@supabase/supabase-js` used by the Jasmine browser suite
 * (wired via the importMap in spec/support/jasmine-browser.json).
 *
 * `auth.onAuthStateChange` registers real callbacks so specs can drive the
 * OAuth handoff with `client.auth._emitAuthEvent(event, session)`.
 */
function createClient(supabaseUrl, supabaseKey, options = {}) {
  const listeners = new Set();

  const auth = {
    supabaseUrl,
    supabaseKey,
    options,
    listeners,

    onAuthStateChange(callback) {
      listeners.add(callback);
      const subscription = {
        unsubscribe() {
          listeners.delete(callback);
        },
      };
      return { data: { subscription }, subscription };
    },

    stopAutoRefresh() {},

    getSession() {
      return Promise.resolve({ data: { session: null }, error: null });
    },

    signInWithOAuth() {
      return Promise.resolve({ data: {}, error: null });
    },

    /** Test helper: fire every registered onAuthStateChange callback. */
    _emitAuthEvent(event, session) {
      listeners.forEach((callback) => callback(event, session));
    },
  };

  return { supabaseUrl, supabaseKey, options, auth };
}

export { createClient };
export default { createClient };
