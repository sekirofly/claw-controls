# MSI Claw A8 Back Buttons & Rumble

[English](README.md) | 简体中文

适用于 **MSI Claw A8（AMD Ryzen Z2 Extreme / BZ2EM）** 的 Decky 插件：切换 M1/M2 背键模式，分别调节左右震动强度。社区项目，非 MSI 官方产品；未确认其他 Claw 型号兼容性。

## 安装

先安装 Decky Loader。在 SteamOS 桌面模式打开 Konsole，以普通桌面用户运行：

```sh
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-back-buttons-rumble/v1.0.0/install.sh | bash
```

**安装、更新或重装后，请保存工作并正常重启，再进入 Gaming Mode。** 测试设备在安装后直接切回游戏模式可能无法识别内置手柄；重启后恢复。原因尚未确定。

**如果重启后仍有震动消失或控制器异常，可能需要重置 EC。** 测试者反馈一次震动消失通过 EC 重置恢复。这是故障排查选项，并非每次安装必做，也不保证解决所有问题。请保存工作，按 [MSI 官方 EC 重置说明](https://www.msi.com/support/technical_details/HH_EC_Reset)操作。插件不会自动重置 EC；恢复后请刷新并核对硬件实际设置。

需要 Python 3、curl、sudo 和 systemd。Decky 默认位置为 `~/homebrew`；其他位置可将末尾 `bash` 改成 `bash -s -- install --decky-home /absolute/homebrew`。不要以 root 启动默认命令，否则会使用 `/root/homebrew`。

安装器先下载固定版本并验证 ZIP 和 SHA-256，再短暂重启 Decky；其他插件会暂时断开。失败时尝试回滚。校验值用于检查损坏，不是独立数字签名。可阅读 [install.sh](install.sh) 和 [installer.py](installer.py)检查流程。

## 使用

- **M1/M2 模式：**点击 Macro、Combination 或 Disabled 即时切换。两个背键共用一个模式，不改变具体按键映射。
- **震动：**左右滑块独立调节 0–100%。数值立即跟随，停顿约 200 毫秒后自动保存。
- 写入串行执行并读回确认；连续滑动会合并，关闭面板时保存最后待提交的值。
- 失败后停止后续写入并刷新实际状态。左右马达分两次写入，一边失败时另一边可能已生效。
- 打开插件本身只读取硬件。设置可能保存在控制器中并影响 Windows；卸载不会恢复硬件默认值。

## 卸载与重装

插件内提供“干净卸载”和“干净重装当前版本”，均需确认。插件打不开时可用：

```sh
# 重装
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-back-buttons-rumble/v1.0.0/install.sh | bash -s -- reinstall
# 卸载
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-back-buttons-rumble/v1.0.0/install.sh | bash -s -- uninstall
# 离线卸载
python3 ~/homebrew/plugins/msi-claw-a8-back-buttons-rumble/installer.py uninstall
```

仅清理 Decky 的 `plugins/`、`settings/`、`data/`、`logs/` 下名为 `msi-claw-a8-back-buttons-rumble` 的本插件目录。不删除其他插件、Decky 或重置硬件。共享的排序/隐藏/禁用记录和系统日志由 Decky/系统管理。“维护已安排”不代表成功，请重启后验证；回滚失败时保留 `.msi-claw-a8-back-buttons-rumble-backup-*` 供恢复。

## 兼容性与已知限制

测试者反馈 A8 在重启后，及一次震动丢失进行 EC 重置后，震动和三个背键模式均可使用。反馈环境为 SteamOS 3.9.5 / Decky 3.3.1；这是单台设备反馈，不是全面兼容性认证。重启及可能的 EC 恢复需求仍是 v1.0.0 的已知限制。

内核需在唯一的 `/sys/class/hidraw/*/device` 下提供 `mkeys_function`、`rumble_intensity_left`、`rumble_intensity_right`。无设备或多个候选时拒绝写入。root 权限用于 sysfs 写入及用户明确请求的维护。不刷固件、不安装 HHD、不修改 InputPlumber、不复位 USB、不安装常驻后台服务。

## 诊断

```sh
journalctl -u msi-claw-a8-back-buttons-rumble-maintenance --no-pager -n 100
sudo bash ~/homebrew/plugins/msi-claw-a8-back-buttons-rumble/diagnostics.sh
```

诊断脚本只读取本地服务、设备及近期日志，不上传或修改任何状态。

## 开发

需要 Node 22、pnpm 11.25.0、Python 3.11+：

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
node --test tests/frontend.cjs
python3 -m unittest discover -s tests -v
python3 scripts/package.py
```

Linux CI 验证并打包。测试使用模拟硬件，不能代替真机验证。因 Decky/React 声明差异，TypeScript 跳过第三方类型声明检查，但检查本项目源码。

| 项目 | 名称 |
| --- | --- |
| Decky 显示名 | MSI Claw A8 Back Buttons & Rumble |
| 仓库、包名、目录标识 | `msi-claw-a8-back-buttons-rumble` |
| 安装包 | `msi-claw-a8-back-buttons-rumble.zip` |
| 维护任务 | `msi-claw-a8-back-buttons-rumble-maintenance` |

## 分发与许可

通过 GitHub Releases 分发，未上架 Decky 商店。2026-11-07 查阅的[商店提交模板](https://github.com/SteamDeckHomebrew/decky-plugin-database/blob/main/.github/PULL_REQUEST_TEMPLATE/plugin_addition.md)包含本 AI 辅助项目无法如实满足的代码作者声明。

项目代码采用 MIT；安装包包含 SteamDeckHomebrew Team 的 `@decky/api` 1.1.3 源码和 LGPL-2.1 许可，以及可重新构建前端的源码/配置。UI 与 React 由 Decky 提供，第三方依赖保留各自许可。
