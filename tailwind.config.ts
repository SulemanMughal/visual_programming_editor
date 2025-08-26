// tailwind.config.js
module.exports = {
  darkMode: 'class', // use class strategy
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: { extend: {
    colors: {
        htb: {
          bg: '#0f0f0f',
          accent: '#00ff9f',
          input: '#1c1c1c',
          border: '#333333',
        },
      },
  } },
  plugins: [],
};
