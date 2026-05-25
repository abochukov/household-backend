import { Injectable } from '@nestjs/common';

type InfobipMessage = {
  messageId: string;
  to: string;
  status?: {
    description?: string;
  };
};

type InfobipSmsResponse = {
  messages?: InfobipMessage[];
  requestError?: {
    serviceException?: {
      text?: string;
      messageId?: string;
    };
  };
};

@Injectable()
export class SmsService {
  // Hardcoded recipient as requested.
  private readonly testRecipientNumber = '+359878000000';

  async sendSms(to: string, customMessage?: string): Promise<{ sid: string; to: string }> {
    const apiKey = 'c3775cc7d9aa4a6cb759ada05bf1da4e-67a1daef-bf8f-4c88-8526-a29279e22745';
    const baseUrl = 'nde55y.api.infobip.com';
    const senderId = '+447491163443';

    if (!apiKey || !baseUrl || !senderId) {
      throw new Error(
        'Missing Infobip config. Set INFOBIP_API_KEY, INFOBIP_BASE_URL and INFOBIP_SENDER_ID.',
      );
    }

    const body = customMessage || 'Тест на функционалност :)))';

    const normalizedBaseUrl = /^https?:\/\//i.test(baseUrl)
      ? baseUrl
      : `https://${baseUrl}`;
    const endpoint = `${normalizedBaseUrl.replace(/\/$/, '')}/sms/2/text/advanced`;
    const payload = {
      messages: [
        {
          from: senderId,
          destinations: [{ to }],
          text: body,
        },
      ],
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `App ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as InfobipSmsResponse;
    const firstMessage = data.messages?.[0];

    if (!response.ok || !firstMessage) {
      const apiError = data.requestError?.serviceException?.text;
      throw new Error(apiError || 'Infobip request failed.');
    }

    return {
      sid: firstMessage.messageId,
      to: firstMessage.to,
    };
  }

  async sendTestSms(customMessage?: string): Promise<{ sid: string; to: string }> {
    return this.sendSms(this.testRecipientNumber, customMessage);
  }
}
