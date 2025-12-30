export interface PropertyData {
  buildingName: string;
  transactionType: string;
  price: number;
  propertyType: string;
  furnishing: string;
  features: string[];
  agentName: string;
  agentPhone: string;
  imageUrl: string;
  totalListings: number;
  location: string;
}

export interface WebhookPayload {
  message: string;
  timestamp: Date;
  messageId: string;
  audioFile?: File | Blob;
  audioUri?: string;
  audioMimeType?: string;
  [key: string]: any;
}

export interface WebhookResponse {
  data?: any;
  status: number;
  statusText: string;
  headers?: any;
  error?: string;
  timestamp: string;
  properties?: PropertyData[];
}

export interface FormattedResponse {
  success: boolean;
  timestamp: string;
  data: {
    properties?: PropertyData[];
    message?: string;
    context?: string;
  };
  error?: {
    code: number;
    message: string;
  };
}