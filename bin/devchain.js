#!/usr/bin/env node
const { spawn } = require("node:child_process");
const fs = require("fs");
const path = require("path");
const { homedir } = require("os");
const commandExists = require("command-exists").sync;

const commandArgs = [];

// TODO test for existing of docker
if (!commandExists("docker")) {
  console.error(`You need docker on your system`);
  process.exit(1);
}

let dockerComposeCommand = `docker`;

if (commandExists("docker-compose")) {
  dockerComposeCommand = `docker-compose`;
} else {
  commandArgs.push("compose");
}

const npmPackageFolder = path.resolve(__dirname, "..");
let dockerComposeFilepath = path.resolve(
  npmPackageFolder,
  "docker-compose.yml"
);

const configHome =
  process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config");
const configFolder = path.join(configHome, "devchain");
if (!fs.existsSync(configFolder)) {
  fs.mkdirSync(configFolder, { recursive: true });
}
const execFolder = configFolder;

fs.copyFileSync(
  dockerComposeFilepath,
  path.join(execFolder, "docker-compose.yml")
);
dockerComposeFilepath = "docker-compose.yml";

commandArgs.push("-f", dockerComposeFilepath);

console.log({
  dockerComposeFilepath,
  execFolder,
});

// const execFolder = npmPackageFolder;

function dockerComposeUP() {
  return new Promise((resolve, reject) => {
    const dockerCompose = spawn(
      dockerComposeCommand,
      commandArgs.concat(["up", "-d"]),
      {
        stdio: "inherit",
        cwd: execFolder,
      }
    );
    dockerCompose.on("close", (code) => {
      if (code) {
        const message = `${dockerComposeCommand} down failed with error code ${code}`;
        // console.error(message);
        reject(message);
      } else {
        resolve();
      }
    });
  });
}

function dockerComposeDOWN() {
  return new Promise((resolve, reject) => {
    const dockerCompose = spawn(
      dockerComposeCommand,
      commandArgs.concat(["down", "-v", "--remove-orphans"]),
      {
        stdio: "inherit",
        cwd: execFolder,
      }
    );
    dockerCompose.on("close", (code) => {
      if (code) {
        const message = `${dockerComposeCommand} down failed with error code ${code}`;
        // console.error(message);
        reject(message);
      } else {
        resolve();
      }
    });
  });
}

function execScript() {
  return new Promise((resolve, reject) => {
    const script = ` 
const accountsToFund = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"
]
const value = "10000000000000000000";
const from = web3.eth.coinbase;
for (const to of accountsToFund) {
  web3.eth.sendTransaction({from, to, value});
}`;

    const scriptExecution = spawn(
      dockerComposeCommand,
      commandArgs.concat([
        "exec",
        "ethereum",
        "geth",
        "attach",
        "http://localhost:8545",
        "--exec",
        script,
      ]),
      {
        stdio: "inherit",
        cwd: execFolder,
      }
    );

    scriptExecution.on("close", (code) => {
      if (code) {
        const message = `script execution failed with error code ${code}`;
        // console.error(message);
        reject(message);
      } else {
        resolve();
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "stop") {
    await dockerComposeDOWN();
    console.log(`Docker Services Are Down!`);
  } else {
    await dockerComposeUP();
    console.log(`Docker Services Are Up!`);
    await execScript();
    console.log(`Default Accounts Funded!`);
  }
}

main();
