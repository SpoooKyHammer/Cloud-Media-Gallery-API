import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import s3Client from '../config/s3';
import config from '../config/index';

interface UploadFileParams {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder?: string;
}

interface UploadResponse {
  key: string;
  url: string;
}

class S3Service {
  private bucket: string;

  constructor() {
    this.bucket = config.aws.s3Bucket;
  }

  async uploadFile({ buffer, filename, mimeType, folder = 'uploads' }: UploadFileParams): Promise<UploadResponse> {
    const ext = filename.split('.').pop() || '';
    const uniqueFilename = `${uuidv4()}${ext ? '.' + ext : ''}`;
    const key = `${folder}/${uniqueFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    const url = `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

    return { key, url };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await s3Client.send(command);
  }

  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  }
}

export default new S3Service();
