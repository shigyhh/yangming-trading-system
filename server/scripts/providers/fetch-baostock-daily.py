#!/usr/bin/env python3
import argparse
import contextlib
import io
import json
import sys


def parse_args():
    parser = argparse.ArgumentParser(description="Fetch A-share daily candles from BaoStock.")
    parser.add_argument("--symbols", required=True, help="Comma separated stock codes, e.g. 600519,300750")
    parser.add_argument("--start-date", default="", help="YYYYMMDD")
    parser.add_argument("--end-date", default="", help="YYYYMMDD")
    parser.add_argument("--adjust", default="none", choices=["none", "qfq", "hfq"])
    parser.add_argument("--timeout", default="15000", help="Reserved for provider parity; milliseconds")
    return parser.parse_args()


def normalize_date(value):
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if len(digits) >= 8:
        return f"{digits[:4]}-{digits[4:6]}-{digits[6:8]}"
    return ""


def normalize_number(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except Exception:
        return None


def normalize_symbol(symbol):
    raw = str(symbol or "").strip()
    if raw.startswith(("sh.", "sz.", "bj.")):
        return raw
    if raw.startswith(("6", "9")):
        return f"sh.{raw}"
    if raw.startswith(("0", "2", "3")):
        return f"sz.{raw}"
    if raw.startswith(("4", "8")):
        return f"bj.{raw}"
    return raw


def normalize_adjust(value):
    key = str(value or "").strip().lower()
    if key == "qfq":
        return "2"
    if key == "hfq":
        return "1"
    return "3"


def normalize_row(row, symbol):
    return {
        "time": row.get("date") or "",
        "code": symbol,
        "open": normalize_number(row.get("open")),
        "high": normalize_number(row.get("high")),
        "low": normalize_number(row.get("low")),
        "close": normalize_number(row.get("close")),
        "volume": normalize_number(row.get("volume")),
        "amount": normalize_number(row.get("amount")),
        "pct_chg": normalize_number(row.get("pctChg")),
        "amplitude": None,
        "turnover": normalize_number(row.get("turn")),
    }


def call_quietly(fn, *args, **kwargs):
    with contextlib.redirect_stdout(io.StringIO()):
        return fn(*args, **kwargs)


def main():
    args = parse_args()
    symbols = [item.strip() for item in args.symbols.split(",") if item.strip()]
    payload = {
        "provider": "baostock",
        "market": "ashare",
        "timeframe": "101",
        "adjust": args.adjust,
        "symbols": {},
        "errors": [],
    }

    try:
        import baostock as bs
    except Exception as exc:
        payload["errors"].append({
            "symbol": "*",
            "message": f"baostock 未安装或不可用：{exc}. 请执行 pip install baostock",
        })
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    login_result = call_quietly(bs.login)
    if getattr(login_result, "error_code", "") != "0":
        payload["errors"].append({
            "symbol": "*",
            "message": f"baostock 登录失败：{getattr(login_result, 'error_msg', 'unknown error')}",
        })
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    try:
        for symbol in symbols:
            try:
                query = call_quietly(
                    bs.query_history_k_data_plus,
                    normalize_symbol(symbol),
                    "date,code,open,high,low,close,volume,amount,turn,pctChg",
                    start_date=normalize_date(args.start_date),
                    end_date=normalize_date(args.end_date),
                    frequency="d",
                    adjustflag=normalize_adjust(args.adjust),
                )
                rows = []
                while query.error_code == "0" and query.next():
                    rows.append(dict(zip(query.fields, query.get_row_data())))
                if query.error_code != "0":
                    raise RuntimeError(query.error_msg)
                candles = [
                    candle for candle in (normalize_row(row, symbol) for row in rows)
                    if candle["time"] and all(candle[field] is not None for field in ("open", "high", "low", "close"))
                ]
                payload["symbols"][symbol] = {
                    "code": symbol,
                    "candles": candles,
                }
            except Exception as exc:
                payload["errors"].append({
                    "symbol": symbol,
                    "message": str(exc),
                })
    finally:
        try:
            call_quietly(bs.logout)
        except Exception:
            pass

    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
