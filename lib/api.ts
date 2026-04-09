export type IndentStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';

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
  outstanding?: number;
  balance?: number;
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

const AUTH_LOGIN_ENDPOINT = '/api/auth/login';
const AUTH_ME_ENDPOINT = '/api/auth/me';
const INDENTS_ENDPOINT = '/api/indents';
const CATEGORIES_ENDPOINT = '/api/categories';
const PRODUCTS_ENDPOINT = '/api/products';
const AUTH_STORAGE_KEY = 'indent-pwa-auth';

export interface IndentItem {
  categoryId?: string;
  categoryName?: string;
  productId?: string;
  productName?: string;
  qty: number;
}

export interface IndentRecord {
  _id: string;
  indentNumber: string;
  status: string;
  remarks?: string;
  items: IndentItem[];
}

export interface Category {
  _id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  size: string;
}

type RawProduct = {
  _id?: string;
  id?: string;
  name?: string;
  categoryId?: string;
  size?: string;
  category?: { _id?: string };
};

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

function buildAuthHeaders(contentType = false): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeIndentsPayload(data: unknown): IndentRecord[] {
  if (Array.isArray(data)) return data as IndentRecord[];
  if (data && typeof data === 'object') {
    const value = data as { indents?: unknown; data?: unknown; indent?: unknown };
    if (Array.isArray(value.indents)) return value.indents as IndentRecord[];
    if (Array.isArray(value.data)) return value.data as IndentRecord[];
    if (value.indent && typeof value.indent === 'object') return [value.indent as IndentRecord];
  }
  return [];
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const url = AUTH_LOGIN_ENDPOINT;
  const payload = {
    identifier,
    userid: identifier,
    userId: identifier,
    agentCode: identifier,
    email: identifier,
    mobile: identifier,
    password
  };
  
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
      
      let apiMessage = responseText || response.statusText;
      try {
        const parsed = JSON.parse(responseText) as { message?: string; error?: string };
        apiMessage = parsed.message ?? parsed.error ?? apiMessage;
      } catch {
        // response not JSON
      }

      if (response.status === 401) {
        throw new Error(apiMessage || 'Invalid credentials. Please check Agent ID and password.');
      }

      throw new Error(apiMessage || 'Login failed');
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
  const response = await fetch(AUTH_ME_ENDPOINT, {
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

export async function validateSessionOnBackend(token: string): Promise<CurrentAgentResponse> {
  const response = await fetch(AUTH_ME_ENDPOINT, {
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

export async function fetchIndentsApi(): Promise<IndentRecord[]> {
  const response = await fetch(INDENTS_ENDPOINT);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to fetch indents: ${errorText || response.statusText}`);
  }
  const data = await response.json();
  return normalizeIndentsPayload(data);
}

export async function deleteIndentApi(id: string): Promise<void> {
  const response = await fetch(`${INDENTS_ENDPOINT}/${id}`, {
    method: 'DELETE',
    headers: buildAuthHeaders()
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to delete indent: ${errorText || response.statusText}`);
  }
}

export async function updateIndentStatusApi(id: string, nextStatus: IndentStatus): Promise<void> {
  const response = await fetch(`${INDENTS_ENDPOINT}/${id}`, {
    method: 'PATCH',
    headers: buildAuthHeaders(true),
    body: JSON.stringify({
      status: nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to update indent: ${errorText || response.statusText}`);
  }
}

export async function createIndentApi(input: { remarks?: string; items: IndentItem[] }): Promise<void> {
  const response = await fetch(INDENTS_ENDPOINT, {
    method: 'POST',
    headers: buildAuthHeaders(true),
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to create indent: ${errorText || response.statusText}`);
  }
}

export async function fetchCategoriesApi(): Promise<Category[]> {
  const response = await fetch(CATEGORIES_ENDPOINT);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  const categories = Array.isArray(data)
    ? (data as Category[])
    : data && typeof data === 'object' && Array.isArray((data as { categories?: unknown }).categories)
      ? (data as { categories: Category[] }).categories
      : [];

  return [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function fetchProductsApi(): Promise<Product[]> {
  const response = await fetch(PRODUCTS_ENDPOINT);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  const rawProducts = Array.isArray(data)
    ? (data as RawProduct[])
    : data && typeof data === 'object' && Array.isArray((data as { products?: unknown }).products)
      ? ((data as { products: RawProduct[] }).products ?? [])
      : [];

  const normalized: Product[] = rawProducts.reduce((acc, item) => {
    const id = item.id ?? item._id ?? '';
    const categoryId = item.categoryId ?? item.category?._id ?? '';
    const name = item.name ?? '';
    if (!id || !categoryId || !name) return acc;
    acc.push({ id, categoryId, name, size: item.size ?? '' });
    return acc;
  }, [] as Product[]);

  return normalized.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function fetchDashboard(): Promise<DashboardStats> {
  await delay(100);
  const indents = await fetchIndentsApi();
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
