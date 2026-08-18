#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { findProfile, profiles } from './profiles/index.js'
import { createSubject } from './subjects.js'
import { runProfile, runSuite } from './core/run-suite.js'
import { buildReport } from './reporting/report.js'
import { renderInspector } from './reporting/inspector.js'

function readOption(args, name, fallback = null) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

async function persist(report, outputDir) {
  const directory = resolve(outputDir)
  await mkdir(directory, { recursive: true })
  const reportPath = resolve(directory, 'report.json')
  const inspectorPath = resolve(directory, 'inspector.html')
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  await writeFile(inspectorPath, renderInspector(report))
  return { reportPath, inspectorPath }
}

const args = process.argv.slice(2)
const command = args[0] ?? 'help'
const subjectName = readOption(args, '--subject', 'reference')
const outputDir = readOption(args, '--out', `artifacts/${subjectName}`)
const subject = createSubject(subjectName)

if (!subject) {
  console.error(`Unknown subject: ${subjectName}`)
  process.exit(2)
}

if (command === 'demo') {
  const results = await runSuite({ ...subject, profiles })
  const report = buildReport({ ...subject, results })
  const paths = await persist(report, outputDir)
  console.log(JSON.stringify({ subject: subjectName, summary: report.summary, reportDigest: report.reportDigest, ...paths }, null, 2))
  process.exit(0)
}

if (command === 'run') {
  const profileId = args[1]
  const profile = findProfile(profileId)
  if (!profile) {
    console.error(`Unknown profile: ${profileId ?? '<missing>'}`)
    process.exit(2)
  }
  const row = await runProfile({ ...subject, profile })
  const report = buildReport({ ...subject, results: [row] })
  const paths = await persist(report, outputDir)
  console.log(JSON.stringify({ subject: subjectName, profile: profileId, status: row.result.status, reportDigest: report.reportDigest, ...paths }, null, 2))
  process.exit(row.result.status === 'FAIL' ? 1 : 0)
}

console.log(`ActionSeam experimental CLI\n\nUsage:\n  node src/cli.js demo --subject reference\n  node src/cli.js demo --subject known-bad\n  node src/cli.js run <profile-id> --subject reference|known-bad\n`)
