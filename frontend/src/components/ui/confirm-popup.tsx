import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { DialogShell } from '@/components/ui/dialog-shell'

export function ConfirmPopup({
  open,
  title,
  description,
  error,
  confirmLabel = '확인',
  cancelLabel = '취소',
  destructive = false,
  pending = false,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  description: ReactNode
  error?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const handleClose = () => {
    if (!pending) onOpenChange(false)
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      labelledBy="confirm-popup-title"
      describedBy="confirm-popup-description"
      closeDisabled={pending}
    >
      <div className="pr-9">
        <h2
          id="confirm-popup-title"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {title}
        </h2>
        <p
          id="confirm-popup-description"
          data-amp-mask
          className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-muted-foreground"
        >
          {description}
        </p>
        {error ? (
          <p
            className="mt-3 text-sm font-semibold text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="cta"
          onClick={handleClose}
          disabled={pending}
          className="flex-1"
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? 'destructive-solid' : 'default'}
          size="cta"
          onClick={onConfirm}
          disabled={pending}
          className="flex-1"
        >
          {pending ? '처리 중...' : confirmLabel}
        </Button>
      </div>
    </DialogShell>
  )
}
