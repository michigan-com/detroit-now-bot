'use strict';

/**
 * Use this to wrap a route that uses async/await.
 * It helps catch any rejected promises.
 */
export default function CatchRoute(fn) {
  return function route(req, res, next) {
    fn(req, res, next).catch(next);
  };
}
