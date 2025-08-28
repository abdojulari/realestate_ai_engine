/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1976D2',
        secondary: '#424242',
        accent: '#82B1FF',
        error: '#FF5252',
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#FFC107'
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif']
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem'
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem'
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '2rem'
      },
      boxShadow: {
        'outline-primary': '0 0 0 3px rgba(25, 118, 210, 0.5)',
        'outline-secondary': '0 0 0 3px rgba(66, 66, 66, 0.5)'
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      }
    }
  },
  plugins: [],
  // Disable Tailwind's preflight as we're using Vuetify
  corePlugins: {
    preflight: false
  }
}
