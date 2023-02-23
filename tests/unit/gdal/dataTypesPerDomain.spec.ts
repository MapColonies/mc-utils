import { RecordType } from '@map-colonies/mc-model-types';
import { DataType, getDataTypesNoInterpolation } from '../../../src';

describe('gdal utils', () => {
  describe('dataTypesPerDomain', () => {
    it('Should return lower res data types for domain', () => {
      const dataTypeList = getDataTypesNoInterpolation(DataType.INT64, RecordType.RECORD_DEM);
      expect(dataTypeList).toEqual([DataType.INT16, DataType.INT32, DataType.INT64]);
    });

    it('Should return lower res data types when domain not specified', () => {
      const dataTypeList = getDataTypesNoInterpolation(DataType.INT64);
      expect(dataTypeList).toEqual([
        DataType.BYTE,
        DataType.INT8,
        DataType.UINT16,
        DataType.INT16,
        DataType.UINT32,
        DataType.INT32,
        DataType.UINT64,
        DataType.INT64,
      ]);
    });
  });
});
