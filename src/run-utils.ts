import fs = require('fs')
import mod = require('module')
import path = require('path')

import execa = require('execa')
import which = require('which')

import allModulePaths = require('all-module-paths')
import npmCliPath = require('npm-cli-path')

export type Options = { paths?: string[] } & {
  tag?: string,
  run?: typeof defaultCliRunner,
  npmClient?: string,
  prune?: boolean,
  verbose?: boolean,
  upwordsFromNpm?: number,
}

export const defaultOptions = {
  tag: 'latest',
  run: defaultCliRunner,
  npmClient: 'npm',
  prune: false,
  verbose: false,
  upwordsFromNpm: 4,
}

export type RunnerOptions = {
  dir: string,
  type?: string,
  args?: string[],
  options: Options,
  defaultRunner?: typeof defaultCliRunner,
}

export async function defaultCliRunner(opt: RunnerOptions) {
  const { dir, args, options } = opt
  const opts = { ...defaultOptions, ...options }
  const { verbose, npmClient } = opts

  // if (!cliPath) {
  //   throw new Error(`Cannot find cli for "${npmClient}" package manager`)
  // }

  // if (verbose) {
  //   console.warn(
  //     `Using npmClient "${npmClient}" from ${cliPath}\nWith the following arguments: ${args}`,
  //   )
  // }

  const argz = (await getCliPath(opts))(args).concat({
    cwd: dir,
    stdio: 'inherit',
    preferLocal: false,
    all: true,
  })

  console.log(argz)
  // @ts-ignore
  await execa(...argz)
}

export async function getCliPath(opts: Options) {
  const options = Object.assign({}, defaultOptions, opts)

  const cliPath = await npmCliPath()

  switch (options.npmClient) {
    case 'npm': {
      return (args) => ['node', [cliPath].concat(args)]
    }
    case 'yarn': {
      const fp = tryResolve('yarn', cliPath, options)
      return (args) => ['node', [fp].concat(args)]
    }
    case 'pnpm': {
      return (args) => [tryResolve('pnpm', cliPath, options), args]
    }
    default: {
      return cliPath
    }
  }
}

function tryResolve(name, cliPath, options) {
  if (options.verbose) {
    console.log('Trying resolve "%s" bin path with `which` ...', name)
  }
  const fromWhichPath = which
    .sync(name, { all: true })
    .find((fp: string) => fs.existsSync(fp))

  if (fromWhichPath) {
    if (options.verbose) {
      console.log('Found "%s" bin path with `which`:', name, fromWhichPath)
    }
    return fromWhichPath
  }

  // We need, strictly, the `process.cwd()` here
  // @ts-ignore
  const modPaths = mod._nodeModulePaths(process.cwd())
  const {
    globalModules: { binaries },
  } = allModulePaths({
    paths: options.paths || modPaths,
  })

  if (options.verbose) {
    console.log('Trying resolve "%s" bin path with `all-module-paths`', name)
  }

  const foundPath = binaries
    .map((fp: string) => path.join(fp, name))
    .find((fp: string) => fs.existsSync(fp))

  if (foundPath) {
    if (options.verbose) {
      console.log('Found "%s" bin path:', name, foundPath)
    }

    return foundPath
  }

  if (options.verbose) {
    console.log('Calculate "%s" bin path from `npm-cli-path`:', name, cliPath)
  }

  let vmPmRoot = ''
  let i = options.upwordsFromNpm + 1

  while (i > 0) {
    vmPmRoot = path.dirname(vmPmRoot || cliPath)
    i -= 1
  }

  if (options.verbose) {
    console.log('Found root:', vmPmRoot)
  }

  return path.join(vmPmRoot, 'bin', 'yarn')
}
