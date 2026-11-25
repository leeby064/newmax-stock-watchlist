<!-- newmax-app:app-93d2605b-89c6-44e4-9d4e-aad4a01c9ea5:start -->
# 股价追踪

[built by newmax](https://newmax.ai)

在侧栏停靠面板和独立窗口管理自选股，信息卡显示前 3 只。打开窗口启动本机后台服务后自动同步现价与分时。

## 功能 / Features

- 保留独立窗口、侧栏停靠/工作台面板与信息卡三种形态：打开独立窗口可拉取行情并启动本机后台服务，侧栏面板管理自选股，信息卡显示前 3 只。
- 可在窗口或停靠面板输入常见名称、简称或精确代码（A股、港股、美股）加入自选列表，由窗口或本机后台服务自动拉取名称、现价、涨跌幅和分时走势；拉不到现价时不写入假价格。
- 关注列表保存在本机，重新打开后仍在；停靠面板支持点击展开详情、More 菜单置顶/移除（二次确认）以及整行拖拽和键盘排序，前 3 只自动同步到信息卡。
- 点击面板刷新按钮时向后台服务发起补拉请求并同步最新本地行情；若后台服务未运行或拉取失败，保留上次行情并明确提示打开窗口恢复同步。
- 信息卡在 252×160 内以最多 3 行显示已保存的代码、名称、现价和涨跌方向；有上一交易日或当日分时才画走势，不编造曲线；不显示更新时间；价格字号与代码、名称对应，并带货币符号；没有数据时说明去侧栏面板添加；不重复应用标题。外壳背景和边框透明，不另铺卡片底。
- 空列表、加载中和错误都有可见说明；涨跌不只靠颜色区分。
- 窗口、停靠面板和信息卡的行情行同构：代码、名称、有数据才画的分时、现价和带正负号的涨跌。

## 源码 / Source

- [浏览应用源码 / Browse source](newmax-apps/app-93d2605b-89c6-44e4-9d4e-aad4a01c9ea5/)
- [应用原始文档 / App documentation](newmax-apps/app-93d2605b-89c6-44e4-9d4e-aad4a01c9ea5/README.md)
- 版本 / Version: 1\.0\.1
- NewMax runtime: ^1\.0\.0
- 权限 / Permissions: data\.kv
- [本次发布 / Release](https://github.com/leeby064/newmax-stock-watchlist/releases/tag/app-75e3d208-7e2a-45fe-831e-25034ebbd9b6)

## 安装 / Install

1. 安装并打开 / Install and open [NewMax](https://newmax.ai).
2. 本地应用 → 激活应用。 / Local apps → Activate app.
3. 粘贴下方完整口令，等待下载校验。 / Paste the full code below and wait for verification.
4. 检查来源与权限后，点击「信任并安装」。 / Review the publisher and permissions, then choose Trust and install.

```text
NEWMAX-APP:1:leeby064/newmax-stock-watchlist/app-75e3d208-7e2a-45fe-831e-25034ebbd9b6:2bb9f1c15cbaea5c4695e6e6be70897a7da92ce5390cc5289fdcec67fde00526
```

无需 GitHub 登录；安装后需手动打开应用。口令对应此版本，旧口令不会自动升级。
No GitHub sign-in is required. Open the app manually after installation. Each code installs a fixed snapshot.

## 使用说明 / Notes

这是依赖 NewMax 的应用源码，不是独立系统安装程序。个人数据、账号密钥与开发对话不随包分发；外部服务、连接器和依赖可能需要自行配置。
This app requires NewMax. Personal data, credentials and development chats are not included. External services, connectors and dependencies may need separate setup.

许可证请查看源码中的 LICENSE 或原始文档；此发布流程不会自动添加或修改许可。
See the source LICENSE or original documentation for licensing. Publishing does not assign or change a license.
<!-- newmax-app:app-93d2605b-89c6-44e4-9d4e-aad4a01c9ea5:end -->

# newmax-stock-watchlist
Public NewMax app shares
