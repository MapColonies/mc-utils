/**
 * split group into unique sub groups ordered by size from largest to smallest
 * @param group input group
 * @param maxLength length of the largest sub group return. must be <= group.length
 * @param includeOnlyMaxLength indicates if function will return only sub groups in the specified "maxLength" or smaller groups as well. default: false
 */
function* subGroupsGen<T>(group: T[], maxLength: number, includeOnlyMaxLength = false): Generator<T[]> {
  if (maxLength === 0) {
    yield [];
  } else {
    if (group.length === maxLength) {
      yield group;
    } else {
      const lengthDif = group.length - maxLength;
      for (let i = 0; i <= lengthDif; i++) {
        const subLayers = group.slice(i + 1);
        const subPermutations = subGroupsGen(subLayers, maxLength - 1);
        for (const subPermutation of subPermutations) {
          yield [group[i], ...subPermutation];
        }
      }
    }
    if (maxLength > 1 && !includeOnlyMaxLength) {
      yield* subGroupsGen(group, maxLength - 1);
    }
  }
}

export { subGroupsGen };
