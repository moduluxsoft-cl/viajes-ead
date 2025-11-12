module.exports = {
    root: true,
    env: { es2021: true, node: true },
    ignorePatterns: ["node_modules/", "packages/app/dist/", "firebase/hosting/public/"],
    overrides: [
        {
            files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
            parserOptions: { ecmaVersion: 2021, sourceType: "module" },
            extends: ["eslint:recommended"]
        }
    ]
};
