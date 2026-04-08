export type IndentStatus = 'pending' | 'approved' | 'rejected';

export interface Indent {
  id: string;
  title: string;
  description: string;
  status: IndentStatus;
  createdAt: string;
}

export interface DashboardStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export interface LoginResponse {
  user: {
    name: string;
    email: string;
  };
  token: string;
}

export interface AgentDetails {
  userId: string;
  userid: string;
  fname: string;
  lname: string;
  email: string;
  mobile?: string;
  agentCode?: string;
  creditLimit?: number;
  address?: string;
  isActive?: boolean;
  role?: unknown;
  plant?: unknown;
  branch?: unknown;
  route?: unknown;
}

export interface CurrentAgentResponse extends LoginResponse {
  agent?: AgentDetails;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://production.srichakramilk.com/api';
const STORAGE_KEY = 'indent-pwa-mock-data';

const defaultIndents: Indent[] = [
  {
    id: 'indent-1',
    title: 'Purchase office supplies',
    description: 'Request stationery and printer ink for the main office.',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: 'indent-2',
    title: 'Repair workstation',
    description: 'Fix the broken standing desk motor in room 4.',
    status: 'approved',
    createdAt: new Date().toISOString()
  }
];

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

function loadStoredIndents(): Indent[] {
  if (typeof window === 'undefined') {
    return defaultIndents;
  }

  const json = window.localStorage.getItem(STORAGE_KEY);
  if (!json) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultIndents));
    return defaultIndents;
  }

  try {
    return JSON.parse(json) as Indent[];
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultIndents));
    return defaultIndents;
  }
}

function saveStoredIndents(indents: Indent[]) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(indents));
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const url = `${API_BASE}/auth/agent-login`;
  const payload = { identifier, password };
  
  try {
    console.log('[Login] Sending to', url, 'with payload:', payload);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('[Login] Response status:', response.status, 'body:', responseText);

    if (!response.ok) {
      console.error(`[Login] ${response.status} at ${url}:`, responseText);
      
      // Try parsing as JSON in case there's more detail
      try {
        const errorJson = JSON.parse(responseText);
        console.error('[Login] Error JSON:', errorJson);
      } catch {
        // Not JSON, that's ok
      }
      
      throw new Error(`Login failed: ${responseText || response.statusText}`);
    }

    const data = JSON.parse(responseText);
    const token = data.token ?? data.accessToken ?? data.authToken ?? data.access_token ?? '';
    const name = data.user?.name ?? data.agentName ?? data.agent_name ?? identifier;
    const email = data.user?.email ?? data.agent_email ?? '';

    if (!token) {
      console.warn('[Login] No token found in response. Full response:', data);
      throw new Error('Login response did not include a token.');
    }

    console.log('[Login] Success. User:', name);
    return {
      user: {
        name,
        email
      },
      token
    };
  } catch (error) {
    console.error('[Login] Exception:', error);
    throw error;
  }
}

function normalizeAgentProfile(data: any): { name: string; email: string; agent?: AgentDetails } {
  const agent = data.agent;
  const nameFromAgent = agent ? `${agent.fname ?? ''} ${agent.lname ?? ''}`.trim() : '';
  const name = nameFromAgent || (data.user?.name ?? data.agentName ?? data.agent_name ?? data.name ?? agent?.userid ?? '');
  const email = agent?.email ?? data.user?.email ?? data.agent_email ?? data.email ?? '';

  if (!name) {
    throw new Error('Profile response did not include a valid name.');
  }

  return {
    name,
    email,
    agent: agent
      ? {
          userId: agent.userId,
          userid: agent.userid,
          fname: agent.fname,
          lname: agent.lname,
          email: agent.email,
          mobile: agent.mobile,
          agentCode: agent.agentCode,
          creditLimit: agent.creditLimit,
          address: agent.address,
          isActive: agent.isActive,
          role: agent.role,
          plant: agent.plant,
          branch: agent.branch,
          route: agent.route
        }
      : undefined
  };
}

export async function fetchCurrentAgent(token: string): Promise<CurrentAgentResponse> {
  const response = await fetch(`${API_BASE}/auth/agent-login/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to validate session: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const normalized = normalizeAgentProfile(data);
  const returnedToken = data.token ?? token;

  return {
    user: {
      name: normalized.name,
      email: normalized.email
    },
    token: returnedToken,
    agent: normalized.agent
  };
}

export async function fetchDashboard(): Promise<DashboardStats> {
  await delay();
  const indents = loadStoredIndents();
  const pending = indents.filter((item) => item.status === 'pending').length;
  const approved = indents.filter((item) => item.status === 'approved').length;
  const rejected = indents.filter((item) => item.status === 'rejected').length;
  return {
    pending,
    approved,
    rejected,
    total: indents.length
  };
}

export async function fetchIndents(): Promise<Indent[]> {
  await delay();
  return loadStoredIndents();
}

export async function createIndent(data: Omit<Indent, 'id' | 'createdAt'>): Promise<Indent> {
  await delay();
  const indents = loadStoredIndents();
  const newIndent: Indent = {
    id: `indent-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...data
  };
  const nextIndents = [newIndent, ...indents];
  saveStoredIndents(nextIndents);
  return newIndent;
}

export async function updateIndent(id: string, update: Partial<Pick<Indent, 'title' | 'description' | 'status'>>): Promise<Indent> {
  await delay();
  const indents = loadStoredIndents();
  const nextIndents = indents.map((item) => (item.id === id ? { ...item, ...update } : item));
  saveStoredIndents(nextIndents);
  const updated = nextIndents.find((item) => item.id === id);
  if (!updated) {
    throw new Error('Indent not found');
  }
  return updated;
}

export async function deleteIndent(id: string): Promise<void> {
  await delay();
  const indents = loadStoredIndents();
  const nextIndents = indents.filter((item) => item.id !== id);
  saveStoredIndents(nextIndents);
}
