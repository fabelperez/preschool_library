// PM2 ecosystem config — auto-starts the library server
// Usage:
//   npm install -g pm2
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup   (follow the printed command to enable Windows auto-start)

module.exports = {
  apps: [
    {
      name: 'preschool-library',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HTTP_PORT: '3001',
      },
      restart_delay: 3000,
      autorestart: true,
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
