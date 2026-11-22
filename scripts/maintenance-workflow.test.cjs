const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const trailer =
  '\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>';

function fixture(t, { git = true, tools = false } = {}) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'document-maintenance-')
  );
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const name of [
    'package.json',
    'package-lock.json',
    '.prettierrc',
    '.prettierignore',
  ]) {
    fs.copyFileSync(path.join(root, name), path.join(directory, name));
  }
  fs.mkdirSync(path.join(directory, '.husky'));
  fs.copyFileSync(
    path.join(root, '.husky/pre-commit'),
    path.join(directory, '.husky/pre-commit')
  );
  fs.writeFileSync(
    path.join(directory, '.gitignore'),
    'node_modules/\n.husky/_/\n'
  );
  const environment = {
    ...process.env,
    CI: '',
    HUSKY: '',
    NODE_ENV: '',
    GENERATE_OPENAPI: '',
    npm_config_omit: '',
    npm_config_ignore_scripts: 'false',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    XDG_CONFIG_HOME: path.join(directory, '.config'),
  };
  const run = (command, args, env = {}) =>
    spawnSync(command, args, {
      cwd: directory,
      env: { ...environment, ...env },
      encoding: 'utf8',
      timeout: 120000,
    });
  const pass = (command, args, env) => {
    const result = run(command, args, env);
    assert.equal(
      result.status,
      0,
      `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}\n${result.error || ''}`
    );
    return result.stdout.trim();
  };
  if (git) pass('git', ['init', '--quiet']);
  if (tools)
    fs.symlinkSync(
      path.join(root, 'node_modules'),
      path.join(directory, 'node_modules'),
      'dir'
    );
  const write = (name, contents) => {
    fs.mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
    fs.writeFileSync(path.join(directory, name), contents);
  };
  const read = (name) => fs.readFileSync(path.join(directory, name), 'utf8');
  const commitArgs = (message) => [
    '-c',
    'user.name=Maintenance Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '-m',
    message + trailer,
  ];
  return { directory, run, pass, write, read, commitArgs };
}

test('real hook formats staged changes, preserves partial/unstaged edits, and rolls back failures', (t) => {
  const f = fixture(t, { tools: true });
  f.write(
    'src/item.ts',
    'export const staged = 0;\nexport const pending = 0;\n'
  );
  f.write('other.txt', 'original\n');
  f.pass('git', ['add', '.']);
  f.pass('git', f.commitArgs('Fixture baseline'), { HUSKY: '0' });
  f.pass('npm', ['run', 'prepare']);
  assert.equal(
    f.pass('git', ['config', '--get', 'core.hooksPath']),
    '.husky/_'
  );
  f.write('src/item.ts', 'export const staged=1\nexport const pending = 0;\n');
  f.pass('git', ['add', 'src/item.ts']);
  f.write('src/item.ts', 'export const staged=1\nexport const pending = 2;\n');
  f.write('other.txt', 'unstaged\n');
  f.pass('git', f.commitArgs('Fixture formatting'));
  assert.equal(
    f.pass('git', ['show', 'HEAD:src/item.ts']),
    'export const staged = 1;\nexport const pending = 0;'
  );
  assert.equal(
    f.read('src/item.ts'),
    'export const staged = 1;\nexport const pending = 2;\n'
  );
  assert.equal(f.read('other.txt'), 'unstaged\n');
  assert.equal(f.pass('git', ['stash', 'list']), '');

  const previous = f.pass('git', ['rev-parse', 'HEAD']);
  f.write('src/item.ts', 'export const = ;\n');
  f.pass('git', ['add', 'src/item.ts']);
  const failed = f.run('git', f.commitArgs('Fixture rejected'));
  assert.notEqual(failed.status, 0);
  assert.match(failed.stdout + failed.stderr, /SyntaxError/);
  assert.equal(f.pass('git', ['rev-parse', 'HEAD']), previous);
  assert.equal(f.read('src/item.ts'), 'export const = ;\n');
  assert.equal(f.read('other.txt'), 'unstaged\n');
  assert.equal(f.pass('git', ['stash', 'list']), '');
});

test('format and lint gates reject new violations without modifying files; generated paths stay excluded', (t) => {
  const f = fixture(t, { tools: true });
  f.write('src/item.ts', 'export const item=1\n');
  f.write('contracts/generated.ts', 'not valid TypeScript');
  const before = f.read('src/item.ts');
  const badFormat = f.run('npm', ['run', 'format:check']);
  assert.notEqual(badFormat.status, 0);
  assert.match(badFormat.stdout + badFormat.stderr, /src\/item.ts/);
  assert.equal(f.read('src/item.ts'), before);
  f.write('src/item.ts', 'export const item = 1;\n');
  f.pass('npm', ['run', 'format:check']);
  fs.copyFileSync(
    path.join(root, 'eslint.config.mjs'),
    path.join(f.directory, 'eslint.config.mjs')
  );
  fs.copyFileSync(
    path.join(root, 'tsconfig.json'),
    path.join(f.directory, 'tsconfig.json')
  );
  f.write('src/item.ts', 'const unused = 1;\n');
  f.write('test/helper.ts', 'export {};\n');
  const badLint = f.run('npm', ['run', 'lint:check']);
  assert.notEqual(badLint.status, 0);
  assert.match(badLint.stdout + badLint.stderr, /no-unused-vars/);
  assert.equal(f.read('src/item.ts'), 'const unused = 1;\n');
});

for (const mode of [
  'developer',
  'CI',
  'package-only-no-git',
  'production-no-dev',
]) {
  test(`clean offline npm ci succeeds in ${mode}`, (t) => {
    const f = fixture(t, { git: mode !== 'package-only-no-git' });
    if (mode === 'package-only-no-git') {
      fs.rmSync(path.join(f.directory, '.husky/pre-commit'));
      fs.rmdirSync(path.join(f.directory, '.husky'));
    }
    const environment =
      mode === 'CI'
        ? { CI: 'true' }
        : mode === 'production-no-dev'
          ? { NODE_ENV: 'production' }
          : {};
    const args = ['ci', '--offline', '--no-audit', '--no-fund'];
    if (mode === 'production-no-dev') args.push('--omit=dev');
    f.pass('npm', args, environment);
    if (mode === 'developer') {
      assert.equal(
        f.pass('git', ['config', '--get', 'core.hooksPath']),
        '.husky/_'
      );
      assert.ok(fs.existsSync(path.join(f.directory, '.husky/_/pre-commit')));
    } else {
      assert.equal(fs.existsSync(path.join(f.directory, '.husky/_')), false);
    }
    if (mode === 'production-no-dev') {
      assert.equal(
        fs.existsSync(path.join(f.directory, 'node_modules/husky')),
        false
      );
    }
  });
}
