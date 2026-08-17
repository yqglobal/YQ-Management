import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  getAuthUrl(tenantId: string): string {
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    // MOCK URL: Immediately redirects back to the callback with a mock code
    return `${backendUrl}/integrations/google/callback?code=mock_oauth_code&state=${tenantId}`;
  }

  async handleCallback(code: string, tenantId: string) {
    this.logger.log(`Handling Google OAuth callback for tenant ${tenantId}`);
    
    // MOCK Exchange code for tokens
    const mockAccessToken = 'ya29.mock_access_token_' + Math.random().toString(36).substring(7);
    const mockRefreshToken = '1//mock_refresh_token_' + Math.random().toString(36).substring(7);

    // Save to database
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        googleBusinessConnected: true,
        googleAccessToken: mockAccessToken,
        googleRefreshToken: mockRefreshToken,
        googleTokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
      },
    });

    // Fire and forget updating the Google Business Profile link
    this.updateBusinessProfileBookingLink(tenantId).catch(err => {
      this.logger.error('Failed to update Google Business Profile booking link', err);
    });
  }

  async updateBusinessProfileBookingLink(tenantId: string) {
    this.logger.log(`Updating Google Business Profile booking link for tenant ${tenantId}`);
    
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true, name: true, googleAccessToken: true }
    });

    if (!tenant || !tenant.googleAccessToken) {
      throw new Error('Tenant not found or not connected to Google');
    }

    const bookingLink = `https://${tenant.subdomain}.qmova.com/booking`;
    
    this.logger.log(`Mocking Google My Business API call...`);
    this.logger.log(`Setting booking URL for ${tenant.name} to: ${bookingLink}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    this.logger.log('Google Business Profile booking link updated successfully!');
  }
}
