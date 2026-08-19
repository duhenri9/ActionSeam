import { execFileSync, spawnSync } from 'node:child_process'
import { basename } from 'node:path'

const MAX_BLOB_BYTES = 8 * 1024 * 1024

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  })
}

function listReachableBlobs() {
  const rows = git(['rev-list', '--objects', '--all'])
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(' ')
      return separator === -1
        ? { sha: line, path: undefined }
        : { sha: line.slice(0, separator), path: line.slice(separator + 1) }
    })

  const pathsBySha = new Map()
  for (const { sha, path } of rows) {
    if (!pathsBySha.has(sha)) pathsBySha.set(sha, new Set())
    if (path) pathsBySha.get(sha).add(path)
  }

  const shas = [...pathsBySha.keys()]
  const batch = spawnSync(
    'git',
    ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'],
    {
      cwd: process.cwd(),
      input: `${shas.join('\n')}\n`,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  )
  if (batch.status !== 0) throw new Error(`git cat-file --batch-check failed: ${batch.stderr}`)

  const metadata = new Map()
  for (const line of batch.stdout.split('\n').filter(Boolean)) {
    const [sha, type, rawSize] = line.split(' ')
    metadata.set(sha, { type, size: Number(rawSize) })
  }

  return shas
    .map((sha) => ({ sha, paths: [...pathsBySha.get(sha)], ...metadata.get(sha) }))
    .filter((entry) => entry.type === 'blob')
}

const riskyPathRules = [
  { label: 'environment file', test: (path) => /(^|\/)\.env(?:\..+)?$/i.test(path) && !/(^|\/)\.env\.(?:example|sample|template)$/i.test(path) },
  { label: 'environment dir file', test: (path) => /(^|\/)\.envrc$/i.test(path) },
  { label: 'npm credentials file', test: (path) => /(^|\/)\.npmrc$/i.test(path) },
  { label: 'netrc credentials file', test: (path) => /(^|\/)\.netrc$/i.test(path) },
  { label: 'PyPI credentials file', test: (path) => /(^|\/)\.pypirc$/i.test(path) },
  { label: 'private key/container file', test: (path) => /\.(?:key|p12|pfx|jks|keystore)$/i.test(path) },
  { label: 'PEM file', test: (path) => /\.pem$/i.test(path) },
  { label: 'SSH private key file', test: (path) => /(^|\/)id_(?:rsa|dsa|ecdsa|ed25519)$/i.test(path) },
  { label: 'cloud credentials JSON', test: (path) => /(^|\/)(?:credentials|service[-_]?account|application_default_credentials)[^/]*\.json$/i.test(path) },
  { label: 'Terraform variable file', test: (path) => /\.tfvars(?:\.json)?$/i.test(path) },
]

const signatureRules = [
  { label: 'GitHub classic token', regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { label: 'GitHub fine-grained PAT', regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { label: 'OpenAI/Anthropic-style secret key', regex: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { label: 'Google API key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { label: 'AWS access key id', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: 'Slack token', regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { label: 'npm access token', regex: /\bnpm_[A-Za-z0-9]{30,}\b/g },
  { label: 'Stripe live secret/restricted key', regex: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g },
  { label: 'private key PEM block', regex: /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE KEY-----/g },
]

const sensitiveAssignment = /\b(GITHUB_TOKEN|GH_TOKEN|OPENAI_API_KEY|ANTHROPIC_API_KEY|VERCEL_TOKEN|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|POSTHOG_API_KEY|AWS_SECRET_ACCESS_KEY|STRIPE_SECRET_KEY|NPM_TOKEN)\s*[:=]\s*["']?([^\s"'`,;]{12,})/g

function isPlaceholder(value) {
  const normalized = value.toLowerCase()
  return normalized.includes('${')
    || normalized.includes('<')
    || normalized.includes('example')
    || normalized.includes('placeholder')
    || normalized.includes('changeme')
    || normalized.includes('your_')
    || normalized.includes('your-')
    || /^x{8,}$/i.test(value)
}

function displayPaths(paths) {
  if (paths.length === 0) return ['<historical blob without path>']
  return paths.slice(0, 4)
}

const blobs = listReachableBlobs()
const findings = []
let scanned = 0
let oversized = 0

for (const blob of blobs) {
  for (const path of blob.paths) {
    for (const rule of riskyPathRules) {
      if (rule.test(path)) findings.push({ kind: rule.label, sha: blob.sha, paths: [path] })
    }
  }

  if (!Number.isFinite(blob.size) || blob.size > MAX_BLOB_BYTES) {
    oversized += 1
    continue
  }

  const content = git(['cat-file', 'blob', blob.sha])
  scanned += 1

  for (const rule of signatureRules) {
    rule.regex.lastIndex = 0
    if (rule.regex.test(content)) {
      findings.push({ kind: rule.label, sha: blob.sha, paths: displayPaths(blob.paths) })
    }
  }

  sensitiveAssignment.lastIndex = 0
  for (const match of content.matchAll(sensitiveAssignment)) {
    if (!isPlaceholder(match[2])) {
      findings.push({ kind: `credential assignment (${match[1]})`, sha: blob.sha, paths: displayPaths(blob.paths) })
    }
  }
}

const unique = new Map()
for (const finding of findings) {
  const key = `${finding.kind}:${finding.sha}:${finding.paths.join('|')}`
  unique.set(key, finding)
}

if (oversized > 0) {
  throw new Error(`Secret scan refused to silently skip ${oversized} reachable blob(s) larger than ${MAX_BLOB_BYTES} bytes`)
}

if (unique.size > 0) {
  console.error(`ActionSeam public-history secret scan: FAIL (${unique.size} finding(s))`)
  for (const finding of unique.values()) {
    console.error(`- ${finding.kind}; blob=${finding.sha}; path=${finding.paths.join(', ')}`)
  }
  console.error('Secret values are intentionally never printed. Rotate any exposed credential before history remediation.')
  process.exit(1)
}

console.log(`ActionSeam public-history secret scan: PASS (${scanned} reachable blob(s) scanned; ${blobs.length} blob object(s) inspected)`)