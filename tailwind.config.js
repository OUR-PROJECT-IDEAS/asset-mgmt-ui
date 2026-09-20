/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  // This stops Tailwind from deleting our glowing chart colors!
  safelist: [
    {
      pattern:
        /^(bg|text|border|ring|stroke|fill)-(slate|emerald|rose|cyan|blue)-(400|500|600)$/,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
