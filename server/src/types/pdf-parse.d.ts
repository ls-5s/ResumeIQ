declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: any;
    text: string;
    version: string;
  }

  interface PdfParseOptions {
    pagerender?: (pageData: { getTextContent: () => Promise<any> }) => Promise<string>;
    max?: number;
    version?: string;
  }

  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: PdfParseOptions
  ): Promise<PDFData>;

  export = pdfParse;
}
