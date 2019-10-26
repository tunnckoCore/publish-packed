import fs = require('fs-extra')
import path = require('path')
import test = require('tape-await')
import pMapSeries from 'p-map-series'
import { getCliPath } from '../src/run-utils'

process.env.npm_config_registry = 'http://localhost:4873'

// @ts-ignore
import publishPacked from 'publish-packed'

function cleanupWrapper(fn) {
  return async (...args) => {
    const dbPath = path.join(__dirname, 'registry', 'storage')

    await fs.remove(dbPath)
    await fn(...args)
    await fs.remove(dbPath)
  }
}

test(
  'should work with using "npm" client by default',
  cleanupWrapper(async (t) => {
    t.plan(1)

    const pkgName = 'package-with-no-bundled-deps'
    const filepath = path.join(__dirname, 'packages', pkgName)

    await publishPacked(filepath, { verbose: true })
    t.pass('should pass')
  }),
)

// test(
//   'should fail correctly if pkgDir not found or other errors',
//   cleanupWrapper(async (t) => {
//     t.plan(1)

//     const filepath = path.join(__dirname, 'foo-bar-not-existing')

//     try {
//       await publishPacked(filepath, { verbose: true })
//     } catch (err) {
//       t.pass('correctly fails')
//       return
//     }
//     t.fail('should not pass')
//   }),
// )

// test('should work with opts.npmClient option', async (t) => {
//   const clients = await Promise.all(
//     ['yarn', 'pnpm'].filter(async (npmClient) => {
//       const cliPath = await getCliPath({
//         npmClient: await npmClient,
//         verbose: true,
//       })
//       if (!cliPath) {
//         return false
//       }
//       return fs.existsSync(cliPath)
//     }),
//   )

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

//       await publishPacked(filepath, { npmClient: npmClient, verbose: true })
//       t.pass(`should work with opts.npmClient: ${npmClient} client`)
//     }),
//   )
// })
