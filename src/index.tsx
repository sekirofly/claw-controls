import { useEffect, useState } from 'react';
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
  async function run(operation: () => Promise<State>, syncMode = true) {
    setBusy(true);
    try {
      const result = await operation();
      if (!result.ok) { setState(undefined); throw new Error(result.error); }
      setState(result); if (syncMode) modeChange(result.mode); leftChange(result.left); rightChange(result.right);
      setMessage('已读取硬件实际状态');
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  }
  useEffect(() => { void run(read); }, []);
  const modeLabel = (value: string) => modes.find(option => option.data === value)?.label ?? value;
  function applyMode() {
    if (!state || busy || mode === state.mode) return;
    const selected = mode;
    showModal(<ConfirmModal strTitle="确认应用背键模式"
      strDescription={`硬件当前：${modeLabel(state.mode)}。将切换为：${modeLabel(selected)}。可能影响 Windows；选择列表本身不会写入硬件。`}
      strOKButtonText="应用" strCancelButtonText="取消"
      onOK={() => { void run(() => setMode(selected)); }} />);
  }
  function maintain(action: 'uninstall' | 'reinstall') {
    showModal(<ConfirmModal strTitle={action === 'uninstall' ? '干净卸载 MSI Claw A8 Z2E Controller' : '干净重装 MSI Claw A8 Z2E Controller'}
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
    <PanelSection title="MSI Claw A8 Z2E Controller · 测试版">
      <PanelSectionRow><div style={{fontSize: 12, overflowWrap: 'anywhere'}}>{message}</div></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => void run(read)}>刷新硬件状态</ButtonItem></PanelSectionRow>
    </PanelSection>
    <PanelSection title="M1 / M2 共用模式">
      <PanelSectionRow><div>硬件当前模式：{state ? modeLabel(state.mode) : '尚未读取'}</div></PanelSectionRow>
      <PanelSectionRow><div>待应用模式：{state ? modeLabel(mode) : '尚未读取'}{state && mode !== state.mode ? '（未写入）' : ''}</div></PanelSectionRow>
      {modes.map(option => <PanelSectionRow key={option.data}><ButtonItem layout="below" disabled={busy || !state}
        onClick={() => modeChange(option.data)}>{mode === option.data ? '● ' : '○ '}{option.label}</ButtonItem></PanelSectionRow>)}
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || !state || mode === state.mode} onClick={applyMode}>应用背键模式</ButtonItem></PanelSectionRow>
    </PanelSection>
    <PanelSection title="震动强度">
      <PanelSectionRow><SliderField label={`左马达 ${left}%`} value={left} min={0} max={100} step={5} disabled={busy || !state} onChange={leftChange} /></PanelSectionRow>
      <PanelSectionRow><SliderField label={`右马达 ${right}%`} value={right} min={0} max={100} step={5} disabled={busy || !state} onChange={rightChange} /></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || !state || (left === state.left && right === state.right)} onClick={() => void run(() => setRumble(left, right), false)}>应用震动强度</ButtonItem></PanelSectionRow>
      <PanelSectionRow><div style={{fontSize: 12}}>仅点击应用时写入。可能影响 Windows；卸载不会重置硬件设置。</div></PanelSectionRow>
    </PanelSection>
    <PanelSection title="插件维护">
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => maintain('reinstall')}>一键干净重装当前版本</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => maintain('uninstall')}>一键干净卸载</ButtonItem></PanelSectionRow>
    </PanelSection>
  </>;
}
export default definePlugin(() => ({name: 'MSI Claw A8 Z2E Controller', content: <Content />, icon: <span>🎮</span>}));
