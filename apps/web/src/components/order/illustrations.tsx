// Ilustrasi dekoratif dari kanvas desain (C6, C7). Warna lewat kelas token, bukan hex.

/** Mangkuk mengepul — kartu status pesanan (desain C6). */
export function BowlIllustration() {
  return (
    <svg aria-hidden="true" width="96" height="72" viewBox="0 0 96 72" fill="none">
      <path
        d="M30 14c0-6 6-6 6-12M46 14c0-6 6-6 6-12M62 14c0-6 6-6 6-12"
        className="stroke-accent"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M8 30h80c0 22-18 36-40 36S8 52 8 30z" className="fill-primary" />
      <path d="M8 30h80" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="48" cy="28" rx="30" ry="5" className="fill-photo-tuna" />
      <path d="M34 70h28" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Meja dengan kode QR dan tanda tanya — QR tidak dikenali (desain C7). */
export function TableQrIllustration() {
  return (
    <svg aria-hidden="true" width="200" height="160" viewBox="0 0 200 160" fill="none">
      <ellipse cx="100" cy="148" rx="80" ry="8" className="fill-line" />
      <rect x="30" y="78" width="140" height="14" rx="7" className="fill-primary" />
      <path d="M48 92v54M152 92v54M70 92l-6 54M130 92l6 54" className="stroke-primary" strokeWidth="7" strokeLinecap="round" />
      <rect x="84" y="50" width="32" height="28" rx="4" className="fill-surface stroke-ink" strokeWidth="3" />
      <path d="M91 57h6v6h-6zM103 57h6v6h-6zM91 67h6v4h-6z" className="fill-ink" />
      <circle cx="142" cy="34" r="22" className="fill-accent" />
      <path
        d="M135 28a7 7 0 1 1 9 6.7c-1.4.5-2 1.4-2 2.8v1.5"
        className="stroke-surface"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="142" cy="46" r="2.6" className="fill-surface" />
    </svg>
  );
}
