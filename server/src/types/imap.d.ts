declare module 'imap' {
  export default class Imap {
    constructor(config: ImapConfig);
    connect(): void;
    end(): void;
    openBox(mailbox: string, readOnly: boolean, callback: (err: Error | null, box: ImapBox) => void): void;
    search(criteria: any[], callback: (err: Error | null, results: number[]) => void): void;
    fetch(messages: number[], options: ImapFetchOptions): ImapMessage;
    once(event: 'ready' | 'error', callback: () => void): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }

  export interface ImapConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
    tlsOptions?: {
      rejectUnauthorized?: boolean;
    };
  }

  export interface ImapBox {
    name: string;
    messages: {
      total: number;
      new: number;
    };
  }

  export interface ImapFetchOptions {
    bodies?: string | string[];
    struct?: boolean;
    markSeen?: boolean;
  }

  export interface ImapMessage {
    once(event: 'error' | 'end', callback: (err?: Error) => void): void;
    on(event: 'message' | 'body', callback: (msg: any, ...args: any[]) => void): void;
  }
}

declare module 'mailparser' {
  export interface SimpleParserOptions {
    stream?: NodeJS.ReadableStream;
    buffer?: Buffer;
  }

  export interface ParsedMail {
    from?: {
      text?: string;
      address?: string;
      name?: string;
    };
    subject?: string;
    date?: Date;
    attachments?: MailAttachment[];
  }

  export interface MailAttachment {
    filename?: string;
    contentType?: string;
    content?: Buffer | string;
    size?: number;
    headers?: any[];
  }

  export function simpleParser(source: NodeJS.ReadableStream | Buffer | string): Promise<ParsedMail>;
}
