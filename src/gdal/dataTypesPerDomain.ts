import { RecordType } from '@map-colonies/mc-model-types';
import { DataType } from '../models/enums/gdal';

export const DATA_TYPES_MAP: Map<Partial<RecordType>, DataType[]> = new Map([
  [RecordType.RECORD_DEM, [DataType.INT16, DataType.INT32, DataType.INT64, DataType.FLOAT32, DataType.FLOAT64]],
  [RecordType.RECORD_ALL, Object.values(DataType)],
]);

/**
 * Returns a list of data types lower in value than the provided type in order to prevent interpolations for gdal operations.
 * @param {DataType} currentType The current data type to build the list upon.
 * @param {RecordType} [domain = RecordType.RECORD_ALL] domain The requested domain for the original valid data types list.
 * @returns DataType[]
 */
export const getDataTypesNoInterpolation = (currentType: DataType, domain: RecordType = RecordType.RECORD_ALL): DataType[] => {
  const dataTypeForDomain = DATA_TYPES_MAP.get(domain) as DataType[];

  const currentTypeIdx = dataTypeForDomain.findIndex((type) => type === currentType);
  return dataTypeForDomain.slice(0, currentTypeIdx + 1);
};
