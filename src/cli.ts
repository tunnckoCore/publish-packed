#!/usr/bin/env node
import publishPacked from '.'
import getopts = require('getopts')

const opts = getopts(process.argv.slice(2), {
  alias: {
    h: 'help',
  },
  boolean: [
    'help',
    'prune',
  ],
  default: {
    help: false,
    prune: false,
    tag: 'latest',
  },
})

if (opts._[0] === 'help' || opts.help) {
  console.log(`
  Usage: publish-packed [flags]

  Options:

    -h, --help  Output usage information

    --tag       Registers the published package with the given tag, such that npm install <name>@<tag> will install this version.
                By default, npm publish updates and npm install installs the latest tag.

    --prune     Prune unneeded files (.md, .td, etc..) from node_modules folder.
  `)
} else {
  publishPacked(process.cwd(), opts)
}
