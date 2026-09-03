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


  async syncAppointmentToCalendar(tenantId: string, appointmentDetails: any) {
    this.logger.log(`Syncing appointment to Google Calendar for location ${appointmentDetails.locationId}`);

    const location = await this.prisma.location.findUnique({
      where: { id: appointmentDetails.locationId },
      include: { googleIntegration: true },
    });

    const integration = location?.googleIntegration;

    if (!integration || (!integration.accessToken && !integration.refreshToken)) {
      this.logger.warn(`Location ${appointmentDetails.locationId} does not have Google Calendar connected. Skipping sync.`);
      return;
    }

    try {
      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
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
    if (!appointmentDetails.formData?.googleEventId || !appointmentDetails.locationId) return;
    
    const location = await this.prisma.location.findUnique({
      where: { id: appointmentDetails.locationId },
      include: { googleIntegration: true },
    });

    const integration = location?.googleIntegration;
    if (!integration || (!integration.accessToken && !integration.refreshToken)) return;

    try {
      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
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
    if (!appointmentDetails.formData?.googleEventId || !appointmentDetails.locationId) return;

    const location = await this.prisma.location.findUnique({
      where: { id: appointmentDetails.locationId },
      include: { googleIntegration: true },
    });

    const integration = location?.googleIntegration;
    if (!integration || (!integration.accessToken && !integration.refreshToken)) return;

    try {
      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
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
        enableSmartReviews: true,
        reviewWaitThresholdMins: true,
      },
    });

    const locations = await this.prisma.location.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        googleIntegrationId: true,
        googlePlaceId: true,
        googleCalendarId: true,
      }
    });

    const googleIntegrations = await this.prisma.googleIntegration.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      }
    });

    return { tenant, locations, googleIntegrations };
  }

  async updateSettings(
    tenantId: string,
    data: {
      enableSmartReviews?: boolean;
      reviewWaitThresholdMins?: number;
      locations?: {
        id: string;
        googleIntegrationId?: string | null;
        googlePlaceId?: string | null;
        googleCalendarId?: string | null;
      }[];
    },
  ) {
    if (data.enableSmartReviews !== undefined || data.reviewWaitThresholdMins !== undefined) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...(data.enableSmartReviews !== undefined ? { enableSmartReviews: data.enableSmartReviews } : {}),
          ...(data.reviewWaitThresholdMins !== undefined ? { reviewWaitThresholdMins: data.reviewWaitThresholdMins } : {}),
        },
      });
    }

    if (data.locations && data.locations.length > 0) {
      for (const loc of data.locations) {
        await this.prisma.location.update({
          where: { id: loc.id, tenantId },
          data: {
            ...(loc.googleIntegrationId !== undefined ? { googleIntegrationId: loc.googleIntegrationId } : {}),
            ...(loc.googlePlaceId !== undefined ? { googlePlaceId: loc.googlePlaceId } : {}),
            ...(loc.googleCalendarId !== undefined ? { googleCalendarId: loc.googleCalendarId } : {}),
          },
        });
      }
    }

    return this.getSettings(tenantId);
  }
}
