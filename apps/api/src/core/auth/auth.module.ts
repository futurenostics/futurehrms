import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokensService } from './tokens.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionGuard } from './guards/permission.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        // Default throttle — overridable per-route via @Throttle.
        ttl: 60 * 1000,
        limit: 60,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokensService, JwtAuthGuard, PermissionGuard],
  exports: [AuthService, PasswordService, TokensService, JwtAuthGuard, PermissionGuard],
})
export class AuthModule {}
