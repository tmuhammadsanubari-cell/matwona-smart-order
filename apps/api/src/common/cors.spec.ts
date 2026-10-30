import { isAllowedOrigin } from './cors.js';

const env = (vars: Record<string, string>) => vars as NodeJS.ProcessEnv;

describe('isAllowedOrigin (CORS HTTP & Socket.IO)', () => {
  it('request tanpa Origin selalu diizinkan', () => {
    expect(isAllowedOrigin(undefined, env({ NODE_ENV: 'production', WEB_ORIGIN: 'https://matwona.id' }))).toBe(true);
  });

  it('WEB_ORIGIN (dipisah koma) diizinkan; default localhost:3000', () => {
    const vars = env({ WEB_ORIGIN: 'https://matwona.id, https://admin.matwona.id' });
    expect(isAllowedOrigin('https://admin.matwona.id', vars)).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000', env({}))).toBe(true);
  });

  it('dev: origin LAN 192.168.*.*:3000 diizinkan (uji di HP), selain itu ditolak', () => {
    const dev = env({ NODE_ENV: 'development', WEB_ORIGIN: 'http://localhost:3000' });
    expect(isAllowedOrigin('http://192.168.137.1:3000', dev)).toBe(true);
    expect(isAllowedOrigin('http://192.168.2.59:3000', dev)).toBe(true);
    expect(isAllowedOrigin('http://192.168.137.1:4000', dev)).toBe(false);
    expect(isAllowedOrigin('http://10.0.0.5:3000', dev)).toBe(false);
    expect(isAllowedOrigin('https://evil.example', dev)).toBe(false);
  });

  it('produksi: hanya WEB_ORIGIN, origin LAN ditolak', () => {
    const prod = env({ NODE_ENV: 'production', WEB_ORIGIN: 'https://matwona.id' });
    expect(isAllowedOrigin('https://matwona.id', prod)).toBe(true);
    expect(isAllowedOrigin('http://192.168.137.1:3000', prod)).toBe(false);
    expect(isAllowedOrigin('http://localhost:3000', prod)).toBe(false);
  });
});
