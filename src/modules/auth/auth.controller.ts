import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { RequestWithUser } from 'src/types/auth';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('me')
  @UseGuards(AuthenticationGuard)
  me(@Req() req: RequestWithUser) {
    return this.authService.profile(req.user);
  }
}
