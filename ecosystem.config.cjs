/**
 * إعداد PM2 للإنتاج — SOBIS Premium
 * التشغيل:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup   (للتشغيل التلقائي بعد إعادة تشغيل السيرفر)
 */
module.exports = {
  apps: [
    {
      name: "sobis-supermarket",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: "max", // استخدام كل أنوية المعالج
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "900M",
      restart_delay: 3000,
      exp_backoff_restart_delay: 500,
      max_restarts: 20,
      kill_timeout: 8000,
      listen_timeout: 12000,
      env: {
        NODE_ENV: "production",
      },
      error_file: "logs/sobis-error.log",
      out_file: "logs/sobis-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
