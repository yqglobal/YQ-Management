import * as React from 'react';
import { cn } from '@/lib/utils';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

const Dialog = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & { open?: boolean; onOpenChange?: (open: boolean) => void }
>(({ className, children, open, onOpenChange, ...props }, ref) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 bg-zinc-950/60 dark:bg-black/85 backdrop-blur-md z-[140] transition-opacity duration-200 data-[open]:opacity-100 data-[closed]:opacity-0" />
        <DialogPrimitive.Viewport className="fixed inset-0 z-[150] flex min-h-full items-center justify-center p-4 overflow-y-auto pointer-events-none">
          <DialogPrimitive.Popup
            ref={ref}
            className={cn(
              'relative w-full max-w-lg pointer-events-auto rounded-[24px] border border-border dark:border-zinc-800 bg-surface dark:bg-zinc-900 p-6 shadow-2xl transition-all duration-200 data-[open]:scale-100 data-[open]:opacity-100 data-[closed]:scale-95 data-[closed]:opacity-0',
              className
            )}
            {...props}
          >
            {children}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});
Dialog.displayName = 'Dialog';

const DialogTrigger = DialogPrimitive.Trigger;

const DialogClose = DialogPrimitive.Close;

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<'h3'>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-on-surface dark:text-white', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<'p'>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-on-surface-variant dark:text-zinc-400', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

export { Dialog, DialogTrigger, DialogClose, DialogTitle, DialogDescription };