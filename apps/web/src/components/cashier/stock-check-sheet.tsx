'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { formatRupiah } from 'shared';
import type { MenuItemDto, PrinterStationConfig, ServiceMode } from 'shared';
import { ApiClientError } from '@/lib/api';
import { staffFetch } from '@/lib/staff-api';
import { Badge, BottomSheet, Input, Switch, toast } from '@/components/ui';

export interface CashierOperationalInfo {
  qrisEnabled: boolean;
  serviceMode: ServiceMode;
  stockReminderHours: number[];
  printerStations: PrinterStationConfig[];
  lowStockItems: Array<{ id: string; name: string; stock: number | null; isAvailable: boolean }>;
}

export function useCashierOperationalInfo(enabled: boolean) {
  return useQuery({
    queryKey: ['cashier-operational-info'],
    queryFn: () => staffFetch<CashierOperationalInfo>('/outlet/cashier-info'),
    enabled,
    retry: false,
    refetchInterval: 60_000,
  });
}

export interface StockCheckSheetProps {
  open: boolean;
  onClose: () => void;
}

export function StockCheckSheet({ open, onClose }: StockCheckSheetProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [onlyLowOrOut, setOnlyLowOrOut] = useState(false);

  const itemsQuery = useQuery({
    queryKey: ['cashier-stock-menu-items'],
    queryFn: () => staffFetch<MenuItemDto[]>('/menu-items'),
    enabled: open,
    retry: false,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      staffFetch<MenuItemDto>(`/menu-items/${id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      }),
    onSuccess: (updated) => {
      toast(`${updated.name}: ${updated.isAvailable ? 'Tersedia kembali' : 'Ditandai Habis'}`);
      void queryClient.invalidateQueries({ queryKey: ['cashier-stock-menu-items'] });
      void queryClient.invalidateQueries({ queryKey: ['cashier-operational-info'] });
    },
    onError: (err) => {
      const msg = err instanceof ApiClientError ? err.message : 'Gagal memperbarui ketersediaan menu.';
      toast(msg);
    },
  });

  const sortedItems = useMemo(() => {
    const raw = itemsQuery.data ?? [];
    const term = search.trim().toLowerCase();

    return raw
      .filter((item) => !item.isArchived)
      .filter((item) => {
        if (onlyLowOrOut) {
          const isLow = item.stock !== null && item.stock <= 5;
          if (item.isAvailable && !isLow) return false;
        }
        if (!term) return true;
        return (
          item.name.toLowerCase().includes(term) ||
          (item.variantGroup?.toLowerCase().includes(term) ?? false) ||
          (item.sku?.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a, b) => {
        // Prioritaskan menu habis & stok menipis (<= 5) di paling atas
        const rank = (m: MenuItemDto) => {
          if (!m.isAvailable) return 0;
          if (m.stock !== null && m.stock <= 5) return 1;
          return 2;
        };
        const rDiff = rank(a) - rank(b);
        if (rDiff !== 0) return rDiff;
        return a.name.localeCompare(b.name, 'id');
      });
  }, [itemsQuery.data, onlyLowOrOut, search]);

  const unavailableCount = (itemsQuery.data ?? []).filter((i) => !i.isArchived && !i.isAvailable).length;
  const lowStockCount = (itemsQuery.data ?? []).filter(
    (i) => !i.isArchived && i.isAvailable && i.stock !== null && i.stock <= 5,
  ).length;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Cek Ketersediaan & Stok Menu"
      className="sm:max-w-xl"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone={unavailableCount > 0 ? 'danger' : 'neutral'}>
            {unavailableCount} Habis
          </Badge>
          <Badge tone={lowStockCount > 0 ? 'warning' : 'neutral'}>
            {lowStockCount} Stok Menipis (≤ 5)
          </Badge>
          <button
            type="button"
            onClick={() => setOnlyLowOrOut((v) => !v)}
            className={`ml-auto rounded-control border px-2.5 py-1 font-bold transition-colors ${
              onlyLowOrOut
                ? 'border-primary bg-primary text-cream'
                : 'border-line bg-surface text-muted hover:text-ink'
            }`}
          >
            {onlyLowOrOut ? 'Tampilkan Semua Menu' : 'Filter Habis / Menipis'}
          </button>
        </div>

        <Input
          label="Cari Nama Menu atau SKU"
          placeholder="Contoh: Tuna Matah, Ayam, Es Teh..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {itemsQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Memuat daftar menu...</p>
        ) : sortedItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Tidak ada menu yang cocok dengan filter ini.
          </p>
        ) : (
          <div className="max-h-[54vh] divide-y divide-line overflow-y-auto rounded-card border border-line bg-surface">
            {sortedItems.map((item) => {
              const isLow = item.stock !== null && item.stock <= 5;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-ink">{item.name}</p>
                      {!item.isAvailable ? (
                        <Badge tone="danger-solid">Habis</Badge>
                      ) : isLow ? (
                        <Badge tone="warning">Sisa {item.stock}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatRupiah(item.price)}
                      {item.stock !== null ? ` · Stok POS: ${item.stock}` : ''}
                      {item.sku ? ` · ${item.sku}` : ''}
                    </p>
                  </div>

                  <Switch
                    checked={item.isAvailable}
                    disabled={toggleMutation.isPending}
                    aria-label={`Tersedia: ${item.name}`}
                    onChange={(next) => toggleMutation.mutate({ id: item.id, isAvailable: next })}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
