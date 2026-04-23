// Side-effect CSS imports ("./popup.css") are handled by webpack's css-loader
// + postcss-loader pipeline. This declaration keeps TypeScript happy about
// the import statement — the module's runtime effect is all we care about.
declare module "*.css";
