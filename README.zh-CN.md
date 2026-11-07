# MSI Claw A8 Z2E Controller

[English](README.md) | 简体中文

> **测试设备安装/更新后必须正常重启，再进入 Gaming Mode。** 用户已确认 beta.3 重启后震动和三种背键模式正常。直接切回游戏模式仍会丢失内置控制器，原因未定位；beta.4 不声称修复该问题。请先保存工作。

beta.4 去掉应用按钮：模式点击即切换；震动滑块数值即时跟随，停顿约 200 毫秒自动保存。连续输入会合并，写入串行并读回；错误时停止后续写入并刷新实际状态。关闭面板会提交最后待保存的滑块值。打开面板本身不写硬件。新交互仍待真机验证。

**只有还在用旧名 Claw Controls 的用户需要先卸载。beta.3 用户可直接覆盖更新，无需卸载。** 旧名版本的卸载命令：

```sh
python3 ~/homebrew/plugins/ClawControls/installer.py uninstall
```

新版显示名、内部标识、安装目录和安装包均已更名。旧目录仍存在时安装器会拒绝安装，避免出现两份插件。卸载不会重置硬件设置。



MSI Claw A8 controller settings for Decky Loader. **Experimental 0.2.0-beta.4; not yet tested on physical hardware.**

## 在 SteamOS 一条命令安装

先安装 Decky Loader，在桌面模式打开 **Konsole**，粘贴：

```sh
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-z2e-back-buttons-rumble-decky/v0.2.0-beta.4/install.sh | bash
```

需要 `python3`、`curl`、`sudo` 和 systemd。终端可能要求 sudo 密码。默认 Decky 路径为当前用户的 `~/homebrew`；非标准位置使用 `bash -s -- install --decky-home /absolute/homebrew`。不要以 root 身份直接启动默认命令，否则默认主目录是 `/root`。

脚本从本仓库指定 Release 下载 ZIP 和 SHA-256 校验值，验证内容后才停止 Decky。校验用于发现损坏，不是独立数字签名。可先阅读 `install.sh` 和 `installer.py` 再运行。

## 卸载 / 干净重装

插件内有 **一键干净卸载** 和 **一键干净重装当前版本**，点击后确认即可。下载在停服务前完成；Decky 会短暂重启，其他插件也会暂时断开。安装失败会尝试恢复旧版本；恢复失败时保留 `.msi-claw-a8-z2e-controller-backup-*`。按钮提示“已安排”不等于任务成功；重启后检查状态，错误用下方日志命令检查。

插件打不开时用终端恢复：

```sh
# 干净重装同一测试版本
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-z2e-back-buttons-rumble-decky/v0.2.0-beta.4/install.sh | bash -s -- reinstall
# 干净卸载
curl -fsSL https://raw.githubusercontent.com/sekirofly/msi-claw-a8-z2e-back-buttons-rumble-decky/v0.2.0-beta.4/install.sh | bash -s -- uninstall
```

安装后也可离线卸载：

```sh
python3 ~/homebrew/plugins/MSIClawA8Z2EController/installer.py uninstall
```

“干净”删除 `plugins/MSIClawA8Z2EController`、`settings/MSIClawA8Z2EController`、`data/MSIClawA8Z2EController`、`logs/MSIClawA8Z2EController`。不删除其他插件、Decky 或修改系统只读分区。共享的 Decky 插件排序/隐藏记录不在文件清理范围内；以前隐藏或禁用过插件时，请在 Decky 设置恢复。系统日志按 systemd 策略保留。

**卸载、重装不重置硬件。** 控制器设置可能保存在设备中并影响 Windows。需要更改时先设置所需值，不猜测“出厂默认值”。不安装 HHD、不修改 InputPlumber、不创建常驻服务。

## 功能与兼容性

- M1/M2 共用模式：macro / combination / disabled；不修改具体按键映射。
- 左右马达独立 0–100%，滑动停顿约 200 毫秒后自动保存并读回确认；连续拖动会合并，写入不会并发。
- 动态发现 `/sys/class/hidraw/*/device` 的三个既有驱动属性。
- 没设备、多个候选设备、异常参数或读回不一致时报错。
- 左右马达是两次独立写入；第二次失败时第一项可能已生效，请刷新查看实际状态。

目标为用户提供的 MSI Claw A8 BZ2EM / SteamOS 3.9.5 / Decky 3.3.1 环境，尚未进行兼容性认证。需要内核提供 `mkeys_function`、`rumble_intensity_left`、`rumble_intensity_right`。root 用于 sysfs 写入和显式安装维护。维护仅操作固定插件目录、仓库和版本，不接受任意命令/URL。

## 故障诊断与真机验收

### 安装后手柄消失

[DeckyPlumber 的 README](https://github.com/aarron-lee/DeckyPlumber#quick-install--update)也要求安装后重启；其安装脚本重启 `plugin_loader.service`，没有自动重启 InputPlumber 或重新枚举控制器的恢复逻辑。这不能证明两个插件的原因相同。

目前无法确定是物理设备、InputPlumber 虚拟手柄还是 Steam 的发现过程异常。不会自动重启 InputPlumber、修改它的配置或复位 USB。要进一步定位，请在**断连时、重启前**记录一次，恢复后再记录一次：

```sh
sudo bash ~/homebrew/plugins/MSIClawA8Z2EController/diagnostics.sh > ~/msi-controller-before-reboot.txt
# 正常重启后：
sudo bash ~/homebrew/plugins/MSIClawA8Z2EController/diagnostics.sh > ~/msi-controller-after-reboot.txt
```

脚本只读取服务状态、输入/USB 设备列表及近期日志，不改变硬件、服务或上传数据。需要这两份报告才能选择有依据的免整机重启方案。

```sh
journalctl -u msi-claw-a8-z2e-controller-maintenance --no-pager -n 100
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


