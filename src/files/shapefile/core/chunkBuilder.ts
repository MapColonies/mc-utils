import { Feature } from 'geojson';
import { ShapefileChunk } from '../types/index';
import { countVertices } from '../../../geo/vertices';

export class ChunkBuilder {
  private features: Feature[];
  private skippedFeatures: Feature[];
  private currentVerticesCount: number;
  private chunkIndex: number;

  public constructor(chunkIndex = 0) {
    this.chunkIndex = chunkIndex;
    this.features = [];
    this.skippedFeatures = [];
    this.currentVerticesCount = 0;
  }

  public canAddFeature(feature: Feature, maxVertices: number): boolean {
    const featureVertices = countVertices(feature.geometry);

    if (featureVertices > maxVertices) {
      this.skippedFeatures.push(feature);
      return false;
    }

    return this.currentVerticesCount + featureVertices <= maxVertices;
  }

  public addFeature(feature: Feature): void {
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
}
