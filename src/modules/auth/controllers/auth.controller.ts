import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { IRequestWithUser } from 'src/types/auth';
import { AuthService } from '../services/auth.service';
import { LoginDto, RefreshDto } from '../dtos/auth.dto';
import { RequestUser } from '@/src/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body);
  }

  @Get('me')
  @UseGuards(AuthenticationGuard)
  me(@RequestUser() user: IRequestWithUser) {
    return this.authService.profile(user);
  }
}
