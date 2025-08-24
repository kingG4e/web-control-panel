const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');

module.exports = function override(config, env) {
  // Add Monaco Editor Webpack Plugin
  config.plugins.push(
    new MonacoWebpackPlugin({
      // Languages supported by Monaco Editor
      languages: [
        'javascript',
        'typescript',
        'html',
        'css',
        'json',
        'xml',
        'yaml',
        'markdown',
        'python',
        'java',
        'php',
        'sql',
        'shell'
      ],
      // Features to include
      features: [
        'coreCommands',
        'find',
        'format',
        'hover',
        'parameterHints',
        'quickOutline',
        'suggest'
      ]
    })
  );

  // Configure CSS handling for Monaco Editor
  const MONACO_DIR = path.resolve(__dirname, './node_modules/monaco-editor');
  const APP_DIR = path.resolve(__dirname, './src');

  // Find the existing CSS rule and modify it
  const cssRule = config.module.rules.find(rule => 
    rule.test && rule.test.toString().includes('css')
  );

  if (cssRule) {
    // Backup the original rule
    const originalRule = { ...cssRule };
    
    // Clear the original rule
    Object.keys(cssRule).forEach(key => delete cssRule[key]);
    
    // Set up oneOf for different CSS handling
    cssRule.oneOf = [
      // Monaco Editor CSS (no CSS modules)
      {
        test: /\.css$/,
        include: MONACO_DIR,
        use: ['style-loader', 'css-loader']
      },
      // App CSS (with original configuration)
      {
        test: /\.css$/,
        include: APP_DIR,
        use: originalRule.use
      },
      // Fallback for other CSS files
      {
        test: /\.css$/,
        exclude: [MONACO_DIR, APP_DIR],
        use: ['style-loader', 'css-loader']
      }
    ];
  }

  return config;
};

// Allow custom hostnames to access CRA dev server to avoid "Invalid Host header"
module.exports.devServer = function(configFunction) {
  return function(proxy, allowedHost) {
    const config = configFunction(proxy, allowedHost);
    // Whitelist expected hostnames. Use 'all' if you want to allow any host.
    const allowed = process.env.CRA_ALLOWED_HOSTS;
    if (allowed && allowed.length > 0) {
      // comma-separated -> array
      config.allowedHosts = allowed.split(',').map(h => h.trim());
    } else {
      // Default: allow the current domain as served via reverse proxy or custom DNS
      config.allowedHosts = 'all';
    }
    // Listen on all interfaces by default for LAN/domain access
    config.host = process.env.HOST || '0.0.0.0';
    return config;
  };
};