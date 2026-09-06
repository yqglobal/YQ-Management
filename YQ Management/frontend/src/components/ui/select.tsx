import * as React from 'react';
import { cn } from '@/lib/utils';
import { Select as SelectPrimitive } from '@base-ui/react/select';

const Select = ({ className, children, value, onValueChange, placeholder, ...props }: {
  className?: string;
  children?: React.ReactNode;
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  [key: string]: AnyFixMe;
}) => {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Popup>
        <SelectPrimitive.Positioner>
          <SelectPrimitive.List className="z-50 max-h-96 w-[var(--trigger-width)] overflow-auto rounded-lg border bg-popover text-popover-foreground shadow-md">
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Popup>
    </SelectPrimitive.Root>
  );
};
Select.displayName = 'Select';

const SelectItem = ({ className, children, value, ...props }: {
  className?: string;
  children?: React.ReactNode;
  value: string;
  [key: string]: AnyFixMe;
}) => {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      value={value}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <span className="text-xs">✓</span>
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
};
SelectItem.displayName = 'SelectItem';

export { Select, SelectItem };