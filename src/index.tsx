import { useEffect, useRef, useState } from 'react';
import { ButtonItem, PanelSection, PanelSectionRow, SliderField, ConfirmModal, showModal } from '@decky/ui';
import { callable, definePlugin } from '@decky/api';

type State = { ok: boolean; error?: string; mode: string; left: number; right: number };
const read = callable<[], State>('get_state');
const setMode = callable<[mode: string], State>('set_mode');
const setRumble = callable<[left: number, right: number], State>('set_rumble');
const maintenance = callable<[action: string], {ok: boolean; error?: string; message?: string}>('maintenance');
const modes = [{label: 'Macro / 普通映射', data: 'macro'}, {label: 'Combination / 组合键', data: 'combination'}, {label: 'Disabled / 关闭', data: 'disabled'}];

function Content() {
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
    if (mounted.current) { setSaving(true); setMessage('正在保存…'); }
    let failed = false;
    try {
      const result = modeChanged ? await setMode(target.mode) : await setRumble(target.left, target.right);
      if (!result.ok) throw new Error(result.error ?? '写入失败');
      actual.current = result;
      if (mounted.current) { setState(result); setMessage('已保存并读取硬件状态'); }
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
      if (mounted.current) setMessage(`保存失败，已停止后续写入，请检查当前状态：${String(error)}`);
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
      setMessage('已读取硬件实际状态');
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    mounted.current = true;
    void run(read);
    return () => { mounted.current = false; void flush(); };
  }, []);
  const modeLabel = (value: string) => modes.find(option => option.data === value)?.label ?? value;
  function maintain(action: 'uninstall' | 'reinstall') {
    showModal(<ConfirmModal strTitle={action === 'uninstall' ? '干净卸载 MSI Claw A8 Back Buttons & Rumble' : '干净重装 MSI Claw A8 Back Buttons & Rumble'}
      strDescription="仅清除本插件文件、配置和日志。硬件设置保持不变。重装会先下载并校验安装包；Decky 将短暂重启，其他插件也会暂时断开。"
      strOKButtonText="确认" strCancelButtonText="取消" onOK={() => {
        setBusy(true);
        void maintenance(action).then(result => {
          setMessage(result.ok ? result.message ?? '维护已安排' : result.error ?? '维护失败');
          setBusy(false);
        }).catch(error => { setMessage(String(error)); setBusy(false); });
      }} />);
  }
  return <>
    <PanelSection title="MSI Claw A8 Back Buttons & Rumble">
      <PanelSectionRow><div style={{fontSize: 12, overflowWrap: 'anywhere'}}>{message}</div></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || saving} onClick={() => void run(read)}>刷新硬件状态</ButtonItem></PanelSectionRow>
    </PanelSection>
    <PanelSection title="M1 / M2 共用模式">
      <PanelSectionRow><div>硬件当前模式：{state ? modeLabel(state.mode) : '尚未读取'}</div></PanelSectionRow>
      <PanelSectionRow><div>点击即切换；以硬件读回状态为准。</div></PanelSectionRow>
      {modes.map(option => <PanelSectionRow key={option.data}><ButtonItem layout="below" disabled={busy || !state}
        onClick={() => change(option.data)}>{mode === option.data ? '● ' : '○ '}{option.label}</ButtonItem></PanelSectionRow>)}
    </PanelSection>
    <PanelSection title="震动强度">
      <PanelSectionRow><SliderField label={`左马达 ${left}%`} value={left} min={0} max={100} step={5} disabled={busy || !state} onChange={value => change(undefined, 'left', value)} /></PanelSectionRow>
      <PanelSectionRow><SliderField label={`右马达 ${right}%`} value={right} min={0} max={100} step={5} disabled={busy || !state} onChange={value => change(undefined, 'right', value)} /></PanelSectionRow>
      <PanelSectionRow><div style={{fontSize: 12}}>拖动自动保存，连续调整会合并。可能影响 Windows；卸载不会重置硬件设置。</div></PanelSectionRow>
    </PanelSection>
    <PanelSection title="插件维护">
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || saving} onClick={() => maintain('reinstall')}>一键干净重装当前版本</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || saving} onClick={() => maintain('uninstall')}>一键干净卸载</ButtonItem></PanelSectionRow>
    </PanelSection>
  </>;
}
export default definePlugin(() => ({name: 'MSI Claw A8 Back Buttons & Rumble', content: <Content />, icon: <span>🎮</span>}));
