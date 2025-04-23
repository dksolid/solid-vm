import { expect } from 'chai';

import { fnAny } from '../src/index.js';

describe('Sample test', () => {
  test('function does not throw errors', () => {
    expect(() => fnAny()).to.not.throw();
    expect(fnAny()).to.eq('test 111');
  });
});
