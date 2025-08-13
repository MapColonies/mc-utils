import z from 'zod';

export const featurePropertiesSchema = z
  .object(
    {
      id: z.string().or(z.number()).describe('Feature ID'),
    },
    { message: 'error(ShapeFileReader): Feature must have an id' }
  )
  .passthrough();
