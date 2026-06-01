# Contracts

这里放 Web、小程序、后台和后端共用的数据结构约定。

当前已新增：

- `assessment-report.schema.json`：测评报告统一 schema。
- `assessment-report.example.json`：符合 schema 的示例报告。
- `assessment-report-schema.test.mjs`：轻量测试，确保必填字段和合规提示不漂移。
- `data-binding.d.ts`：测评报告、训练记录、K 线训练记录、复测变化和 admin 列表共用的最小 API 类型。
- `living-mirror.d.ts`：Sprint 9 之后共用的心镜报告、训练记录、真实交易复盘、活镜成长、助教承接和全球照见层类型。
- `living-mirror-contract.test.mjs`：轻量测试，确保活镜路线与共享类型包含核心字段、九面心镜和合规边界。

本目录暂不引入运行时依赖，不绑定具体前端或后端构建系统。`web-next` 与 `server` 已开始兼容 `assessment_report_v1`；小程序后续再接入同一结构。
