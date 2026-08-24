import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
