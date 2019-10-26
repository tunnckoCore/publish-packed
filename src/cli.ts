#!/usr/bin/env node

import path = require('path')
import sade = require('sade')
import readPkg = require('read-pkg')

import publishPacked from '.'

const pkg = readPkg.sync({ cwd: path.dirname(__dirname) })

sade('publish-packed [dir]', true)
  .version(pkg.version)
  .describe(pkg.description)
  .example('--prune')
  .example('--prune --tag next')
  .example('./pkg/ --tag beta')
  .option('--cwd', 'Working directory, used for --runner and when `dir` is not passed', process.cwd())
  .option('--runner', 'Path to file with default export or "run" named export, passed as options.run')
  .option('-t, --tag', 'The dist-tag to publish to', 'latest')
  .option('-p, --prune', 'Prune unneeded files (.md, .ts, etc...) from node_modules folder.', false)
  .option('-V, --verbose', 'Enable more verbose logging', false)
  .option('-n, --npm-client', 'Name of package manager (npm, yarn, pnpm)', 'npm')
  .action(async (pkgDir, argv) => {

    const options = { ...argv };

    if (options.runner) {
      const runFnFile = path.resolve(options.cwd, options.runner)

      try {
        const run = require(runFnFile)
        options.run = run.run || run.default || run
      } catch (err) {
        if (options.verbose) {
          console.error(err.stack)
        }
        if (err.code === 'MODULE_NOT_FOUND') {
          const runFileRelative = path.relative(options.cwd, runFnFile)
          console.warn(`publish-packed: Runner "${runFileRelative}" file not found!`)
          process.exit(1)
        }
      }
    }

    if (pkgDir) {
      await publishPacked(path.resolve(options.cwd, pkgDir), options)
      return
    }
    await publishPacked(options.cwd, options)
  })
  .parse(process.argv);
