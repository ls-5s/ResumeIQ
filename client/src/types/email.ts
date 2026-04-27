export interface EmailConfig {
  id: number;
  userId: number;
  email: string;
  authCode?: string; // 授权码
  imapHost: string | null;
  imapPort: number | null;
  smtpHost: string | null;
  smtpPort: number | null;
  isDefault: boolean | null;
  isDeleted: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailConfigData {
  email: string;
  authCode: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  isDefault?: boolean;
}

export interface UpdateEmailConfigData {
  email?: string;
  authCode?: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  isDefault?: boolean;
}

export interface TestEmailConfigResult {
  success: boolean;
  message: string;
}
