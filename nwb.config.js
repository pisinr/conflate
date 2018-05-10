module.exports = {
  type: 'web-module',
  npm: {
    esModules: true,
    umd: {
      global: 'conflate',
      externals: {}
    }
  },
  babel: {
    presets: ['flow']
  },
}
