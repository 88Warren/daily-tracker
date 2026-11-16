/**
 * PM2 ecosystem config — used if deploying without Docker.
 * On VPS: pm2 start ecosystem.config.js --env production
 */
module.exports = {
  apps: [
    {
      name: 'tracker',
      script: 'server/dist/index.js',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '200M',
      restart_delay: 3000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
