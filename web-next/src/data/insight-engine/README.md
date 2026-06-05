# Insight Engine

九镜照见内容引擎的数据层骨架。

当前阶段只建立结构，不一次性生成 36 个场景的全部内容。

## Flow

```text
scene
thought
reflection
thief
evidence
practice
```

## Record Schema

每一条照见内容统一使用：

```json
{
  "sceneId": "scene-01-chase-surge",
  "sceneName": "急涨时",
  "mirrorId": "chase",
  "intensity": 3,
  "thought": "我不能又慢一步。",
  "reflection": "你怕的不是错过行情，而是再次证明自己比别人慢。",
  "thief": "贪 · 急",
  "evidence": "我看见自己不是在追行情，而是在追那个不想再慢一步的自己。",
  "practice": "下次急涨前，先把手离开鼠标十秒，只问：这是规则，还是怕慢？"
}
```

## Scene Files

场景文件放在 `scenes/`，未来最多扩展到 36 个场景：

```text
scenes/
  manifest.json
  scene-01-chase-surge.json
  scene-02-missed.json
  ...
  scene-36-xxx.json
```

每个场景文件只负责承载该场景下的多镜、多强度内容。页面组件不要写死文案。
