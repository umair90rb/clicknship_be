import { IsNotEmpty, IsString } from 'class-validator';

export class PostCommentDto {
  @IsString()
  @IsNotEmpty()
  comment: string;
}
