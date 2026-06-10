import { e as execExports, b as addPath, i as info, l as setOutput, c as setFailed, f as axios, g as error, m as startGroup, n as endGroup } from './exec-DFZO2h97.js';
import * as fs from 'fs';
import * as path from 'path';
import 'os';
import 'crypto';
import 'http';
import 'https';
import 'net';
import 'tls';
import 'events';
import 'assert';
import 'util';
import 'node:assert';
import 'node:net';
import 'node:http';
import 'node:stream';
import 'node:buffer';
import 'node:util';
import 'node:querystring';
import 'node:events';
import 'node:diagnostics_channel';
import 'node:tls';
import 'node:zlib';
import 'node:perf_hooks';
import 'node:util/types';
import 'node:worker_threads';
import 'node:url';
import 'node:async_hooks';
import 'node:console';
import 'node:dns';
import 'string_decoder';
import 'child_process';
import 'timers';
import 'stream';
import 'url';
import 'tty';
import 'http2';
import 'zlib';

// SonarQube Scan Action
// Copyright (C) SonarSource Sàrl
// Copyright (c) 2026 StepSecurity
// mailto:contact AT sonarsource DOT com
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 3 of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with this program; if not, write to the Free Software Foundation,
// Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.


/**
 * Compute all names and paths related to the build wrapper
 * based on the runner environment
 */
function getBuildWrapperInfo({
  runnerOS,
  runnerArch,
  runnerTemp,
  sonarHostUrl,
}) {
  const { buildWrapperSuffix, buildWrapperName } = getSuffixAndName(
    runnerOS,
    runnerArch
  );

  const buildWrapperDir = `${runnerTemp}/build-wrapper-${buildWrapperSuffix}`;
  const buildWrapperUrl = `${sonarHostUrl}/static/cpp/build-wrapper-${buildWrapperSuffix}.zip`;
  const buildWrapperBin = `${buildWrapperDir}/${buildWrapperName}`;

  return {
    buildWrapperUrl,
    buildWrapperDir,
    buildWrapperBin,
  };
}

function getSuffixAndName(runnerOS, runnerArch) {
  if (
    runnerArch !== "X64" &&
    !(runnerArch === "ARM64" && (runnerOS === "macOS" || runnerOS === "Linux"))
  ) {
    throw new Error(
      `Architecture '${runnerArch}' is unsupported by build-wrapper`
    );
  }

  switch (runnerOS) {
    case "Windows":
      return {
        buildWrapperSuffix: "win-x86",
        buildWrapperName: "build-wrapper-win-x86-64.exe",
      };

    case "Linux":
      switch (runnerArch) {
        case "X64":
          return {
            buildWrapperSuffix: "linux-x86",
            buildWrapperName: "build-wrapper-linux-x86-64",
          };

        case "ARM64":
          return {
            buildWrapperSuffix: "linux-aarch64",
            buildWrapperName: "build-wrapper-linux-aarch64",
          };
      }
      break; // handled before the switch

    case "macOS":
      return {
        buildWrapperSuffix: "macosx-x86",
        buildWrapperName: "build-wrapper-macosx-x86",
      };

    default:
      throw new Error(`Unsupported runner OS '${runnerOS}'`);
  }
}

async function getRealPath(filePath, runnerOS) {
  switch (runnerOS) {
    case "Windows": {
      const windowsResult = await execExports.getExecOutput("cygpath", [
        "--absolute",
        "--windows",
        filePath,
      ]);
      return windowsResult.stdout.trim();
    }
    case "Linux": {
      const linuxResult = await execExports.getExecOutput("readlink", [
        "-f",
        filePath,
      ]);
      return linuxResult.stdout.trim();
    }
    case "macOS": {
      const macResult = await execExports.getExecOutput("greadlink", ["-f", filePath]);
      return macResult.stdout.trim();
    }
    default:
      return path.resolve(filePath);
  }
}

// SonarQube Scan Action
// Copyright (C) SonarSource Sàrl
// Copyright (c) 2026 StepSecurity
// mailto:contact AT sonarsource DOT com
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 3 of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with this program; if not, write to the Free Software Foundation,
// Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.


async function validateSubscription() {
  let repoPrivate;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    repoPrivate = payload?.repository?.private;
  }

  const upstream = 'sonarsource/sonarqube-scan-action';
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl = 'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';
  info('');
  info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m');
  info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false) info('\u001b[32m✓ Free for public repositories\u001b[0m');
  info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  info('');
  if (repoPrivate === false) return;
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const body = { action: action || '' };
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body, { timeout: 3000 }
    );
  } catch (error$1) {
    if (axios.isAxiosError(error$1) && error$1.response?.status === 403) {
      error(`\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`);
      error(`\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`);
      process.exit(1);
    }
    info('Timeout or API not reachable. Continuing to next step.');
  }
}

async function installMacOSPackages() {
  if (process.platform === "darwin") {
    info("Installing required packages for macOS");
    await execExports.exec("brew", ["install", "coreutils"]);
  }
}

/**
 * These RUNNER_XX env variables come from GitHub by default.
 * See https://docs.github.com/en/actions/reference/workflows-and-actions/variables#default-environment-variables
 *
 * If SONAR_HOST_URL is omitted, we assume sonarcloud.io
 */
function getEnvVariables() {
  const sonarHostUrl = process.env.SONAR_HOST_URL
    ? process.env.SONAR_HOST_URL.replace(/\/$/, "")
    : "https://sonarcloud.io";

  return {
    runnerOS: process.env.RUNNER_OS,
    runnerArch: process.env.RUNNER_ARCH,
    runnerTemp: process.env.RUNNER_TEMP,
    sonarHostUrl,
  };
}

async function downloadAndInstallBuildWrapper(downloadUrl, runnerEnv) {
  const { runnerArch, runnerOS, runnerTemp } = runnerEnv;
  const tmpZipPath = path.join(
    runnerTemp,
    `build-wrapper-${runnerOS}-${runnerArch}.zip`
  );

  startGroup(`Download ${downloadUrl}`);

  info(`Downloading '${downloadUrl}'`);

  if (!fs.existsSync(runnerTemp)) {
    fs.mkdirSync(runnerTemp, { recursive: true });
  }

  await execExports.exec("curl", ["-sSLo", tmpZipPath, downloadUrl]);

  info("Decompressing");
  await execExports.exec("unzip", ["-o", "-d", runnerTemp, tmpZipPath]);

  endGroup();
}

async function run() {
  try {
    await validateSubscription();
    await installMacOSPackages();

    const envVariables = getEnvVariables();

    const { buildWrapperBin, buildWrapperDir, buildWrapperUrl } =
      getBuildWrapperInfo(envVariables);

    await downloadAndInstallBuildWrapper(buildWrapperUrl, envVariables);

    const buildWrapperBinDir = await getRealPath(
      buildWrapperDir,
      envVariables.runnerOS
    );
    addPath(buildWrapperBinDir);
    info(`'${buildWrapperBinDir}' added to the path`);

    const buildWrapperBinPath = await getRealPath(
      buildWrapperBin,
      envVariables.runnerOS
    );
    setOutput("build-wrapper-binary", buildWrapperBinPath);
    info(`'build-wrapper-binary' output set to '${buildWrapperBinPath}'`);
  } catch (error) {
    setFailed(error.message);
  }
}

run();
//# sourceMappingURL=install-build-wrapper.js.map
