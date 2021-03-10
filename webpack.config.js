const path = require('path');

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader', 'eslint-loader?fix=true']
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: [
                require('postcss-nested-ancestors'),
                require('postcss-nested')
              ]
            }
          }
        ]
      },
      {
        test: /\.svg$/,
        loader: 'svg-inline-loader?removeSVGTagAttrs=false'
      }
    ]
  },
  output: {
    path:  '/Users/victor/Desktop/SmoothNLP_Work/swrite_frontend/src/plugins/editorjs_smartlink/',
    publicPath: '/',
    filename: 'bundle.js',
    library: 'LinkTool',
    libraryExport: 'default',
    libraryTarget: 'umd'
  }
};
