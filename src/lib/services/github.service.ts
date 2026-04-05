import { logger } from '@/lib/logger';

export interface GitHubIssuePayload {
  code: string;
  title: string;
  description: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  businessReason: string;
  expectedValue?: string | null;
  affectedModules: string[];
  riskLevel: string;
  complianceFlag: boolean;
  tasks?: Array<{ title: string; status: string; description?: string | null }>;
}

export interface GitHubIssueResult {
  issueNumber: number;
  issueUrl: string;
}

const GITHUB_API = 'https://api.github.com';

// Labels to ensure exist in the target repo
const OTS_LABELS = [
  { name: 'ots-backlog', color: '0075ca', description: 'Synced from OTS Backlog' },
  { name: 'priority:critical', color: 'd73a4a', description: 'Critical priority' },
  { name: 'priority:high', color: 'e4e669', description: 'High priority' },
  { name: 'priority:medium', color: '0052cc', description: 'Medium priority' },
  { name: 'priority:low', color: 'cfd3d7', description: 'Low priority' },
  { name: 'type:feature', color: '84b6eb', description: 'Feature request' },
  { name: 'type:bug', color: 'd73a4a', description: 'Bug report' },
  { name: 'type:tech-debt', color: 'e4e669', description: 'Technical debt' },
  { name: 'type:performance', color: 'bfd4f2', description: 'Performance improvement' },
  { name: 'type:reporting', color: 'bfd4f2', description: 'Reporting' },
  { name: 'type:refactor', color: 'bfd4f2', description: 'Code refactor' },
  { name: 'type:compliance', color: 'fef2c0', description: 'Compliance requirement' },
  { name: 'type:insight', color: 'e6edf8', description: 'Insight / research' },
  { name: 'compliance', color: '7057ff', description: 'Compliance flagged' },
];

function buildIssueBody(item: GitHubIssuePayload): string {
  const modules = item.affectedModules.length > 0
    ? item.affectedModules.join(', ')
    : '_None specified_';

  return `## OTS Backlog Item — ${item.code}

> Synced from [Hexa Steel OTS](https://ots.hexasteel.sa/backlog) · ${new Date().toUTCString()}

---

### Why This Exists
${item.businessReason}

### Description
${item.description || '_No description provided_'}
${item.expectedValue ? `\n### Expected Value\n${item.expectedValue}` : ''}

---

| Field | Value |
|---|---|
| **Type** | ${item.type.replace(/_/g, ' ')} |
| **Category** | ${item.category.replace(/_/g, ' ')} |
| **Priority** | ${item.priority} |
| **Status** | ${item.status.replace(/_/g, ' ')} |
| **Risk Level** | ${item.riskLevel} |
| **Compliance** | ${item.complianceFlag ? '⚠️ Yes' : 'No'} |
| **Affected Modules** | ${modules} |

---
${item.tasks && item.tasks.length > 0 ? `### Tasks\n${item.tasks.map(t => `- [${t.status === 'Completed' ? 'x' : ' '}] ${t.title}`).join('\n')}\n\n---\n` : ''}*This issue was automatically created from OTS Backlog item \`${item.code}\`. Do not edit the header section — it will be overwritten on re-sync.*`;
}

function getLabelsForItem(item: GitHubIssuePayload): string[] {
  const labels: string[] = ['ots-backlog'];
  labels.push(`priority:${item.priority.toLowerCase()}`);
  labels.push(`type:${item.type.toLowerCase().replace(/_/g, '-')}`);
  if (item.complianceFlag) labels.push('compliance');
  return labels;
}

async function ensureLabels(token: string, owner: string, repo: string): Promise<void> {
  for (const label of OTS_LABELS) {
    try {
      await fetch(`${GITHUB_API}/repos/${owner}/${repo}/labels`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify(label),
      });
      // 422 means it already exists — that's fine
    } catch (err) {
      logger.warn({ err, label: label.name }, 'Could not ensure GitHub label');
    }
  }
}

export async function testGitHubConnection(token: string, repo: string): Promise<{ ok: boolean; login?: string; repoFullName?: string; error?: string }> {
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    return { ok: false, error: 'Repository must be in owner/repo format' };
  }

  try {
    const [userRes, repoRes] = await Promise.all([
      fetch(`${GITHUB_API}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }),
      fetch(`${GITHUB_API}/repos/${owner}/${repoName}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }),
    ]);

    if (!userRes.ok) {
      return { ok: false, error: 'Invalid GitHub token — authentication failed' };
    }
    if (!repoRes.ok) {
      return { ok: false, error: `Repository "${repo}" not found or not accessible with this token` };
    }

    const user = await userRes.json() as { login: string };
    const repoData = await repoRes.json() as { full_name: string };

    return { ok: true, login: user.login, repoFullName: repoData.full_name };
  } catch (err) {
    logger.error({ err }, 'GitHub connection test failed');
    return { ok: false, error: 'Network error while connecting to GitHub' };
  }
}

export async function createGitHubIssue(token: string, repo: string, item: GitHubIssuePayload): Promise<GitHubIssueResult> {
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) throw new Error('Repository must be in owner/repo format');

  await ensureLabels(token, owner, repoName);

  const body = buildIssueBody(item);
  const labels = getLabelsForItem(item);

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: `[${item.code}] ${item.title}`,
      body,
      labels,
    }),
  });

  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(err.message ?? 'Failed to create GitHub issue');
  }

  const data = await res.json() as { number: number; html_url: string };

  // If item is already completed or dropped, immediately close the newly created issue
  if (['COMPLETED', 'DROPPED'].includes(item.status)) {
    await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/issues/${data.number}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ state: 'closed' }),
    });
  }

  return { issueNumber: data.number, issueUrl: data.html_url };
}

export async function updateGitHubIssue(token: string, repo: string, issueNumber: number, item: GitHubIssuePayload): Promise<void> {
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) throw new Error('Repository must be in owner/repo format');

  const body = buildIssueBody(item);
  const labels = getLabelsForItem(item);

  // Determine if issue should be closed
  const state = ['COMPLETED', 'DROPPED'].includes(item.status) ? 'closed' : 'open';

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: `[${item.code}] ${item.title}`,
      body,
      labels,
      state,
    }),
  });

  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(err.message ?? 'Failed to update GitHub issue');
  }
}
