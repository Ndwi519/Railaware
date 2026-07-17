/**
 * @module application/utils/deepFreeze
 * @responsibility Recursively freeze plain objects and arrays to enforce immutability.
 *
 * Only plain objects and arrays are frozen. Functions, class instances (e.g. RequestCache,
 * Map, Set), and primitives are left untouched so mutable runtime objects are not broken.
 *
 * @param {*} value
 * @returns {*} The same value, deeply frozen if it is a plain object or array.
 */
function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  // Do not freeze class instances — only freeze plain objects and arrays.
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== Array.prototype) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }

  return value;
}

module.exports = { deepFreeze };
