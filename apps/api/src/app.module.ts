import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { RequestContextModule } from './core/request-context/request-context.module';
import { RequestContextInterceptor } from './core/request-context/request-context.interceptor';
import { RegistryModule } from './core/registry/registry.module';
import { EventsModule } from './core/events/events.module';
import { AuditModule } from './core/audit/audit.module';
import { RbacModule } from './core/rbac/rbac.module';
import { SchedulerModule } from './core/scheduler/scheduler.module';
import { EmailModule } from './core/email/email.module';
import { StorageModule } from './core/storage/storage.module';
import { AuthModule } from './core/auth/auth.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    AppConfigModule,
    RequestContextModule,
    RegistryModule,
    EventsModule,
    RbacModule,
    AuditModule,
    SchedulerModule,
    EmailModule,
    StorageModule,
    AuthModule,
    // Domain modules slot in below as they land in subsequent phases.
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
})
export class AppModule {}
