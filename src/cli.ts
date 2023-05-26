import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import cac from 'cac';
import Configstore from 'configstore';
import { getConfigCli, cacHelpWithConfigCli } from 'config-cli-helper';
import TtyTable from 'tty-table';
import FurtiveFileSystem, { SimpleFileTree } from '.';
const { name: pkgName, version } = require('../package.json');

const cliName = 'ffs';

const defaultCwd = path.join(os.tmpdir(), pkgName);

const localStore = new Configstore(`config-cli__${pkgName}`, {
  config: {
    cwd: defaultCwd,
  },
});

const ffs = new FurtiveFileSystem(localStore.get('config').cwd);

if (process.argv[2] === 'config') {
  const configCli = getConfigCli({ cliName, configStore: localStore });
  configCli.parse(process.argv.slice(1));
  process.exit();
}

// TODO cli
const cli = cac(cliName);

cli
  .command('ls [scope]', 'List file tree')
  .option('-l, --list', 'List detailed information for the next layer of `scope`')
  .action(async (scope, { list }) => {
    ffs.setPassword('juln1234');
    const tree = await ffs.ls(scope);
    if (!tree.length) {
      console.log('<empty>');
      return;
    }
    if (list) {
      console.log(
        TtyTable(
          // @ts-ignore
          [{ value: 'realName' }, { value: 'size' }, { value: 'filename' }, { value: 'type' }],
          tree.map(({ realName, size, name, type }) => ({ realName, size, filename: name, type })),
          [],
          // @ts-ignore
          { headerAlign: 'center', align: "left", borderStyle: 'none' },
        ).render()
        // 去掉第一行的\n
        .replace('\n', '')
      );
      return;
    }
    function treeToString(node: Pick<SimpleFileTree, 'realName' | 'children'>, indent = '', result = ''): string {
      result += `${indent}${node.realName}\n`;
        if (node.children) {
        const lastChild = node.children[node.children.length - 1];
          for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          const isLastChild = child === lastChild;
          const symbol = isLastChild ? '└──' : '├──';
          const childIndent = indent + (isLastChild ? '    ' : '│   ');
          result += `${indent}${symbol}${treeToString(child, childIndent).slice(indent.length + 3)}`;
        }
      }
      return result;
    }
    console.log(treeToString({ realName: '', children: tree }));
  });

cli
  .command('push', 'Push project')
  .option('--target <dir>', 'Set target directory')
  .option('--scope <scope>', 'Set project scope')
  .option('--rename <name>', 'Set project rename')
  .option('--ignore <globs>', 'Set ignore globs')
  .action(async ({ target, scope, rename, ignore }) => {
    await ffs.pushProject(target, { scope, rename, ignore });
    console.log('Push project successfully');
  });

cli
  .command('restore <scope>', 'Restore project')
  .option('--target <dir>', 'Set target directory')
  .option('--rename <name>', 'Set project rename')
  .action(async (scope, { target, rename }) => {
    await ffs.restoreProject(scope, target, { rename });
    console.log('Restore project successfully');
  });

cli
  .command('rm <scope>', 'Remove project or scope')
  .option('--project', 'Set remove project')
  .option('--scope', 'Set remove scope')
  .action(async (scope, { project, scope: rmScope }) => {
    if (project) {
      await ffs.rmProject(scope, rmScope);
      console.log(`Remove project ${scope} successfully`);
    } else if (rmScope) {
      await ffs.rmScope(scope);
      console.log(`Remove scope ${scope} successfully`);
    }
  });

cli
  .command('clean', 'Clean FurtiveFileSystem')
  .action(async () => {
    await ffs.clean();
    console.log('Clean FurtiveFileSystem successfully');
  });

cli.help(
  cacHelpWithConfigCli(cliName)
);
cli.version(version);

cli.parse();
