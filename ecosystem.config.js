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
      // Host has 7.8GB RAM (confirmed via `free -h`), NOT the ~1GB assumed by
      //   earlier rounds — there is no OS OOM-killer involvement (dmesg is clean).
      //   1024 was far too low for this ERP's legitimate ~900MB+ working set: V8
      //   spent its time GC-thrashing near the cap. 2048 gives real headroom while
      //   still leaving the box ~5GB for MySQL/OS/other apps.
      node_args: '--max-old-space-size=2048 --expose-gc',
      watch: false,
      // The restart loop was self-inflicted: PM2 was restarting the app every
      //   ~19s because this limit (820M) sat BELOW the app's normal ~937MB working
      //   set on a 7.8GB host. That is not memory pressure — it is a misconfigured
      //   ceiling. 1800M is ~2x the baseline: a healthy process never trips it, and
      //   a genuine runaway still gets a graceful PM2 restart before V8's 2048MB
      //   heap limit would crash it. (Earlier this was wrongly lowered 1200M->820M
      //   on the false premise of a 992MB OS-OOM ceiling.)
      max_memory_restart: '1800M',
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
