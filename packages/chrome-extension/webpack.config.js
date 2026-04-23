const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  entry: {
    background: './src/background/index.ts',
    popup: './src/popup/index.tsx',
    capture: './src/content/capture.ts',
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
              '@babel/preset-react',
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
        { from: 'src/popup/popup.html', to: 'popup.html' },
      ],
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    // ESM convention: .ts files import each other with .js extensions (matches
    // what tsconfig's `moduleResolution: "bundler"` expects). Tell webpack to
    // try .ts/.tsx when it sees a .js/.jsx import specifier.
    extensionAlias: {
      '.js': ['.ts', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    },
  },
};
