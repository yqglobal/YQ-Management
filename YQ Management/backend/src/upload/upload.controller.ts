import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  // A generic endpoint to accept files, typically insurance cards or IDs in healthcare
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB limit
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf)' }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // In a production system, this would upload to S3 with SSE-KMS encryption.
    // For this boilerplate, we'll store in a local .tmp folder with a generated ID.
    const uploadDir = path.join(process.cwd(), '.tmp', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileId = randomUUID();
    const ext = path.extname(file.originalname);
    const fileName = `${fileId}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Simulate basic file encryption at rest (or just write it)
    fs.writeFileSync(filePath, file.buffer);

    return {
      success: true,
      fileId,
      url: `/upload/${fileId}`, // Secure URL to access later
      message: 'File securely uploaded and stored.',
    };
  }
}
