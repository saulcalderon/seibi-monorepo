// Unistyles' Babel plugin finds each style's theme and runtime dependencies
// and registers React Native views, so a theme change updates them natively.
// Plugins run before presets, so it runs before the React Compiler that
// babel-preset-expo adds (Unistyles requires that order).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['react-native-unistyles/plugin', { root: 'src' }]],
  };
};
