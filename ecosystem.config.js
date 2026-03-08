module.exports = {
  apps: [
    {
      name: 'hexa-steel-ots',
      script: '.next/standalone/server.js',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=1024 --expose-gc',
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_BASE_PATH: '/ots',
        NEXT_PUBLIC_APP_URL: 'https://hexasteel.sa/ots',
      },
      cron_restart: '0 */6 * * *', // Restart every 6 hours to prevent memory buildup
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Zero-downtime deployment settings
      wait_ready: true,
      listen_timeout: 30000,
      kill_timeout: 10000,
      // Auto-restart on crash with exponential backoff
      autorestart: true,
      max_restarts: 15,
      min_uptime: '30s',
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      // Graceful shutdown
      shutdown_with_message: true,
      // Health check
      instance_var: 'INSTANCE_ID',
    },
  ],
};
