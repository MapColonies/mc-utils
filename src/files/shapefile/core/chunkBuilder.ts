import { Feature } from 'geojson';
import { ShapefileChunk } from '../types/index';
import { countVertices } from '../../../geo/vertices';

export class ChunkBuilder {
  private features: Feature[];
  private skippedFeatures: Feature[];
  private currentVerticesCount: number;

  public constructor(private readonly maxVertices: number, private chunkIndex: number = 0) {
    this.features = [];
    this.skippedFeatures = [];
    this.currentVerticesCount = 0;
  }

  public canAddFeature(feature: Feature): boolean {
    this.validateFeatureId(feature);

    const featureVertices = countVertices(feature.geometry);

    if (featureVertices > this.maxVertices) {
      this.skippedFeatures.push(feature);
      return false;
    }

    return this.currentVerticesCount + featureVertices <= this.maxVertices;
  }

  public addFeature(feature: Feature): void {
    this.validateFeatureId(feature);

    if (this.withinSkipped(feature)) {
      return;
    }
    this.features.push(feature);
    this.currentVerticesCount += countVertices(feature.geometry);
  }

  public build(): ShapefileChunk {
    return {
      id: this.chunkIndex,
      features: this.features,
      skippedFeatures: this.skippedFeatures,
      verticesCount: this.currentVerticesCount,
    };
  }

  public nextChunk(): void {
    this.features = [];
    this.skippedFeatures = [];
    this.currentVerticesCount = 0;
    this.chunkIndex++;
  }

  private withinSkipped(feature: Feature): boolean {
    return this.skippedFeatures.some((skipped) => skipped.id === feature.id);
  }

  private validateFeatureId(feature: Feature): void {
    if (feature.id === undefined) {
      throw new Error('Feature must have an id');
    }
  }
}
