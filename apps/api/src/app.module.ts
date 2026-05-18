import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
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
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { PermissionGuard } from './core/auth/guards/permission.guard';
import { TimelineModule } from './core/timeline/timeline.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
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
    TimelineModule,
    // Domain modules
    EmployeesModule,
    ProjectsModule,
    CommissionsModule,
    NotificationsModule,
    RemindersModule,
    ApprovalsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
