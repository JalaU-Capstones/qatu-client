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
}

export { createClient };
export default { createClient };
