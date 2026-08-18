export const ResultStatus = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  UNSUPPORTED: 'UNSUPPORTED',
  NOT_TESTED: 'NOT_TESTED',
  INDETERMINATE: 'INDETERMINATE',
})

export const SubjectMaturity = Object.freeze({
  EXPERIMENTAL: 'EXPERIMENTAL',
  PARTIAL: 'PARTIAL',
  SUPPORTED: 'SUPPORTED',
  DEPRECATED: 'DEPRECATED',
})

export const profileIds = Object.freeze({
  approvalBinding: 'authority.approval-binding.v1',
  monotonicDeny: 'authority.monotonic-deny.v1',
  principalBoundary: 'identity.external-principal.v1',
  idempotentRetry: 'effects.idempotent-retry.v1',
  inputContract: 'contracts.input-validation.v1',
  outputContract: 'contracts.output-validation.v1',
  staleRevision: 'effects.stale-revision.v1',
  promptAuthority: 'authority.untrusted-context.v1',
  reconstruction: 'reconstruction.model-visible.v1',
  tenantBoundary: 'isolation.tenant-boundary.v1',
  secretBoundary: 'isolation.secret-canary.v1',
})
