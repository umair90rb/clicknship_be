import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequestUser } from '@/src/types/auth';
import { RequestUser as RequestUserDeco } from '@/src/decorators/user.decorator';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { UserService } from '../services/user.service';
import {
  CreateUserDto,
  ListUserBodyDto,
  UpdateUserDto,
} from '../dtos/user.dto';

@Controller('users')
@UseGuards(AuthenticationGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async list(@Body() body: ListUserBodyDto) {
    return this.userService.list(body);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.userService.get(id);
  }

  @Post('create')
  async create(
    @RequestUserDeco() user: RequestUser,
    @Body() createDto: CreateUserDto,
  ) {
    return this.userService.create(createDto, user);
  }

  @Patch(':id')
  async update(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateDto, user);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.delete(id, user);
  }
}
