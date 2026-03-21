import { S3Client } from '@aws-sdk/client-s3';

import config from './index';

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  endpoint: config.aws.endpoint || undefined,
  forcePathStyle: !!config.aws.endpoint, // Required for MinIO and S3-compatible services
});

export default s3Client;
