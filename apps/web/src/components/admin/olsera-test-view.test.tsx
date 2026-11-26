import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OlseraTestView } from './olsera-test-view';

const staffFetchMock = vi.fn();

vi.mock('@/lib/staff-api', () => ({
  staffFetch: (...args: unknown[]) => staffFetchMock(...args),
}));

function renderView() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <OlseraTestView />
    </QueryClientProvider>,
  );
}

describe('OlseraTestView (Internal Read-Only Test Page)', () => {
  beforeEach(() => {
    staffFetchMock.mockReset();
  });

  it('menampilkan penanda read-only aman dan menukar App ID + Secret Key menjadi token di memori', async () => {
    staffFetchMock.mockResolvedValueOnce({
      ok: true,
      statusCode: 200,
      durationMs: 142,
      endpoint: 'https://api-open.olsera.co.id/api/open-api/v1/id/token',
      tokenType: 'Bearer',
      expiresIn: 86400,
      accessToken: 'olsera-jwt-token-xyz123456',
      refreshToken: 'olsera-refresh-xyz',
      rawBody: { access_token: 'olsera-jwt-token-xyz123456' },
    });

    renderView();
    expect(screen.getByText(/MODE INTERNAL · READ-ONLY AMAN/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/App ID/i), { target: { value: 'app-matwona' } });
    fireEvent.change(screen.getByLabelText(/Secret Key/i), { target: { value: 'secret-matwona' } });
    fireEvent.click(screen.getByRole('button', { name: /Ambil Access Token/i }));

    await waitFor(() =>
      expect(staffFetchMock).toHaveBeenCalledWith(
        '/pos-sync/olsera-test/token',
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    expect(await screen.findByText(/Siap Dipakai/i)).toBeTruthy();

    // Uji probe GET read-only
    staffFetchMock.mockResolvedValueOnce({
      ok: true,
      statusCode: 200,
      durationMs: 118,
      endpoint: 'https://api-open.olsera.co.id/api/open-api/v1/en/product?per_page=20&page=1',
      safeReadOnly: true,
      itemCount: 1,
      rawBody: {
        data: [{ id: 101, name: 'Matwona Tuna Sambal Matah', sku: 'TN-SMT-J', sell_price: 29000, stock_qty: 12 }],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Jalankan Tes GET/i }));

    await waitFor(() =>
      expect(staffFetchMock).toHaveBeenCalledWith(
        '/pos-sync/olsera-test/probe',
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    expect(await screen.findByText('Matwona Tuna Sambal Matah')).toBeTruthy();
    expect(screen.getByText('TN-SMT-J')).toBeTruthy();

    // Bersihkan kunci dari memori
    fireEvent.click(screen.getByRole('button', { name: /Bersihkan Kunci dari Memori/i }));
    expect(screen.getByText(/Belum Ada Token/i)).toBeTruthy();
  });
});
