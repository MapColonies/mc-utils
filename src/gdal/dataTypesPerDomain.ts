import { RecordType } from '@map-colonies/mc-model-types';
import { DataType } from '../models/enums/gdal';

export const ALL_DATA_TYPES = Object.values(DataType);
export const DEM_DATA_TYPES = [DataType.INT16, DataType.INT32, DataType.INT64, DataType.FLOAT32, DataType.FLOAT64];

export const getDataTypesNoInterpolation = (currentType: DataType, domain?: RecordType): DataType[] => {
  let validDataTypeForDomain: DataType[];
  switch (domain) {
    case RecordType.RECORD_DEM:
      validDataTypeForDomain = DEM_DATA_TYPES;
      break;
    default:
      validDataTypeForDomain = ALL_DATA_TYPES;
      break;
  }

  const currentTypeIdx = validDataTypeForDomain.findIndex((type) => type === currentType);
  return validDataTypeForDomain.slice(0, currentTypeIdx + 1);
};
