import axios from 'axios';
import { WebhookPayload, WebhookResponse, FormattedResponse, PropertyData } from '../types/webhook';
import { checkRateLimit } from '../utils/rateLimit';

const WEBHOOK_URL = 'https://baitak.app.n8n.cloud/webhook/11569ec8-0287-4a02-b281-b175e5c84575';
const TIMEOUT = 60000; // 60 seconds timeout

export const triggerWebhook = async (payload: WebhookPayload): Promise<WebhookResponse> => {
  const rateLimitCheck = checkRateLimit();
  if (!rateLimitCheck.allowed) {
    return {
      status: 429,
      statusText: 'Too Many Requests',
      error: `Rate limit exceeded. Please try again in ${rateLimitCheck.timeRemaining} seconds.`,
      timestamp: new Date().toISOString()
    };
  }

  try {
    let response;

    if (payload.audioFile || payload.audioUri) {
      const formData = new FormData();
      formData.append('message', payload.message);
      formData.append('timestamp', payload.timestamp.toISOString());
      formData.append('messageId', payload.messageId);

      if (payload.audioFile) {
        formData.append('audio', payload.audioFile, 'recording.webm');
      } else if (payload.audioUri) {
        const audioResponse = await fetch(payload.audioUri);
        const audioBlob = await audioResponse.blob();
        formData.append('audio', audioBlob, 'recording.webm');
      }

      response = await axios.post(WEBHOOK_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
        timeout: TIMEOUT
      });
    } else {
      response = await axios.post(WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: TIMEOUT
      });
    }

    return {
      data: response.data,
      status: 200,
      statusText: 'OK',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Webhook error:', error);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return {
          status: 408,
          statusText: 'Request Timeout',
          error: 'The request timed out. Please try again.',
          timestamp: new Date().toISOString()
        };
      }
    }

    return {
      status: 500,
      statusText: 'Internal Error',
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };
  }
}