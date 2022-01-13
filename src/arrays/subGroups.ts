function* subGroupsGen<T>(layers: T[], maxLength: number, includeOnlyMaxLength = false): Generator<T[]> {
  if (maxLength === 0) {
    yield [];
  } else {
    if (layers.length === maxLength) {
      yield layers;
    } else {
      const lengthDif = layers.length - maxLength;
      for (let i = 0; i <= lengthDif; i++) {
        const subLayers = layers.slice(i + 1);
        const subPermutations = subGroupsGen(subLayers, maxLength - 1);
        for (const subPermutation of subPermutations) {
          yield [layers[i], ...subPermutation];
        }
      }
    }
    if (maxLength > 1 && !includeOnlyMaxLength) {
      yield* subGroupsGen(layers, maxLength - 1);
    }
  }
}

export { subGroupsGen };
