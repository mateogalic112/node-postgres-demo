import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "config/env";
import { LoggerService } from "interfaces/logger.interface";
import { FilesService, UploadPayload } from "interfaces/files.interface";
import { getMimeType } from "api/api.validations";

export class AWSService implements FilesService {
  private readonly s3Client: S3Client;

  constructor(private readonly logger: LoggerService) {
    this.s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  public async uploadFile({ file, key }: UploadPayload) {
    if (!file) {
      return null;
    }
    try {
      const uploadResult = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: getMimeType(file.originalname),
          ContentDisposition: "inline"
        })
      );

      if (uploadResult.$metadata.httpStatusCode !== 200) {
        throw new Error(
          `Failed to upload file to AWS S3: ${uploadResult.$metadata.httpStatusCode}`
        );
      }

      return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(String(error));
      return null;
    }
  }
}
