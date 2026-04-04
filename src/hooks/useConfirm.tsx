"use client";

import { useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState extends ConfirmOptions {
  open: boolean;
  loading: boolean;
}

export function useConfirm() {
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    title: "",
    loading: false,
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ open: true, loading: false, ...options });
    });

  const handleConfirm = () => {
    setDialog((d) => ({ ...d, loading: true }));
    // Brief tick lets the loading state render before resolving
    setTimeout(() => {
      resolveRef.current?.(true);
      resolveRef.current = null;
      setDialog((d) => ({ ...d, open: false, loading: false }));
    }, 50);
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setDialog((d) => ({ ...d, open: false, loading: false }));
  };

  function ConfirmDialogHost() {
    return (
      <ConfirmDialog
        open={dialog.open}
        title={dialog.title}
        description={dialog.description}
        confirmText={dialog.confirmText ?? "Confirm"}
        cancelText={dialog.cancelText ?? "Cancel"}
        loading={dialog.loading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  return { confirm, ConfirmDialogHost };
}
