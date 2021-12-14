const fontFamily = {
  sans: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    '"Microsoft YaHei"',
    '"Noto Sans"',
    "sans-serif",
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
    '"Noto Color Emoji"'
  ],
  serif: [
    "ui-serif",
    "Georgia",
    "Cambria",
    '"Times New Roman"',
    "Times",
    "serif"
  ],
  mono: [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Consolas",
    '"Liberation Mono"',
    '"Courier New"',
    "monospace"
  ]
};

window.tailwind.config = {
  theme: {
    fontFamily: {
      sans: ["Inter var", ...fontFamily.sans],
      mono: ["Fira Code VF", ...fontFamily.mono],
      source: ["Source Sans Pro", ...fontFamily.sans],
      "ubuntu-mono": ["Ubuntu Mono", ...fontFamily.mono],
      system: fontFamily.sans,
      flow: "Flow"
    },
    fontSize: {
      xs: ".85714rem",
      sm: ".92857rem",
      base: "1.00rem",
      lg: "1.1250rem",
      xl: "1.2500rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
      "6xl": "4rem",
      "7xl": "5rem"
    }
  }
};

console.log("config tailwindcss done.");
