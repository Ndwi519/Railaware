var _deepFreeze = require("../../utils/deepFreeze.js");
describe('deepFreeze', () => {
  it('freezes a flat object', () => {
    const obj = {
      a: 1
    };
    const frozen = (0, _deepFreeze.deepFreeze)(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
  });
  it('recursively freezes nested objects', () => {
    const obj = {
      a: 1,
      nested: {
        b: 2,
        deep: {
          c: 3
        }
      }
    };
    const frozen = (0, _deepFreeze.deepFreeze)(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.nested)).toBe(true);
    expect(Object.isFrozen(frozen.nested.deep)).toBe(true);
  });
  it('handles null values safely', () => {
    const obj = {
      a: null,
      b: undefined
    };
    const frozen = (0, _deepFreeze.deepFreeze)(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
  });
  it('does not crash on cyclic references and properly freezes the graph', () => {
    const child = {
      value: 1
    };
    const root = {
      child
    };
    root.self = root;
    child.parent = root;
    expect(() => (0, _deepFreeze.deepFreeze)(root)).not.toThrow();
    expect(Object.isFrozen(root)).toBe(true);
    expect(Object.isFrozen(child)).toBe(true);
    expect(root.self).toBe(root);
    expect(child.parent).toBe(root);
  });
  it('does not recursively traverse non-plain objects', () => {
    const date = new Date();
    const map = new Map();
    const obj = {
      date,
      map
    };
    (0, _deepFreeze.deepFreeze)(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(date)).toBe(true);
    expect(Object.isFrozen(map)).toBe(true);
  });
});