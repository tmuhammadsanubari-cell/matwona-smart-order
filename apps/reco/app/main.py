from fastapi import Depends, FastAPI, Header, HTTPException

from app.config import settings

app = FastAPI(
    title="Matwona Reco Service",
    description="Rekomendasi menu: FP-Growth (sering dibeli bersama) + popularitas per slot waktu.",
    version="0.1.0",
)


def require_internal_key(x_internal_key: str = Header(default="")) -> None:
    if x_internal_key != settings.reco_internal_key:
        raise HTTPException(status_code=403, detail="Forbidden")


@app.get("/health")
def health() -> dict:
    return {"success": True, "data": {"status": "ok", "service": "reco"}}


@app.get("/internal/recommend", dependencies=[Depends(require_internal_key)])
def recommend(outlet_id: str, cart_item_ids: str = "", limit: int = 3) -> dict:
    """TODO [S3-03]: baca recommendation_rules aktif, cocokkan antecedent dengan isi keranjang
    (app.services.miner.recommend_for_cart), fallback ke POPULAR_SLOT untuk slot WIB saat ini.
    """
    raise HTTPException(status_code=501, detail="Belum diimplementasikan (S3-03)")


@app.post("/internal/train", dependencies=[Depends(require_internal_key)])
def train(outlet_id: str) -> dict:
    """TODO [S3-01, S3-02]: ambil order_items (window RECO_TRAINING_WINDOW_DAYS), split holdout,
    mine_rules, evaluasi vs baseline, simpan recommendation_rules & recommendation_models."""
    raise HTTPException(status_code=501, detail="Belum diimplementasikan (S3-01)")
