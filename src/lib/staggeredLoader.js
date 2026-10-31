/**
 * Staggered batch loader — runs async tasks in small waves with a delay
 * between waves to avoid triggering 429 rate limits when a page needs to
 * fetch many entities on mount.
 *
 * Returns results in the same shape as Promise.allSettled so it's a
 * drop-in replacement.
 */

const DEFAULT_WAVE_SIZE = 2;
const DEFAULT_WAVE_DELAY_MS = 150;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run an array of async tasks in staggered waves.
 *
 * @param {Array<() => Promise>} tasks - each task is a zero-arg async function
 * @param {{ waveSize?: number, waveDelay?: number }} opts
 * @returns {Promise<Array<{status: 'fulfilled'|'rejected', value?: any, reason?: any}>>}
 */
export async function staggeredAllSettled(tasks, opts = {}) {
  const waveSize = opts.waveSize || DEFAULT_WAVE_SIZE;
  const waveDelay = opts.waveDelay ?? DEFAULT_WAVE_DELAY_MS;
  const results = [];
  for (let i = 0; i < tasks.length; i += waveSize) {
    if (i > 0 && waveDelay > 0) await sleep(waveDelay);
    const wave = tasks.slice(i, i + waveSize);
    const settled = await Promise.allSettled(wave.map((fn) => fn()));
    results.push(...settled);
  }
  return results;
}