import { S3 } from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import {createReadStream,statSync} from 'node:fs';
import { S3Options } from './interfaces/auto-dump-heap.module.interfaces';
import { PutObjectCommandInput } from '@aws-sdk/client-s3/dist-types/commands/PutObjectCommand';

export class S3Service {
  private readonly s3Client: S3;
  private readonly logger = new Logger(S3Service.name);

  public constructor(private readonly config: S3Options) {
    this.s3Client = new S3(this.config.s3.options);
  }

  public async upload(fullPath: string, key: string) {
    try {
      const fileContent = createReadStream(fullPath);
      const stat = statSync(fullPath);

      const command: PutObjectCommandInput = {
        Bucket: this.config.s3.bucket,
        Body: fileContent,
        Key: `heapdump/${key}`,
        ContentLength: stat.size,
      };

      if (this.config.s3.putCommandOptions?.env) {
        command.Key = `${this.config.s3.putCommandOptions.env}/${command.Key}`;
      }

      if (this.config.s3.putCommandOptions?.alc) {
        command.ACL = this.config.s3.putCommandOptions.alc;
      }

      await this.s3Client.putObject(command);

      fileContent.close();
      this.logger.log(`File ${key} upload success`);

      return {
        url: `https://${this.config.s3.bucket}.s3-${this.config.s3.options.region}.amazonaws.com/${command.Key}`
      }

    } catch (ex) {
      this.logger.warn(`File ${key} upload fail`);
      this.logger.error(ex);
    }
  }
}
