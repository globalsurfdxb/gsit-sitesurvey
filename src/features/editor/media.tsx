"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useUi } from "@/components/ui/UiProvider";
import { ACCEPT_ATTACHMENTS, extOf, FILE_TYPES, formatBytes, MAX_FILE_BYTES } from "@/lib/files";
import { compressImage } from "@/lib/image";
import { deleteFile, getFile, putFile } from "@/lib/local-db";
import { uid } from "@/lib/survey";
import type { BlockDef, FileRef, UploadValue } from "@/lib/types";
import { Pill, type OnChange } from "./blocks";

type B<T extends BlockDef["t"]> = Extract<BlockDef, { t: T }>;

/** Resolve a FileRef to something an <img> can show: the local blob if we have it, else the server copy. */
export function useFileUrl(ref: FileRef | undefined): { url: string | null; pendingUpload: boolean } {
  const [state, setState] = useState<{ id: string; url: string; pendingUpload: boolean } | null>(null);
  const id = ref?.id;
  useEffect(() => {
    if (!id) return;
    let revoke: string | null = null;
    let live = true;
    getFile(id).then((f) => {
      if (!live) return;
      if (f) {
        revoke = URL.createObjectURL(f.blob);
        setState({ id, url: revoke, pendingUpload: f.uploaded === 0 });
      } else {
        setState({ id, url: `/api/files/${id}`, pendingUpload: false });
      }
    });
    return () => {
      live = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [id]);
  // Ignore a result that belongs to a previous id (slot replaced / removed).
  return id && state?.id === id ? state : { url: null, pendingUpload: false };
}

async function storeImage(file: File, surveyId: string): Promise<FileRef> {
  const { blob, name, type } = await compressImage(file);
  const id = uid();
  await putFile({ id, surveyId, blob, name, type, size: blob.size, uploaded: 0 });
  return { kind: "file", id, name, type, size: blob.size, takenAt: Date.now() };
}

function PhotoSlot({ label, value, surveyId, onSet }: { label: string; value: FileRef | undefined; surveyId: string; onSet: (r: FileRef | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { url, pendingUpload } = useFileUrl(value);
  const { toast } = useUi();

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const old = value;
      const ref = await storeImage(file, surveyId);
      onSet(ref);
      if (old) await deleteFile(old.id);
    } catch (e) {
      toast("Couldn’t save the photo on this device. Storage may be full." + (e instanceof Error && e.message ? ` (${e.message})` : ""), "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="photo-slot">
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" className="photo-btn" onClick={() => input.current?.click()} aria-label={value ? `Replace photo: ${label}` : `Add photo: ${label}`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="photo-img" />
        ) : (
          <span className="photo-empty">
            <Icon name="camera" size={22} />
            {busy ? "Saving…" : "Add photo"}
          </span>
        )}
        {pendingUpload && <span className="photo-flag" title="Not uploaded yet"><Icon name="clock" size={12} /> Pending</span>}
      </button>
      <div className="photo-label">{label}</div>
      {value && (
        <button
          type="button"
          className="photo-remove"
          aria-label={`Remove photo: ${label}`}
          onClick={async () => {
            onSet(undefined);
            await deleteFile(value.id);
          }}
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}

export const PhotosBlock = memo(function PhotosBlock({ block, value, onChange, surveyId }: { block: B<"photos">; value: unknown; onChange: OnChange; surveyId: string }) {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, FileRef>;
  return (
    <div className="photo-grid">
      {block.slots.map((s) => (
        <PhotoSlot
          key={s.key}
          label={s.label}
          surveyId={surveyId}
          value={v[s.key]}
          onSet={(r) => {
            const next = { ...v };
            if (r) next[s.key] = r;
            else delete next[s.key];
            onChange(block.key, next);
          }}
        />
      ))}
    </div>
  );
});

export const UploadBlock = memo(function UploadBlock({ block, value, onChange, surveyId }: { block: B<"upload">; value: unknown; onChange: OnChange; surveyId: string }) {
  const v: UploadValue = { types: [], files: [], ...(value as Partial<UploadValue> | undefined) };
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setError("");
    const added: FileRef[] = [];
    try {
      for (const f of Array.from(list)) {
        if (!FILE_TYPES[extOf(f.name)]) {
          setError(`"${f.name}" is not an accepted file type.`);
          continue;
        }
        if (f.size > MAX_FILE_BYTES) {
          setError(`"${f.name}" is larger than 15 MB.`);
          continue;
        }
        if (f.type.startsWith("image/")) added.push(await storeImage(f, surveyId));
        else {
          const id = uid();
          await putFile({ id, surveyId, blob: f, name: f.name, type: f.type, size: f.size, uploaded: 0 });
          added.push({ kind: "file", id, name: f.name, type: f.type, size: f.size, takenAt: Date.now() });
        }
      }
      if (added.length) onChange(block.key, { ...v, files: [...v.files, ...added] });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="upload">
      {block.typeOptions.length > 0 && (
        <div className="field">
          <span className="field-label">Upload type</span>
          <div className="pills">
            {block.typeOptions.map((o) => (
              <Pill key={o} on={v.types.includes(o)} onClick={() => onChange(block.key, { ...v, types: v.types.includes(o) ? v.types.filter((t) => t !== o) : [...v.types, o] })}>
                {o}
              </Pill>
            ))}
          </div>
        </div>
      )}
      <input ref={input} type="file" multiple hidden accept={ACCEPT_ATTACHMENTS} onChange={(e) => add(e.target.files)} />
      <button type="button" className="dropzone" onClick={() => input.current?.click()} disabled={busy}>
        <Icon name="paperclip" size={20} /> {busy ? "Saving…" : "Add files"}
        <small>JPG, PNG, PDF, DWG, DOCX, XLSX · max 15 MB each</small>
      </button>
      {error && <div className="error small" role="alert">{error}</div>}
      <ul className="file-list">
        {v.files.map((f) => (
          <li key={f.id}>
            <span className="file-name"><Icon name="file" size={16} /> {f.name}</span>
            <span className="muted small">{formatBytes(f.size)}</span>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${f.name}`}
              onClick={async () => {
                onChange(block.key, { ...v, files: v.files.filter((x) => x.id !== f.id) });
                await deleteFile(f.id);
              }}
            >
              <Icon name="x" size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});
