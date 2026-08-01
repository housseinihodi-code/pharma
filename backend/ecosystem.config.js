module.exports = {
  apps: [
    {
      name: 'pharmaconnect-api',
      cwd: __dirname,
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
      out_file: '/root/.pm2/logs/pharmaconnect-out.log',
      error_file: '/root/.pm2/logs/pharmaconnect-error.log',
      time: true,
    },
  ],
};
