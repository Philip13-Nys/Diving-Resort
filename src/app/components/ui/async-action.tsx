import * as React from "react";
import { Loader2 } from "lucide-react";

const FormPending = React.createContext(false);

function isPromise(value: unknown): value is PromiseLike<unknown> {
  return value != null && typeof (value as PromiseLike<unknown>).then === "function";
}

function usePendingAction() {
  const locked = React.useRef(false);
  const [pending, setPending] = React.useState(false);
  const run = async (action: () => unknown) => {
    if (locked.current) return;
    locked.current = true;
    try {
      const result = action();
      if (isPromise(result)) {
        setPending(true);
        await result;
      }
    } finally {
      locked.current = false;
      setPending(false);
    }
  };
  return { pending, locked, run };
}

export const AsyncButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(function AsyncButton({ onClick, disabled, children, ...props }, ref) {
  const { pending, locked, run } = usePendingAction();
  const formPending = React.useContext(FormPending);
  const busy = pending || (formPending && (props.type ?? "submit") === "submit");
  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled || pending || formPending}
      aria-busy={busy || undefined}
      onClick={(event) => {
        if (locked.current || formPending) {
          event.preventDefault();
          return;
        }
        if (onClick) return run(() => onClick(event));
      }}
    >
      {busy && <Loader2 aria-hidden="true" className="inline-block h-4 w-4 shrink-0 animate-spin mr-2" />}
      {children}
      {busy && <span className="sr-only" role="status">Processing, please wait</span>}
    </button>
  );
});

export function AsyncForm({ onSubmit, children, ...props }: React.ComponentProps<"form">) {
  const { pending, locked, run } = usePendingAction();
  return (
    <FormPending.Provider value={pending}>
      <form
        {...props}
        aria-busy={pending || undefined}
        onSubmit={(event) => {
          if (!onSubmit) return;
          event.preventDefault();
          if (locked.current) return;
          return run(() => onSubmit(event));
        }}
      >
        {children}
      </form>
    </FormPending.Provider>
  );
}
