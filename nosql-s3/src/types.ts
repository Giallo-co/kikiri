export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
}

export interface CreateResult {
  ETag?: string;
  VersionId?: string;
}

export interface UpdateResult {
  ETag?: string;
  VersionId?: string;
}

