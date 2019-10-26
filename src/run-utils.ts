import fs = require('fs')
import mod = require('module')
import path = require('path')

import execa = require('execa')
import allModulePaths = require('all-module-paths')

export type Options = { paths?: string[] } & {
  tag?: string,
  run?: typeof defaultCliRunner,
  npmClient?: string,
  prune?: boolean,
  verbose?: boolean,
}

export const defaultOptions = {
  tag: 'latest',
  run: defaultCliRunner,
  npmClient: 'npm',
  prune: false,
  verbose: false,
}

export type RunnerOptions = {
  dir: string,
  type?: string,
  args?: string[],
  options: Options,
  defaultRunner?: typeof defaultCliRunner
}

export async function defaultCliRunner (opt: RunnerOptions) {
  const { dir, args, options } = opt
  const opts = { ...defaultOptions, ...options }
  const { verbose, npmClient } = opts

  let cliPath: string | undefined = getCliPath(opts)

  if (!cliPath) {
    throw new Error(`Cannot find cli for "${npmClient}" package manager`)
  }

  if (verbose) {
    console.warn(`Using npmClient "${npmClient}" from ${cliPath}\nWith the following arguments: ${args}`)
  }

  await execa(cliPath, args, {
    cwd: dir,
    stdio: 'inherit',
    preferLocal: false,
    all: true,
  })
}


export function getCliPath (opts: Options) {
  // We need, strictly, the `process.cwd()` here
  // @ts-ignore
  const modPaths = mod._nodeModulePaths(process.cwd())

  const options = { ...defaultOptions, ...opts }
  const { globalModules: { binaries } } = allModulePaths({
    paths: options.paths || modPaths
  })

  return binaries
    .reverse()
    .map((fp: string) => path.join(fp, options.npmClient))
    .find((fp: string) => fs.existsSync(fp))
}
