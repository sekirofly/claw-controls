# Claw Controls

MSI Claw A8 controller settings for Decky Loader. **Experimental 0.2.0-beta.1; not yet tested on physical hardware.**

## 在 SteamOS 一条命令安装

先安装 Decky Loader，在桌面模式打开 **Konsole**，粘贴：

```sh
curl -fsSL https://raw.githubusercontent.com/sekirofly/claw-controls/v0.2.0-beta.1/install.sh | bash
```

需要 `python3`、`curl`、`sudo` 和 systemd。终端可能要求 sudo 密码。默认 Decky 路径为当前用户的 `~/homebrew`；非标准位置使用 `bash -s -- install --decky-home /absolute/homebrew`。不要以 root 身份直接启动默认命令，否则默认主目录是 `/root`。

脚本从本仓库指定 Release 下载 ZIP 和 SHA-256 校验值，验证内容后才停止 Decky。校验用于发现损坏，不是独立数字签名。可先阅读 `install.sh` 和 `installer.py` 再运行。

## 卸载 / 干净重装

插件内有 **一键干净卸载** 和 **一键干净重装当前版本**，点击后确认即可。下载在停服务前完成；Decky 会短暂重启，其他插件也会暂时断开。安装失败会尝试恢复旧版本；恢复失败时保留 `.claw-controls-backup-*`。按钮提示“已安排”不等于任务成功；重启后检查状态，错误用下方日志命令检查。

插件打不开时用终端恢复：

```sh
# 干净重装同一测试版本
curl -fsSL https://raw.githubusercontent.com/sekirofly/claw-controls/v0.2.0-beta.1/install.sh | bash -s -- reinstall
# 干净卸载
curl -fsSL https://raw.githubusercontent.com/sekirofly/claw-controls/v0.2.0-beta.1/install.sh | bash -s -- uninstall
```

安装后也可离线卸载：

```sh
python3 ~/homebrew/plugins/ClawControls/installer.py uninstall
```

“干净”删除 `plugins/ClawControls`、`settings/ClawControls`、`data/ClawControls`、`logs/ClawControls`。不删除其他插件、Decky 或修改系统只读分区。共享的 Decky 插件排序/隐藏记录不在文件清理范围内；以前隐藏或禁用过插件时，请在 Decky 设置恢复。系统日志按 systemd 策略保留。

**卸载、重装不重置硬件。** 控制器设置可能保存在设备中并影响 Windows。需要更改时先显式应用，不猜测“出厂默认值”。不安装 HHD、不修改 InputPlumber、不创建常驻服务。

## 功能与兼容性

- M1/M2 共用模式：macro / combination / disabled；不修改具体按键映射。
- 左右马达独立 0–100%，仅点击“应用”才写入并读回确认。
- 动态发现 `/sys/class/hidraw/*/device` 的三个既有驱动属性。
- 没设备、多个候选设备、异常参数或读回不一致时报错。
- 左右马达是两次独立写入；第二次失败时第一项可能已生效，请刷新查看实际状态。

目标为用户提供的 MSI Claw A8 BZ2EM / SteamOS 3.9.5 / Decky 3.3.1 环境，尚未进行兼容性认证。需要内核提供 `mkeys_function`、`rumble_intensity_left`、`rumble_intensity_right`。root 用于 sysfs 写入和显式安装维护。维护仅操作固定插件目录、仓库和版本，不接受任意命令/URL。

## 故障诊断与真机验收

```sh
journalctl -u claw-controls-maintenance --no-pager -n 100
systemctl status plugin_loader.service
```

验收：只读刷新 → 应用模式/左右震动并核对实际效果 → 重启 → 干净重装 → 卸载并检查其他插件仍在。自动测试不能替代真机测试。首次试用前记录原来的三个硬件值。

## 构建与发布

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
python3 -m unittest discover -s tests -v
python3 scripts/package.py
```

Node 22、pnpm 11.25.0、Python 3.11+。TypeScript 跳过第三方库声明文件（Decky/React 声明存在差异），仍检查本项目。CI 在 Linux 构建、测试并产出 ZIP/校验文件。发布前同步 package.json、plugin.json、installer.py、install.sh 和文档版本号；将 CI ZIP 与校验文件附到同一 Release。未真机验收版本使用 prerelease。

## Decky 商店状态

未上架、未提交审核。2026-11-07 查阅的[官方新增插件模板](https://github.com/SteamDeckHomebrew/decky-plugin-database/blob/main/.github/PULL_REQUEST_TEMPLATE/plugin_addition.md)要求声明多数代码不是由生成式 AI 编写，本项目主要由 AI 辅助编写，无法如实勾选。还需 SteamOS 渠道和第三方测试。现阶段采用 GitHub Release 分发，不声称通过商店审核。

## 来源与许可

由用户提供的 `ClawControls_Decky_v0.1.0.zip` 原型整理。前端改用官方 `@decky/api` / `@decky/ui`，不手写内部连接协议。项目 MIT；第三方依赖保留各自许可。安装包附带 SteamDeckHomebrew Team 的 `@decky/api` 1.1.3 原始源码及 LGPL-2.1 许可，以及可重新构建前端的源码/配置；可修改替换该库并重新构建。UI 和 React 由 Decky 主程序提供。
