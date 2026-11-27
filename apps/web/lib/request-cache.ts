import * as React from 'react';

/**
 * Once-per-request memo for server code (owner 27/11/26: taps had become slow
 * because the same sign-in check ran several times per page).
 * Next renders server components with its own React build, which has `cache`
 * (scoped to one request). The React 18 type definitions do not list it, so it
 * is read here with a safe fallback: without it, functions simply run as before.
 */
type AnyFn = (...args: never[]) => unknown;
const reactCache = (React as unknown as { cache?: <F extends AnyFn>(fn: F) => F }).cache;

export function perRequest<F extends AnyFn>(fn: F): F {
  return typeof reactCache === 'function' ? reactCache(fn) : fn;
}
