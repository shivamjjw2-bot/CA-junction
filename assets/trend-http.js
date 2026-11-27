// Never parse an HTML gateway/error page as a successful analysis response.
export async function trendResponse(response) {
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch {
    const ray = response.headers.get('cf-ray');
    const resourceLimit = /1102|exceeded.*(?:cpu|resource)|resource.*limit/i.test(raw);
    const timedOut = [504, 524].includes(response.status);
    const error = new Error((resourceLimit
      ? 'The document processor reached its hosting resource limit.'
      : timedOut ? 'The document processor timed out.'
      : 'The document service returned an invalid response.')
      + ' No analysis was added for this paper. Retry the remaining papers.'
      + ' (HTTP ' + response.status + (ray ? '; reference ' + ray : '') + ')');
    error.code = resourceLimit ? 'HOST_RESOURCE_LIMIT' : timedOut ? 'HOST_TIMEOUT' : 'INVALID_RESPONSE';
    error.status = response.status;
    throw error;
  }
  if (!response.ok || !data || typeof data !== 'object' || Array.isArray(data)) {
    const error = new Error(data?.error || 'The document service could not complete this paper.');
    error.code = data?.code;
    error.status = response.status;
    throw error;
  }
  return data;
}
