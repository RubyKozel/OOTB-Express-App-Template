/**
 * @author Ruby Kozel
 */

const prompt = require('prompt-sync')({ sigint: true });
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cliProgress = require('cli-progress');
const commander = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

const jsTemplate = fs.readFileSync(`${ path.dirname(__dirname) + path.sep }templates/js/js-template.txt`);
const tsTemplate = fs.readFileSync(`${ path.dirname(__dirname) + path.sep }templates/ts/ts-template.txt`);
const jsMiddlewaresTemplate = fs.readFileSync(`${ path.dirname(__dirname) + path.sep }templates/js/js-middlewares-template.txt`);
const tsMiddlewaresTemplate = fs.readFileSync(`${ path.dirname(__dirname) + path.sep }templates/ts/ts-middlewares-template.txt`);

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

let ts_support;
let git_support;
let projectName;

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
    console.log(`${ chalk.cyan(`Installing ${ deps.join(' ') }as dependencies, this may take a while...`) }`);
    await install(deps, false, dirName);
    console.log(`${ chalk.cyan(`Installing ${ devDeps.join(' ') }as dev-dependencies, this may take a while...`) }`);
    await install(devDeps, true, dirName);
};

const getEslintrcJson = () => {
    if (ts_support) {
        return require('../templates/ts/ts-eslint-template.json');
    }
    return require('../templates/js/js-eslint-template.json');
};

const promptUser = () => {
    const extra_deps = prompt(`${ chalk.cyan('What extra dependencies to add? write the names of packages with spaces between (Enter to add none) ') }`);
    const extra_dev_deps = prompt(`${ chalk.cyan('What extra dev-dependencies to add? write the names of packages with spaces between (Enter to add none) ') }`);
    return { extra_deps, extra_dev_deps };
};

const getTsConfig = () => require('../templates/ts/tsconfig-template.json');

const getInputs = ({ extra_deps, extra_dev_deps }) => {
    const inputs = require('../resources/inputs.json');
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

const createPackageJson = async (dirName) => {
    if (git_support) {
        await run(dirName, 'git init');
    }
    await run(dirName, 'npm init -y');
    const packageJsonTemplate = JSON.parse(fs.readFileSync(`${ dirName }${ path.sep }package.json`).toString());
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

const writeScripts = async (dirName) => {
    fs.mkdirSync(`${ dirName }${ path.sep }src`);
    fs.mkdirSync(`${ dirName }${ path.sep }test`);
    fs.mkdirSync(`${ dirName }${ path.sep }middlewares`);
    fs.writeFileSync(`${ dirName }${ path.sep }index.${ ts_support ? 'ts' : 'js' }`, ts_support ? tsTemplate : jsTemplate, 'utf8');
    fs.writeFileSync(`${ dirName }${ path.sep }middlewares${ path.sep }index.${ ts_support ? 'ts' : 'js' }`, ts_support ? tsMiddlewaresTemplate : jsMiddlewaresTemplate, 'utf8');
    await run(dirName, `echo PORT=3000 > .env`);
};

const addEslintFile = (dirName) => {
    console.log('Adding .eslintrc.json');
    fs.writeFileSync(`${ dirName }${ path.sep }.eslintrc.json`, JSON.stringify(getEslintrcJson(ts_support), null, 2), 'utf8');
}

const addTsFiles = (dirName) => {
    console.log('Adding tsconfig.json');
    fs.writeFileSync(`${ dirName }${ path.sep }tsconfig.json`, JSON.stringify(getTsConfig(), null, 2), 'utf8');
};

const registerCommand = () => {
    new commander.Command(packageJson.name)
        .version(packageJson.version)
        .arguments('<project-name>')
        .option('-t, --ts', 'Adds typescript support')
        .option('-g, --git', 'Adds git init command')
        .action((name, options) => {
            projectName = name;
            if (options.ts) {
                console.log(`${ chalk.green('--ts was specified, adding typescript support') }`);
                ts_support = options.ts;
            }

            if (options.git) {
                console.log(`${ chalk.green('--git was specified, adding git support') }`);
                git_support = options.git;
            }
        })
        .usage(`${ chalk.green('<project-name>') } [options]`)
        .parse();

    if (typeof projectName === "undefined") {
        console.log(`${ chalk.red('You have to specify the project name!') }`);
        process.exit(1);
    }
}

const createApp = async () => {
    registerCommand();
    const { deps, devDeps } = getInputs(promptUser());
    const dirName = getDirName(projectName);
    await createPackageJson(dirName);
    await installDeps(deps, devDeps, dirName);
    await writeScripts(dirName);
    addEslintFile(dirName);
    if (ts_support) {
        addTsFiles(dirName);
    }

    return dirName;
};

module.exports = createApp;
