const path = require('path')
const fs = require('fs-extra')
const test = require('tape-await')
const pMapSeries = require('p-map-series')
const execa = require('execa')
const dargs = require('dargs')

const { getCliPath } = require('../lib/run-utils')

process.env.npm_config_registry = 'http://localhost:4873'

async function publishPacked (dir, options = {}) {
  const packed = path.join(path.dirname(__dirname), 'lib/cli.js')
  const flags = dargs(options)

  await execa('node', [packed].concat(dir).concat(flags), {
    cwd: dir,
    stdio: 'inherit',
    all: true
  })
}

function cleanupWrapper(fn) {
  return async (...args) => {
    const dbPath = path.join(__dirname, 'registry', 'storage')

    await fs.remove(dbPath)
    await fn(...args)
    await fs.remove(dbPath)
  }
}

test('CLI: should work with using `npm` client by default', cleanupWrapper(async (t) => {
  t.plan(1)

  const pkgName = 'package-with-no-bundled-deps'
  const filepath = path.join(__dirname, 'packages', pkgName)

  await publishPacked(filepath)
  t.pass('should pass')
}))

// test('CLI: should fail correctly if pkgDir not found or other errors', cleanupWrapper(async (t) => {
//   t.plan(1)

//   const filepath = path.join(__dirname, 'foo-bar-not-existing')

//   try {
//     await publishPacked(filepath)
//   } catch (err) {
//     t.pass('correctly fails')
//     return
//   }
//   t.fail('should not pass')
// }))

// test('CLI: should work with opts.npmClient option', async (t) => {
//   const clients = ['yarn', 'pnpm'].filter((npmClient) => {
//     const cliPath = getCliPath({ npmClient })
//     if (!cliPath) {
//       return false
//     }
//     return fs.existsSync(cliPath)
//   })

//   if (clients.length === 0) {
//     t.end()
//     return
//   }

//   t.plan(clients.length)

//   await pMapSeries(
//     clients,
//     cleanupWrapper(async (npmClient) => {
//       const pkgName = 'package-with-no-bundled-deps'
//       const filepath = path.join(__dirname, 'packages', pkgName)

//       await publishPacked(filepath, { npmClient: npmClient })
//       t.pass(`CLI: should work with opts.npmClient: ${npmClient} client`)
//     }),
//   )
// })
