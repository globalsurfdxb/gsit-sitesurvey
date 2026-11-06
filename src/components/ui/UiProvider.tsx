"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { NewSurveySheet, type NewSurveyPreset } from "@/features/surveys/NewSurveySheet";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";

type Tone = "success" | "error" | "info";
interface ToastItem { id: number; message: string; tone: Tone }
interface ConfirmOpts { title: string; message?: string; confirmLabel?: string; danger?: boolean }

interface UiCtx {
  toast: (message: string, tone?: Tone) => void;
  /** Promise-based replacement for window.confirm. */
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  /** Open the "New survey" sheet, optionally with a department / form already chosen. */
  openNewSurvey: (preset?: NewSurveyPreset) => void;
}

const Ctx = createContext<UiCtx | null>(null);
export const useUi = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUi outside UiProvider");
  return c;
};

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<{ opts: ConfirmOpts } | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const [newSurvey, setNewSurvey] = useState<{ preset?: NewSurveyPreset } | null>(null);
  const seq = useRef(0);

  const toast = useCallback((message: string, tone: Tone = "info") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3200);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false); // a newer prompt replaces an unanswered one
        resolver.current = resolve;
        setPending({ opts });
      }),
    [],
  );
  const settle = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setPending(null);
  };

  const value = useMemo(() => ({ toast, confirm, openNewSurvey: (preset?: NewSurveyPreset) => setNewSurvey({ preset }) }), [toast, confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <Icon name={t.tone === "success" ? "check-circle" : t.tone === "error" ? "alert" : "cloud"} size={18} />
            {t.message}
          </div>
        ))}
      </div>

      <Sheet
        open={!!pending}
        onClose={() => settle(false)}
        title={pending?.opts.title ?? ""}
        footer={
          <>
            <button className="btn ghost" onClick={() => settle(false)}>
              Cancel
            </button>
            <button className={`btn ${pending?.opts.danger ? "danger-solid" : "primary"}`} onClick={() => settle(true)} autoFocus>
              {pending?.opts.confirmLabel ?? "Confirm"}
            </button>
          </>
        }
      >
        {pending?.opts.message && <p className="confirm-text">{pending.opts.message}</p>}
      </Sheet>

      <NewSurveySheet open={!!newSurvey} preset={newSurvey?.preset} onClose={() => setNewSurvey(null)} />
    </Ctx.Provider>
  );
}
