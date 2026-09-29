export const materialDownloadHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export function materialDownloadResponse(download: { body: ReadableStream<Uint8Array>; filename: string }) {
  const name = download.filename.replace(/[\r\n\u0000-\u001f\u007f]/g, "");
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (char) => "%" + char.charCodeAt(0).toString(16).toUpperCase());
  return new Response(download.body, { headers: {
    ...materialDownloadHeaders,
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="material"; filename*=UTF-8''${encoded}`,
  } });
}
