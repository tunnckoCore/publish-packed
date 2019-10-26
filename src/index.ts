import fs = require('fs-extra')
import path = require('path')
import rimraf = require('rimraf-then')
import renameKeys from './renameKeys'
import readPkg = require('read-pkg')
import renameOverwrite = require('rename-overwrite')
import nmPrune = require('nm-prune')

import { defaultCliRunner, defaultOptions, Options, RunnerOptions } from './run-utils'

export default async function (pkgDir?: string, opts: Options = defaultOptions) {
  const options = { ...defaultOptions, ...opts }
  const { tag, prune } = options

  const lockfileMap = {
    yarn: '--no-lockfile',
    pnpm: '--no-lockfile',
    npm: '--no-package-lock'
  }

  const runCli = options.run
  const dir = pkgDir || process.cwd()
  const lockfileFlag = lockfileMap[options.npmClient]
  const modules = path.join(dir, 'node_modules')
  const tmpModules = path.join(dir, 'tmp_node_modules')
  let publishedModules: string | null = null

  await runPrepublishScript(dir, runCli, options, defaultCliRunner)

  try {
    await renameOverwriteIfExists(modules, tmpModules)

    await runCli(
      {
        dir,
        type: 'install',
        args: ['install', '--production', '--ignore-scripts', lockfileFlag],
        options,
        defaultRunner: defaultCliRunner
      }
    )

    if (prune) await pruneNodeModules(dir)

    publishedModules = path.join(dir, 'lib', 'node_modules')
    await renameOverwriteIfExists(modules, publishedModules)

    await hideDeps(dir)
    await runCli(
      {
        dir: dir,
        type: 'publish',
        args: ['publish', '--tag', tag],
        options: {
          ...options,
          npmClient: 'npm' // ! force using npm for publishing
        },
        defaultRunner: defaultCliRunner
      }
    )
  } finally {
    await unhideDeps(dir)

    await renameOverwriteIfExists(tmpModules, modules)

    if (publishedModules) await rimraf(publishedModules)
  }
}

async function pruneNodeModules (pkgDir: string) {
  const info = await nmPrune.prep(pkgDir, {pruneLicense: false}) as {files: string[], dirs: string[]}
  await Promise.all(info.files.map(fullPath => fs.remove(fullPath)))
  await Promise.all(info.dirs.map(fullPath => fs.remove(fullPath)));
}

async function renameOverwriteIfExists (oldPath: string, newPath: string | null) {
  try {
    await renameOverwrite(oldPath, newPath)
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
}

async function runPrepublishScript (
  dir: string,
  runCli: typeof defaultCliRunner,
  opts: Options,
  defaultRunner?: typeof defaultCliRunner
) {
  const pkgJson = await readPkg({ cwd: dir })

  if (!pkgJson['scripts']) return

  const runOpts = {
    dir: dir,
    options: opts,
    defaultRunner
  }

  if (pkgJson['scripts']['prepublish']) {
    await runCli({ ...runOpts, type: 'prepublish', args: ['run', 'prepublish'] })
  }

  if (pkgJson['scripts']['prepublishOnly']) {
    await runCli({ ...runOpts, type: 'prepublishOnly', args: ['run', 'prepublishOnly'] })
  }
}

function hideDeps (pkgDir: string) {
  return renameKeys(pkgDir, {
    dependencies: '__dependencies',
    devDependencies: '__devDependencies',
    optionalDependencies: '__optionalDependencies',
    scripts: {
      prepublish: '__prepublish',
      prepublishOnly: '__prepublishOnly'
    }
  })
}

function unhideDeps (pkgDir: string) {
  return renameKeys(pkgDir, {
    __dependencies: 'dependencies',
    __devDependencies: 'devDependencies',
    __optionalDependencies: 'optionalDependencies',
    scripts: {
      __prepublish: 'prepublish',
      __prepublishOnly: 'prepublishOnly'
    }
  })
}
