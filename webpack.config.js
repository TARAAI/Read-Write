const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const libraryName = 'read-write';
const isProduction = process.env.NODE_ENV === 'production';

const config = {
  mode: process.env.NODE_ENV || 'production',
  entry: [path.join(__dirname, 'src/index.js')],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: libraryName + (isProduction ? '.min.js' : '.js'),
    library: 'ReadWrite',
    libraryTarget: 'umd',
    umdNamedDefine: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  externals: {
    '@reduxjs/toolkit': '@reduxjs/toolkit',
    firebase: 'firebase',
    react: 'react',
    'react-dom': 'react-dom',
    'react-redux': 'react-redux',
  },
  optimization: {
    minimize: isProduction,
    minimizer: isProduction ? [new TerserPlugin()] : [],
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/transform-runtime'],
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [],
};

const testingConfig = {
  target: 'node',
  mode: process.env.NODE_ENV || 'production',
  entry: [path.join(__dirname, 'src/test.js')],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: libraryName + '-test.js',
    library: 'ReadWriteTest',
    libraryTarget: 'umd',
    umdNamedDefine: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  externals: {
    '@reduxjs/toolkit': '@reduxjs/toolkit',
    firebase: 'firebase',
    react: 'react',
    'react-dom': 'react-dom',
    'react-redux': 'react-redux',
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/transform-runtime'],
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [],
};

module.exports = [config, testingConfig];
