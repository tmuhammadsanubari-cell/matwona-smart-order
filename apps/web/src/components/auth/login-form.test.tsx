import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ErrorCode } from 'shared';
import { ApiClientError, apiFetch } from '@/lib/api';
import { LoginForm } from './login-form';

const replace = vi.fn();
let next: string | null = null;
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => ({ get: () => next }),
}));
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api')>()), apiFetch: vi.fn() }));
const fetchMock = vi.mocked(apiFetch);

const renderLogin = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LoginForm />
    </QueryClientProvider>,
  );
const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));
};
const session = (role: 'CASHIER' | 'ADMIN') => ({
  user: { id: 'u1', outletId: 'o1', name: 'Kasir 1', email: 'k@matwona.local', role },
  csrfToken: 'c',
});

beforeEach(() => {
  fetchMock.mockReset();
  replace.mockReset();
  next = null;
});

describe('Login staf (FR-009)', () => {
  it('validasi email & password tanpa memanggil API', () => {
    renderLogin();
    fill('bukan-email', '123');
    expect(screen.getByText('Email tidak valid')).toBeTruthy();
    expect(screen.getByText('Password minimal 8 karakter')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('kasir masuk → /cashier', async () => {
    fetchMock.mockResolvedValue(session('CASHIER'));
    renderLogin();
    fill('kasir@matwona.local', 'Kasir123!');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/cashier'));
    expect(fetchMock).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'kasir@matwona.local', password: 'Kasir123!' }),
    });
  });

  it('admin → /admin', async () => {
    fetchMock.mockResolvedValue(session('ADMIN'));
    renderLogin();
    fill('admin@matwona.local', 'Admin123!');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
  });

  it('kembali ke halaman asal (?next=) setelah login', async () => {
    next = '/cashier';
    fetchMock.mockResolvedValue(session('ADMIN'));
    renderLogin();
    fill('admin@matwona.local', 'Admin123!');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/cashier'));
  });

  it('password salah / akun terkunci → pesan dari server', async () => {
    fetchMock.mockRejectedValue(
      new ApiClientError(423, { code: ErrorCode.ACCOUNT_LOCKED, message: 'Akun terkunci karena terlalu banyak percobaan login.' }),
    );
    renderLogin();
    fill('kasir@matwona.local', 'SalahSekali1');
    expect((await screen.findByRole('alert')).textContent).toContain('Akun terkunci');
    expect(replace).not.toHaveBeenCalled();
  });
});
