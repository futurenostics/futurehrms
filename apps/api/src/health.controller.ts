import { Controller, Get } from '@nestjs/common';
import { Public } from './core/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
