const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const {create, act} = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'de-DE', undefined]) {
test(`localized controls and interaction: ${locale ?? 'missing locale'}`, async () => {
  Object.defineProperty(global, 'navigator', {value: locale ? {language: locale} : undefined, configurable: true});
  const chinese = locale?.startsWith('zh');
  const calls = [];
  let modal;
  let failure = false;
  let hold;
  let hardware = {ok: true, mode: 'macro', left: 80, right: 90};
  const ui = {};
  for (const name of ['ButtonItem', 'PanelSection', 'PanelSectionRow', 'SliderField', 'ConfirmModal']) {
    ui[name] = props => React.createElement(name, props, props.children);
  }
  ui.showModal = element => { modal = element; };
  const api = {definePlugin: factory => factory, callable: name => async (...args) => {
    calls.push([name, ...args]);
    if (name === 'set_rumble' && hold) await hold;
    if (name === 'set_mode' && failure) return {ok: false, error: '背键模式写入后读取不匹配。'};
    if (name === 'set_mode') hardware = {...hardware, mode: args[0]};
    if (name === 'set_rumble') hardware = {...hardware, left: args[0], right: args[1]};
    return {...hardware};
  }};
  const filename = path.resolve('src/index.tsx');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020}
  }).outputText;
  const module = new Module(filename, moduleParent());
  module.filename = filename;
  module.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = module.require.bind(module);
  module.require = name => name === '@decky/ui' ? ui : name === '@decky/api' ? api : originalRequire(name);
  module._compile(compiled, filename);
  let renderer;
  await act(async () => { renderer = create(module.exports.default().content); });
  const button = text => renderer.root.findAllByType('ButtonItem').find(node => String(node.props.children).includes(text));
  const text = () => JSON.stringify(renderer.toJSON());
  assert.deepEqual(calls, [['get_state']]);
  if (!chinese) assert.doesNotMatch(text(), /[\u3400-\u9fff]/);
  await act(async () => { button('Combination /').props.onClick(); });
  assert.match(text(), chinese ? /Combination \/ 组合键/ : /Combination \/ Shortcuts/);
  assert.equal(hardware.mode, 'combination');
  const noDuplicate = calls.length;
  await act(async () => { button('Combination /').props.onClick(); });
  assert.equal(calls.length, noDuplicate);
  assert.equal(button('应用背键模式'), undefined);
  assert.equal(modal, undefined);
  await act(async () => { button('Disabled /').props.onClick(); });
  assert.equal(hardware.mode, 'disabled');
  const sliders = () => renderer.root.findAllByType('SliderField');
  await act(async () => { sliders()[0].props.onChange(60); sliders()[0].props.onChange(40); sliders()[1].props.onChange(30); });
  assert.equal(calls.filter(c => c[0] === 'set_rumble').length, 0);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 250)); });
  assert.deepEqual(calls.filter(c => c[0] === 'set_rumble'), [['set_rumble', 40, 30]]);
  assert.equal(hardware.mode, 'disabled');
  assert.match(text(), /● .*Disabled/);
  let release;
  hold = new Promise(resolve => { release = resolve; });
  await act(async () => { sliders()[0].props.onChange(50); await new Promise(resolve => setTimeout(resolve, 250)); });
  const count = calls.length;
  await act(async () => { sliders()[0].props.onChange(70); button('Macro /').props.onClick(); });
  assert.equal(calls.length, count); // no concurrent mode write while rumble is in flight
  hold = undefined;
  await act(async () => { release(); });
  assert.equal(hardware.left, 70);
  assert.equal(hardware.right, 30);
  assert.equal(hardware.mode, 'macro');
  failure = true;
  await act(async () => { button('Combination /').props.onClick(); });
  assert.equal(hardware.mode, 'macro');
  assert.match(text(), chinese ? /保存失败/ : /Save failed/);
  assert.match(text(), chinese ? /背键模式写入后读取不匹配/ : /Back-button mode read-back did not match/);
  if (!chinese) assert.doesNotMatch(text(), /[\u3400-\u9fff]/);
  assert.match(text(), /● .*Macro/);
  assert.equal(calls.at(-1)[0], 'get_state');
  await act(async () => { button(chinese ? '一键干净卸载' : 'Clean uninstall').props.onClick(); });
  assert.equal(modal.props.strOKButtonText, chinese ? '确认' : 'Confirm');
  assert.equal(modal.props.strCancelButtonText, chinese ? '取消' : 'Cancel');
  if (!chinese) assert.doesNotMatch(JSON.stringify(modal.props), /[\u3400-\u9fff]/);
  await act(async () => { sliders()[1].props.onChange(20); });
  await act(async () => { renderer.unmount(); });
  assert.equal(hardware.right, 20); // closing the panel flushes the final pending value
});
}

function moduleParent() { return module; }
