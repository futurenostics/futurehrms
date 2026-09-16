import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import {
  expenseClaimCreateSchema,
  expenseClaimListQuerySchema,
  expenseClaimReturnSchema,
  expenseClaimUpdateSchema,
} from '@futurenostics/types';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { RequirePermission } from '../../core/auth/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../core/auth/types';
import { StorageService } from '../../core/storage/storage.service';
import { ExpenseClaimsService } from './expense-claims.service';

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

@Controller('expenses/claims')
export class ExpenseClaimsController {
  constructor(
    private readonly claims: ExpenseClaimsService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() rawQuery: Record<string, unknown>) {
    const query = parseOrBadRequest(expenseClaimListQuerySchema, rawQuery);
    return this.claims.list(user, query);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.claims.findOne(user, id);
  }

  @Post()
  @RequirePermission('expenses:submit_own')
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = parseOrBadRequest(expenseClaimCreateSchema, body);
    return this.claims.create(user, input);
  }

  @Patch(':id')
  @RequirePermission('expenses:submit_own')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parseOrBadRequest(expenseClaimUpdateSchema, body);
    return this.claims.update(user, id, input);
  }

  @Post(':id/submit')
  @RequirePermission('expenses:submit_own')
  @HttpCode(HttpStatus.OK)
  async submit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.claims.submit(user, id);
  }

  @Post(':id/return-for-correction')
  @RequirePermission('expenses:approve_claim')
  @HttpCode(HttpStatus.OK)
  async returnForCorrection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parseOrBadRequest(expenseClaimReturnSchema, body);
    return this.claims.returnForCorrection(user, id, input);
  }

  @Post(':id/documents')
  @RequirePermission('expenses:submit_own')
  @UseInterceptors(FileInterceptor('document', { limits: { fileSize: PHOTO_MAX_BYTES } }))
  async uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!PHOTO_ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type ${file.mimetype}. Use JPEG, PNG, WebP, or PDF.`,
      );
    }
    const ext = pickExtension(file.mimetype);
    const key = `expenses/${id}/documents/${randomUUID()}.${ext}`;
    await this.storage.putObject({
      bucket: 'documents',
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });
    try {
      return await this.claims.addDocument(user, id, {
        storageKey: key,
        fileName: file.originalname || `document.${ext}`,
      });
    } catch (err) {
      await this.storage.deleteObject({ bucket: 'documents', key }).catch(() => undefined);
      throw err;
    }
  }

  @Delete(':id/documents/:documentId')
  @RequirePermission('expenses:submit_own')
  async removeDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.claims.removeDocument(user, id, documentId);
  }
}

function parseOrBadRequest<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    const issues = (err as { issues?: Array<{ message?: string }> })?.issues;
    if (Array.isArray(issues) && issues.length > 0) {
      throw new BadRequestException(issues[0]?.message ?? 'Invalid input');
    }
    throw err;
  }
}

function pickExtension(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}
