const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  entry: {
    background: './src/background/index.ts',
    content: './src/content/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    clean: true,
  },
  devtool: isProduction ? false : 'cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              // `runtime: 'automatic'` tells Babel to emit JSX via the React 17+
              // automatic runtime (importSource: 'react'). Without this, Babel
              // emits React.createElement() calls and requires `import React`
              // in every .tsx file, which silently overrides tsconfig's
              // `jsx: "react-jsx"` setting.
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'icons/*', to: 'icons/[name][ext]' },
      ],
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    // ESM convention: .ts files import each other with .js extensions (matches
    // what tsconfig's `moduleResolution: "bundler"` expects). Tell webpack to
    // try .ts/.tsx when it sees a .js/.jsx import specifier.
    extensionAlias: {
      // `.js` specifiers may target either .ts sources (plain modules) or
      // .tsx sources (components — importing from "./button.js" when the
      // real file is button.tsx). Webpack tries each in order.
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    },
  },
};
