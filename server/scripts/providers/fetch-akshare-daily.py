#!/usr/bin/env python3
import argparse
import json
import sys


def parse_args():
    parser = argparse.ArgumentParser(description="Fetch A-share daily candles from AKShare.")
    parser.add_argument("--symbols", required=True, help="Comma separated stock codes, e.g. 600519,300750")
    parser.add_argument("--start-date", default="", help="YYYYMMDD")
    parser.add_argument("--end-date", default="", help="YYYYMMDD")
    parser.add_argument("--adjust", default="none", choices=["none", "qfq", "hfq"])
    parser.add_argument("--timeout", default="15000", help="Request timeout in milliseconds")
    return parser.parse_args()


def normalize_adjust(value):
    return "" if value in ("", "none", None) else value


def normalize_number(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except Exception:
        return None


def normalize_timeout(value):
    try:
        number = int(value)
        return max(number / 1000, 1)
    except Exception:
        return 15


def row_value(row, *names):
    for name in names:
        if name in row:
            return row[name]
    return None


def normalize_row(row, symbol=""):
    raw_date = str(row_value(row, "日期", "date", "time") or "")
    candle = {
        "time": raw_date,
        "code": str(row_value(row, "股票代码", "代码", "code") or symbol),
        "open": normalize_number(row_value(row, "开盘", "open")),
        "high": normalize_number(row_value(row, "最高", "high")),
        "low": normalize_number(row_value(row, "最低", "low")),
        "close": normalize_number(row_value(row, "收盘", "close")),
        "volume": normalize_number(row_value(row, "成交量", "volume", "vol")),
        "amount": normalize_number(row_value(row, "成交额", "amount")),
        "pct_chg": normalize_number(row_value(row, "涨跌幅", "pct_chg", "pctChg")),
        "amplitude": normalize_number(row_value(row, "振幅", "amplitude")),
        "turnover": normalize_number(row_value(row, "换手率", "turnover")),
    }
    return candle


def main():
    args = parse_args()
    symbols = [item.strip() for item in args.symbols.split(",") if item.strip()]
    payload = {
        "provider": "akshare",
        "market": "ashare",
        "timeframe": "101",
        "adjust": args.adjust,
        "symbols": {},
        "errors": [],
    }

    try:
        import akshare as ak
    except Exception as exc:
        payload["errors"].append({
            "symbol": "*",
            "message": f"akshare 未安装或不可用：{exc}. 请执行 pip install akshare",
        })
        print(json.dumps(payload, ensure_ascii=False))
        return 0

    adjust = normalize_adjust(args.adjust)
    timeout = normalize_timeout(args.timeout)
    for symbol in symbols:
        try:
            frame = ak.stock_zh_a_hist(
                symbol=symbol,
                period="daily",
                start_date=args.start_date,
                end_date=args.end_date,
                adjust=adjust,
                timeout=timeout,
            )
            rows = frame.to_dict(orient="records") if frame is not None else []
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

    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
