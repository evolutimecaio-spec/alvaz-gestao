import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        concrete: "#F2F1EC",
        graphite: "#1C2126",
        ink: "#23282C",
        steel: "#5A6570",
        brand: "#C2410C",
        brandsoft: "#FDEBDD",
        ok: "#178A50",
        oksoft: "#E3F4EB",
        warn: "#B45309",
        warnsoft: "#FCF3E3",
        danger: "#C93A2E",
        dangersoft: "#FBE9E7",
        info: "#2563EB",
        infosoft: "#E7EEFC"
      },
      fontFamily: {
        display: ['"Archivo Variable"', "sans-serif"],
        body: ['"Inter Variable"', "sans-serif"]
      }
    }
  },
  plugins: []
};
export default config;
