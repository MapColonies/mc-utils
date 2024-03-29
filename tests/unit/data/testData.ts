/* eslint-disable @typescript-eslint/no-magic-numbers */
import { FeatureCollection } from '@turf/helpers';
import { Feature, MultiPolygon, Polygon } from '@turf/turf';

export const feature1: Feature<Polygon | MultiPolygon> = {
  type: 'Feature',
  properties: {},
  geometry: {
    coordinates: [
      [
        [108.23021298738564, 52.09272928306041],
        [113.51557640000391, 63.529763133526615],
        [89.89497162493814, 55.343736045515755],
        [64.84938510265445, 59.67151334643026],
        [54.65598238553369, 51.79699229921323],
        [73.24391328373366, 55.232514659387306],
        [108.99519269978873, 47.1374091167618],
        [108.23021298738564, 52.09272928306041],
      ],
    ],
    type: 'Polygon',
  },
};

export const fc1: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625 },
      geometry: {
        coordinates: [
          [
            [35.78730760230002, 32.413527830383586],
            [34.028588462144086, 32.413527830383586],
            [34.028588462144086, 30.443274919529202],
            [35.78730760230002, 30.443274919529202],
            [35.78730760230002, 32.413527830383586],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625 },
      geometry: {
        coordinates: [
          [
            [-56.29877003377544, -20.989883416446176],
            [-67.17978485873638, -20.989883416446176],
            [-67.17978485873638, -34.94933042186917],
            [-56.29877003377544, -34.94933042186917],
            [-56.29877003377544, -20.989883416446176],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625 },
      geometry: {
        coordinates: [
          [
            [23.318359639503512, 39.18221646544751],
            [21.26353866141656, 39.18221646544751],
            [21.26353866141656, 36.607068419259576],
            [23.318359639503512, 36.607068419259576],
            [23.318359639503512, 39.18221646544751],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const fc2: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625 },
      geometry: {
        coordinates: [
          [
            [-56.29877003377544, -20.989883416446176],
            [-67.17978485873638, -20.989883416446176],
            [-67.17978485873638, -34.94933042186917],
            [-56.29877003377544, -34.94933042186917],
            [-56.29877003377544, -20.989883416446176],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625 },
      geometry: {
        coordinates: [
          [
            [35.78730760230002, 32.413527830383586],
            [34.028588462144086, 32.413527830383586],
            [34.028588462144086, 30.443274919529202],
            [35.78730760230002, 30.443274919529202],
            [35.78730760230002, 32.413527830383586],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625 },
      geometry: {
        coordinates: [
          [
            [23.318359639503512, 39.18221646544751],
            [21.26353866141656, 39.18221646544751],
            [21.26353866141656, 36.607068419259576],
            [23.318359639503512, 36.607068419259576],
            [23.318359639503512, 39.18221646544751],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const fcNoProperties: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        coordinates: [
          [
            [35.78730760230002, 32.413527830383586],
            [34.028588462144086, 32.413527830383586],
            [34.028588462144086, 30.443274919529202],
            [35.78730760230002, 30.443274919529202],
            [35.78730760230002, 32.413527830383586],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: {},
      geometry: {
        coordinates: [
          [
            [-56.29877003377544, -20.989883416446176],
            [-67.17978485873638, -20.989883416446176],
            [-67.17978485873638, -34.94933042186917],
            [-56.29877003377544, -34.94933042186917],
            [-56.29877003377544, -20.989883416446176],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: {},
      geometry: {
        coordinates: [
          [
            [23.318359639503512, 39.18221646544751],
            [21.26353866141656, 39.18221646544751],
            [21.26353866141656, 36.607068419259576],
            [23.318359639503512, 36.607068419259576],
            [23.318359639503512, 39.18221646544751],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const fc4: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [35.78730760230002, 32.413527830383586],
            [34.028588462144086, 32.413527830383586],
            [34.028588462144086, 30.443274919529202],
            [35.78730760230002, 30.443274919529202],
            [35.78730760230002, 32.413527830383586],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [-56.29877003377544, -20.989883416446176],
            [-67.17978485873638, -20.989883416446176],
            [-67.17978485873638, -34.94933042186917],
            [-56.29877003377544, -34.94933042186917],
            [-56.29877003377544, -20.989883416446176],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [23.318359639503512, 39.18221646544751],
            [21.26353866141656, 39.18221646544751],
            [21.26353866141656, 36.607068419259576],
            [23.318359639503512, 36.607068419259576],
            [23.318359639503512, 39.18221646544751],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const fc5: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        coordinates: [
          [
            [35.78730760230002, 32.413527830383586],
            [34.028588462144086, 32.413527830383586],
            [34.028588462144086, 30.443274919529202],
            [35.78730760230002, 30.443274919529202],
            [35.78730760230002, 32.413527830383586],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: {},
      geometry: {
        coordinates: [
          [
            [-56.29877003377544, -20.989883416446176],
            [-67.17978485873638, -20.989883416446176],
            [-67.17978485873638, -34.94933042186917],
            [-56.29877003377544, -34.94933042186917],
            [-56.29877003377544, -20.989883416446176],
          ],
        ],
        type: 'Polygon',
      },
    },
    {
      type: 'Feature',
      properties: {},
      geometry: {
        coordinates: [
          [
            [23.318359639503512, 39.18221646544751],
            [21.26353866141656, 39.18221646544751],
            [21.26353866141656, 36.607068419259576],
            [23.318359639503512, 36.607068419259576],
            [23.318359639503512, 39.18221646544751],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const fcFullWorld: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        coordinates: [
          [
            [-180, -90],
            [-180, 90],
            [180, 90],
            [180, -90],
            [-180, -90],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const fcComplexGeo: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { maxResolutionDeg: 0.02197265625, minResolutionDeg: 0.703125 },
      geometry: {
        coordinates: [
          [
            [108.23021298738564, 52.09272928306041],
            [113.51557640000391, 63.529763133526615],
            [89.89497162493814, 55.343736045515755],
            [64.84938510265445, 59.67151334643026],
            [54.65598238553369, 51.79699229921323],
            [73.24391328373366, 55.232514659387306],
            [108.99519269978873, 47.1374091167618],
            [108.23021298738564, 52.09272928306041],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};

export const fcComplexGeoNoMinMax: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        coordinates: [
          [
            [108.23021298738564, 52.09272928306041],
            [113.51557640000391, 63.529763133526615],
            [89.89497162493814, 55.343736045515755],
            [64.84938510265445, 59.67151334643026],
            [54.65598238553369, 51.79699229921323],
            [73.24391328373366, 55.232514659387306],
            [108.99519269978873, 47.1374091167618],
            [108.23021298738564, 52.09272928306041],
          ],
        ],
        type: 'Polygon',
      },
    },
  ],
};
