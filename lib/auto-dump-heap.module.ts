import { S3Service } from './s3.service';
import {
  MODE,
  DumpHeapModuleOptions,
  AutoDumpHeapModuleAsyncOptions,
} from './interfaces/auto-dump-heap.module.interfaces';
import { PATH_METADATA } from '@nestjs/common/constants';
import { AutoDumpHeapService } from './auto-dump-heap.service';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AUTO_DUMP_HEAP_MODULE_CONFIG_TOKEN } from './constants';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';

@Module({})
export class AutoDumpHeapModule {
  public static forRootAsync(options: AutoDumpHeapModuleAsyncOptions): DynamicModule {
    const controllers = [];
    if (options.mode === MODE.MANUAL) {
      controllers.push(require('./auto-dump-heap.controller').default);
    }
    const providers: Provider[] = [
      ...(options.extraProviders || []),
      this.createAsyncProviders(options),
      {
        provide: S3Service,
        useFactory: async (opts:  DumpHeapModuleOptions<any>) => {
          return new S3Service(opts);
        },
        inject: [AUTO_DUMP_HEAP_MODULE_CONFIG_TOKEN],
      },
      {
        provide: AutoDumpHeapService,
        useFactory: async (
           opts: DumpHeapModuleOptions<any>,
          s3Service: S3Service,
          schedulerRegistry: SchedulerRegistry,
        ) => {
          if (options.mode === MODE.AUTO) {
            return new AutoDumpHeapService(s3Service, opts, schedulerRegistry);
          }
          if (options.mode === MODE.MANUAL) {
            opts = opts as DumpHeapModuleOptions<MODE.MANUAL>;
            Reflect.defineMetadata(PATH_METADATA, opts.controllerPath, controllers[0]);
            return new AutoDumpHeapService(s3Service, opts);
          }
        },
        inject: [AUTO_DUMP_HEAP_MODULE_CONFIG_TOKEN, S3Service, SchedulerRegistry],
      },
    ];

    return {
      providers: providers,
      exports: providers,
      module: AutoDumpHeapModule,
      controllers: controllers,
      imports: [...options.imports, ScheduleModule.forRoot()],
    };
  }

  private static createAsyncProviders(options: AutoDumpHeapModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return this.createAsyncOptionsProvider(options);
    }
  }

  private static createAsyncOptionsProvider(options: AutoDumpHeapModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: AUTO_DUMP_HEAP_MODULE_CONFIG_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
  }
}
