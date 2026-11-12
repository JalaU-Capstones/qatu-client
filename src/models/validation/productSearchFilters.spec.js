import {
  SEARCH_MAX_LENGTH,
  createEmptyFilters,
  parsePrice,
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
