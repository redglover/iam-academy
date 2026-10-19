// Automation pipeline builder: the learner orders blocks, the validator reviews it like a senior engineer would.

export interface Block {
  id: string
  label: string
  hint: string
  /** PowerShell / Graph snippet this block turns into. */
  code: string
  trap?: boolean
}

export interface Issue {
  level: 'error' | 'warn' | 'tip'
  message: string
}

export interface Scenario {
  id: 'leaver' | 'joiner'
  title: string
  goal: string
  blocks: Block[]
  validate: (ids: string[]) => Issue[]
}

const idx = (ids: string[], id: string) => ids.indexOf(id)
const has = (ids: string[], id: string) => ids.includes(id)
const before = (ids: string[], a: string, b: string) => has(ids, a) && has(ids, b) && idx(ids, a) < idx(ids, b)

const LEAVER_BLOCKS: Block[] = [
  { id: 'trigger', label: 'Trigger: HR termination event', hint: 'Starts the run when HR sets an end date that has passed.', code: '# Triggered by HR webhook: worker.terminated\nparam([string]$EmployeeId)' },
  { id: 'validate', label: 'Validate input', hint: 'Check that the employee ID and date are real before touching anything.', code: 'if (-not ($EmployeeId -match "^[EC]\\d{5}$")) { throw "Invalid employee ID: $EmployeeId" }' },
  { id: 'lookup', label: 'Look up user by employee ID', hint: 'Find the right account and skip if already done (idempotent).', code: '$user = Get-MgUser -Filter "employeeId eq \'$EmployeeId\'" -Property Id,AccountEnabled,UserPrincipalName\nif (-not $user) { throw "No user for $EmployeeId" }\nif (-not $user.AccountEnabled) { Write-Log "Already disabled, nothing to do"; return }' },
  { id: 'disable', label: 'Disable account', hint: 'Block sign-in.', code: 'Update-MgUser -UserId $user.Id -AccountEnabled:$false' },
  { id: 'revoke', label: 'Revoke sessions', hint: 'Invalidate refresh tokens on all devices.', code: 'Revoke-MgUserSignInSession -UserId $user.Id' },
  { id: 'groups', label: 'Remove group memberships', hint: 'Groups give access to apps, so removing them removes access.', code: 'Get-MgUserMemberOf -UserId $user.Id | Where-Object { $_.AdditionalProperties["@odata.type"] -eq "#microsoft.graph.group" } |\n  ForEach-Object { Remove-MgGroupMemberDirectoryObjectByRef -GroupId $_.Id -DirectoryObjectId $user.Id }' },
  { id: 'scim', label: 'Deactivate SaaS accounts (SCIM)', hint: 'Tells each connected app to set active=false.', code: '# Handled by Entra provisioning: removing app-role assignments sends PATCH /Users/{id} { "active": false }' },
  { id: 'mailbox', label: 'Convert mailbox to shared', hint: 'Keep business email, give the manager access.', code: 'Set-Mailbox -Identity $user.UserPrincipalName -Type Shared\nAdd-MailboxPermission -Identity $user.UserPrincipalName -User $managerUpn -AccessRights FullAccess' },
  { id: 'license', label: 'Remove licences', hint: 'Return the paid licence to the pool.', code: '$skus = (Get-MgUserLicenseDetail -UserId $user.Id).SkuId\nSet-MgUserLicense -UserId $user.Id -AddLicenses @() -RemoveLicenses $skus' },
  { id: 'retry', label: 'Retry with backoff on API errors', hint: 'Graph returns 429 when throttled. Wait and try again.', code: '# Wrap Graph calls: on 429/5xx wait 2s, 4s, 8s… honouring the Retry-After header' },
  { id: 'notify', label: 'Notify manager', hint: 'Remind them to collect the laptop and badge.', code: 'Send-MgUserMail -UserId $svc -BodyParameter (New-LeaverMail -To $managerUpn -User $user)' },
  { id: 'log', label: 'Write audit log', hint: 'Who, what, when, and why, for the auditors.', code: 'Write-AuditLog -Action "leaver" -Target $user.UserPrincipalName -Ticket $env:RUN_ID -Result "success"' },
  { id: 'approval', label: 'Wait for manager approval', hint: 'Ask the manager before removing access.', code: 'Wait-Approval -Approver $managerUpn -TimeoutDays 5', trap: true },
  { id: 'delete', label: 'Delete account immediately', hint: 'Gone for good.', code: 'Remove-MgUser -UserId $user.Id', trap: true },
]

function validateLeaver(ids: string[]): Issue[] {
  const out: Issue[] = []
  if (!ids.length) return [{ level: 'tip', message: 'Add blocks from the toolbox to start building your leaver runbook.' }]
  if (ids[0] !== 'trigger') out.push({ level: 'error', message: 'Every automation needs a trigger first. What starts this run?' })
  if (!has(ids, 'disable')) out.push({ level: 'error', message: 'The account is never disabled. The leaver can still sign in.' })
  if (!has(ids, 'revoke')) out.push({ level: 'error', message: 'Sessions are never revoked. A disabled user can keep working on a phone until the token expires.' })
  else if (has(ids, 'disable') && before(ids, 'revoke', 'disable'))
    out.push({ level: 'error', message: 'Revoke runs before disable. The user can sign in again in between and get fresh tokens. Lock the door first, then kick them out.' })
  if (has(ids, 'delete')) out.push({ level: 'error', message: 'Deleting right away is irreversible and destroys audit evidence. Disable now, delete after the retention period (e.g. 30 days).' })
  if (has(ids, 'license') && !has(ids, 'mailbox')) out.push({ level: 'warn', message: 'Removing the licence without converting the mailbox means the mailbox is deleted after 30 days, along with business email.' })
  if (before(ids, 'license', 'mailbox')) out.push({ level: 'error', message: 'Licence is removed before the mailbox is converted. The conversion can fail and the data is at risk. Convert first, then free the licence.' })
  if (has(ids, 'approval')) out.push({ level: 'warn', message: 'Leavers should not wait for approval. HR already decided. Every hour of waiting is an hour of exposure.' })
  if (!has(ids, 'lookup')) out.push({ level: 'warn', message: 'No lookup step. The script cannot find the right user or detect that it already ran, so it is not idempotent.' })
  else if (has(ids, 'disable') && before(ids, 'disable', 'lookup')) out.push({ level: 'error', message: 'Disabling before looking the user up. Which user?' })
  if (!has(ids, 'validate')) out.push({ level: 'warn', message: 'No input validation. A bad HR record could disable the wrong person.' })
  if (!has(ids, 'retry')) out.push({ level: 'warn', message: 'No error handling. Graph throttles bulk runs (HTTP 429), so one failure leaves a half-finished leaver.' })
  if (!has(ids, 'log')) out.push({ level: 'warn', message: 'No audit log. You won’t be able to prove to an auditor that access was removed on time.' })
  if (!has(ids, 'groups') && !has(ids, 'scim')) out.push({ level: 'warn', message: 'App access is never cleaned up. Expect orphan accounts in SaaS apps.' })
  if (!has(ids, 'notify')) out.push({ level: 'tip', message: 'Consider notifying the manager about hardware and handover.' })
  return out
}

const JOINER_BLOCKS: Block[] = [
  { id: 'trigger', label: 'Trigger: HR new hire event', hint: 'Fires when HR saves a new worker with a start date.', code: '# Triggered by HR webhook: worker.hired\nparam($Worker)' },
  { id: 'validate', label: 'Validate HR data', hint: 'Required fields: employee ID, name, department, manager, start date.', code: 'foreach ($f in "employeeId","givenName","surname","department","managerId","startDate") {\n  if (-not $Worker.$f) { throw "Missing $f" }\n}' },
  { id: 'lookup', label: 'Check for existing identity (rehire)', hint: 'Same employee ID already in the directory? Re-enable instead of creating a duplicate.', code: '$existing = Get-MgUser -Filter "employeeId eq \'$($Worker.employeeId)\'"\nif ($existing) { return Invoke-Rehire $existing $Worker }' },
  { id: 'upn', label: 'Generate unique username', hint: 'firstname.lastname, æøå transliterated, number added if taken.', code: '$upn = New-UniqueUpn -Given $Worker.givenName -Surname $Worker.surname -Domain "fjordtech.no"' },
  { id: 'create', label: 'Create account (disabled)', hint: 'Exists from now, usable from the start date.', code: '$user = New-MgUser -AccountEnabled:$false -DisplayName "$($Worker.givenName) $($Worker.surname)" `\n  -UserPrincipalName $upn -MailNickname ($upn -split "@")[0] -EmployeeId $Worker.employeeId `\n  -Department $Worker.department -PasswordProfile @{ Password = New-RandomSecret; ForceChangePasswordNextSignIn = $true }' },
  { id: 'manager', label: 'Set manager', hint: 'Used for approvals, reviews and notifications later.', code: 'Set-MgUserManagerByRef -UserId $user.Id -BodyParameter @{ "@odata.id" = "https://graph.microsoft.com/v1.0/users/$($Worker.managerId)" }' },
  { id: 'birthright', label: 'Add birthright groups', hint: 'All-employees group, VPN, intranet.', code: 'Add-ToGroups -User $user -Groups "GRP-All-Employees","GRP-VPN-Users"' },
  { id: 'role', label: 'Assign business role from department', hint: 'Department → role → groups. No ticket needed.', code: '# Better: a dynamic group with rule (user.department -eq "Sales")\nAdd-ToGroups -User $user -Groups (Get-RoleGroups -Department $Worker.department)' },
  { id: 'license', label: 'Assign licence via group', hint: 'Group-based licensing scales and self-heals.', code: 'Add-ToGroups -User $user -Groups "LIC-M365-E3"' },
  { id: 'tap', label: 'Issue Temporary Access Pass', hint: 'One-time pass so the new hire can register MFA on day one.', code: '$tap = New-MgUserAuthenticationTemporaryAccessPassMethod -UserId $user.Id -BodyParameter @{ startDateTime = $Worker.startDate; lifetimeInMinutes = 480; isUsableOnce = $true }' },
  { id: 'schedule', label: 'Enable on start date', hint: 'Scheduled job flips AccountEnabled on day one.', code: 'Register-ScheduledEnable -UserId $user.Id -At $Worker.startDate' },
  { id: 'retry', label: 'Retry with backoff on API errors', hint: 'Graph throttling and replication delays happen.', code: '# Wrap Graph calls: on 429/5xx wait 2s, 4s, 8s… honouring Retry-After' },
  { id: 'notify', label: 'Notify manager', hint: 'Send the username and how to hand over the Temporary Access Pass.', code: 'Send-WelcomeKit -To $Worker.managerEmail -Upn $upn -Tap $tap.TemporaryAccessPass' },
  { id: 'log', label: 'Write audit log', hint: 'Record what was created and why.', code: 'Write-AuditLog -Action "joiner" -Target $upn -Source "HR:$($Worker.employeeId)" -Result "success"' },
  { id: 'approval', label: 'Ask IT manager to approve birthright access', hint: 'Extra control on standard access.', code: 'Wait-Approval -Approver "it-manager@fjordtech.no"', trap: true },
  { id: 'password-mail', label: 'Email password to new hire’s private address', hint: 'So they can log in at home.', code: 'Send-Mail -To $Worker.privateEmail -Body "Your password is $password"', trap: true },
]

function validateJoiner(ids: string[]): Issue[] {
  const out: Issue[] = []
  if (!ids.length) return [{ level: 'tip', message: 'Add blocks from the toolbox to start building your joiner runbook.' }]
  if (ids[0] !== 'trigger') out.push({ level: 'error', message: 'Every automation needs a trigger first. What starts this run?' })
  if (!has(ids, 'create')) out.push({ level: 'error', message: 'No account is ever created.' })
  for (const dep of ['manager', 'birthright', 'role', 'license', 'tap', 'schedule']) {
    if (has(ids, dep) && has(ids, 'create') && before(ids, dep, 'create')) {
      out.push({ level: 'error', message: `“${JOINER_BLOCKS.find((b) => b.id === dep)!.label}” runs before the account exists.` })
    }
  }
  if (has(ids, 'create') && !before(ids, 'upn', 'create')) out.push({ level: 'error', message: 'The account needs a unique username before it can be created.' })
  if (!has(ids, 'lookup')) out.push({ level: 'warn', message: 'No rehire check. A returning employee gets a second account and two identities to audit.' })
  else if (has(ids, 'create') && before(ids, 'create', 'lookup')) out.push({ level: 'error', message: 'The rehire check runs after the account is created, so the duplicate already exists.' })
  if (has(ids, 'password-mail')) out.push({ level: 'error', message: 'Never email passwords, especially to private addresses. Use a Temporary Access Pass the manager hands over in person.' })
  if (has(ids, 'approval')) out.push({ level: 'warn', message: 'Birthright access is pre-approved by policy. Approvals here only add delay. Save approvals for sensitive access.' })
  if (!has(ids, 'role')) out.push({ level: 'warn', message: 'No role assignment. The new hire gets only basic access and files tickets for everything else.' })
  if (!has(ids, 'schedule')) out.push({ level: 'warn', message: 'The account is never enabled, or worse, enabled two weeks early. Enable it on the start date.' })
  if (!has(ids, 'validate')) out.push({ level: 'warn', message: 'No validation. Garbage in from HR means garbage accounts out.' })
  if (!has(ids, 'retry')) out.push({ level: 'warn', message: 'No error handling. Half-created users are worse than none.' })
  if (!has(ids, 'log')) out.push({ level: 'warn', message: 'No audit log.' })
  if (!has(ids, 'tap')) out.push({ level: 'tip', message: 'How will the new hire set up MFA on day one? A Temporary Access Pass helps.' })
  if (!has(ids, 'manager')) out.push({ level: 'tip', message: 'Without a manager attribute, access reviews have no reviewer.' })
  return out
}

export const SCENARIOS: Scenario[] = [
  { id: 'leaver', title: 'Leaver runbook', goal: 'Remove all access for someone leaving Fjordtech, safely, fast and provably.', blocks: LEAVER_BLOCKS, validate: validateLeaver },
  { id: 'joiner', title: 'Joiner runbook', goal: 'Get a new hire productive on day one without granting anything extra.', blocks: JOINER_BLOCKS, validate: validateJoiner },
]

export function score(issues: Issue[]): number {
  const penalty = issues.reduce((s, i) => s + (i.level === 'error' ? 25 : i.level === 'warn' ? 8 : 2), 0)
  return Math.max(0, 100 - penalty)
}

export function toScript(s: Scenario, ids: string[]): string {
  const blocks = ids.map((id) => s.blocks.find((b) => b.id === id)!).filter(Boolean)
  const header = `# Fjordtech ${s.title}: generated from your pipeline\n#Requires -Modules Microsoft.Graph.Users\n$ErrorActionPreference = "Stop"\n`
  return header + blocks.map((b) => `\n# ── ${b.label}\n${b.code}`).join('\n')
}
