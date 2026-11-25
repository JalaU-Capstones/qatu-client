import { execFileSync, spawn } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const srcDir = join(rootDir, 'src');
const nycOutputDir = join(rootDir, '.nyc_output');
const tempWorkDir = join(rootDir, '.coverage-tmp');
const instrumentedSrcDir = join(tempWorkDir, 'src');

rmSync(nycOutputDir, { recursive: true, force: true });
rmSync(tempWorkDir, { recursive: true, force: true });
rmSync(join(rootDir, 'coverage'), { recursive: true, force: true });
mkdirSync(nycOutputDir, { recursive: true });
mkdirSync(instrumentedSrcDir, { recursive: true });

// eslint-disable-next-line no-undef
process.env.VITE_COVERAGE = 'true';
const viteConfig = await resolveConfig({ root: rootDir, mode: 'test' }, 'serve');
const istanbulPlugin = viteConfig.plugins.find((plugin) => plugin.name === 'vite:istanbul');

if (!istanbulPlugin || typeof istanbulPlugin.transform !== 'function') {
  throw new Error('vite-plugin-istanbul no está configurado en vite.config.js');
}

async function walkAndInstrument(currentDir) {
  for (const entry of readdirSync(currentDir)) {
    const fullPath = join(currentDir, entry);
    const relPath = relative(srcDir, fullPath);
    const destPath = join(instrumentedSrcDir, relPath);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      await walkAndInstrument(fullPath);
      continue;
    }

    if (!entry.endsWith('.js')) {
      cpSync(fullPath, destPath);
      continue;
    }

    const sourceCode = readFileSync(fullPath, 'utf8');
    const lineCount = sourceCode.split('\n').length;
    const identityMap = {
      version: 3,
      file: fullPath,
      sources: [fullPath],
      sourcesContent: [sourceCode],
      names: [],
      mappings: lineCount > 0 ? `AAAA${';AACA'.repeat(lineCount - 1)}` : '',
    };

    const result = await istanbulPlugin.transform.call(
      { getCombinedSourcemap: () => identityMap },
      sourceCode,
      fullPath
    );

    const outputCode = typeof result === 'string' ? result : (result?.code ?? sourceCode);
    writeFileSync(destPath, outputCode, 'utf8');
  }
}

await walkAndInstrument(srcDir);

let coverageData = null;
const collectorServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/coverage') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      coverageData = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

await new Promise((resolveListen) => collectorServer.listen(0, '127.0.0.1', resolveListen));
const { port } = collectorServer.address();

writeFileSync(
  join(instrumentedSrcDir, '__coverage_helper__.js'),
  `jasmine.getEnv().addReporter({
  jasmineDone: function () {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://127.0.0.1:${port}/coverage', false);
    xhr.send(JSON.stringify(window.__coverage__ || null));
  },
});
`,
  'utf8'
);

const baseJasmineConfig = JSON.parse(
  readFileSync(join(rootDir, 'spec/support/jasmine-browser.json'), 'utf8')
);

const coverageJasmineConfig = {
  ...baseJasmineConfig,
  srcDir: '.coverage-tmp/src',
  specDir: '.coverage-tmp/src',
  helpers: [...(baseJasmineConfig.helpers ?? []), '__coverage_helper__.js'],
  importMap: {
    imports: {
      '@supabase/supabase-js': './.coverage-tmp/src/testing/supabase-stub.js',
    },
  },
};

const tempConfigPath = join(tempWorkDir, 'jasmine-browser.coverage.json');
writeFileSync(tempConfigPath, JSON.stringify(coverageJasmineConfig, null, 2), 'utf8');

try {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      'pnpm',
      [
        'exec',
        'jasmine-browser-runner',
        'runSpecs',
        '--config=.coverage-tmp/jasmine-browser.coverage.json',
      ],
      { cwd: rootDir, stdio: 'inherit' }
    );

    child.on('error', rejectRun);
    child.on('exit', (code) => {
      if (code === 0) {
        resolveRun();
      } else {
        rejectRun(new Error(`jasmine-browser-runner finalizó con código ${code}`));
      }
    });
  });
} finally {
  collectorServer.close();
  rmSync(tempWorkDir, { recursive: true, force: true });
}

if (!coverageData) {
  throw new Error('No se recibió información de cobertura desde el navegador.');
}

writeFileSync(join(nycOutputDir, 'out.json'), JSON.stringify(coverageData), 'utf8');

execFileSync('pnpm', ['exec', 'nyc', 'report', '--reporter=lcov', '--reporter=text-summary'], {
  cwd: rootDir,
  stdio: 'inherit',
});
