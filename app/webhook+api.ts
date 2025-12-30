import { WebhookPayload, WebhookResponse } from '../types/webhook';
import { triggerWebhook } from '../services/WebhookService';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type');
    let body: any;
    let audioFile: Blob | undefined;

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {
        message: formData.get('message'),
        timestamp: formData.get('timestamp'),
        messageId: formData.get('messageId')
      };

      const audio = formData.get('audio');
      if (audio instanceof Blob) {
        audioFile = audio;
        body.audioFile = audioFile;
      }
    } else {
      body = await request.json();
    }

    console.log('Incoming webhook request:', {
      timestamp: new Date().toISOString(),
      messageId: body.messageId,
      message: body.message,
      hasAudio: !!audioFile || !!body.audioUri
    });

    const response = await triggerWebhook(body);

    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error: any) {
    console.error('Webhook execution error:', {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    });

    return new Response(JSON.stringify({
      success: false,
      timestamp: new Date().toISOString(),
      error: {
        code: 500,
        message: error.message || 'Failed to execute webhook'
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

export function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}