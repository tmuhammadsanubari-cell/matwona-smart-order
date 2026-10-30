"""Popularitas per slot waktu untuk "Populer sekarang" & fallback cold start (FR-016)."""

from datetime import datetime
from zoneinfo import ZoneInfo

WIB = ZoneInfo("Asia/Jakarta")

# Slot sesuai PRD 2.2.11 (jam WIB, batas atas eksklusif)
SLOTS: list[tuple[str, int, int]] = [
    ("MORNING", 6, 10),
    ("LUNCH", 10, 15),
    ("AFTERNOON", 15, 18),
    ("DINNER", 18, 22),
]


def time_slot(moment: datetime) -> str:
    """Kembalikan slot waktu WIB untuk sebuah waktu (aware atau naive-UTC).

    Di luar jam 06–22 dianggap DINNER agar tetap ada rekomendasi.
    """
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=ZoneInfo("UTC"))
    hour = moment.astimezone(WIB).hour
    for name, start, end in SLOTS:
        if start <= hour < end:
            return name
    return "DINNER"
