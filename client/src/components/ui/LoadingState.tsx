import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "加载中..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute inset-0 m-auto size-9 animate-ping rounded-full bg-(--app-primary)/20 opacity-75" />
        <Loader2 className="relative size-12 shrink-0 animate-spin text-(--app-primary)" />
      </div>
      <p className="mt-4 text-sm text-(--app-text-secondary)">{message}</p>
    </div>
  );
}
