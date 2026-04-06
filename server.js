// Custom HTTPS production server for Next.js
// Required for mobile camera access (barcode scanning) on the local network.
// Run: npm run start:prod
// See README for one-time cert setup instructions.

const { createServer: createHttpsServer } = require('https')
const { createServer: createHttpServer } = require('http')
const { parse } = require('url')
const { networkInterfaces } = require('os')
const next = require('next')
const fs = require('fs')
const path = require('path')

const port = parseInt(process.env.PORT || '3000', 10)
const httpRedirectPort = parseInt(process.env.HTTP_PORT || '3001', 10)
const hostname = '0.0.0.0'

const keyPath = path.join(__dirname, 'certs', 'key.pem')
const certPath = path.join(__dirname, 'certs', 'cert.pem')
const hasCerts = fs.existsSync(keyPath) && fs.existsSync(certPath)

const app = next({ dev: false, hostname, port })
const handle = app.getRequestHandler()

function getLocalIPs() {
  const nets = networkInterfaces()
  const results = []
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        results.push(iface.address)
      }
    }
  }
  return results
}

app.prepare().then(() => {
  if (hasCerts) {
    // HTTPS server — required for camera/barcode scanning on mobile
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }

    createHttpsServer(httpsOptions, async (req, res) => {
      try {
        await handle(req, res, parse(req.url, true))
      } catch (err) {
        console.error('Error handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    }).listen(port, hostname, () => {
      const ips = getLocalIPs()
      console.log('\n✅ Preschool Library — HTTPS server running\n')
      console.log(`   Local:   https://localhost:${port}`)
      for (const ip of ips) {
        console.log(`   Network: https://${ip}:${port}  ← use this URL on phones`)
      }
      if (ips.length === 0) {
        console.log('   (no network interfaces found — check WiFi connection)')
      }
      console.log()
    })

    // HTTP → HTTPS redirect so plain http:// links auto-upgrade
    createHttpServer((req, res) => {
      const host = (req.headers.host || 'localhost').replace(
        new RegExp(`:${httpRedirectPort}$`),
        `:${port}`
      )
      res.writeHead(301, { Location: `https://${host}${req.url}` })
      res.end()
    }).listen(httpRedirectPort, hostname, () => {
      console.log(`   HTTP redirect: port ${httpRedirectPort} → HTTPS ${port}`)
    })
  } else {
    // No certs — fall back to plain HTTP with a clear warning
    console.warn('\n⚠️  WARNING: No SSL certificates found in ./certs/')
    console.warn('   Camera-based barcode scanning will NOT work on mobile browsers.')
    console.warn('   See README for one-time mkcert setup instructions.\n')

    createHttpServer(async (req, res) => {
      try {
        await handle(req, res, parse(req.url, true))
      } catch (err) {
        console.error('Error handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    }).listen(port, hostname, () => {
      const ips = getLocalIPs()
      console.log('\n🟡 Preschool Library — HTTP server running (no HTTPS)\n')
      console.log(`   Local:   http://localhost:${port}`)
      for (const ip of ips) {
        console.log(`   Network: http://${ip}:${port}`)
      }
      console.log()
    })
  }
})
