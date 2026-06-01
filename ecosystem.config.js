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
