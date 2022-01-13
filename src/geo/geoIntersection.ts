import { Feature, intersect, MultiPolygon, Polygon } from '@turf/turf';

/**
 * tuft intersect supported footprint types
 */
declare type Footprint = Polygon | MultiPolygon | Feature<Polygon | MultiPolygon>;

/**
 * return the intersection footprint of all specified footprints or null when there is no intersection
 * @param footprints footprint list to intersect
 * @returns intersection footprint or null
 */
const multiIntersect = (footprints: Footprint[]): Footprint | null => {
  if (footprints.length === 0) {
    return null;
  } else if (footprints.length === 1) {
    return footprints[0];
  }
  let intersection = footprints[0];
  for (let i = 1; i < footprints.length; i++) {
    const curIntersection = intersect(intersection, footprints[i]);
    if (curIntersection === null) {
      return null;
    }
    intersection = curIntersection;
  }
  return intersection;
};

export { multiIntersect, Footprint };
