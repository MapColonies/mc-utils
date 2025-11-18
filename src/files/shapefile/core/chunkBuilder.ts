import { Feature } from 'geojson';
import { ShapefileChunk } from '../types/index';
import { countVertices } from '../../../geo/vertices';
import { featurePropertiesSchema } from '../../../utils/validation';

export class ChunkBuilder {
  private features: Feature[];
  private skippedFeatures: Feature[];
  private currentVerticesCount: number;

  public constructor(private readonly maxVertices: number, private chunkIndex: number = 0) {
    this.features = [];
    this.skippedFeatures = [];
    this.currentVerticesCount = 0;
  }

  public get chunkId(): number {
    return this.chunkIndex;
  }

  public canAddFeature(feature: Feature): boolean {
    this.validateFeatureId(feature);

    const featureVertices = countVertices(feature.geometry);

    if (featureVertices > this.maxVertices) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const featureWithVertices: Feature = { ...feature, properties: { ...feature.properties, e_vertices: featureVertices } };
      this.skippedFeatures.push(featureWithVertices);
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
    const featureId = featurePropertiesSchema.safeParse(feature.properties).data?.id;
    return this.skippedFeatures.some((skipped) => {
      const skippedId = featurePropertiesSchema.safeParse(skipped.properties).data?.id;
      return skippedId === featureId;
    });
  }

  private validateFeatureId(feature: Feature): void {
    const parsed = featurePropertiesSchema.safeParse(feature.properties);
    if (!parsed.success) {
      throw new Error('Feature must have an id');
    }
  }
}
