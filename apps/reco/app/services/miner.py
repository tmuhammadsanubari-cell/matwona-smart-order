"""Association rule mining untuk rekomendasi "Sering dibeli bersama" (ADR 0003, FR-015).

Input: daftar keranjang, setiap keranjang = kumpulan menu_item_id dalam satu pesanan.
Output: rule antecedent → consequent tunggal dengan support, confidence, lift, score.
"""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

import pandas as pd
from mlxtend.frequent_patterns import association_rules, fpgrowth
from mlxtend.preprocessing import TransactionEncoder


@dataclass(frozen=True)
class Rule:
    antecedent: frozenset[str]
    consequent: str
    support: float
    confidence: float
    lift: float

    @property
    def score(self) -> float:
        return self.lift * self.confidence


def mine_rules(
    baskets: Sequence[Iterable[str]],
    min_support: float = 0.01,
    min_confidence: float = 0.2,
    min_lift: float = 1.0,
    max_antecedent_len: int = 2,
) -> list[Rule]:
    """Jalankan FP-Growth lalu turunkan association rules.

    Hanya rule dengan consequent satu item yang dipakai (yang direkomendasikan satu menu).
    Keranjang berisi satu item tetap ikut menghitung support tetapi tidak menghasilkan rule.
    """
    cleaned = [sorted(set(b)) for b in baskets if b]
    if len(cleaned) < 2:
        return []

    encoder = TransactionEncoder()
    onehot = encoder.fit(cleaned).transform(cleaned)
    df = pd.DataFrame(onehot, columns=encoder.columns_)

    itemsets = fpgrowth(df, min_support=min_support, use_colnames=True)
    if itemsets.empty or (itemsets["itemsets"].map(len) > 1).sum() == 0:
        return []

    rules_df = association_rules(itemsets, metric="confidence", min_threshold=min_confidence)
    rules_df = rules_df[
        (rules_df["lift"] > min_lift)
        & (rules_df["consequents"].map(len) == 1)
        & (rules_df["antecedents"].map(len) <= max_antecedent_len)
    ]

    rules = [
        Rule(
            antecedent=frozenset(row.antecedents),
            consequent=next(iter(row.consequents)),
            support=float(row.support),
            confidence=float(row.confidence),
            lift=float(row.lift),
        )
        for row in rules_df.itertuples()
    ]
    return sorted(rules, key=lambda r: r.score, reverse=True)


def recommend_for_cart(
    rules: Sequence[Rule],
    cart: Iterable[str],
    unavailable: Iterable[str] = (),
    limit: int = 3,
) -> list[tuple[str, Rule]]:
    """Pilih rule yang antecedent-nya subset isi keranjang.

    Item yang sudah di keranjang atau sedang habis tidak pernah direkomendasikan (PRD 2.2.11).
    Satu consequent hanya muncul sekali (rule dengan skor tertinggi).
    """
    cart_set = set(cart)
    blocked = cart_set | set(unavailable)
    picked: dict[str, Rule] = {}
    for rule in sorted(rules, key=lambda r: r.score, reverse=True):
        if rule.consequent in blocked or rule.consequent in picked:
            continue
        if rule.antecedent <= cart_set:
            picked[rule.consequent] = rule
        if len(picked) >= limit:
            break
    return list(picked.items())
