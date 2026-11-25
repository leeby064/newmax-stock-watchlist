# Build Plan

## Visible Build Trace

| Phase | Status | Step | Evidence |
|------|--------|------|----------|
| requirements | done | 窗口拉行情，面板管名单，信息卡做指标 | REQUIREMENTS.md |
| plan | done | 面板与信息卡不联网，窗口请求 qt.gtimg.cn | DESIGN_SYSTEM.md |
| generate | done | 面板和窗口改成与信息卡相同的行情行 | src/panel.html, src/index.html, src/tape-ui.js |
| run | done | preview_app 打开窗口、面板和信息卡 | 2026-11-07 预览 |
| validate | done | 添加、隔离提示、置顶、信息卡截图 | ACCEPTANCE.md |

## App Structure

```txt
app-93d2605b-89c6-44e4-9d4e-aad4a01c9ea5/
  newmax.app.json
  src/index.html
  src/app.js
  src/quote.js
  src/search.js
  src/store.js
  src/styles.css
  src/panel.html
  src/panel.js
  src/panel.css
  src/card.html
  src/card.js
  src/card.css
  backend/quote_server.py
  backend/quote_server.sh
```

## Current Implementation Tasks

- 恢复 `entry.frontend`（`src/index.html`），保留 `setup` 面板（`dock` / `workbench`）与 `tape` 信息卡（`info-card/section`）；打开独立窗口时由 NewMax 自动拉起本机后台服务 `backend/quote_server.py`。
- 停靠面板点击刷新按钮时，通过 `tape.control.refreshRequestedAt` 通知后台服务立即补拉（2 秒内响应），并轮询本地数据回显；若后台未运行则明确提示从侧栏「股价追踪」打开一次窗口恢复同步。
- 停靠面板用本地常见名称或精确代码添加自选股，并支持点击展开详情、More 菜单置顶/移除（二次确认）以及整行拖拽（浮动幽灵卡片 + 占位槽）和键盘排序。
- 信息卡以最多 3 行 macOS 行情样式显示前 3 只；分时来自窗口或后台服务写入的分钟序列。

## Future Edit Protocol

- 改功能先更新 REQUIREMENTS.md。
- 改代码后更新本文件的验证路径。
- 验收结果写入 ACCEPTANCE.md。
