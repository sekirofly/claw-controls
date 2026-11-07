const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const {create, act} = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

test('mode selection stays local; confirmation writes once; rumble does not discard selection', async () => {
  const calls = [];
  let modal;
  let hardware = {ok: true, mode: 'macro', left: 80, right: 90};
  const ui = {};
  for (const name of ['ButtonItem', 'PanelSection', 'PanelSectionRow', 'SliderField', 'ConfirmModal']) {
    ui[name] = props => React.createElement(name, props, props.children);
  }
  ui.showModal = element => { modal = element; };
  const api = {definePlugin: factory => factory, callable: name => async (...args) => {
    calls.push([name, ...args]);
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
  await act(async () => { button('Combination /').props.onClick(); });
  assert.match(text(), /Combination \/ 组合键/);
  assert.match(text(), /（未写入）/);
  assert.equal(hardware.mode, 'macro');
  assert.equal(button('应用背键模式').props.disabled, false);
  await act(async () => { button('Disabled /').props.onClick(); });
  assert.deepEqual(calls, [['get_state']]);
  await act(async () => { button('应用背键模式').props.onClick(); });
  assert.equal(modal.props.strCancelButtonText, '取消');
  assert.deepEqual(calls, [['get_state']]); // opening/dismissing the modal is not a write
  modal = undefined;
  await act(async () => { renderer.root.findAllByType('SliderField')[0].props.onChange(40); });
  await act(async () => { button('应用震动强度').props.onClick(); });
  assert.equal(hardware.mode, 'macro');
  assert.match(text(), /● .*Disabled/);
  await act(async () => { button('应用背键模式').props.onClick(); });
  await act(async () => { modal.props.onOK(); });
  assert.deepEqual(calls.filter(call => call[0] === 'set_mode'), [['set_mode', 'disabled']]);
  assert.equal(button('应用背键模式').props.disabled, true);
  await act(async () => { renderer.unmount(); });
});

function moduleParent() { return module; }
