# 阳明心学交易系统 v1.0.0 Release Lock

## App Version
v1.0.0

## Release Branch
release/1.0.0

## Git Tag
v1.0.0

## Commit SHA
919e7e2

## Content Version
reflection_final_shenji_zeyou_v1

## Ritual Version
one_thought_ritual_v1

## Main Demo Path
首页
→ 照见一念
→ 落印
→ 今日所照
→ 真实复盘
→ 档案馆
→ 心镜长卷 / 知行长卷
→ 众念心湖

## Production Navigation
- 今日所照
- 真实复盘
- 档案馆
- 众念心湖

## Forbidden Production Sources
- reflection_v2
- suggestedReflectionV2
- 心镜档案
- 众念心湖匿名数据进入私人档案
- GPT 生成生产 reflectionFinal

## Kline Status
P2.2-A 工程底座完成。
自动盘证是否开启由 NEXT_PUBLIC_ENABLE_KLINE_CONTEXT 控制。
K线缓存 stale 不阻塞 1.0，只要真实复盘手动盘证可用。

## Verification
- typecheck: passed
- build: passed
- P0-P4: main path tests mostly passed; one legacy feature test still expects YangmingCharacterMark
- mobile 390px: passed, checked routes had no horizontal overflow
- console error: none found on checked demo routes
