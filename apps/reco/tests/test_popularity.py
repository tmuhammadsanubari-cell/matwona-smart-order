from datetime import UTC, datetime

from app.services.popularity import time_slot


def test_time_slot_uses_wib():
    # 05:00 UTC = 12:00 WIB → LUNCH
    assert time_slot(datetime(2026, 11, 5, 5, 0, tzinfo=UTC)) == "LUNCH"
    # 12:00 UTC = 19:00 WIB → DINNER
    assert time_slot(datetime(2026, 11, 5, 12, 0, tzinfo=UTC)) == "DINNER"
    # 00:30 UTC = 07:30 WIB → MORNING
    assert time_slot(datetime(2026, 11, 5, 0, 30, tzinfo=UTC)) == "MORNING"
