import { Injectable, Logger } from '@nestjs/common';
import {
  ErrorCode,
  OLSERA_ALLOWED_QUERY_KEYS,
  OLSERA_BASE_URLS,
  OLSERA_SAFE_READ_ENDPOINTS,
  OLSERA_SAFE_READ_PATHS,
} from 'shared';
import type {
  OlseraEnvironment,
  OlseraLang,
  OlseraTestProbeInput,
  OlseraTestProbeResult,
  OlseraTestTokenInput,
  OlseraTestTokenResult,
} from 'shared';
import { AppException } from '../../common/app.exception.js';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_TEST_PER_PAGE = 50;

/**
 * Proxy uji internal Olsera Open API v1 yang DIJAMIN HANYA-BACA (read-only) & stateless.
 * Tidak menyuntikkan PrismaService/DB agar kredensial & data toko tidak pernah tersimpan atau termodifikasi.
 */
@Injectable()
export class OlseraTestService {
  private readonly logger = new Logger('OlseraTest');

  getSafeEndpoints() {
    return {
      environments: OLSERA_BASE_URLS,
      endpoints: OLSERA_SAFE_READ_ENDPOINTS,
    };
  }

  async fetchToken(input: OlseraTestTokenInput): Promise<OlseraTestTokenResult> {
    const baseUrl = this.resolveBaseUrl(input.environment);
    const endpoint = `${baseUrl}/api/open-api/v1/${input.lang}/token`;
    const started = Date.now();

    const payload: Record<string, string> =
      input.grantType === 'refresh_token'
        ? {
            refresh_token: (input.refreshToken ?? '').trim(),
            grant_type: 'refresh_token',
          }
        : {
            app_id: (input.appId ?? '').trim(),
            secret_key: (input.secretKey ?? '').trim(),
            grant_type: 'secret_key',
          };

    let body: BodyInit;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (input.bodyFormat === 'form') {
      const form = new FormData();
      for (const [k, v] of Object.entries(payload)) form.append(k, v);
      body = form;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(payload);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const rawBody = await this.parseResponseBody(response);
      const record = this.asRecord(rawBody);
      const nested = this.asRecord(record?.data);

      const accessToken = this.pickString(record?.access_token) ?? this.pickString(nested?.access_token);
      const refreshToken = this.pickString(record?.refresh_token) ?? this.pickString(nested?.refresh_token);
      const tokenType = this.pickString(record?.token_type) ?? this.pickString(nested?.token_type);
      const expiresIn = this.pickNumber(record?.expires_in) ?? this.pickNumber(nested?.expires_in);

      this.logger.log(
        `Token probe -> ${input.environment} (${input.lang}) status=${response.status} (${Date.now() - started}ms)`,
      );

      return {
        ok: response.ok && Boolean(accessToken),
        statusCode: response.status,
        durationMs: Date.now() - started,
        endpoint,
        tokenType,
        expiresIn,
        accessToken,
        refreshToken,
        rawBody,
      };
    } catch (err) {
      return {
        ok: false,
        statusCode: 502,
        durationMs: Date.now() - started,
        endpoint,
        rawBody: {
          error: 'Gagal menghubungi endpoint token Olsera',
          detail: (err as Error)?.message ?? String(err),
        },
      };
    }
  }

  async probeReadOnly(input: OlseraTestProbeInput): Promise<OlseraTestProbeResult> {
    const endpoint = this.buildSafeReadUrl(input.environment, input.lang, input.path, input.query);
    const token = input.accessToken.trim().replace(/^Bearer\s+/i, '');
    const started = Date.now();

    try {
      // HARDCODED GET — dilarang keras mengirim POST/PUT/PATCH/DELETE pada endpoint uji data
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const rawBody = await this.parseResponseBody(response);
      const record = this.asRecord(rawBody);
      const itemCount = Array.isArray(record?.data) ? record.data.length : null;

      this.logger.log(
        `Read probe GET /${input.path} (${input.environment}) status=${response.status} (${Date.now() - started}ms)`,
      );

      return {
        ok: response.ok,
        statusCode: response.status,
        durationMs: Date.now() - started,
        endpoint,
        safeReadOnly: true,
        itemCount,
        rawBody,
      };
    } catch (err) {
      return {
        ok: false,
        statusCode: 502,
        durationMs: Date.now() - started,
        endpoint,
        safeReadOnly: true,
        itemCount: null,
        rawBody: {
          error: 'Gagal menghubungi API Olsera',
          detail: (err as Error)?.message ?? String(err),
        },
      };
    }
  }

  buildSafeReadUrl(
    environment: OlseraEnvironment,
    lang: OlseraLang,
    path: string,
    query?: Record<string, string | number>,
  ): string {
    const normalized = path.trim().replace(/^\/+/, '');
    if (!OLSERA_SAFE_READ_PATHS.has(normalized)) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        `Path "${normalized}" ditolak karena tidak masuk daftar endpoint GET read-only yang aman.`,
      );
    }

    const baseUrl = this.resolveBaseUrl(environment);
    const url = new URL(`/api/open-api/v1/${lang}/${normalized}`, baseUrl);

    if (query) {
      for (const [key, rawValue] of Object.entries(query)) {
        if (!OLSERA_ALLOWED_QUERY_KEYS.has(key)) continue;
        const valStr = String(rawValue).trim();
        if (!valStr) continue;

        if (key === 'per_page') {
          const n = Math.trunc(Number(valStr));
          if (Number.isFinite(n)) {
            url.searchParams.set(key, String(Math.min(Math.max(1, n), MAX_TEST_PER_PAGE)));
          }
          continue;
        }
        if (key === 'page') {
          const n = Math.trunc(Number(valStr));
          if (Number.isFinite(n)) {
            url.searchParams.set(key, String(Math.max(1, n)));
          }
          continue;
        }
        url.searchParams.set(key, valStr);
      }
    }

    return url.toString();
  }

  private resolveBaseUrl(environment: OlseraEnvironment): string {
    const base = OLSERA_BASE_URLS[environment];
    if (!base) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Environment Olsera tidak dikenal.');
    }
    return base;
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { rawText: text.slice(0, 3000) };
    }
  }

  private asRecord(val: unknown): Record<string, unknown> | null {
    return typeof val === 'object' && val !== null && !Array.isArray(val)
      ? (val as Record<string, unknown>)
      : null;
  }

  private pickString(val: unknown): string | undefined {
    return typeof val === 'string' && val.length > 0 ? val : undefined;
  }

  private pickNumber(val: unknown): number | undefined {
    return typeof val === 'number' && Number.isFinite(val) ? val : undefined;
  }
}
