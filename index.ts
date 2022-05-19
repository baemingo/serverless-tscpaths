import * as path from 'path';
import * as _ from 'lodash';
import * as Plugin from 'serverless/classes/Plugin';
import * as Serverless from 'serverless';
import { spawn } from 'child_process';
import * as fs from 'fs';

export class TscPathsPlugin implements Plugin {
  public hooks: Plugin.Hooks;
  public serverless: Serverless;
  public options: Serverless.Options;

  private rootPath: string;
  private tscpathsPath: string;
  private tsconfigPath: string;
  private sourcePath: string;
  private buildPath: string;
  private isDebug: boolean;
  private isWatching: boolean = false;
  private hookCalled: boolean = false;

  constructor(serverless: Serverless, options: Serverless.Options) {
    this.serverless = serverless;
    this.options = options;

    this.isDebug = typeof process.env.SLS_DEBUG !== 'undefined';
    this.rootPath = this.serverless.config.servicePath;
    const config = _.merge(
      {
        sourcePath: './',
        buildPath: '.build',
        tsconfigPath: 'tsconfig.json',
        tscpathsPath: 'node_modules/@baemingo/tscpaths-async',
      },
      this.serverless.service.custom ? this.serverless.service.custom.tscpaths : {},
    );

    this.sourcePath = path.join(this.rootPath, config.sourcePath);

    this.buildPath = path.join(this.rootPath, config.buildPath);

    this.tscpathsPath = path.join(this.rootPath, config.tscpathsPath);

    this.tsconfigPath = path.join(this.rootPath, config.tsconfigPath);

    this.hooks = {
      'after:invoke:local:invoke': () => {
        if (this.options.watch) {
          this.watchAll();
        }
      },
      'before:deploy:function:packageFunction': async () => {
        await this.hook();
      },
      'before:invoke:local:invoke': async () => {
        await this.hook();
      },
      'before:offline:start': async () => {
        await this.hook();
        this.watchAll();
      },
      'before:offline:start:init': async () => {
        await this.hook();
        this.watchAll();
      },
      'before:package:createDeploymentArtifacts': async () => {
        await this.hook();
      },
      'before:run:run': async () => {
        await this.hook();
      },
    };
  }

  private async watchAll(): Promise<void> {
    if (this.isWatching) {
      return;
    }

    this.serverless.cli.log(`Ready to fix paths in changed files...`);

    this.isWatching = true;
    this.watchFiles(this.watchCallback.bind(this));
  }

  private async watchCallback(): Promise<void> {
    if (this.hookCalled) {
      return;
    }

    this.hookCalled = true;
    await this.hook();
    this.hookCalled = false;
  }

  private getFilesPaths(): string[] {
    return this.serverless.service
      .getAllFunctions()
      .map((fn) => this.serverless.service.getFunction(fn).handler)
      .reduce((acc, h) => {
        const fnName = _.last(h.split('.'));
        const fnNameLastAppearanceIndex = h.lastIndexOf(fnName!);
        // replace only last instance to allow the same name for file and handler
        const fileName = h.substring(0, fnNameLastAppearanceIndex);

        // Check if the .js files exists. If so return that to watch
        const pathTofile = path.join(this.buildPath, fileName + 'js');
        if (fs.existsSync(pathTofile)) {
          acc.push(pathTofile);
        }

        return acc;
      }, [] as string[]);
  }

  private watchFiles(cb: () => void) {
    const watchedFiles = this.getFilesPaths();

    watchedFiles.forEach((fileName) => {
      fs.watchFile(fileName, { persistent: true, interval: 250 }, watchCallback);
    });

    function watchCallback(curr: fs.Stats, prev: fs.Stats) {
      // Check timestamp
      if (+curr.mtime <= +prev.mtime) {
        return;
      }

      cb();
    }
  }

  private async hook() {
    this.serverless.cli.log('Fixing paths');
    const flag = this.isDebug ? '--verbose' : '';
    const result = await this.exec(
      // tslint:disable-next-line: max-line-length
      `node "${this.tscpathsPath}" -p "${this.tsconfigPath}" -s "${this.sourcePath}" -o "${this.buildPath}" ${flag}`,
    );

    this.serverless.cli.log('Paths fixed');
    return result;
  }

  private async exec(cmd: string) {
    const child = spawn(cmd, {
      shell: true,
      stdio: 'inherit',
    });

    return new Promise((resolve, reject) => {
      child.on('close', (code) => {
        code ? reject(code) : resolve();
      });
    });
  }
}

module.exports = TscPathsPlugin;
