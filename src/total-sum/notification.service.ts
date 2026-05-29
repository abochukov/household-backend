import { Injectable, Logger } from '@nestjs/common';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly region = process.env.AWS_REGION || 'eu-central-1';
  private readonly fromEmail = process.env.NOTIFICATION_EMAIL_FROM || '';

  private readonly sesClient = new SESv2Client({ region: this.region });

  constructor(private readonly smsService: SmsService) {
    this.logger.log(
      `SES initialized with region=${this.region}, fromEmail=${this.fromEmail ? this.fromEmail : 'missing'}`,
    );
  }

  async sendPaymentEmail(toEmail: string, subject: string, body: string): Promise<boolean> {
    if (!toEmail || !this.fromEmail) {
      this.logger.warn(
        `Email skipped: toEmail=${toEmail || 'missing'}, fromEmail=${this.fromEmail || 'missing'}, region=${this.region}`,
      );
      return false;
    }

    try {
      await this.sesClient.send(
        new SendEmailCommand({
          FromEmailAddress: this.fromEmail,
          Destination: {
            ToAddresses: [toEmail],
          },
          Content: {
            Simple: {
              Subject: {
                Data: subject,
                Charset: 'UTF-8',
              },
              Body: {
                Text: {
                  Data: body,
                  Charset: 'UTF-8',
                },
              },
            },
          },
        }),
      );

      this.logger.log(`Email sent via SES from ${this.fromEmail} to ${toEmail}`);

      return true;
    } catch (error) {
      const awsError = error as {
        name?: string;
        message?: string;
        code?: string;
        $metadata?: {
          httpStatusCode?: number;
          requestId?: string;
          attempts?: number;
          totalRetryDelay?: number;
        };
      };

      const details = {
        toEmail,
        fromEmail: this.fromEmail,
        region: this.region,
        errorName: awsError?.name || 'UnknownError',
        errorCode: awsError?.code || 'N/A',
        errorMessage: awsError?.message || 'No error message available',
        httpStatusCode: awsError?.$metadata?.httpStatusCode,
        requestId: awsError?.$metadata?.requestId,
        attempts: awsError?.$metadata?.attempts,
        totalRetryDelay: awsError?.$metadata?.totalRetryDelay,
      };

      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send payment email via SES: ${JSON.stringify(details)}. Verify NOTIFICATION_EMAIL_FROM identity, AWS region, IAM permission ses:SendEmail, and active AWS credentials.`,
        stack,
      );
      return false;
    }
  }

  async sendPaymentSms(phoneNumber: string, body: string): Promise<boolean> {
    if (!phoneNumber) {
      return false;
    }

    try {
      await this.smsService.sendSms(phoneNumber, body);

      return true;
    } catch (error) {
      this.logger.error(`Failed to send payment SMS to ${phoneNumber}`, error as Error);
      return false;
    }
  }
}
