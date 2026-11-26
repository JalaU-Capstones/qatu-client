import {
  createEmptyFilters,
  parsePrice,
  SEARCH_MAX_LENGTH,
  validateSearchFilters,
} from './productSearchFilters.js';

describe('productSearchFilters', () => {
  describe('createEmptyFilters', () => {
    it('should return filters with no search, category, or price', () => {
      expect(createEmptyFilters()).toEqual({
        search: '',
        category: '',
        minPrice: null,
        maxPrice: null,
      });
    });

    it('should return a new object on every call', () => {
      expect(createEmptyFilters()).not.toBe(createEmptyFilters());
    });
  });

  describe('parsePrice', () => {
    it('should return null for empty values', () => {
      expect(parsePrice('')).toBeNull();
      expect(parsePrice('   ')).toBeNull();
      expect(parsePrice(null)).toBeNull();
      expect(parsePrice(undefined)).toBeNull();
    });

    it('should convert numeric strings and keep numbers', () => {
      expect(parsePrice('100')).toBe(100);
      expect(parsePrice('99.5')).toBe(99.5);
      expect(parsePrice(0)).toBe(0);
    });

    it('should return NaN for text that is not a number', () => {
      expect(parsePrice('abc')).toBeNaN();
    });
  });

  describe('validateSearchFilters', () => {
    it('should trim the search term and category', () => {
      const { filters, error } = validateSearchFilters({ search: '  phone  ', category: ' tech ' });

      expect(error).toBe('');
      expect(filters.search).toBe('phone');
      expect(filters.category).toBe('tech');
    });

    it('should accept a valid price range from 100 to 500', () => {
      const { filters, error } = validateSearchFilters({ minPrice: '100', maxPrice: '500' });

      expect(error).toBe('');
      expect(filters.minPrice).toBe(100);
      expect(filters.maxPrice).toBe(500);
    });

    it('should accept equal minimum and maximum prices', () => {
      expect(validateSearchFilters({ minPrice: '50', maxPrice: '50' }).error).toBe('');
    });

    it('should accept only one side of the range', () => {
      expect(validateSearchFilters({ minPrice: '10' }).error).toBe('');
      expect(validateSearchFilters({ maxPrice: '10' }).error).toBe('');
    });

    it('should reject a maximum price lower than the minimum price', () => {
      const { error } = validateSearchFilters({ minPrice: '500', maxPrice: '100' });
      expect(error).toBe('El precio máximo debe ser mayor o igual al precio mínimo.');
    });

    it('should reject negative or non-numeric prices', () => {
      expect(validateSearchFilters({ minPrice: '-1' }).error).toContain('precio mínimo');
      expect(validateSearchFilters({ maxPrice: 'abc' }).error).toContain('precio máximo');
    });

    it('should reject a search longer than the API limit', () => {
      const { error } = validateSearchFilters({ search: 'a'.repeat(SEARCH_MAX_LENGTH + 1) });
      expect(error).toContain(String(SEARCH_MAX_LENGTH));
    });

    it('should accept a search exactly at the API limit', () => {
      expect(validateSearchFilters({ search: 'a'.repeat(SEARCH_MAX_LENGTH) }).error).toBe('');
    });

    it('should return empty filters when called without values', () => {
      expect(validateSearchFilters()).toEqual({ filters: createEmptyFilters(), error: '' });
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('productSearchFilters additional branches (recovered 1)', () => {
      describe('parsePrice (recovered 2)', () => {
        it('trims whitespace and keeps negative, exponential and hexadecimal values', () => {
          expect(parsePrice(' 42 ')).toBe(42);
          expect(parsePrice('-10')).toBe(-10);
          expect(parsePrice('1e3')).toBe(1000);
          expect(parsePrice('0x10')).toBe(16);
          expect(parsePrice('Infinity')).toBe(Infinity);
          expect(parsePrice(true)).toBeNaN();
          expect(parsePrice([])).toBeNull();
        });

        it('treats null, undefined and blank strings as null', () => {
          expect(parsePrice(null)).toBeNull();
          expect(parsePrice(undefined)).toBeNull();
          expect(parsePrice('   ')).toBeNull();
        });
      });

      describe('validateSearchFilters (recovered 3)', () => {
        it('normalizes non-string search and category values to empty strings', () => {
          const { filters, error } = validateSearchFilters({
            search: 123,
            category: null,
            minPrice: ' ',
            maxPrice: undefined,
          });

          expect(filters).toEqual(createEmptyFilters());
          expect(error).toBe('');
        });

        it('measures search length after trimming', () => {
          const padded = `${'a'.repeat(SEARCH_MAX_LENGTH)}   `;
          expect(validateSearchFilters({ search: padded }).error).toBe('');

          const overLimit = `${'a'.repeat(SEARCH_MAX_LENGTH + 1)}   `;
          expect(validateSearchFilters({ search: overLimit }).error).toBe(
            `La búsqueda puede tener como máximo ${SEARCH_MAX_LENGTH} caracteres.`
          );
        });

        it('rejects negative and non-finite prices for both bounds', () => {
          expect(validateSearchFilters({ minPrice: '-1' })).toEqual({
            filters: {
              search: '',
              category: '',
              minPrice: -1,
              maxPrice: null,
            },
            error: 'El precio mínimo debe ser un número mayor o igual a 0.',
          });
          expect(validateSearchFilters({ maxPrice: '-1' }).error).toBe(
            'El precio máximo debe ser un número mayor o igual a 0.'
          );
          expect(validateSearchFilters({ minPrice: 'Infinity' }).error).toBe(
            'El precio mínimo debe ser un número mayor o igual a 0.'
          );
          expect(validateSearchFilters({ maxPrice: '-Infinity' }).error).toBe(
            'El precio máximo debe ser un número mayor o igual a 0.'
          );
        });

        it('accepts -0 and a zero-width range', () => {
          expect(validateSearchFilters({ minPrice: '-0', maxPrice: 0 }).error).toBe('');
        });

        it('keeps the invalid filters in the result and respects error precedence', () => {
          const result = validateSearchFilters({
            search: 'x'.repeat(SEARCH_MAX_LENGTH + 1),
            minPrice: 'abc',
            maxPrice: '-1',
          });
          expect(result.error).toBe(
            `La búsqueda puede tener como máximo ${SEARCH_MAX_LENGTH} caracteres.`
          );
          expect(Number.isNaN(result.filters.minPrice)).toBe(true);
          expect(result.filters.maxPrice).toBe(-1);

          const minWins = validateSearchFilters({ minPrice: 'abc', maxPrice: '-1' });
          expect(minWins.error).toBe('El precio mínimo debe ser un número mayor o igual a 0.');

          const maxValidityWins = validateSearchFilters({ minPrice: 10, maxPrice: -2 });
          expect(maxValidityWins.error).toBe(
            'El precio máximo debe ser un número mayor o igual a 0.'
          );
        });

        it('does not impose a length limit on the category', () => {
          const category = 'c'.repeat(500);
          expect(validateSearchFilters({ category }).error).toBe('');
          expect(validateSearchFilters({ category }).filters.category).toBe(category);
        });
      });
    });
  })();
})();
