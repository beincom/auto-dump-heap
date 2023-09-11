import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { S3ClientConfig } from '@aws-sdk/client-s3/dist-types/S3Client';
import { ObjectCannedACL } from '@aws-sdk/client-s3/dist-types/models/models_0';

export enum MODE {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export type S3Options = {
  s3: {
    bucket: string;
    options: S3ClientConfig;
    putCommandOptions?: {
      env?:string;
      alc?: ObjectCannedACL;
    };
  };
};

export type AutoDumpOptions = {
  cronExpression: string;
};

export type ManualDumpOptions = {
  controllerPath: string;
};

type ModeOptions = MODE.AUTO | MODE.MANUAL;

export type DumpHeapModuleOptions<M extends ModeOptions> =  {
  AUTO: AutoDumpOptions;
  MANUAL: ManualDumpOptions;
}[M] & S3Options;

export type FactoryFn<M extends ModeOptions> = (...args: any[]) => Promise<DumpHeapModuleOptions<M>> |  DumpHeapModuleOptions<M>;

export type DumpHeapModuleAsyncOptions<M> = M extends  ModeOptions ?
    Pick<ModuleMetadata, 'imports'> & { mode: M } & {
  useFactory: FactoryFn<M>;
  inject?: any[];
  extraProviders?: Provider[];
}: never;

export type AutoDumpHeapModuleAsyncOptions= DumpHeapModuleAsyncOptions<ModeOptions>;

