/**
 * Shrink a camera photo before storing/uploading it. A modern phone photo is 4–12 MB; a
 * 1600px JPEG at q≈0.72 is typically 200–400 KB, which matters on site mobile data and
 * for IndexedDB quota. Falls back to the original file if the browser can't decode it.
 */
export async function compressImage(file: File, maxDim = 1600, quality = 0.72): Promise<{ blob: Blob; name: string; type: string }> {
  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) throw new Error("encode failed");
    // Only keep the result if it actually got smaller (small screenshots can grow).
    if (blob.size < file.size || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return { blob, name: `${baseName}.jpg`, type: "image/jpeg" };
    }
  } catch {
    /* fall through to original */
  }
  const ext = /^image\/png$/.test(file.type) ? "png" : /^image\/webp$/.test(file.type) ? "webp" : "jpg";
  return { blob: file, name: file.name || `${baseName}.${ext}`, type: file.type || "image/jpeg" };
}
