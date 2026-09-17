import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  appBaseUrl
});

/**
 * Global API concurrency limiter.
 *
 * When the app mounts, many components fire entity queries simultaneously
 * (WorkspaceContext, NotificationBell, usePlan, useFinancialYear, page data).
 * This burst of 15+ concurrent requests triggers 429 rate-limit errors.
 *
 * This limiter caps concurrent base44 entity API calls to MAX_CONCURRENT,
 * queuing the rest. The burst is smoothed regardless of which page loads.
 *
 * Only entity CRUD methods are limited — `subscribe` (WebSocket) and
 * `schema` (local) are exempt since they don't hit the HTTP API.
 */
const MAX_CONCURRENT = 3;
let activeCount = 0;
const waitQueue = [];

function acquireSlot() {
  return new Promise((resolve) => {
    if (activeCount < MAX_CONCURRENT) {
      activeCount++;
      resolve();
    } else {
      waitQueue.push(resolve);
    }
  });
}

function releaseSlot() {
  activeCount--;
  if (waitQueue.length > 0) {
    activeCount++;
    const next = waitQueue.shift();
    next();
  }
}

function withConcurrency(fn) {
  return async (...args) => {
    await acquireSlot();
    try {
      return await fn(...args);
    } finally {
      releaseSlot();
    }
  };
}

// Methods that are synchronous or non-HTTP — don't gate them.
const EXEMPT_METHODS = new Set(['subscribe', 'schema']);

// Proxy each entity so its CRUD methods go through the concurrency limiter.
const entityProxyCache = new Map();

const limitedEntities = new Proxy(client.entities, {
  get(target, entityName) {
    if (entityProxyCache.has(entityName)) return entityProxyCache.get(entityName);
    const entity = target[entityName];
    if (!entity || typeof entity !== 'object') return entity;

    const wrappedEntity = new Proxy(entity, {
      get(et, methodName) {
        const fn = et[methodName];
        if (typeof fn !== 'function') return fn;
        if (EXEMPT_METHODS.has(methodName)) return fn.bind(et);
        return withConcurrency(fn.bind(et));
      },
    });

    entityProxyCache.set(entityName, wrappedEntity);
    return wrappedEntity;
  },
});

// Export base44 with concurrency-limited entities; everything else passes through.
export const base44 = new Proxy(client, {
  get(target, prop) {
    if (prop === 'entities') return limitedEntities;
    return target[prop];
  },
});