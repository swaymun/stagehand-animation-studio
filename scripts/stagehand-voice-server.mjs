#!/usr/bin/env node

import http from 'node:http';

const PORT = Number(process.env.STAGEHAND_VOICE_PORT || 8787);
const HOST = '127.0.0.1';
const SAMPLE_RATE = 24_000;
const OMNIVOICE_BASE_URL =
  process.env.OMNIVOICE_BASE_URL || 'http://127.0.0.1:7861';
const OMNIVOICE_MODEL = process.env.OMNIVOICE_MODEL || 'omnivoice';
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://stagehand-animation-studio.saimun-h-shahee.chatgpt.site',
  ...String(process.env.STAGEHAND_VOICE_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
]);

const cors = (request) => ({
  ...(request.headers.origin && ALLOWED_ORIGINS.has(request.headers.origin)
    ? { 'access-control-allow-origin': request.headers.origin, vary: 'Origin' }
    : {}),
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-private-network': 'true',
  'cache-control': 'no-store',
});

function json(request, response, status, body) {
  response.writeHead(status, {
    ...cors(request),
    'content-type': 'application/json',
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64_000)
        request.destroy(new Error('Request body too large'));
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function wavPcm16(samples, rate = SAMPLE_RATE) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1)
    buffer.writeInt16LE(
      Math.max(-32_768, Math.min(32_767, Math.round(samples[index] * 32_767))),
      44 + index * 2,
    );
  return buffer;
}

function deterministicPreview(text, durationMs) {
  const frames = Math.max(1, Math.round((SAMPLE_RATE * durationMs) / 1000));
  const output = new Float32Array(frames);
  let seed = 2166136261;
  for (const character of text)
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  const syllables = Math.max(1, text.trim().split(/\s+/).length * 2);
  for (let index = 0; index < frames; index += 1) {
    const time = index / SAMPLE_RATE;
    const syllable = Math.min(
      syllables - 1,
      Math.floor((index / frames) * syllables),
    );
    const frequency = 155 + ((seed >>> (syllable % 19)) & 63) + syllable * 3;
    const gate = Math.sin((Math.PI * syllables * index) / frames) ** 2;
    const attack = Math.min(1, index / (SAMPLE_RATE * 0.01));
    const release = Math.min(1, (frames - index) / (SAMPLE_RATE * 0.04));
    output[index] =
      (Math.sin(Math.PI * 2 * frequency * time) * 0.055 +
        Math.sin(Math.PI * 4 * frequency * time) * 0.018) *
      gate *
      attack *
      release;
  }
  return wavPcm16(output);
}

function estimateTimings(text, durationMs) {
  const tokens = [...text.matchAll(/\S+/g)];
  if (!tokens.length) return [];
  const weights = tokens.map((match) =>
    Math.max(1, match[0].replace(/[^\p{L}\p{N}]/gu, '').length),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return tokens.map((match, index) => {
    const startMs = cursor;
    cursor += (durationMs * weights[index]) / total;
    return {
      token: match[0],
      startMs: Math.round(startMs),
      endMs: Math.round(cursor),
      estimated: true,
    };
  });
}

function wavDurationMs(buffer) {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF')
    return undefined;
  const byteRate = buffer.readUInt32LE(28);
  const dataBytes = buffer.readUInt32LE(40);
  return byteRate ? Math.round((dataBytes / byteRate) * 1000) : undefined;
}

async function detectOmniVoice() {
  try {
    const response = await fetch(`${OMNIVOICE_BASE_URL}/v1/models`, {
      signal: AbortSignal.timeout(900),
    });
    if (!response.ok)
      return { available: false, reason: `HTTP ${response.status}` };
    const payload = await response.json();
    const modelIds = Array.isArray(payload?.data)
      ? payload.data.map((item) => item?.id).filter(Boolean)
      : [];
    return { available: true, modelIds, endpoint: OMNIVOICE_BASE_URL };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function omniVoiceSpeech(input) {
  const response = await fetch(`${OMNIVOICE_BASE_URL}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model: OMNIVOICE_MODEL,
      input: input.text,
      voice: input.voice || 'default',
      response_format: 'wav',
      speed: typeof input.speed === 'number' ? input.speed : 1,
    }),
  });
  if (!response.ok)
    throw new Error(`OmniVoice returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    json(request, response, 403, { error: 'origin not allowed' });
    return;
  }
  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors(request));
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/health') {
    json(request, response, 200, {
      ok: true,
      service: 'stagehand-local-voice',
      host: HOST,
      port: PORT,
    });
    return;
  }
  if (request.method === 'GET' && request.url === '/v1/capabilities') {
    const detected = await detectOmniVoice();
    json(request, response, 200, {
      service: 'stagehand-local-voice',
      version: '1.0.0',
      tts: detected.available
        ? {
            available: true,
            engine: 'OmniVoice',
            model: OMNIVOICE_MODEL,
            endpoint: detected.endpoint,
            audioMime: 'audio/wav',
            sampleRate: SAMPLE_RATE,
            timings: 'estimated',
          }
        : {
            available: true,
            engine: 'deterministic-fallback',
            modelDetected: false,
            audioMime: 'audio/wav',
            sampleRate: SAMPLE_RATE,
            timings: 'estimated',
            installHint:
              'Install and run an OpenAI-compatible OmniVoice server on 127.0.0.1:7861.',
          },
      sfx: { available: true, engine: 'Web Audio recipes', offline: true },
      privacy: { network: 'loopback-only', uploads: false },
    });
    return;
  }
  if (request.method === 'POST' && request.url === '/v1/tts') {
    try {
      const input = JSON.parse(await readBody(request));
      const text = String(input.text || '').trim();
      if (!text)
        return json(request, response, 400, { error: 'text is required' });
      if (text.length > 1000)
        return json(request, response, 413, {
          error: 'text exceeds 1000 characters',
        });
      const detected = await detectOmniVoice();
      const fallbackDuration = Math.max(
        240,
        Math.min(
          30_000,
          Number(input.durationMs) || Math.round(280 + text.length * 46),
        ),
      );
      let audio;
      let engine;
      if (detected.available) {
        audio = await omniVoiceSpeech({ ...input, text });
        engine = 'OmniVoice';
      } else {
        audio = deterministicPreview(text, fallbackDuration);
        engine = 'deterministic-fallback';
      }
      const durationMs = wavDurationMs(audio) || fallbackDuration;
      json(request, response, 200, {
        audioBase64: audio.toString('base64'),
        audioMime: 'audio/wav',
        sampleRate: SAMPLE_RATE,
        durationMs,
        timings: estimateTimings(text, durationMs),
        timingQuality: 'estimated',
        engine,
      });
    } catch (error) {
      json(request, response, 400, {
        error: error instanceof Error ? error.message : 'invalid request',
      });
    }
    return;
  }
  if (request.method === 'POST' && request.url === '/v1/sfx') {
    try {
      const input = JSON.parse(await readBody(request));
      const label = String(input.kind || input.label || 'stagehand-sfx');
      const durationMs = Math.max(
        40,
        Math.min(4000, Number(input.durationMs) || 180),
      );
      const audio = deterministicPreview(label, durationMs);
      json(request, response, 200, {
        audioBase64: audio.toString('base64'),
        audioMime: 'audio/wav',
        sampleRate: SAMPLE_RATE,
        durationMs,
        engine: 'deterministic-sfx',
      });
    } catch {
      json(request, response, 400, { error: 'invalid JSON' });
    }
    return;
  }
  json(request, response, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(
    `Stagehand local voice bridge listening on http://${HOST}:${PORT}`,
  );
  console.log(`Probing OmniVoice at ${OMNIVOICE_BASE_URL}`);
});

for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
