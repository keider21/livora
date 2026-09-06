import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TokenVerifier } from 'livekit-server-sdk';
import { LiveKitStreamProvider, toHttpUrl } from '../src/streaming/livekit-provider';

// Las claves de `livekit-server --dev`, que es como se prueba en local.
const config = { url: 'ws://localhost:7880', apiKey: 'devkey', apiSecret: 'secret' };
const verifier = new TokenVerifier(config.apiKey, config.apiSecret);

describe('proveedor LiveKit', () => {
  const provider = new LiveKitStreamProvider(config);

  it('nombra la sala a partir del id y devuelve la URL del servidor de medios', async () => {
    const channel = await provider.createChannel('abc-123');
    assert.equal(channel, 'livora-abc-123');

    const credentials = await provider.issueToken({ channel, identity: 'u1', role: 'viewer' });
    assert.equal(credentials.provider, 'livekit');
    assert.equal(credentials.url, 'ws://localhost:7880');
    assert.equal(credentials.channel, channel);
  });

  it('el anfitrión puede publicar y el espectador solo mirar', async () => {
    const channel = await provider.createChannel('sala');

    const host = await verifier.verify((await provider.issueToken({ channel, identity: 'host', role: 'host' })).token);
    assert.equal(host.sub, 'host');
    assert.equal(host.video?.room, channel);
    assert.equal(host.video?.roomJoin, true);
    assert.equal(host.video?.canPublish, true);
    assert.equal(host.video?.canSubscribe, true);

    const viewer = await verifier.verify((await provider.issueToken({ channel, identity: 'fan', role: 'viewer' })).token);
    assert.equal(viewer.video?.canPublish, false);
    assert.equal(viewer.video?.canSubscribe, true);
    assert.equal(viewer.video?.canPublishData, false, 'el chat no va por LiveKit');
  });

  it('respeta el tiempo de vida pedido', async () => {
    const credentials = await provider.issueToken({ channel: 'x', identity: 'u', role: 'viewer', ttlSeconds: 120 });
    const claims = await verifier.verify(credentials.token);
    const now = Math.floor(Date.now() / 1000);
    assert.ok(claims.exp! >= now + 110 && claims.exp! <= now + 130, `exp fuera de rango: ${claims.exp}`);
    assert.ok(credentials.expiresAt > Date.now() + 100_000);
  });

  it('rechaza un token firmado con otra clave', async () => {
    const other = new LiveKitStreamProvider({ ...config, apiSecret: 'otra-clave' });
    const { token } = await other.issueToken({ channel: 'x', identity: 'u', role: 'viewer' });
    await assert.rejects(() => verifier.verify(token));
  });

  it('convierte la URL de WebSocket a HTTP para la API', () => {
    assert.equal(toHttpUrl('ws://localhost:7880'), 'http://localhost:7880');
    assert.equal(toHttpUrl('wss://livora.livekit.cloud'), 'https://livora.livekit.cloud');
    assert.equal(toHttpUrl('https://ya-http'), 'https://ya-http');
  });
});
