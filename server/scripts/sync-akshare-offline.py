#!/usr/bin/env python3
"""Incrementally sync A-share K-line data from AkShare into the local training cache.

The server reads JSON files under server/data/market/ashare/{klt}/{code}.json.
This script writes the same format, so the mini-program training API can stay
anonymous and cache-first while the data source can be AkShare.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path


SERVER_ROOT = Path(__file__).resolve().parents[1]
MARKET_DIR = SERVER_ROOT / "data" / "market"
DEFAULT_BEGIN = "19900101"
KLT_TO_AK_PERIOD = {
    "101": "daily",
    "102": "weekly",
    "103": "monthly",
}


def main() -> int:
    args = parse_args()
    ak = import_akshare()
    pool = load_stock_pool(ak, refresh=args.refresh_pool)
    selected = select_stocks(pool, args.codes, args.limit)
    timeframes = normalize_timeframes(args.timeframes)

    results = []
    total = len(selected) * len(timeframes)
    started = time.time()
    for stock in selected:
        for klt in timeframes:
            try:
                item = sync_one_stock(
                    ak,
                    stock=stock,
                    klt=klt,
                    begin=args.begin,
                    end=args.end,
                    adjust=args.adjust,
                    force=args.force,
                )
            except Exception as exc:  # noqa: BLE001 - CLI should continue per stock.
                item = {
                    "code": stock["code"],
                    "klt": klt,
                    "ok": False,
                    "error": str(exc),
                }
            results.append(item)
            if not args.summary_only:
                print_progress(item, len(results), total)
            if args.delay > 0:
                time.sleep(args.delay / 1000)

    output = {
        "ok": any(item.get("ok") for item in results),
        "source": "akshare",
        "total": len(results),
        "success": sum(1 for item in results if item.get("ok")),
        "failed": sum(1 for item in results if not item.get("ok")),
        "added": sum(int(item.get("added", 0)) for item in results),
        "seconds": round(time.time() - started, 1),
    }
    if not args.summary_only:
        output["results"] = results
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if output["ok"] else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="AkShare A股K线增量补离线库")
    parser.add_argument("--codes", default="", help="股票代码，逗号分隔。设置后忽略 --limit")
    parser.add_argument("--limit", default="30", help="从股票池取前N只；all表示全部")
    parser.add_argument("--timeframes", default="101", help="周期：101(日K),102(周K),103(月K)")
    parser.add_argument("--begin", default=DEFAULT_BEGIN, help="无本地缓存时的起始日期 YYYYMMDD")
    parser.add_argument("--end", default=today_key(), help="结束日期 YYYYMMDD")
    parser.add_argument("--adjust", default="", choices=["", "qfq", "hfq"], help="AkShare复权参数；默认不复权，避免长历史前复权出现负价格")
    parser.add_argument("--delay", type=int, default=300, help="请求间隔毫秒")
    parser.add_argument("--force", action="store_true", help="忽略本地缓存，全量重拉")
    parser.add_argument("--refresh-pool", action="store_true", help="刷新A股股票池")
    parser.add_argument("--summary-only", action="store_true", help="只输出汇总")
    return parser.parse_args()


def import_akshare():
    try:
        import akshare as ak  # type: ignore

        return ak
    except ImportError as exc:
        raise SystemExit(
            "未安装 AkShare。请先在服务器环境执行：python3 -m pip install akshare pandas"
        ) from exc


def load_stock_pool(ak, refresh: bool = False) -> list[dict]:
    pool_file = MARKET_DIR / "stock-pool.json"
    if pool_file.exists() and not refresh:
        payload = json.loads(pool_file.read_text(encoding="utf-8"))
        stocks = [item for item in payload.get("stocks", []) if is_valid_stock(item)]
        if stocks:
            return stocks

    frame = ak.stock_info_a_code_name()
    records = []
    for item in frame.to_dict("records"):
        code = normalize_code(item.get("code") or item.get("证券代码"))
        name = str(item.get("name") or item.get("证券简称") or "").strip()
        stock = {
            "code": code,
            "name": name,
            "secid": f"{1 if code.startswith('6') else 0}.{code}",
        }
        if is_valid_stock(stock):
            records.append(stock)

    records = sorted({item["code"]: item for item in records}.values(), key=lambda item: item["code"])
    pool_file.parent.mkdir(parents=True, exist_ok=True)
    pool_file.write_text(
        json.dumps(
            {
                "source": "akshare_stock_info_a_code_name",
                "updated_at": datetime.now().isoformat(timespec="seconds"),
                "stocks": records,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return records


def select_stocks(pool: list[dict], codes_text: str, limit_text: str) -> list[dict]:
    codes = [normalize_code(item) for item in codes_text.split(",") if normalize_code(item)]
    if codes:
        by_code = {item["code"]: item for item in pool}
        return [by_code.get(code, {"code": code, "name": "", "secid": f"{1 if code.startswith('6') else 0}.{code}"}) for code in codes]
    if str(limit_text).lower() == "all":
        return pool
    limit = max(int(limit_text or 30), 1)
    return pool[:limit]


def normalize_timeframes(value: str) -> list[str]:
    output = []
    for raw in str(value or "101").split(","):
        text = raw.strip().lower()
        if text in {"101", "daily", "day", "日", "日k"}:
            output.append("101")
        elif text in {"102", "weekly", "week", "周", "周k"}:
            output.append("102")
        elif text in {"103", "monthly", "month", "月", "月k"}:
            output.append("103")
    return sorted(set(output)) or ["101"]


def sync_one_stock(ak, stock: dict, klt: str, begin: str, end: str, adjust: str, force: bool) -> dict:
    code = stock["code"]
    cache_file = MARKET_DIR / "ashare" / klt / f"{code}.json"
    existing = [] if force else read_existing_candles(cache_file)
    start = begin
    if existing:
        start = max(begin, next_day_key(existing[-1]["date"]))
    if existing and start > normalize_date_key(end):
        return {
            "code": code,
            "klt": klt,
            "ok": True,
            "skipped": True,
            "candles": len(existing),
            "added": 0,
            "latest_date": existing[-1]["date"],
        }

    frame = ak.stock_zh_a_hist(
        symbol=code,
        period=KLT_TO_AK_PERIOD[klt],
        start_date=start,
        end_date=normalize_date_key(end),
        adjust=adjust,
    )
    fresh = normalize_akshare_frame(frame)
    merged = merge_candles(existing, fresh)
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(
        json.dumps(
            {
                "code": code,
                "klt": klt,
                "timeframe_label": timeframe_label(klt),
                "source": "akshare_incremental_cache",
                "adjust": adjust,
                "updated_at": datetime.now().isoformat(timespec="seconds"),
                "candles": merged,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return {
        "code": code,
        "klt": klt,
        "ok": True,
        "incremental": bool(existing),
        "candles": len(merged),
        "added": max(len(merged) - len(existing), 0),
        "latest_date": merged[-1]["date"] if merged else "",
    }


def normalize_akshare_frame(frame) -> list[dict]:
    columns = {
        "日期": "date",
        "开盘": "open",
        "收盘": "close",
        "最高": "high",
        "最低": "low",
        "成交量": "volume",
        "成交额": "amount",
        "涨跌幅": "pct_chg",
    }
    rows = []
    for item in frame.to_dict("records"):
        row = {target: item.get(source) for source, target in columns.items()}
        date = str(row.get("date") or "").strip()
        if not date:
            continue
        rows.append(
            {
                "date": date,
                "open": to_float(row.get("open")),
                "close": to_float(row.get("close")),
                "high": to_float(row.get("high")),
                "low": to_float(row.get("low")),
                "volume": to_float(row.get("volume")),
                "amount": to_float(row.get("amount")),
                "pct_chg": to_float(row.get("pct_chg")),
            }
        )
    return [item for item in rows if all(isinstance(item[key], float) and item[key] > 0 for key in ("open", "close", "high", "low"))]


def read_existing_candles(path: Path) -> list[dict]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    candles = payload.get("candles", [])
    return [item for item in candles if "date" in item]


def merge_candles(existing: list[dict], fresh: list[dict]) -> list[dict]:
    by_date = {str(item["date"]): item for item in existing + fresh if item.get("date")}
    return [by_date[key] for key in sorted(by_date, key=normalize_date_key)]


def print_progress(item: dict, index: int, total: int) -> None:
    if item.get("skipped"):
        status = f"SKIP {item.get('candles', 0)}根"
    elif item.get("ok"):
        status = f"INC +{item.get('added', 0)}/{item.get('candles', 0)}根"
    else:
        status = f"FAIL {item.get('error')}"
    print(f"[{index}/{total}] {item.get('code')} {item.get('klt')} {status}")


def is_valid_stock(stock: dict) -> bool:
    code = normalize_code(stock.get("code", ""))
    name = str(stock.get("name", "")).strip()
    if not code or not name:
        return False
    if "退" in name:
        return False
    return code.startswith(("000", "001", "002", "003", "300", "301", "600", "601", "603", "605", "688", "689"))


def normalize_code(value) -> str:
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    return digits[-6:].zfill(6) if digits else ""


def normalize_date_key(value) -> str:
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    return digits[:8] if len(digits) >= 8 else DEFAULT_BEGIN


def next_day_key(value) -> str:
    key = normalize_date_key(value)
    dt = datetime.strptime(key, "%Y%m%d") + timedelta(days=1)
    return dt.strftime("%Y%m%d")


def today_key() -> str:
    return datetime.now().strftime("%Y%m%d")


def timeframe_label(klt: str) -> str:
    return {"101": "日K", "102": "周K", "103": "月K"}.get(klt, "日K")


def to_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


if __name__ == "__main__":
    sys.exit(main())
