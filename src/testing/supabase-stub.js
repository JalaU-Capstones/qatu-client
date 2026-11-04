<<<<<<< HEAD
/**
 * Test double for `@supabase/supabase-js`, wired via the importMap in
 * spec/support/jasmine-browser.json.
 */
function createClient(supabaseUrl, supabaseKey, options = {}) {
  const listeners = new Set();

  const auth = {
    supabaseUrl,
    supabaseKey,
    options,
    listeners,
    signOutCalls: [],

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

    signOut(options = {}) {
      this.signOutCalls.push(options);
      return Promise.resolve({ error: null });
    },

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
=======
const dummySubscription = { unsubscribe() {} };

function createClient(supabaseUrl, supabaseKey, options = {}) {
  return {
    supabaseUrl,
    supabaseKey,
    options,
    auth: {
      onAuthStateChange() {
        return { data: { subscription: dummySubscription } };
      },
      stopAutoRefresh() {},
      getSession() {
        return Promise.resolve({ data: { session: null }, error: null });
      },
      signInWithOAuth() {
        return Promise.resolve({ data: {}, error: null });
      },
    },
  };
>>>>>>> 8e72f6f (fix: corrected format)
}

export { createClient };
export default { createClient };
