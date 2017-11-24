const http = require('http')
const chalk = require('chalk')
const { proxy } = require('./utils')

const Koa = require('koa')
const { PassThrough } = require('stream')
const Router = require('koa-router')
const favicon = require('koa-favicon')
const { getPolyfillString } = require('polyfill-service')
const logger = require('koa-logger')
const mount = require('koa-mount')
/* eslint-env node */
const path = require('path')
const serve = require('koa-static')

module.exports = class Koaze {
  constructor({
    debug, // This controls whether to run in debug environment
    mockNginx, // This serves routes in fake production mode
    verbose, // This makes the server verbose
    faviconPath, // The absolute path to the favicon
    staticDirs, // A list of directory to server under /static (not in prod)
    apiUrl, // The api server url to proxy /api requests to
    assetsUrl, // The debug assets url server if any
    assetsDir, // The production assets build directory
    socket,
  }) {
    this.verbose = verbose
    this.socket = socket

    this.app = new Koa()
    this.app.use(logger())
    this.app.use(favicon(faviconPath))

    this.router = new Router()
    if (debug || mockNginx) {
      /* Development and production check config
         (replaced by nginx in production) */
      verbose && console.info(`Serving /static on ${staticDirs.join(',')}`)
      staticDirs.map(dir => this.app.use(mount('/static', serve(dir))))
      if (apiUrl) {
        this.router.all(
          '/api/*',
          proxy(hostname => apiUrl.href.replace(apiUrl.hostname, hostname))
        )
      }
    }
    if (debug && assetsUrl) {
      this.router.get('/assets/*', proxy(assetsUrl.href))
    } else if (mockNginx && assetsDir) {
      this.app.use(mount('/assets', serve(assetsDir)))
    }

    this.router.get('/polyfill.js', async ctx => {
      const polyfill = await getPolyfillString({
        uaString: ctx.headers['user-agent'],
        minify: !debug,
        features: {
          default: {},
          es6: {},
          es7: {},
          es2017: {},
        },
      })
      ctx.type = 'application/javascript'
      ctx.body = polyfill
    })

    this.app.use(this.router.routes()).use(this.router.allowedMethods())
  }

  serve(url, error) {
    this.appCallback = this.app.callback()
    this.server = http.createServer(this.appCallback)
    const args = this.socket ? [this.socket] : [url.port, url.hostname]
    this.server.listen(...args, err => {
      if (err) {
        console.log(`  ${chalk.red('🗴')} Koaze server error`)
        error && error(err)
        return
      }
      this.verbose &&
        console.log(
          `  ${chalk.green('🗸')} Koaze server listening at ${chalk.blue(
            this.socket || url.href
          )}`
        )
    })
  }
}
