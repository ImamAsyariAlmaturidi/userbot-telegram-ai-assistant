module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-nunito-sans)", "Nunito Sans", "sans-serif"],
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
        nunito: ["var(--font-nunito-sans)", "Nunito Sans", "sans-serif"],
        poppins: ["var(--font-poppins)", "Poppins", "sans-serif"],
        dmsans: ["var(--font-dm-sans)", "DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
