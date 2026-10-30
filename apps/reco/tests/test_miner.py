from app.services.miner import mine_rules, recommend_for_cart

# Data sintetis: tuna hampir selalu dipesan dengan nasi & es teh
BASKETS = (
    [["tuna", "nasi", "esteh"]] * 40
    + [["tuna", "nasi"]] * 20
    + [["ayam", "nasi", "esjeruk"]] * 25
    + [["ayam", "lalapan"]] * 10
    + [["esteh"]] * 5
)


def test_mine_rules_finds_strong_pair():
    rules = mine_rules(BASKETS, min_support=0.05, min_confidence=0.3)
    pairs = {(tuple(sorted(r.antecedent)), r.consequent) for r in rules}
    assert (("tuna",), "esteh") in pairs
    assert all(r.lift > 1.0 for r in rules)


def test_recommend_excludes_items_in_cart_and_unavailable():
    rules = mine_rules(BASKETS, min_support=0.05, min_confidence=0.3)
    recs = recommend_for_cart(rules, cart=["tuna", "nasi"], unavailable=["esjeruk"], limit=3)
    ids = [item for item, _ in recs]
    assert "tuna" not in ids and "nasi" not in ids and "esjeruk" not in ids
    assert "esteh" in ids


def test_too_few_baskets_returns_empty():
    assert mine_rules([["tuna"]]) == []
