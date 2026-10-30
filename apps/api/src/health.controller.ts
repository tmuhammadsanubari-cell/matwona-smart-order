import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { success: true, data: { status: 'ok', service: 'api', time: new Date().toISOString() } };
  }
}
