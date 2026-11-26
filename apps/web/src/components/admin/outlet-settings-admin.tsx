'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DEFAULT_PRINTER_STATIONS } from 'shared';
import type {
  OutletSettingsDto,
  OutletSettingsUpdateInput,
  PrinterStationConfig,
  PrinterStationType,
  PrintStationResult,
  ServiceMode,
} from 'shared';
import { ApiClientError } from '@/lib/api';
import { staffFetch } from '@/lib/staff-api';
import { Badge, Button, Card, Input, Switch, toast } from '@/components/ui';

interface NotificationTestResult {
  telegram: { configured: boolean; sent: boolean; message: string };
  whatsapp: { configured: boolean; sent: boolean; message: string };
}

const REMINDER_HOUR_CHOICES = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

export function OutletSettingsAdmin() {
  const settingsQuery = useQuery({
    queryKey: ['admin-outlet-settings'],
    queryFn: () => staffFetch<OutletSettingsDto>('/outlet/settings'),
    retry: false,
  });

  if (settingsQuery.isLoading) {
    return (
      <Card>
        <p className="text-sm text-muted">Memuat pengaturan outlet...</p>
      </Card>
    );
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <Card>
        <p className="text-sm font-bold text-danger">Gagal memuat pengaturan outlet.</p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => void settingsQuery.refetch()}>
          Coba Lagi
        </Button>
      </Card>
    );
  }

  return <OutletSettingsForm key={settingsQuery.dataUpdatedAt} initial={settingsQuery.data} />;
}

function OutletSettingsForm({ initial }: { initial: OutletSettingsDto }) {
  const queryClient = useQueryClient();

  const [qrisEnabled, setQrisEnabled] = useState(initial.qrisEnabled);
  const [serviceMode, setServiceMode] = useState<ServiceMode>(initial.serviceMode);
  const [stockReminderHours, setStockReminderHours] = useState<number[]>(initial.stockReminderHours);
  const [printerStations, setPrinterStations] = useState<PrinterStationConfig[]>(
    initial.printerStations.length > 0 ? initial.printerStations : DEFAULT_PRINTER_STATIONS,
  );

  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [tokenEdited, setTokenEdited] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState(initial.telegramChatId ?? '');
  const [whatsappWebhookUrl, setWhatsappWebhookUrl] = useState(initial.whatsappWebhookUrl ?? '');

  const [printerTestResult, setPrinterTestResult] = useState<PrintStationResult | null>(null);
  const [notifTestResult, setNotifTestResult] = useState<NotificationTestResult | null>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: OutletSettingsUpdateInput) =>
      staffFetch<OutletSettingsDto>('/outlet/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-outlet-settings'], updated);
      void queryClient.invalidateQueries({ queryKey: ['cashier-operational-info'] });
      toast('Pengaturan outlet berhasil disimpan');
    },
    onError: (err) => {
      toast(err instanceof ApiClientError ? err.message : 'Gagal menyimpan pengaturan outlet.');
    },
  });

  const testPrinterMutation = useMutation({
    mutationFn: (stationId: string) =>
      staffFetch<PrintStationResult>('/outlet/printers/test', {
        method: 'POST',
        body: JSON.stringify({ stationId }),
      }),
    onSuccess: (res) => {
      setPrinterTestResult(res);
      toast(res.success ? `Tes cetak ${res.stationName} berhasil` : res.message);
    },
    onError: (err) => {
      toast(err instanceof ApiClientError ? err.message : 'Gagal menguji printer.');
    },
  });

  const testNotifMutation = useMutation({
    mutationFn: () => staffFetch<NotificationTestResult>('/outlet/notifications/test', { method: 'POST' }),
    onSuccess: (res) => {
      setNotifTestResult(res);
      toast('Tes notifikasi selesai dikirim');
    },
    onError: (err) => {
      toast(err instanceof ApiClientError ? err.message : 'Gagal mengirim tes notifikasi.');
    },
  });

  const pingReminderMutation = useMutation({
    mutationFn: () => staffFetch('/outlet/stock-reminder/ping', { method: 'POST' }),
    onSuccess: () => {
      toast('Pengingat cek stok dipancarkan ke dashboard kasir');
    },
    onError: (err) => {
      toast(err instanceof ApiClientError ? err.message : 'Gagal mengirim pengingat kasir.');
    },
  });

  const toggleHour = (hour: number) => {
    setStockReminderHours((prev) =>
      prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b),
    );
  };

  const updateStation = (index: number, patch: Partial<PrinterStationConfig>) => {
    setPrinterStations((prev) =>
      prev.map((st, idx) => (idx === index ? { ...st, ...patch } : st)),
    );
  };

  const addStation = () => {
    const suffix = printerStations.length + 1;
    setPrinterStations((prev) => [
      ...prev,
      {
        id: `station-${suffix}`,
        name: `Stasiun ${suffix}`,
        type: 'NETWORK_LAN',
        host: '192.168.1.201',
        port: 9100,
        brand: '',
        isActive: true,
      },
    ]);
  };

  const removeStation = (index: number) => {
    if (printerStations.length <= 1) {
      toast('Minimal harus ada satu stasiun printer.');
      return;
    }
    setPrinterStations((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const sanitizedStations = printerStations.map((s) => ({
      id: s.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'cashier',
      name: s.name.trim() || 'Stasiun Printer',
      type: s.type,
      host: s.type === 'NETWORK_LAN' ? (s.host?.trim() || null) : null,
      port: s.type === 'NETWORK_LAN' ? Number(s.port || 9100) : null,
      brand: s.brand?.trim() || null,
      isActive: s.isActive,
    }));

    const payload: OutletSettingsUpdateInput = {
      qrisEnabled,
      serviceMode,
      stockReminderHours,
      telegramChatId: telegramChatId.trim() || null,
      whatsappWebhookUrl: whatsappWebhookUrl.trim() || null,
      printerStations: sanitizedStations,
      ...(tokenEdited ? { telegramBotToken: telegramBotToken.trim() || null } : {}),
    };

    saveMutation.mutate(payload);
  };

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* 1. Mode Layanan & QRIS */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-base font-extrabold text-ink">Pembayaran & Alur Layanan</h2>
            <p className="mt-1 text-xs text-muted">
              Atur apakah pelanggan dapat langsung membayar via QRIS online atau wajib ke kasir (misal untuk pengambilan pager di Matwona).
            </p>
          </div>
          <Badge tone={qrisEnabled ? 'success' : 'warning'}>
            {qrisEnabled ? 'QRIS Aktif' : 'Kasir / Pager Saja'}
          </Badge>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-card border border-line bg-cream/60 p-3.5">
            <div>
              <p className="text-sm font-bold text-ink">Aktifkan Pembayaran QRIS Online (Midtrans)</p>
              <p className="text-xs text-muted">
                Nonaktifkan jika kasir harus menerima pembayaran dan menyerahkan pager langsung di meja kasir.
              </p>
            </div>
            <Switch
              checked={qrisEnabled}
              onChange={setQrisEnabled}
              aria-label="Aktifkan Pembayaran QRIS"
            />
          </div>

          <div>
            <label htmlFor="service-mode-select" className="text-sm font-bold text-ink">
              Mode Pengambilan Pesanan
            </label>
            <select
              id="service-mode-select"
              value={serviceMode}
              onChange={(e) => setServiceMode(e.target.value as ServiceMode)}
              className="mt-1.5 min-h-11 w-full rounded-control border-[1.5px] border-line-strong bg-surface px-3.5 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
            >
              <option value="SELF_PICKUP_PAGER">
                Self-Pickup Pager (Pelanggan bayar & terima pager, ambil saat dipanggil)
              </option>
              <option value="TABLE_SERVICE">
                Antar ke Meja (Pelayan mengantar pesanan ke nomor meja)
              </option>
            </select>
          </div>
        </div>
      </Card>

      {/* 2. Pengaturan Split-Print Stasiun */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-ink">Stasiun Printer (Kasir, Dapur, Bar)</h2>
            <p className="mt-1 text-xs text-muted">
              Setiap kategori menu dapat diarahkan ke ID stasiun (`cashier`, `kitchen`, `bar`). Printer LAN mengirim ESC/POS langsung lewat TCP port 9100.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPrinterStations(DEFAULT_PRINTER_STATIONS)}
            >
              Reset Default
            </Button>
            <Button type="button" variant="secondary" onClick={addStation}>
              + Tambah Stasiun
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {printerStations.map((st, idx) => (
            <div key={`${st.id}-${idx}`} className="rounded-card border border-line bg-cream/40 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
                <div className="flex items-center gap-2">
                  <Badge tone={st.isActive ? 'primary' : 'neutral'}>{st.id}</Badge>
                  <span className="text-sm font-bold text-ink">{st.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={st.isActive}
                    onChange={(next) => updateStation(idx, { isActive: next })}
                    aria-label={`Aktifkan stasiun ${st.name}`}
                  />
                  {st.type === 'NETWORK_LAN' && (
                    <Button
                      type="button"
                      variant="secondary"
                      loading={testPrinterMutation.isPending}
                      onClick={() => testPrinterMutation.mutate(st.id)}
                    >
                      Tes Cetak LAN
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeStation(idx)}
                    className="px-2 py-1 text-xs font-bold text-danger hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="ID Stasiun"
                  value={st.id}
                  onChange={(e) => updateStation(idx, { id: e.target.value })}
                  hint="Cocokkan di form Kategori Menu."
                />
                <Input
                  label="Nama Tampilan"
                  value={st.name}
                  onChange={(e) => updateStation(idx, { name: e.target.value })}
                />
                <div>
                  <label className="text-sm font-bold text-ink">Koneksi Printer</label>
                  <select
                    value={st.type}
                    onChange={(e) => updateStation(idx, { type: e.target.value as PrinterStationType })}
                    className="mt-1.5 min-h-11 w-full rounded-control border-[1.5px] border-line-strong bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="BROWSER">Browser / USB</option>
                    <option value="BLUETOOTH">Bluetooth Kasir</option>
                    <option value="NETWORK_LAN">Printer LAN (Ethernet TCP)</option>
                  </select>
                </div>
              </div>

              {st.type === 'NETWORK_LAN' ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Input
                    label="IP Address Printer LAN"
                    placeholder="192.168.1.200"
                    value={st.host ?? ''}
                    onChange={(e) => updateStation(idx, { host: e.target.value })}
                  />
                  <Input
                    label="Port TCP"
                    inputMode="numeric"
                    value={String(st.port ?? 9100)}
                    onChange={(e) => updateStation(idx, { port: Number(e.target.value) || 9100 })}
                  />
                  <Input
                    label="Merk / Catatan"
                    placeholder="Silicon Thermal LAN"
                    value={st.brand ?? ''}
                    onChange={(e) => updateStation(idx, { brand: e.target.value })}
                  />
                </div>
              ) : (
                <div className="mt-3">
                  <Input
                    label="Merk / Catatan Perangkat (Opsional)"
                    placeholder="Contoh: Printer Bluetooth 58mm Kasir"
                    value={st.brand ?? ''}
                    onChange={(e) => updateStation(idx, { brand: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {printerTestResult && (
          <p className={`mt-3 text-xs font-bold ${printerTestResult.success ? 'text-primary' : 'text-danger'}`}>
            Hasil tes {printerTestResult.stationName}: {printerTestResult.message}
          </p>
        )}
      </Card>

      {/* 3. Pengingat Cek Stok Harian Kasir */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-ink">Pengingat Cek Stok Kasir (WIB)</h2>
            <p className="mt-1 text-xs text-muted">
              Pilih jam operasional ketika dashboard kasir menampilkan pengingat otomatis untuk memperbarui stok menu.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            loading={pingReminderMutation.isPending}
            onClick={() => pingReminderMutation.mutate()}
          >
            Kirim Pengingat ke Kasir Sekarang
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {REMINDER_HOUR_CHOICES.map((hour) => {
            const active = stockReminderHours.includes(hour);
            return (
              <button
                key={hour}
                type="button"
                onClick={() => toggleHour(hour)}
                className={`min-h-10 rounded-control border px-3 text-xs font-bold transition-colors ${
                  active
                    ? 'border-primary bg-primary text-cream'
                    : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                {String(hour).padStart(2, '0')}:00
              </button>
            );
          })}
        </div>
      </Card>

      {/* 4. Notifikasi Eksternal Owner */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-ink">Notifikasi Telegram & WhatsApp</h2>
            <p className="mt-1 text-xs text-muted">
              Terima pesan otomatis saat ada pesanan masuk atau ketika stok menu menipis. Simpan pengaturan terlebih dahulu sebelum mengirim tes.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            loading={testNotifMutation.isPending}
            onClick={() => testNotifMutation.mutate()}
          >
            Kirim Tes Notifikasi
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Input
              label="Telegram Bot Token"
              type="password"
              placeholder={
                initial.telegramBotTokenConfigured && !tokenEdited
                  ? `Tersimpan (${initial.telegramBotTokenMasked ?? '****'})`
                  : '123456:ABC-DEF...'
              }
              value={telegramBotToken}
              onChange={(e) => {
                setTokenEdited(true);
                setTelegramBotToken(e.target.value);
              }}
              hint="Token dari @BotFather. Biarkan kosong jika tidak ingin mengubah token tersimpan."
            />
            {initial.telegramBotTokenConfigured && (
              <button
                type="button"
                onClick={() => {
                  setTokenEdited(true);
                  setTelegramBotToken('');
                }}
                className="mt-1 text-xs font-bold text-danger hover:underline"
              >
                Hapus Token Tersimpan
              </button>
            )}
          </div>

          <Input
            label="Telegram Chat ID"
            placeholder="-1001234567890"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            hint="ID grup atau chat Telegram penerima laporan."
          />
        </div>

        <div className="mt-3">
          <Input
            label="WhatsApp Webhook URL (Opsional)"
            type="url"
            placeholder="https://hook.example.com/wa-matwona"
            value={whatsappWebhookUrl}
            onChange={(e) => setWhatsappWebhookUrl(e.target.value)}
            hint="Endpoint HTTP POST JSON untuk relay gateway WhatsApp (Fonnte, Wablas, n8n, dll)."
          />
        </div>

        {notifTestResult && (
          <div className="mt-3 space-y-1 rounded-card border border-line bg-cream/60 p-3 text-xs">
            <p className={notifTestResult.telegram.sent ? 'font-bold text-primary' : 'text-muted'}>
              Telegram: {notifTestResult.telegram.message}
            </p>
            <p className={notifTestResult.whatsapp.sent ? 'font-bold text-primary' : 'text-muted'}>
              WhatsApp: {notifTestResult.whatsapp.message}
            </p>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button type="button" size="lg" loading={saveMutation.isPending} onClick={handleSave}>
          Simpan Pengaturan Outlet
        </Button>
      </div>
    </div>
  );
}
