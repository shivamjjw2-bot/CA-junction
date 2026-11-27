export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export async function readPdf(response) {
  if (!response.ok) throw Error('The original PDF could not be retrieved (HTTP ' + response.status
    + '). Ask the admin to check the file link or its access permissions.');
  if (!response.body) throw Error('The original PDF response was empty.');
  const length = Number(response.headers.get('content-length'));
  if (length > MAX_PDF_BYTES) throw Error('This PDF exceeds the document reader’s 50 MB limit. Ask the admin for a compressed copy.');
  const declared = Number.isSafeInteger(length) && length > 0 ? length : null;
  // A known length needs only one output buffer, not a second full-size copy.
  const buffer = declared ? new Uint8Array(declared) : null;
  const parts = [], reader = response.body.getReader();
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (size + value.length > MAX_PDF_BYTES || (buffer && size + value.length > buffer.length)) {
      await reader.cancel();
      throw Error('The PDF exceeds the processing limit or its download length is inconsistent.');
    }
    if (buffer) buffer.set(value, size); else parts.push(value);
    size += value.length;
  }
  if (declared && declared !== size) throw Error('The PDF download was incomplete. Retry this paper.');
  const bytes = buffer || new Uint8Array(size);
  if (!buffer) { let offset=0; for (const part of parts) { bytes.set(part,offset); offset+=part.length; } }
  const decoder = new TextDecoder();
  if (!decoder.decode(bytes.subarray(0,1024)).includes('%PDF-'))
    throw Error('The file link returned a web page or another file type instead of a PDF. Ask the admin to correct the link.');
  const tail = decoder.decode(bytes.subarray(Math.max(0,size-65536)));
  if (!tail.includes('%%EOF')) throw Error('The PDF is truncated or damaged (missing end-of-file marker). Ask the admin to replace it.');
  if (/\/Encrypt\s/.test(tail)) throw Error('This PDF is password protected. Ask the admin for an unlocked examination paper.');
  return bytes;
}
