import { useEffect, useRef, useState } from 'react';
import { ButtonItem, PanelSection, PanelSectionRow, SliderField, ConfirmModal, showModal } from '@decky/ui';
import { callable, definePlugin } from '@decky/api';

// Same locale source as Decky Loader. Unsupported or unavailable locales use English.
const translations: Record<string, string> = {
  "Macro / 普通映射": "Macro / Mapping",
  "Combination / 组合键": "Combination / Shortcuts",
  "Disabled / 关闭": "Disabled / Off",
  "正在保存…": "Saving…",
  "写入失败": "Write failed",
  "已保存并读取硬件状态": "Saved and verified",
  "保存失败，已停止后续写入，请检查当前状态：": "Save failed. Queued writes stopped; check the current state: ",
  "已读取硬件实际状态": "Hardware state refreshed",
  "干净卸载 MSI Claw A8 Back Buttons & Rumble": "Uninstall MSI Claw A8 Back Buttons & Rumble",
  "干净重装 MSI Claw A8 Back Buttons & Rumble": "Reinstall MSI Claw A8 Back Buttons & Rumble",
  "仅清除本插件文件、配置和日志。硬件设置保持不变。重装会先下载并校验安装包；Decky 将短暂重启，其他插件也会暂时断开。": "Only this plugin’s files, settings and logs are removed. Hardware settings stay unchanged. Reinstallation downloads and verifies the package first. Decky restarts briefly, interrupting other plugins.",
  "确认": "Confirm",
  "取消": "Cancel",
  "维护已安排": "Maintenance scheduled. Decky will restart briefly. Check the service journal if it fails.",
  "维护失败": "Maintenance failed",
  "刷新硬件状态": "Refresh hardware state",
  "M1 / M2 共用模式": "M1 / M2 shared mode",
  "硬件当前模式：": "Current hardware mode: ",
  "尚未读取": "Not read yet",
  "点击即切换；以硬件读回状态为准。": "Click to switch. The displayed hardware state is read back from the device.",
  "震动强度": "Rumble strength",
  "左马达": "Left motor",
  "右马达": "Right motor",
  "拖动自动保存，连续调整会合并。可能影响 Windows；卸载不会重置硬件设置。": "Sliders save automatically; continuous changes are combined. Settings may affect Windows. Uninstalling does not reset hardware.",
  "插件维护": "Plugin maintenance",
  "一键干净重装当前版本": "Clean reinstall current version",
  "一键干净卸载": "Clean uninstall",
  "Claw HID 控制接口未找到。请确认 MSI Claw 驱动已加载。": "Claw HID controls were not found. Check that the MSI Claw driver is loaded.",
  "发现多个候选 Claw 设备，为避免误操作已停止写入。": "Multiple Claw devices found. Writes are blocked to avoid changing the wrong device.",
  "无法识别背键模式：": "Unrecognized back-button mode: ",
  "驱动返回的震动范围异常。": "The driver returned an invalid rumble strength.",
  "需要 root 权限；请检查 Decky 插件的 root 标志。": "Root permission is required. Check the plugin root flag.",
  "无效模式，只允许 macro / combination / disabled": "Invalid mode. Expected macro, combination or disabled.",
  "背键模式写入后读取不匹配。": "Back-button mode read-back did not match the requested value.",
  "震动强度必须是整数。": "Rumble strength must be an integer.",
  "震动强度必须在 0–100 之间。": "Rumble strength must be between 0 and 100.",
  "震动强度写入后读取不匹配。": "Rumble read-back did not match the requested values."
};
function t(text: string): string {
  const locale = typeof navigator === 'undefined' ? 'en' : navigator.language;
  if (/^zh(?:[-_]|$)/i.test(locale ?? '')) return text;
  let result = text;
  for (const key of Object.keys(translations).sort((a, b) => b.length - a.length)) {
    result = result.split(key).join(translations[key]);
  }
  return result;
}

type State = { ok: boolean; error?: string; mode: string; left: number; right: number };
const read = callable<[], State>('get_state');
const setMode = callable<[mode: string], State>('set_mode');
const setRumble = callable<[left: number, right: number], State>('set_rumble');
const maintenance = callable<[action: string], {ok: boolean; error?: string; message?: string}>('maintenance');


function Content() {
  const modes = [{label: t("Macro / 普通映射"), data: 'macro'}, {label: t("Combination / 组合键"), data: 'combination'}, {label: t("Disabled / 关闭"), data: 'disabled'}];
  const [state, setState] = useState<State>();
  const [mode, modeChange] = useState('macro');
  const [left, leftChange] = useState(50);
  const [right, rightChange] = useState(50);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const actual = useRef<State | undefined>(undefined);
  const desired = useRef<State | undefined>(undefined);
  const writing = useRef(false);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function display(result: State) {
    if (!mounted.current) return;
    setState(result); modeChange(result.mode); leftChange(result.left); rightChange(result.right);
  }
  async function flush() {
    if (timer.current) { clearTimeout(timer.current); timer.current = undefined; }
    if (writing.current || !actual.current || !desired.current) return;
    const target = {...desired.current};
    const current = actual.current;
    const modeChanged = target.mode !== current.mode;
    if (!modeChanged && target.left === current.left && target.right === current.right) {
      if (mounted.current) setSaving(false);
      return;
    }
    writing.current = true;
    if (mounted.current) { setSaving(true); setMessage(t("正在保存…")); }
    let failed = false;
    try {
      const result = modeChanged ? await setMode(target.mode) : await setRumble(target.left, target.right);
      if (!result.ok) throw new Error(result.error ?? t("写入失败"));
      actual.current = result;
      if (mounted.current) { setState(result); setMessage(t("已保存并读取硬件状态")); }
    } catch (error) {
      failed = true;
      // Stop queued writes after failure. Read back partial writes without retrying them.
      desired.current = undefined;
      try {
        const result = await read();
        if (!result.ok) throw new Error(result.error);
        actual.current = result; desired.current = {...result}; display(result);
      } catch {
        actual.current = undefined;
        if (mounted.current) setState(undefined);
      }
      if (mounted.current) setMessage(t("保存失败，已停止后续写入，请检查当前状态：") + t(String(error)));
    } finally {
      writing.current = false;
      if (failed) { if (mounted.current) setSaving(false); }
      else if (!timer.current) void flush();
    }
  }
  function change(modeValue?: string, motor?: 'left' | 'right', value?: number) {
    if (!desired.current || busy) return;
    const next = {...desired.current};
    if (modeValue !== undefined) { next.mode = modeValue; modeChange(modeValue); }
    if (motor && value !== undefined) {
      next[motor] = Math.max(0, Math.min(100, Math.round(value)));
      if (motor === 'left') leftChange(next.left); else rightChange(next.right);
    }
    desired.current = next;
    setSaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    if (modeValue !== undefined) void flush();
    else timer.current = setTimeout(() => { timer.current = undefined; void flush(); }, 200);
  }
  async function run(operation: () => Promise<State>, syncMode = true) {
    setBusy(true);
    try {
      const result = await operation();
      if (!result.ok) { setState(undefined); throw new Error(result.error); }
      setState(result); if (syncMode) modeChange(result.mode); leftChange(result.left); rightChange(result.right);
      actual.current = result; desired.current = {...result};
      setMessage(t("已读取硬件实际状态"));
    } catch (error) { setMessage(t(String(error))); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    mounted.current = true;
    void run(read);
    return () => { mounted.current = false; void flush(); };
  }, []);
  const modeLabel = (value: string) => modes.find(option => option.data === value)?.label ?? value;
  function maintain(action: 'uninstall' | 'reinstall') {
    showModal(<ConfirmModal strTitle={action === 'uninstall' ? t("干净卸载 MSI Claw A8 Back Buttons & Rumble") : t("干净重装 MSI Claw A8 Back Buttons & Rumble")}
      strDescription={t("仅清除本插件文件、配置和日志。硬件设置保持不变。重装会先下载并校验安装包；Decky 将短暂重启，其他插件也会暂时断开。")}
      strOKButtonText={t("确认")} strCancelButtonText={t("取消")} onOK={() => {
        setBusy(true);
        void maintenance(action).then(result => {
          setMessage(result.ok ? t("维护已安排") : t(result.error ?? "维护失败"));
          setBusy(false);
        }).catch(error => { setMessage(t(String(error))); setBusy(false); });
      }} />);
  }
  return <>
    <PanelSection title="MSI Claw A8 Back Buttons & Rumble">
      <PanelSectionRow><div style={{fontSize: 12, overflowWrap: 'anywhere'}}>{message}</div></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || saving} onClick={() => void run(read)}>{t("刷新硬件状态")}</ButtonItem></PanelSectionRow>
    </PanelSection>
    <PanelSection title={t("M1 / M2 共用模式")}>
      <PanelSectionRow><div>{t("硬件当前模式：")}{state ? modeLabel(state.mode) : t("尚未读取")}</div></PanelSectionRow>
      <PanelSectionRow><div>{t("点击即切换；以硬件读回状态为准。")}</div></PanelSectionRow>
      {modes.map(option => <PanelSectionRow key={option.data}><ButtonItem layout="below" disabled={busy || !state}
        onClick={() => change(option.data)}>{mode === option.data ? '● ' : '○ '}{option.label}</ButtonItem></PanelSectionRow>)}
    </PanelSection>
    <PanelSection title={t("震动强度")}>
      <PanelSectionRow><SliderField label={`${t("左马达")} ${left}%`} value={left} min={0} max={100} step={5} disabled={busy || !state} onChange={value => change(undefined, 'left', value)} /></PanelSectionRow>
      <PanelSectionRow><SliderField label={`${t("右马达")} ${right}%`} value={right} min={0} max={100} step={5} disabled={busy || !state} onChange={value => change(undefined, 'right', value)} /></PanelSectionRow>
      <PanelSectionRow><div style={{fontSize: 12}}>{t("拖动自动保存，连续调整会合并。可能影响 Windows；卸载不会重置硬件设置。")}</div></PanelSectionRow>
    </PanelSection>
    <PanelSection title={t("插件维护")}>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || saving} onClick={() => maintain('reinstall')}>{t("一键干净重装当前版本")}</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || saving} onClick={() => maintain('uninstall')}>{t("一键干净卸载")}</ButtonItem></PanelSectionRow>
    </PanelSection>
  </>;
}
export default definePlugin(() => ({name: 'MSI Claw A8 Back Buttons & Rumble', content: <Content />, icon: <span>🎮</span>}));
