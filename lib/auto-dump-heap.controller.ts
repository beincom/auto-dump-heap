import { Controller, Get } from '@nestjs/common';
import { AutoDumpHeapService } from './auto-dump-heap.service';

@Controller()
export default class AutoDumpHeapController {
  public constructor(private readonly autoDumpService: AutoDumpHeapService) {}

  @Get('/')
  public dump() {
    return this.autoDumpService.dump();
  }
}
