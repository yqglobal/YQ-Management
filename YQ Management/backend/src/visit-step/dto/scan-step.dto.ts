import { IsString, IsOptional } from 'class-validator';

export class ScanStepDto {
  @IsString()
  accessToken: string;  // Visit.accessToken (from QR code)

  @IsOptional() @IsString()
  targetStepId?: string;  // Specific step being scanned at (from scanner context)

  @IsOptional() @IsString()
  locationContext?: string;  // e.g. "gate-1", "pharmacy", "billing"
}
