"""Capacity-limited ranking evaluation; outcomes are used only after ranking."""

import numpy as np


def ranking_metrics(y, scores, amounts, k):
    y = np.asarray(y, dtype=int)
    scores = np.asarray(scores, dtype=float)
    amounts = np.asarray(amounts, dtype=float)
    if not 1 <= k <= len(y) or len(scores) != len(y) or len(amounts) != len(y):
        raise ValueError("Invalid capacity or inconsistent lengths")
    order = np.argsort(-scores, kind="stable")[:k]
    hits = int(y[order].sum())
    precision = hits / k
    z = 1.96
    centre = (precision + z * z / (2 * k)) / (1 + z * z / k)
    half = z * np.sqrt(precision * (1 - precision) / k + z * z / (4 * k * k)) / (1 + z * z / k)
    prevalence = float(y.mean())
    return {
        "k": k,
        "late_found": hits,
        "false_alarms": k - hits,
        "precision": precision,
        "recall": float(hits / y.sum()) if y.sum() else 0,
        "lift": precision / prevalence if prevalence else 0,
        "precision_interval": [float(centre - half), float(centre + half)],
        "late_amount_selected": float((amounts[order] * y[order]).sum()),
    }


def capacity_report(frame, forest_scores, logistic_scores):
    strategies = {
        "Random Forest": forest_scores,
        "Logistic regression": logistic_scores,
        "Highest amount": frame.amount.to_numpy(),
        "Historical late rate": frame.prior_late_rate.to_numpy(),
    }
    return {
        "rows": len(frame),
        "prevalence": float(frame.late.mean()),
        "capacities": [
            {
                "k": k,
                "random_expected_late": float(k * frame.late.mean()),
                "strategies": {
                    name: ranking_metrics(frame.late, s, frame.amount, k) for name, s in strategies.items()
                },
            }
            for k in [5, 10, 20, 50, 100]
            if k <= len(frame)
        ],
    }
