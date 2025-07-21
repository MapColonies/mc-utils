import { Feature } from 'geojson';
import { ShapefileChunk } from '../types/index';
import { countVertices } from '../utils/geometry';

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

    // Check if the feature exceeds the maximum vertices limit
    if (featureVertices > maxVertices) {
      this.skippedFeatures.push(feature);
      return false;
    }

    return this.currentVerticesCount + featureVertices <= maxVertices;
  }

  public addFeature(feature: Feature): void {
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

  public isEmpty(): boolean {
    return this.features.length === 0;
  }

  public nextChunk(): void {
    this.features = [];
    this.skippedFeatures = [];
    this.currentVerticesCount = 0;
    this.chunkIndex++;
  }
}
