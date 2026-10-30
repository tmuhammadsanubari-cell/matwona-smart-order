import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/auth.decorators.js';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { success: true, data: { status: 'ok', service: 'api', time: new Date().toISOString() } };
  }
}
