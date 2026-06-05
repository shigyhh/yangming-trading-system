# Insight Engine

九镜照见内容引擎的数据层骨架。

当前阶段只建立结构，不一次性生成 36 个场景的全部内容。

## Flow

```text
scene
tradeMoment
os
reflection
thief
evidence
practice
coreStatement
```

## Content Record Schema

内容库里的每一条照见文案统一使用：

```json
{
  "sceneId": "scene_01",
  "sceneName": "急涨追高",
  "mirrorId": "chase",
  "thief": "贪 · 急",
  "items": [
    {
      "id": "scene_01_001",
      "tradeMoment": "看着价格突然拉升时",
      "os": "卧槽，真拉了。",
      "hiddenThought": "我又慢了。",
      "reflection": "这一声卧槽，不是惊讶，是后悔。",
      "intensity": 4
    }
  ],
  "thiefExplain": ["贪，是想抓住这一波，不想再看别人赚钱。"],
  "evidences": ["我看见自己不是在追行情，我是在追那个不想落后的自己。"],
  "practices": ["急涨时先停三息。"],
  "coreStatement": "你追的不是上涨。你追的是，那个不想再错过的自己。"
}
```

`hiddenThought` 只作为后续活镜成长、月度报告、AI助教和真实交易复盘的隐藏字段，前台 V3.1 不展示。

## Live Insight Record Schema

后期活镜系统接入真实交易记录后，用户侧沉淀的照见记录统一使用：

```json
{
  "action": "补仓",
  "scene": "场景07",
  "thought": "再买一点。",
  "hiddenThought": "我不想认输。",
  "mirror": "补仓之镜",
  "thief": "痴 · 执",
  "evidence": "我看见自己不是在补仓，我是在补希望。",
  "practice": "补仓前重写一次进场理由。"
}
```

用户上传成交记录、持仓记录、交割单或截图后，系统先判断发生了什么动作，再自动进入对应场景。

## Scene Files

场景文件放在 `scenes/`，未来最多扩展到 36 个场景：

```text
scenes/
  manifest.json
  scene-01-chase-surge.json
  scene-02-missed.json
  scene-03-small-position.json
  scene-04-sold-too-early.json
  scene-08-hold-loss.json
  ...
  scene-36-xxx.json
```

每个场景文件承载该场景的交易现场小字、临盘 OS、隐藏念头、照回、固定心贼、心贼解释、心证、今日修行和核心命题。页面组件不要写死文案。

场景级字段用于统一 36 个场景的内容骨架：

```json
{
  "mirrorId": "chase",
  "thief": "贪 · 急",
  "items": [],
  "thiefExplain": [],
  "evidences": [],
  "practices": [],
  "coreStatement": ""
}
```
