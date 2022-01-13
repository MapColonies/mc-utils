import { subGroupsGen } from '../../../src/arrays/subGroups';

describe('permutations', () => {
  describe('subGroupGen', () => {
    it('generates all sub groups', () => {
      const arr = [1, 2, 3];

      const permutations = subGroupsGen(arr, arr.length);

      expect(permutations.next().value).toEqual([1, 2, 3]);
      expect(permutations.next().value).toEqual([1, 2]);
      expect(permutations.next().value).toEqual([1, 3]);
      expect(permutations.next().value).toEqual([2, 3]);
      expect(permutations.next().value).toEqual([1]);
      expect(permutations.next().value).toEqual([2]);
      expect(permutations.next().value).toEqual([3]);
      expect(permutations.next().done).toBe(true);
    });

    it('generates max length sub groups', () => {
      const arr = [1, 2, 3];

      const permutations = subGroupsGen(arr, 2, true);

      expect(permutations.next().value).toEqual([1, 2]);
      expect(permutations.next().value).toEqual([1, 3]);
      expect(permutations.next().value).toEqual([2, 3]);
      expect(permutations.next().done).toBe(true);
    });
  });
});
