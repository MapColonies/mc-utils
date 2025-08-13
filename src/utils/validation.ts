import z from 'zod';

export const featurePropertiesSchema = z
  .object(
    {
      id: z.uuid(),
    },
    { error: 'error(mc-utils): Feature must have an id' }
  )
  .loose();
