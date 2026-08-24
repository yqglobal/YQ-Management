import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(publishedOnly: boolean = true) {
    return this.prisma.blog.findMany({
      where: publishedOnly ? { published: true } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        authorName: true,
        published: true,
        publishedAt: true,
        createdAt: true,
      }, // Exclude heavy content for listing
    });
  }

  async findOneBySlug(slug: string) {
    const blog = await this.prisma.blog.findUnique({ where: { slug } });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  async findOneById(id: string) {
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  async create(data: any) {
    // Generate slug from title if not provided
    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    return this.prisma.blog.create({
      data: {
        ...data,
        slug,
        publishedAt: data.published ? new Date() : null,
      },
    });
  }

  async update(id: string, data: any) {
    if (data.published && data.publishedAt === undefined) {
      const existing = await this.findOneById(id);
      if (!existing.published) data.publishedAt = new Date();
    }

    return this.prisma.blog.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.blog.delete({ where: { id } });
  }
}
