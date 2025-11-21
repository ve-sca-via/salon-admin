/**
 * Cache Debug Helper
 * Paste this into your browser console to inspect RTK Query cache state
 */

// Helper: Get cache state
window.getCacheState = () => {
  const state = window.store?.getState();
  if (!state) {
    console.error('Store not found. Make sure you expose it: window.store = store');
    return;
  }
  
  const apis = Object.keys(state).filter(k => k.includes('Api'));
  
  console.group('📦 RTK Query Cache State');
  apis.forEach(apiName => {
    const apiState = state[apiName];
    const queries = apiState?.queries || {};
    const mutations = apiState?.mutations || {};
    
    console.group(`🔵 ${apiName}`);
    console.log('Queries:', Object.keys(queries).length);
    console.log('Mutations:', Object.keys(mutations).length);
    
    Object.entries(queries).forEach(([key, value]) => {
      const age = Date.now() - (value.fulfilledTimeStamp || 0);
      const ageSeconds = Math.floor(age / 1000);
      console.log(`  ✓ ${key}`, {
        status: value.status,
        age: `${ageSeconds}s`,
        endpointName: value.endpointName,
        hasData: !!value.data
      });
    });
    console.groupEnd();
  });
  console.groupEnd();
};

// Helper: Clear specific API cache
window.clearCache = (apiName) => {
  console.log(`🗑️ Clearing ${apiName} cache...`);
  // You'll need to implement this based on your API structure
};

// Helper: Monitor API calls
window.monitorAPICalls = () => {
  let callCount = 0;
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    callCount++;
    const url = args[0];
    console.log(`📡 API Call #${callCount}:`, url);
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ API monitoring enabled. Check console for all API calls.');
};

// Helper: Check prefetch status
window.checkPrefetch = () => {
  console.log('Hover over navigation links and watch for API calls in Network tab');
  console.log('Expected: API call triggers BEFORE clicking the link');
};

console.log('🛠️ Cache Debug Helpers Loaded!');
console.log('Available commands:');
console.log('  - getCacheState() - View all cached data');
console.log('  - monitorAPICalls() - Track all API calls');
console.log('  - checkPrefetch() - Test prefetch behavior');
