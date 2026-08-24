import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  // Public Routes
  @Get('public/blogs')
  async getPublicBlogs() {
    return this.blogsService.findAll(true);
  }

  @Get('public/blogs/:slug')
  async getPublicBlogBySlug(@Param('slug') slug: string) {
    return this.blogsService.findOneBySlug(slug);
  }

  // Super Admin Routes
  @Get('super-admin/blogs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getAdminBlogs() {
    return this.blogsService.findAll(false);
  }

  @Get('super-admin/blogs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getAdminBlogById(@Param('id') id: string) {
    return this.blogsService.findOneById(id);
  }

  @Post('super-admin/blogs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async createBlog(@Body() body: any) {
    return this.blogsService.create(body);
  }

  @Patch('super-admin/blogs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async updateBlog(@Param('id') id: string, @Body() body: any) {
    return this.blogsService.update(id, body);
  }

  @Delete('super-admin/blogs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async deleteBlog(@Param('id') id: string) {
    return this.blogsService.remove(id);
  }
}
