/** Nominal uang selalu integer Rupiah. */
export type Rupiah = number;

const formatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/** formatRupiah(45000) → "Rp 45.000" */
export function formatRupiah(value: Rupiah): string {
  return formatter.format(value).replace(/ /g, ' ');
}

/** Diskon persen dibulatkan ke bawah agar tidak pernah melebihi harga. */
export function percentDiscount(unitPrice: Rupiah, quantity: number, percent: number): Rupiah {
  const gross = unitPrice * quantity;
  return Math.min(gross, Math.floor((gross * percent) / 100));
}
