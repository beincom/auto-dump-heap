import { CronJob } from 'cron';
import {writeSnapshot} from 'heapdump';
import { S3Service } from './s3.service';
import { AUTO_DUMP_HEAP_JOB } from './constants';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, mkdirSync,unlinkSync } from 'node:fs';
import {DumpHeapModuleOptions, MODE} from './interfaces/auto-dump-heap.module.interfaces';

export class AutoDumpHeapService implements OnModuleInit {
  private readonly logger = new Logger(AutoDumpHeapService.name);

  public constructor(
    private readonly s3Service: S3Service,
    private readonly config: DumpHeapModuleOptions<any>,
    private readonly schedulerRegistry?: SchedulerRegistry,
  ) {}

  public async dump() {
    process.umask(0);

    const dumpFile = (): Promise<{
      filename: string;
      path: string;
    }> =>
      new Promise((resolve, reject) => {
        const filename = Date.now() + '.heapsnapshot';
        const folderPath = `${process.cwd()}/heapdump`;
        const path = `${folderPath}/${filename}`;

        if (!existsSync(folderPath)) {
          mkdirSync(folderPath, { mode: '777' });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        writeSnapshot(path, (err, _) => {
          if (err) {
            reject(err);
          }
          resolve({
            filename: filename,
            path: path,
          });
        });
      });
    const fileInfo = await dumpFile();
    const result = await this.s3Service.upload(fileInfo.path, fileInfo.filename);
     unlinkSync(fileInfo.path);
    return { ...fileInfo, ...result };
  }

  private createJob(jobName: string, time: string) {
    if (this.schedulerRegistry) {
      const job = new CronJob(`${time}`, () => {
        this.dump().catch((ex) => this.logger.error(ex));
      });
      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();
    }
  }

  public onModuleInit() {
    if (this.schedulerRegistry) {
      const config = this.config as unknown as DumpHeapModuleOptions<MODE.AUTO>;
      this.createJob(AUTO_DUMP_HEAP_JOB, config.cronExpression);
    }
  }
}
