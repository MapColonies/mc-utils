import z from 'zod';

export const featurePropertiesSchema = z
  .object(
    {
      id: z.string().uuid(),
    },
    { message: 'error(mc-utils): Feature must have an id' }
  )
  .passthrough();
