// Babel config for the Expo app.
//
// NativeWind is installed and can be enabled by adding "nativewind/babel" to
// the presets and wiring metro.config.js + global.css (see README). The design
// system ships as a StyleSheet-based theme so the app renders reliably out of
// the box without that build step.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Enables the `@/` path alias used across the codebase.
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
        },
      ],
    ],
  };
};
