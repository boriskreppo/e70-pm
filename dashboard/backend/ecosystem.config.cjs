module.exports = {
  apps: [{
    name: 'pm-dashboard',
    script: 'server.js',
    node_args: '--experimental-sqlite --env-file=.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    error_file: './server.error.log',
    out_file: './server.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
