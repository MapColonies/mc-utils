import { Feature, FeatureCollection, intersect, MultiPolygon, Polygon } from '@turf/turf';
import _ from 'lodash';

/**
 * tuft intersect supported footprint types
 */
declare type Footprint = Polygon | MultiPolygon | Feature<Polygon | MultiPolygon>;

const featuresCustomizer = (objectValue: Feature[], otherValue: Feature[]): boolean => {
  // compare features
  // https://lodash.com/docs/4.17.15#find

  if (!_.isEqual(objectValue.length, otherValue.length)) {
    return false;
  }
  for (let i = 0; i < objectValue.length; i++) {
    const isFeatureContained = _.find(otherValue, objectValue[i]);
    if (isFeatureContained === undefined) {
      return false;
    }
  }
  for (let i = 0; i < otherValue.length; i++) {
    const isFeatureContained = _.find(objectValue, otherValue[i]);
    if (isFeatureContained === undefined) {
      return false;
    }
  }
  return true;
};

const featureCollectionCustomized = (objectValue: FeatureCollection, otherValue: FeatureCollection): boolean => {
  // compare type
  if (!_.isEqual(objectValue.type, otherValue.type)) {
    return false;
  }
  // compare features
  const isFeaturesEqual = _.isEqualWith(objectValue.features, otherValue.features, featuresCustomizer);
  return isFeaturesEqual;
};

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

/**
 * indicates if 2 object of type FeatureCollection are equal by validating properties and features array (order not important)
 * @param fc1 first featureCollection to compare equal
 * @param fc2 second featureCollection to compare equal
 * @returns true if same featureCollection, false if not
 */
const featureCollectionBooleanEqual = (fc1: FeatureCollection, fc2: FeatureCollection): boolean => {
  return _.isEqualWith(fc1, fc2, featureCollectionCustomized);
};

export { multiIntersect, featureCollectionBooleanEqual, Footprint };
