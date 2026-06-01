module.exports = {
  apps: [
    {
      name: 'hexa-steel-ots',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/hexasteel.sa/ots',
      instances: 1,
      exec_mode: 'fork',
      // --heapsnapshot-near-heap-limit=2: V8 writes a .heapsnapshot to the cwd
      //   when it approaches the heap limit — a backstop that names the leaking
      //   objects even if the in-process RSS watchdog misses.
      node_args: '--max-old-space-size=1024 --expose-gc --heapsnapshot-near-heap-limit=2',
      watch: false,
      // Raised from 800M so the in-process heap-snapshot (triggered at ~700MB RSS)
      // has headroom to finish writing before PM2 kills the process. If the host
      // has < ~1.5GB RAM, lower this back toward 900M to avoid OS OOM kills.
      max_memory_restart: '1200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_APP_URL: 'https://ots.hexasteel.sa',
      },
      cron_restart: '0 */6 * * *',
      error_file: '/var/www/hexasteel.sa/ots/logs/pm2-error.log',
      out_file: '/var/www/hexasteel.sa/ots/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 10000,
      autorestart: true,
      max_restarts: 15,
      min_uptime: '30s',
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
    },
  ],
};
