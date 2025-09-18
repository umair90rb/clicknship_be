import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { RequestWithUser } from 'src/types/auth';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/auth.dto';
import { RequestUser } from '@/src/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('me')
  @UseGuards(AuthenticationGuard)
  me(@RequestUser() user: RequestWithUser) {
    return this.authService.profile(user);
  }
}
