import { ExternalLink } from 'lucide-react';
import { Modal } from '../Modal';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  fileName: string | null;
}

export function PdfPreviewModal({ isOpen, onClose, url, fileName }: PdfPreviewModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fileName || undefined}
      size="xl"
    >
      <div className="h-[70vh]">
        <iframe
          src={url || undefined}
          className="w-full h-full border-0"
          title="PDF Preview"
        />
      </div>
      {url && (
        <div className="mt-4 flex justify-center">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <ExternalLink size={16} />
            在新窗口打开
          </a>
        </div>
      )}
    </Modal>
  );
}
