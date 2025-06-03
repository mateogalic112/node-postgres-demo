import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "config/env";
import { LoggerService } from "./logger.service";
import { FilesService } from "api/api.files";

export class AWSService implements FilesService {
  private static instance: AWSService;
  private readonly s3Client: S3Client;

  private constructor() {
    this.s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  public static getInstance(): AWSService {
    if (!AWSService.instance) {
      AWSService.instance = new AWSService();
    }
    return AWSService.instance;
  }

  public async uploadFile(file: Express.Multer.File, key: string) {
    try {
      const uploadResult = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype
        })
      );

      if (uploadResult.$metadata.httpStatusCode !== 200) {
        throw new Error(
          `Failed to upload file to AWS S3: ${uploadResult.$metadata.httpStatusCode}`
        );
      }

      return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      LoggerService.getInstance().error(String(error));
      return null;
    }
  }
}
