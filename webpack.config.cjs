const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (_env, argv) => {
  const production = argv.mode === 'production';

  return {
    entry: './src/app.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: production ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
      assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
      publicPath: production ? './' : '/',
      clean: true
    },
    devtool: production ? false : 'source-map',
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [production ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader']
        },
        {
          test: /\.(svg|png|jpe?g|webp|gif|ico)$/i,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './src/index.html', favicon: './src/assets/mark.svg' }),
      ...(production ? [new MiniCssExtractPlugin({ filename: '[name].[contenthash:8].css' })] : [])
    ],
    devServer: {
      host: 'localhost',
      port: 8080,
      open: true,
      hot: true,
      historyApiFallback: true,
      client: { overlay: true }
    },
    stats: 'minimal'
  };
};
