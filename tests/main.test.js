import { describe, it, expect } from 'vitest';

// Importing this module should not throw, even in a jsdom test environment.
import * as mainModule from '../main.js';

describe('main module', () => {
  it('exports saveCustomer and loadCustomers as functions', () => {
    expect(typeof mainModule.saveCustomer).toBe('function');
    expect(typeof mainModule.loadCustomers).toBe('function');
  });
});
