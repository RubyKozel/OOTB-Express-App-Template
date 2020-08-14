/**
 * @author Ruby Kozel
 */

const prompt = require('prompt-sync')({ sigint: true });
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cliProgress = require('cli-progress');

const jsTemplate = fs.readFileSync(`${ path.dirname(__dirname) + path.sep }templates/js-template.txt`);
const tsTemplate = fs.readFileSync(`${ path.dirname(__dirname) + path.sep }templates/ts-template.txt`);
const jsMiddlewaresTemplate = fs.readFileSync(`${ path.dirname(__dirname) + path.sep }templates/js-middlewares-template.txt`);
const tsMiddlewaresTemplate = fs.readFileSync(`${ path.dirname(__dirname) + path.sep }templates/ts-middlewares-template.txt`);

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

let ts_support;
let git_support;

if (process.argv.includes('ts')) {
    ts_support = true;
}

if (process.argv.includes('git')) {
    git_support = true;
}

const run = async (cwd, command) => {
    await new Promise((resolve, reject) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
};

const install = async (deps, dev, cwd) => {
    progressBar.start(100, 0);
    const progress = Math.round(100 / (deps.length));
    let i = 0;
    for (const dep of deps) {
        await run(cwd, `npm i${ dev ? ' -D' : '' } ${ dep }`);
        progressBar.update(++i * progress);
    }
    progressBar.stop();
};

const installDeps = async (deps, devDeps, dirName) => {
    console.log(`Installing ${ deps.join(' ') }as dependencies, this may take a while...`);
    await install(deps, false, dirName);
    console.log(`Installing ${ devDeps.join(' ') }as dev-dependencies, this may take a while...`);
    await install(devDeps, true, dirName);
};

const getEslintrcJson = () => {
    if (ts_support) {
        return {
            "env": {
                "commonjs": true,
                "es2020": true,
                "node": true
            },
            "extends": [
                "airbnb-base",
                "eslint:recommended",
                "plugin:import/errors",
                "plugin:import/warnings",
                "plugin:import/typescript"
            ],
            "parser": "@typescript-eslint/parser",
            "parserOptions": {
                "ecmaVersion": 2020,
                "sourceType": "module"
            },
            "settings": {
                "import/parsers": {
                    "@typescript-eslint/parser": [
                        ".ts",
                        ".tsx"
                    ]
                },
                "import/resolver": {
                    "node": {
                        "extensions": [
                            ".js",
                            ".jsx",
                            ".ts",
                            ".tsx"
                        ]
                    }
                },
                "import/extensions": [
                    ".js",
                    ".jsx",
                    ".ts",
                    ".tsx",
                    ".mjs"
                ]
            },
            "plugins": [
                "@typescript-eslint"
            ],
            "rules": {
                "no-console": "off",
                "import/extensions": [
                    "error",
                    "ignorePackages",
                    {
                        "js": "never",
                        "jsx": "never",
                        "ts": "never",
                        "tsx": "never"
                    }
                ]
            }
        };
    }
    return {
        env: {
            commonjs: true,
            es2020: true,
            node: true,
        },
        extends: [
            "airbnb-base",
            "eslint:recommended"
        ],
        parserOptions: {
            ecmaVersion: 2020,
        },
        rules: {
            "no-console": "off"
        },
    };
};

const promptUser = () => {
    const author = prompt("What is your name? (Press Enter if you don't have a name...) ");
    const name = prompt('What is the name of the project? (Please pick a name...) ');
    const extra_deps = prompt('What extra dependencies to add? write the names of packages with spaces between (Enter to add none) ');
    const extra_dev_deps = prompt('What extra dev-dependencies to add? write the names of packages with spaces between (Enter to add none) ');
    return { author, name, extra_deps, extra_dev_deps };
};

const getTsConfig = () => ({
    compilerOptions: {
        target: "es6",
        outDir: "./dist",
        baseUrl: "./",
        module: "commonjs",
        strict: true,
        esModuleInterop: false,
        forceConsistentCasingInFileNames: true
    }
});

const getInputs = ({ author, name, extra_deps, extra_dev_deps }) => {
    const inputs = {
        deps: [
            'express',
            'helmet',
            'cors',
            'morgan',
        ],
        devDeps: [
            'eslint',
            'eslint-config-airbnb-base',
            'eslint-plugin-import',
            'nodemon',
        ],
        tsDeps: [
            'typescript',
            'ts-node',
            'tsconfig-paths'
        ],
        tsDevDeps: [
            '@types/node',
            '@types/express',
            '@types/cors',
            '@types/helmet',
            '@types/morgan',
            '@typescript-eslint/eslint-plugin',
            '@typescript-eslint/parser'
        ],
    };

    inputs.author = author.trim().toString();
    inputs.name = name.trim().toString();
    if (ts_support) {
        inputs.deps.push(...inputs.tsDeps)
        inputs.devDeps.push(...inputs.tsDevDeps);
    }
    inputs.deps.push(...extra_deps.trim().toString().split(' '));
    inputs.devDeps.push(...extra_dev_deps.trim().toString().split(' '));
    return inputs;
};

const getDirName = (name) => {
    const dirName = `${ process.cwd() }${ path.sep }${ name }`;
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
    }
    return dirName;
};

const createPackageJson = async (dirName, author) => {
    if (git_support) {
        await run(dirName, 'git init');
    }
    await run(dirName, 'npm init -y');
    const packageJsonTemplate = JSON.parse(fs.readFileSync(`${ dirName }${ path.sep }package.json`).toString());
    packageJsonTemplate.author = author;
    if (ts_support) {
        packageJsonTemplate.scripts.build = 'tsc -p tsconfig.json';
        packageJsonTemplate.scripts.start = 'npm run build && ts-node index.js';
        packageJsonTemplate.scripts.dev = 'nodemon --exec ts-node index.js';
    } else {
        packageJsonTemplate.scripts.start = 'node index.js';
        packageJsonTemplate.scripts.dev = 'nodemon index.js';
    }
    packageJsonTemplate.scripts.lint = 'eslint src/ index.js';
    fs.writeFileSync(`${ dirName }${ path.sep }package.json`, JSON.stringify(packageJsonTemplate, null, 2), 'utf8');
};

const writeScripts = (dirName) => {
    fs.mkdirSync(`${ dirName }${ path.sep }src`);
    fs.mkdirSync(`${ dirName }${ path.sep }test`);
    fs.mkdirSync(`${ dirName }${ path.sep }middlewares`);
    fs.writeFileSync(`${ dirName }${ path.sep }index.${ ts_support ? 'ts' : 'js' }`, ts_support ? tsTemplate : jsTemplate, 'utf8');
    fs.writeFileSync(`${ dirName }${ path.sep }middlewares${ path.sep }index.${ ts_support ? 'ts' : 'js' }`, ts_support ? tsMiddlewaresTemplate : jsMiddlewaresTemplate, 'utf8');
};

const addEslintFile = (dirName) => {
    console.log('Adding .eslintrc.json');
    fs.writeFileSync(`${ dirName }${ path.sep }.eslintrc.json`, JSON.stringify(getEslintrcJson(ts_support), null, 2), 'utf8');
}

const addTsFiles = (dirName) => {
    console.log('Adding tsconfig.json');
    fs.writeFileSync(`${ dirName }${ path.sep }tsconfig.json`, JSON.stringify(getTsConfig, null, 2), 'utf8');
};

const createApp = async () => {
    const { name, author, deps, devDeps, } = getInputs(promptUser());
    const dirName = getDirName(name);
    await createPackageJson(dirName, author);
    await installDeps(deps, devDeps, dirName);
    writeScripts(dirName);
    addEslintFile(dirName);
    if (ts_support) {
        addTsFiles(dirName);
    }
};

module.exports = createApp;
