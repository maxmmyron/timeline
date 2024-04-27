/** @type {import('tailwindcss').Config}*/
const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {
      colors: {
        zinc: {
          925: "#101013",
        }
      }
    },
  },

  plugins: [],
};

module.exports = config;
