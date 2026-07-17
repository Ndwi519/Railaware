/**
 * @module utils/deepFreeze
 * @responsibility Recursively freeze an object to ensure deep immutability.
 */

/**
 * Utility to deeply freeze an object.
 * @param {Object} object - The object to freeze
 * @returns {Object} The deeply frozen object
 */
export function deepFreeze(object) {
  const frozenSet = new WeakSet();

  function isPlainObjectOrArray(value) {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === Array.prototype || proto === null;
  }

  function freezeRecursive(obj) {
    if (obj && typeof obj === 'object') {
      if (frozenSet.has(obj)) {
        return obj;
      }
      frozenSet.add(obj);

      if (isPlainObjectOrArray(obj)) {
        const propNames = Object.getOwnPropertyNames(obj);
        for (const name of propNames) {
          freezeRecursive(obj[name]);
        }
      }
      Object.freeze(obj);
    }
    return obj;
  }

  return freezeRecursive(object);
}
