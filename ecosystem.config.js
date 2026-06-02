module.exports = {
  apps: [
    {
      name: 'hexa-steel-ots',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/hexasteel.sa/ots',
      instances: 1,
      exec_mode: 'fork',
      // NOTE: --heapsnapshot-near-heap-limit was removed. With --max-old-space-size
      //   at 1024 but the OS OOM-killer firing at ~992MB RSS, V8's near-heap-limit
      //   (≈95% of 1024) never triggered before the kill, so it produced no useful
      //   backstop — and any snapshot it DID write went UNPRUNED into the cwd,
      //   helping fill the disk during the restart loop. The bounded RSS watchdog
      //   in restart-logger.ts (keep-newest-only) is the sole snapshot mechanism.
      node_args: '--max-old-space-size=1024 --expose-gc',
      watch: false,
      // Observed: the OS OOM-killer hard-kills this process at ~995MB RSS (peak
      // RSS in the restart events), BELOW any higher PM2 limit — so PM2 never got
      // to restart gracefully. Set to 820M so PM2 sends SIGINT *before* the OS
      // SIGKILLs: that lets our handlers write a shutdown record + heap snapshot
      // instead of vanishing with no trace. (The leak itself is fixed separately;
      // this only makes the kill observable.)
      max_memory_restart: '820M',
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
