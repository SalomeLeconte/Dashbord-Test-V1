module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './dashboard-wip.html',
    './*.js',
    './perf-runtime/**/*.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Nunito', 'sans-serif']
      },
      colors: {
        komatsu: {
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04'
        }
      }
    }
  },
  plugins: []
};
