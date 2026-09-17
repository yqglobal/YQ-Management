import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    const redirectUri = `${backendUrl}/auth/google/callback`;

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  // ─── Token Refresh Helper ─────────────────────────────────────────────────────

  /**
   * Refreshes an expired access token using the stored refresh token and
   * persists the new access token + expiry to the database.
   *
   * This is a critical production fix — Google access tokens expire after 1 hour.
   * Without this, all calendar and GBP calls silently fail after first connect.
   */
  private async refreshTokenIfNeeded(integration: {
    id: string;
    accessToken: string;
    refreshToken: string | null;
    tokenExpiry: Date | null;
  }) {
    // If no refresh token, can't refresh — return existing credentials
    if (!integration.refreshToken) {
      this.oauth2Client.setCredentials({ access_token: integration.accessToken });
      return;
    }

    const isExpired =
      !integration.tokenExpiry ||
      new Date(integration.tokenExpiry).getTime() - Date.now() < 5 * 60 * 1000; // 5 min buffer

    this.oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });

    if (isExpired) {
      try {
        this.logger.log(`Refreshing Google OAuth token for integration ${integration.id}`);
        const { credentials } = await this.oauth2Client.refreshAccessToken();

        // Persist refreshed token
        await this.prisma.googleIntegration.update({
          where: { id: integration.id },
          data: {
            accessToken: credentials.access_token || integration.accessToken,
            ...(credentials.refresh_token ? { refreshToken: credentials.refresh_token } : {}),
            tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          },
        });

        this.oauth2Client.setCredentials(credentials);
        this.logger.log(`Token refreshed successfully for integration ${integration.id}`);
      } catch (err: any) {
        this.logger.error(`Failed to refresh token for integration ${integration.id}: ${err.message}`);
        // Mark integration as needing re-auth
        await this.prisma.googleIntegration.update({
          where: { id: integration.id },
          data: { tokenExpiry: new Date(0) }, // epoch = expired
        }).catch(() => {/* ignore */});
        throw new Error(`Google token expired and could not be refreshed. Please re-connect the account.`);
      }
    }
  }

  // ─── Calendar Sync ─────────────────────────────────────────────────────────────

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
      await this.refreshTokenIfNeeded(integration);

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Use the specific calendarId if configured, otherwise fall back to 'primary'
      const calendarId = location?.googleCalendarId || 'primary';

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
        calendarId,
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

      this.logger.log(`Google Calendar event created in calendar "${calendarId}" successfully!`);
    } catch (error: any) {
      this.logger.error('Failed to sync to Google Calendar', error?.message);
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
      await this.refreshTokenIfNeeded(integration);

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const calendarId = location?.googleCalendarId || 'primary';

      const event = {
        summary: `Appointment for ${appointmentDetails.customer?.name || 'Customer'}`,
        description: `Service: ${appointmentDetails.service?.name || 'Service'}\nNotes: ${appointmentDetails.customerNotes || ''}`,
        start: { dateTime: new Date(appointmentDetails.scheduledStart).toISOString() },
        end: { dateTime: new Date(appointmentDetails.scheduledEnd).toISOString() },
      };

      await calendar.events.update({
        calendarId,
        eventId: appointmentDetails.formData.googleEventId,
        requestBody: event,
      });
      this.logger.log('Google Calendar event updated successfully!');
    } catch (error: any) {
      this.logger.error('Failed to update Google Calendar event', error?.message);
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
      await this.refreshTokenIfNeeded(integration);

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const calendarId = location?.googleCalendarId || 'primary';

      await calendar.events.delete({
        calendarId,
        eventId: appointmentDetails.formData.googleEventId,
      });
      this.logger.log('Google Calendar event deleted successfully!');
    } catch (error: any) {
      this.logger.error('Failed to delete Google Calendar event', error?.message);
    }
  }

  // ─── List Calendars ────────────────────────────────────────────────────────────

  /**
   * Returns a list of calendars from the connected Google Account so the user
   * can pick a specific calendar in the UI instead of always using 'primary'.
   */
  async listCalendars(integrationId: string, tenantId: string) {
    const integration = await this.prisma.googleIntegration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundException('Google integration not found');
    }

    await this.refreshTokenIfNeeded(integration);

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.calendarList.list({ maxResults: 50 });

    return (response.data.items || []).map(cal => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
    }));
  }

  // ─── Disconnect ────────────────────────────────────────────────────────────────

  /**
   * Disconnects a Google integration. Unlinks all locations using it and
   * deletes the integration record (and tokens) from the database.
   */
  async disconnectIntegration(integrationId: string, tenantId: string) {
    const integration = await this.prisma.googleIntegration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundException('Google integration not found');
    }

    // Attempt to revoke the token at Google's end (best-effort)
    try {
      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
      });
      await this.oauth2Client.revokeCredentials();
    } catch (err: any) {
      this.logger.warn(`Could not revoke Google token for ${integrationId}: ${err.message}`);
    }

    // Unlink all locations using this integration
    await this.prisma.location.updateMany({
      where: { googleIntegrationId: integrationId, tenantId },
      data: { googleIntegrationId: null, googleCalendarId: null },
    });

    // Delete the integration record
    await this.prisma.googleIntegration.delete({
      where: { id: integrationId },
    });

    return { success: true, message: 'Google account disconnected successfully' };
  }

  // ─── Google Business Profile ───────────────────────────────────────────────────

  /**
   * Fetches the Google Business Profile accounts and locations for a connected
   * Google account. Requires business.manage OAuth scope.
   *
   * Note: The My Business API requires separate approval from Google for
   * production use. For development/testing, it works for the app owner.
   */
  async fetchGoogleBusinessAccounts(integrationId: string, tenantId: string) {
    const integration = await this.prisma.googleIntegration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundException('Google integration not found');
    }

    await this.refreshTokenIfNeeded(integration);

    try {
      // Use the My Business Account Management API v1
      const mybusiness = google.mybusinessaccountmanagement({
        version: 'v1',
        auth: this.oauth2Client,
      });

      const accountsRes = await mybusiness.accounts.list();
      const accounts = accountsRes.data.accounts || [];

      // For each account, fetch their locations
      const accountsWithLocations = await Promise.all(
        accounts.map(async (account: any) => {
          try {
            const mybusinessInfo = google.mybusinessbusinessinformation({
              version: 'v1',
              auth: this.oauth2Client,
            });

            const locationsRes = await mybusinessInfo.accounts.locations.list({
              parent: account.name,
              readMask: 'name,title,storefrontAddress,websiteUri,phoneNumbers',
            } as any);

            return {
              accountName: account.name,
              accountType: account.type,
              accountDisplayName: account.accountName,
              locations: (locationsRes.data.locations || []).map((loc: any) => ({
                name: loc.name, // e.g. "accounts/123/locations/456"
                title: loc.title,
                address: loc.storefrontAddress?.addressLines?.join(', '),
              })),
            };
          } catch (locErr: any) {
            this.logger.warn(`Could not fetch locations for account ${account.name}: ${locErr.message}`);
            return {
              accountName: account.name,
              accountDisplayName: account.accountName,
              locations: [],
            };
          }
        })
      );

      return accountsWithLocations;
    } catch (err: any) {
      this.logger.error('Failed to fetch Google Business Profile accounts', err?.message);
      // Return a friendly error the UI can handle
      if (err?.code === 403 || err?.status === 403) {
        throw new ForbiddenException(
          'Google Business Profile API access is not enabled for this account. ' +
          'This feature requires API approval from Google for production use.'
        );
      }
      throw err;
    }
  }

  /**
   * Sets a "Book Now" button on a Google Business Profile location by updating
   * the location's booking URL via the Business Profile API.
   */
  async setBookingUrl(
    integrationId: string,
    tenantId: string,
    gbpLocationName: string,
    bookingUrl: string,
  ) {
    const integration = await this.prisma.googleIntegration.findFirst({
      where: { id: integrationId, tenantId },
    });

    if (!integration) {
      throw new NotFoundException('Google integration not found');
    }

    await this.refreshTokenIfNeeded(integration);

    try {
      const mybusinessInfo = google.mybusinessbusinessinformation({
        version: 'v1',
        auth: this.oauth2Client,
      });

      // Patch just the websiteUri field with our booking URL
      await (mybusinessInfo.locations as any).patch({
        name: gbpLocationName,
        updateMask: 'websiteUri',
        requestBody: {
          websiteUri: bookingUrl,
        },
      });

      return { success: true, bookingUrl };
    } catch (err: any) {
      this.logger.error('Failed to set booking URL on GBP', err?.message);
      throw err;
    }
  }

  // ─── Settings CRUD ─────────────────────────────────────────────────────────────

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        enableSmartReviews: true,
        reviewWaitThresholdMins: true,
        subdomain: true,
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
        tokenExpiry: true,
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
