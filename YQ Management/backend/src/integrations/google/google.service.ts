import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { google } from 'googleapis';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private oauth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || 'mock-client-id';
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET') || 'mock-client-secret';
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const redirectUri = `${backendUrl}/integrations/google/callback`;

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  getAuthUrl(tenantId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/business.manage'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: tenantId,
    });
  }

  async handleCallback(code: string, tenantId: string) {
    this.logger.log(`Handling Google OAuth callback for tenant ${tenantId}`);

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          googleBusinessConnected: true,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });

      this.logger.log(`Successfully connected Google account for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error('Error exchanging Google OAuth code', error);
      throw error;
    }
  }

  async syncAppointmentToCalendar(tenantId: string, appointmentDetails: any) {
    this.logger.log(`Syncing appointment to Google Calendar for tenant ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleAccessToken: true, googleRefreshToken: true, name: true },
    });

    if (!tenant || (!tenant.googleAccessToken && !tenant.googleRefreshToken)) {
      this.logger.warn(`Tenant ${tenantId} does not have Google Calendar connected. Skipping sync.`);
      return;
    }

    try {
      this.oauth2Client.setCredentials({
        access_token: tenant.googleAccessToken,
        refresh_token: tenant.googleRefreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const event = {
        summary: `Appointment for ${appointmentDetails.customer?.name || 'Customer'}`,
        description: `Service: ${appointmentDetails.service?.name || 'Service'}\nNotes: ${appointmentDetails.customerNotes || ''}`,
        start: {
          dateTime: new Date(appointmentDetails.scheduledStart).toISOString(),
        },
        end: {
          dateTime: new Date(appointmentDetails.scheduledEnd).toISOString(),
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      if (response.data.id) {
        const formData = (appointmentDetails.formData as any) || {};
        formData.googleEventId = response.data.id;

        await this.prisma.appointment.update({
          where: { id: appointmentDetails.id },
          data: { formData },
        });
      }

      this.logger.log('Google Calendar event created successfully!');
    } catch (error) {
      this.logger.error('Failed to sync to Google Calendar', error);
    }
  }

  async updateAppointmentInCalendar(tenantId: string, appointmentDetails: any) {
    if (!appointmentDetails.formData?.googleEventId) return;
    
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleAccessToken: true, googleRefreshToken: true },
    });

    if (!tenant || (!tenant.googleAccessToken && !tenant.googleRefreshToken)) return;

    try {
      this.oauth2Client.setCredentials({
        access_token: tenant.googleAccessToken,
        refresh_token: tenant.googleRefreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const event = {
        summary: `Appointment for ${appointmentDetails.customer?.name || 'Customer'}`,
        description: `Service: ${appointmentDetails.service?.name || 'Service'}\nNotes: ${appointmentDetails.customerNotes || ''}`,
        start: { dateTime: new Date(appointmentDetails.scheduledStart).toISOString() },
        end: { dateTime: new Date(appointmentDetails.scheduledEnd).toISOString() },
      };

      await calendar.events.update({
        calendarId: 'primary',
        eventId: appointmentDetails.formData.googleEventId,
        requestBody: event,
      });
      this.logger.log('Google Calendar event updated successfully!');
    } catch (error) {
      this.logger.error('Failed to update Google Calendar event', error);
    }
  }

  async deleteAppointmentFromCalendar(tenantId: string, appointmentDetails: any) {
    if (!appointmentDetails.formData?.googleEventId) return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleAccessToken: true, googleRefreshToken: true },
    });

    if (!tenant || (!tenant.googleAccessToken && !tenant.googleRefreshToken)) return;

    try {
      this.oauth2Client.setCredentials({
        access_token: tenant.googleAccessToken,
        refresh_token: tenant.googleRefreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: appointmentDetails.formData.googleEventId,
      });
      this.logger.log('Google Calendar event deleted successfully!');
    } catch (error) {
      this.logger.error('Failed to delete Google Calendar event', error);
    }
  }

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        googlePlaceId: true,
        googleReviewLink: true,
        enableSmartReviews: true,
        reviewWaitThresholdMins: true,
        googleBusinessConnected: true,
      },
    });

    return tenant;
  }

  async updateSettings(
    tenantId: string,
    data: {
      googlePlaceId?: string;
      enableSmartReviews?: boolean;
      reviewWaitThresholdMins?: number;
    },
  ) {
    this.logger.log(`Updating Google Business Profile settings for tenant ${tenantId}`);

    const updateData: any = {};
    if (data.googlePlaceId !== undefined) {
      updateData.googlePlaceId = data.googlePlaceId;
      // If a Place ID is provided, automatically generate the review link
      if (data.googlePlaceId) {
        updateData.googleReviewLink = `https://search.google.com/local/writereview?placeid=${data.googlePlaceId}`;
      } else {
        updateData.googleReviewLink = null;
      }
    }
    if (data.enableSmartReviews !== undefined) {
      updateData.enableSmartReviews = data.enableSmartReviews;
    }
    if (data.reviewWaitThresholdMins !== undefined) {
      updateData.reviewWaitThresholdMins = data.reviewWaitThresholdMins;
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    return {
      message: 'Google Business Profile settings updated successfully',
      settings: {
        googlePlaceId: tenant.googlePlaceId,
        googleReviewLink: tenant.googleReviewLink,
        enableSmartReviews: tenant.enableSmartReviews,
        reviewWaitThresholdMins: tenant.reviewWaitThresholdMins,
      },
    };
  }
}
