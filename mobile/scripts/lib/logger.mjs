const hasColor = !process.env.CI && process.stdout.isTTY

function tag(color, symbol) {
  if (!hasColor) return `[${symbol}]`
  return `\x1b[${color}m[${symbol}]\x1b[0m`
}

function dim(text) {
  if (!hasColor) return text
  return `\x1b[2m${text}\x1b[0m`
}

function bold(text) {
  if (!hasColor) return text
  return `\x1b[1m${text}\x1b[0m`
}

function green(text) {
  if (!hasColor) return text
  return `\x1b[32m${text}\x1b[0m`
}

export function info(...args) {
  console.log(tag('34', '*'), ...args)
}

export function success(...args) {
  console.log(tag('32', '+'), ...args)
}

export function warn(...args) {
  console.error(tag('33', '!'), ...args)
}

export function error(...args) {
  console.error(tag('31', '-'), ...args)
}

export function header(text) {
  console.log(`\n${bold(text)}\n`)
}

export function divider() {
  console.log(dim('---'))
}

export function table(items) {
  for (const item of items) {
    let statusStr
    switch (item.status) {
      case 'ok':
        statusStr = green('ok')
        break
      case 'fail':
        statusStr = tag('31', '-')
        break
      case 'warn':
        statusStr = tag('33', '!')
        break
      case 'skip':
        statusStr = dim('skip')
        break
      case 'info':
        statusStr = tag('34', '*')
        break
      default:
        statusStr = dim(item.status || '')
    }
    const labelStr = item.label ? ` ${item.label}` : ''
    const detailStr = item.detail ? dim(` (${item.detail})`) : ''
    console.log(`  ${statusStr}${labelStr}${detailStr}`)
  }
}
