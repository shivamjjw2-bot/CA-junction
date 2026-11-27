// Checkpoints are scoped by RLS to the signed-in student. The server MAC also
// prevents client-written JSON from ever becoming trusted analysis evidence.
const encoder = new TextEncoder();
async function key(secret) {
  return crypto.subtle.importKey('raw', encoder.encode('ca-trend-checkpoint-v1:' + secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function sealCheckpoint(state, secret) {
  const payload = JSON.stringify(state);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload)));
  return { payload, signature: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') };
}
export async function openCheckpoint(record, secret, userId, sourceStamp) {
  if (!record || typeof record.payload !== 'string' || record.payload.length > 450000
    || !/^[a-f0-9]{64}$/.test(record.signature || '')) return null;
  const bytes = Uint8Array.from(record.signature.match(/../g), x => parseInt(x, 16));
  if (!await crypto.subtle.verify('HMAC', await key(secret), bytes, encoder.encode(record.payload))) return null;
  try {
    const state = JSON.parse(record.payload);
    if (state.userId !== userId || state.sourceStamp !== sourceStamp || state.expires <= Date.now()) return null;
    return state;
  } catch { return null; }
}
export async function loadCheckpoint(base, headers, userId, materialId, secret, sourceStamp, signal) {
  const r = await fetch(base + '/rest/v1/trend_document_checkpoints?user_id=eq.' + encodeURIComponent(userId)
    + '&material_id=eq.' + encodeURIComponent(materialId) + '&select=payload,signature', { headers, signal });
  if (!r.ok) throw Error('Saved document processing is unavailable. Please retry; no paper was counted.');
  const records = await r.json();
  return openCheckpoint(records[0], secret, userId, sourceStamp);
}
export async function saveCheckpoint(base, headers, materialId, state, secret, signal) {
  const sealed = await sealCheckpoint(state, secret);
  const r = await fetch(base + '/rest/v1/trend_document_checkpoints?on_conflict=user_id,material_id', {
    method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, signal,
    body: JSON.stringify({ user_id: state.userId, material_id: materialId, ...sealed })
  });
  if (!r.ok) throw Error('The document processing checkpoint could not be saved. Please retry this paper.');
}
