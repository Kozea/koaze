const chalk = require('chalk')
const request = require('request')

module.exports = {
  proxy(host, timeout = 2500) {
    return ctx => {
      if (typeof host == 'function') {
        host = host(ctx.hostname)
      }
      const url = `${host}${ctx.url.replace(/^\//, '')}`
      // eslint-disable-next-line
      console.log(
        `  ${chalk.gray('-->')} ${chalk.bold(ctx.method)} ${chalk.gray(
          ctx.url
        )} ${chalk.cyan('-->')} ${chalk.gray(url)}`
      )
      ctx.body = ctx.req.pipe(
        request({
          url,
          timeout,
          method: ctx.method,
          headers: ctx.headers,
        }).on('response', res => {
          ctx.set(res.headers)
          ctx.status = res.statusCode
        })
      )
    }
  },
}
