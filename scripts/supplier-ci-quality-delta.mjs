#!/usr/bin/env node
/**
 * Regression gate for the OTS supplier feature.
 * Compare OTS main at the actual merge-base using identical toolchain/deps.
 * Do not silently allow new TypeScript diagnostics or newly failing tests.
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("Usage: node scripts/supplier-ci-quality-delta.mjs <results-directory>");
const from = (name) => fs.readFileSync(path.join(dir, name), "utf8");

function typeErrors(name) {
  const output = from(name);
  const items = new Map();
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^(.+?)\(\d+,\d+\): error (TS\d+): (.*)$/);
    if (!match) continue;
    const key = match[1] + " | " + match[2] + " | " + match[3];
    items.set(key, (items.get(key) || 0) + 1);
  }
  return items;
}

function testFailures(name) {
  const payload = JSON.parse(from(name));
  if (!Array.isArray(payload.testResults) || typeof payload.numTotalTests !== "number") {
    throw new Error("Invalid Vitest JSON report: " + name);
  }
  const items = new Map();
  for (const file of payload.testResults) {
    for (const test of file.assertionResults || []) {
      if (test.status !== "failed") continue;
      const title = test.fullName || [...(test.ancestorTitles || []), test.title || ""].join(" > ");
      const reason = String((test.failureMessages || [])[0] || "")
        .replace(/\u001b\[[0-9;]*m/g, "").trim().split("\n")[0] || "failed";
      const key = path.basename(file.name) + " | " + title + " | " + reason;
      items.set(key, (items.get(key) || 0) + 1);
    }
  }
  return { items, total: payload.numTotalTests, failing: payload.numFailedTests };
}

function additions(base, current) {
  const added = [];
  for (const [key, count] of current) {
    const n = count - (base.get(key) || 0);
    for (let i = 0; i < n; i++) added.push(key);
  }
  return added;
}
function sum(map) { return [...map.values()].reduce((n, x) => n + x, 0); }

const baselineTs = typeErrors("base-tsc.log");
const featureTs = typeErrors("feature-tsc.log");
const baselineTests = testFailures("base-vitest.json");
const featureTests = testFailures("feature-vitest.json");
const newTs = additions(baselineTs, featureTs);
const newTests = additions(baselineTests.items, featureTests.items);
const bTsStatus = Number(from("base-tsc.exit").trim());
const fTsStatus = Number(from("feature-tsc.exit").trim());
const bTestStatus = Number(from("base-vitest.exit").trim());
const fTestStatus = Number(from("feature-vitest.exit").trim());

const technicalErrors = [];
if (bTsStatus !== 0 && baselineTs.size === 0) technicalErrors.push("Baseline compiler failed without readable TS diagnostics.");
if (fTsStatus !== 0 && featureTs.size === 0) technicalErrors.push("Feature compiler failed without readable TS diagnostics.");
if (bTestStatus !== 0 && baselineTests.items.size === 0) technicalErrors.push("Baseline tests failed without readable failing-test evidence.");
if (fTestStatus !== 0 && featureTests.items.size === 0) technicalErrors.push("Feature tests failed without readable failing-test evidence.");
const fail = newTs.length > 0 || newTests.length > 0 || technicalErrors.length > 0;

const summary = [
  "## OTS supplier intake: baseline-aware verification",
  "",
  "| Gate | Existing OTS main baseline | Supplier feature | New failures |",
  "|---|---:|---:|---:|",
  "| TypeScript diagnostic occurrences | " + sum(baselineTs) + " | " + sum(featureTs) + " | " + newTs.length + " |",
  "| Full Vitest suite (failures) | " + baselineTests.failing + " / " + baselineTests.total + " | " + featureTests.failing + " / " + featureTests.total + " | " + newTests.length + " |",
  "",
  "Result: **" + (fail ? "BLOCKED" : "No new supplier-branch regressions detected") + "**.",
  "",
  "> Existing full-project TypeScript and test debt is not fixed or waived. The complete baseline and feature suites both ran with identical dependencies; any new diagnostics or failing tests block the feature.",
  ...(newTs.length ? ["", "### New TypeScript diagnostics", "~~~", ...newTs.slice(0,100), "~~~"] : []),
  ...(newTests.length ? ["", "### Newly failing tests", "~~~", ...newTests.slice(0,100), "~~~"] : []),
  ...(technicalErrors.length ? ["", "### Missing evidence", ...technicalErrors.map(x => "- " + x)] : []),
  "",
].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
if (fail) process.exitCode = 1;
