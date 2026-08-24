import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "import/no-anonymous-default-export": "off"
    }
  },
  { ignores: [".next/**", "node_modules/**", ".recovered-from-cache/**", ".recovered-from-d-cache/**", ".recovery-tools/**"] }
];
