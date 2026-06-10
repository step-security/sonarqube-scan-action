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

import * as core from "@actions/core";
import * as fs from "fs";
import axios from "axios";
import { installSonarScanner } from "./install-sonar-scanner.js";
import { runSonarScanner } from "./run-sonar-scanner.js";
import {
  checkGradleProject,
  checkMavenProject,
  checkSonarToken,
  validateScannerVersion,
} from "./sanity-checks.js";

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
  core.info('');
  core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m');
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false) core.info('\u001b[32m✓ Free for public repositories\u001b[0m');
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  core.info('');
  if (repoPrivate === false) return;
  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const body = { action: action || '' };
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body, { timeout: 3000 }
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      core.error(`\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`);
      core.error(`\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`);
      process.exit(1);
    }
    core.info('Timeout or API not reachable. Continuing to next step.');
  }
}

/**
 * Inputs are defined in action.yml
 */
function getInputs() {
  const args = core.getInput("args");
  const projectBaseDir = core.getInput("projectBaseDir");
  const scannerBinariesUrl = core.getInput("scannerBinariesUrl");
  const scannerBinariesAuthHeader = core.getInput("scannerBinariesAuthHeader") || undefined;
  if (scannerBinariesAuthHeader) {
    core.setSecret(scannerBinariesAuthHeader);
  }
  const scannerVersion = core.getInput("scannerVersion");
  const skipSignatureVerification = core.getBooleanInput("skipSignatureVerification");

  return { args, projectBaseDir, scannerBinariesUrl, scannerBinariesAuthHeader, scannerVersion, skipSignatureVerification };
}

/**
 * These RUNNER env variables come from GitHub by default.
 * See https://docs.github.com/en/actions/reference/workflows-and-actions/variables#default-environment-variables
 *
 * The others are optional env variables provided by the user of the action
 */
function getEnvVariables() {
  return {
    runnerDebug: process.env.RUNNER_DEBUG,
    runnerOs: process.env.RUNNER_OS,
    runnerTemp: process.env.RUNNER_TEMP,
    sonarRootCert: process.env.SONAR_ROOT_CERT,
    sonarcloudUrl: process.env.SONARCLOUD_URL,
    sonarToken: process.env.SONAR_TOKEN,
  };
}

function runSanityChecks(inputs) {
  try {
    const { projectBaseDir, scannerVersion, sonarToken } = inputs;

    validateScannerVersion(scannerVersion);
    checkSonarToken(core, sonarToken);
    checkMavenProject(core, projectBaseDir);
    checkGradleProject(core, projectBaseDir);
  } catch (error) {
    core.setFailed(`Sanity checks failed: ${error.message}`);
    process.exit(1);
  }
}

async function run() {
  try {
    await validateSubscription();
    const { args, projectBaseDir, scannerVersion, scannerBinariesUrl, scannerBinariesAuthHeader, skipSignatureVerification } =
      getInputs();
    const runnerEnv = getEnvVariables();
    const { sonarToken, sonarcloudUrl } = runnerEnv;

    if (sonarcloudUrl) {
      core.warning(
        "The SONARCLOUD_URL environment variable is deprecated and will be removed in a future version. " +
          "Regular users should not set it; use SONAR_REGION=us for the US region. " +
          "For advanced needs, pass -Dsonar.scanner.sonarcloudUrl and -Dsonar.scanner.apiBaseUrl via the args input."
      );
    }

    runSanityChecks({ projectBaseDir, scannerVersion, sonarToken });

    const scannerDir = await installSonarScanner({
      scannerVersion,
      scannerBinariesUrl,
      scannerBinariesAuthHeader,
      skipSignatureVerification,
    });

    await runSonarScanner(args, projectBaseDir, scannerDir, runnerEnv);
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
    process.exit(1);
  }
}

run();
