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
  const className = props.className || "";
  const hasPosition = /(?:^|\s)(?:static|fixed|absolute|relative|sticky)(?:\s|$)/.test(className);
  return (
    <button
      {...props}
      className={`${hasPosition ? "" : "relative "}${className}`}
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
      <span className={busy ? "contents invisible" : "contents"}>{children}</span>
      {busy && <Loader2 aria-hidden="true" className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin" />}
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
