/**
 * Global API concurrency limiter — imported once as a side-effect in main.jsx
 * before React renders. Patches base44 entity CRUD methods with a semaphore
 * that caps concurrent HTTP calls to MAX_CONCURRENT.
 *
 * This is kept in a SEPARATE module from base44Client.js so that editing it
 * does NOT trigger Vite HMR re-evaluation of base44Client.js (which would
 * cascade to AuthContext.jsx and desync React Context providers).
 *
 * Only HTTP-making methods are gated. `subscribe` (WebSocket) and `schema`
 * (local) are exempt.
 */
import { base44 } from '@/api/base44Client';

const MAX_CONCURRENT = 3;
let activeCount = 0;
const waitQueue = [];

// High-priority calls (writes and by-id lookups made while saving) jump ahead of
// queued background list/filter loads so Save never waits behind page loading.
function acquireSlot(priority = false) {
  return new Promise((resolve) => {
    if (activeCount < MAX_CONCURRENT) {
      activeCount++;
      resolve();
    } else if (priority) {
      waitQueue.unshift(resolve);
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

function withConcurrency(fn, priority = false) {
  return async (...args) => {
    await acquireSlot(priority);
    try {
      return await fn(...args);
    } finally {
      releaseSlot();
    }
  };
}

const PRIORITY_METHODS = new Set(['get', 'create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'updateMany', 'deleteMany']);
const EXEMPT_METHODS = new Set(['subscribe', 'schema']);
const CRUD_METHODS = [
  'list', 'filter', 'get', 'create', 'update', 'delete',
  'bulkCreate', 'bulkUpdate', 'updateMany', 'deleteMany',
];

function patchEntities() {
  const entities = base44.entities;
  if (!entities || typeof entities !== 'object') return;

  Object.keys(entities).forEach((name) => {
    const entity = entities[name];
    if (!entity || typeof entity !== 'object') return;

    CRUD_METHODS.forEach((method) => {
      let original = entity[method];
      if (typeof original !== 'function') return;
      // Avoid double-patching if this module re-evaluates (HMR).
      if (original.__concurrencyWrapped) {
        original = original.__original;
      }
      const wrapped = withConcurrency(original.bind(entity), PRIORITY_METHODS.has(method));
      wrapped.__concurrencyWrapped = true;
      wrapped.__original = original;
      entity[method] = wrapped;
    });
  });
}

patchEntities();