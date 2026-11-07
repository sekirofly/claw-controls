import { useEffect, useState } from 'react';
import { ButtonItem, DropdownItem, PanelSection, PanelSectionRow, SliderField, ConfirmModal, showModal } from '@decky/ui';
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
  async function run(operation: () => Promise<State>) {
    setBusy(true);
    try {
      const result = await operation();
      if (!result.ok) { setState(undefined); throw new Error(result.error); }
      setState(result); modeChange(result.mode); leftChange(result.left); rightChange(result.right);
      setMessage('已读取硬件实际状态');
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  }
  useEffect(() => { void run(read); }, []);
  function maintain(action: 'uninstall' | 'reinstall') {
    showModal(<ConfirmModal strTitle={action === 'uninstall' ? '干净卸载 Claw Controls' : '干净重装 Claw Controls'}
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
    <PanelSection title="Claw Controls · 测试版">
      <PanelSectionRow><div style={{fontSize: 12, overflowWrap: 'anywhere'}}>{message}</div></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => void run(read)}>刷新硬件状态</ButtonItem></PanelSectionRow>
    </PanelSection>
    <PanelSection title="M1 / M2 共用模式">
      <PanelSectionRow><DropdownItem label="工作模式" rgOptions={modes} selectedOption={mode} disabled={busy || !state}
        onChange={option => modeChange(option.data)} /></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || !state || mode === state.mode} onClick={() => void run(() => setMode(mode))}>应用背键模式</ButtonItem></PanelSectionRow>
    </PanelSection>
    <PanelSection title="震动强度">
      <PanelSectionRow><SliderField label={`左马达 ${left}%`} value={left} min={0} max={100} step={5} disabled={busy || !state} onChange={leftChange} /></PanelSectionRow>
      <PanelSectionRow><SliderField label={`右马达 ${right}%`} value={right} min={0} max={100} step={5} disabled={busy || !state} onChange={rightChange} /></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy || !state || (left === state.left && right === state.right)} onClick={() => void run(() => setRumble(left, right))}>应用震动强度</ButtonItem></PanelSectionRow>
      <PanelSectionRow><div style={{fontSize: 12}}>仅点击应用时写入。可能影响 Windows；卸载不会重置硬件设置。</div></PanelSectionRow>
    </PanelSection>
    <PanelSection title="插件维护">
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => maintain('reinstall')}>一键干净重装当前版本</ButtonItem></PanelSectionRow>
      <PanelSectionRow><ButtonItem layout="below" disabled={busy} onClick={() => maintain('uninstall')}>一键干净卸载</ButtonItem></PanelSectionRow>
    </PanelSection>
  </>;
}
export default definePlugin(() => ({name: 'Claw Controls', content: <Content />, icon: <span>🎮</span>}));
