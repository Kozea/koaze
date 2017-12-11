/* eslint-env node */

const http = require('http')

const Koa = require('koa')
const Router = require('koa-router')
const chalk = require('chalk')
const favicon = require('koa-favicon')
const logger = require('koa-logger')
const mount = require('koa-mount')
const serve = require('koa-static')

const { proxy } = require('./utils')

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
    serverUrl, // The url containing the host this server will listen to
    socket, // This overrides the previous setting to listen to a socket
  }) {
    this.verbose = verbose
    this.serverUrl = serverUrl
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

    this.app.use(this.router.routes()).use(this.router.allowedMethods())
  }

  serve(error) {
    this.appCallback = this.app.callback()
    this.server = http.createServer(this.appCallback)
    const args = this.socket
      ? [this.socket]
      : [this.serverUrl.port, this.serverUrl.hostname]
    this.server.listen(...args, err => {
      if (err) {
        // eslint-disable-next-line no-console
        console.log(`  ${chalk.red('🗴')} Koaze server error`)
        error && error(err)
        return
      }
      this.verbose &&
        // eslint-disable-next-line no-console
        console.log(
          `  ${chalk.green('🗸')} Koaze server listening at ${chalk.blue(
            this.socket || this.serverUrl.href
          )}`
        )
    })
  }
}
