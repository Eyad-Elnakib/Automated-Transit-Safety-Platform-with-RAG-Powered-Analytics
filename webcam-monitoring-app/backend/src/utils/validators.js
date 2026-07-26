function isValidBase64(str) {
  if (typeof str !== 'string') return false;
  if (str.length < 16) return false;
  // Loose check: base64 chars + optional padding.
  return /^[A-Za-z0-9+/]+={0,2}$/.test(str);
}

function validateInferBody(body, { maxFrameBytes }) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Missing body' };
  const { imageBase64, imageMime, width, height } = body;

  if (!isValidBase64(imageBase64)) return { ok: false, error: 'Invalid imageBase64' };
  const mimeOk = imageMime === 'image/jpeg' || imageMime === 'image/png';
  if (!mimeOk) return { ok: false, error: 'Invalid imageMime (expected image/jpeg or image/png)' };

  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { ok: false, error: 'Invalid width/height' };
  }

  // Rough estimate: 4 chars -> 3 bytes
  const approxBytes = Math.floor((imageBase64.length * 3) / 4);
  if (approxBytes > maxFrameBytes) return { ok: false, error: 'Frame too large' };

  return { ok: true };
}

module.exports = {
  validateInferBody
};

