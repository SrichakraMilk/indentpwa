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
  /** Mongo user / agent document id when returned by API */
  _id?: string;
  id?: string;
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
  role?: { id: string; name: string; code: string };
  plant?: { id: string; name: string; code: string };
  branch?: {
    id: string;
    name: string;
    code: string;
    executive?: any;
    branchManager?: any;
    areaManager?: any;
  };
  route?: { id: string; name: string; code: string };
  department?: any;
  executive?: any;
  branchManager?: any;
  areaManager?: any;
  gmSales?: any;
}

export interface CurrentAgentResponse extends LoginResponse {
  agent?: AgentDetails;
}

const AUTH_LOGIN_ENDPOINT = '/api/auth/login';
const AUTH_ME_ENDPOINT = '/api/auth/me';
const INDENTS_ENDPOINT = '/api/indents';
const ROUTES_ENDPOINT = '/api/routes';
const USERS_AGENTS_ENDPOINT = '/api/users/agents';
/** Only categories with categoryType "Products" — proxied to upstream /api/categories/products */
const PRODUCT_CATEGORIES_ENDPOINT = '/api/categories/products';
const PRODUCTS_ENDPOINT = '/api/products';
const UNITS_ENDPOINT = '/api/units';
const DC_ENDPOINT = '/api/delivery-challans';
const AUTH_STORAGE_KEY = 'indent-pwa-auth';

export interface DcItem {
  category: { name: string; code?: string };
  product: { name: string; sku: string };
  quantity: number;
  size?: string;
  unit?: { name: string; code?: string };
}

export interface DcRecord {
  _id: string;
  dcNumber: string;
  indent: { indentNumber: string; indentDate: string };
  agent: { fname: string; lname: string; userid: string };
  route: { name: string; code: string };
  plant: { name: string; code: string };
  items: DcItem[];
  dcDate: string;
  status: 'Draft' | 'In Progress' | 'Security Check' | 'Dispatched' | 'Delivered' | 'Approved';
  remarks?: string;
}

export async function fetchDcApi(params?: { date?: string; status?: string }): Promise<DcRecord[]> {
  const urlParams = new URLSearchParams();
  if (params?.date) urlParams.append('date', params.date);
  if (params?.status) urlParams.append('status', params.status);

  const res = await fetch(`${DC_ENDPOINT}?${urlParams.toString()}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  });
  if (!res.ok) throw new Error('Failed to fetch delivery challans');
  const data = await res.json();
  return data.dcs || [];
}

export async function updateDcStatusApi(dcId: string, status: string, userId: string, remarks: string = ''): Promise<any> {
  const response = await fetch('/api/delivery-challans/update-status', {
    method: 'POST',
    headers: buildAuthHeaders(true),
    body: JSON.stringify({ dcId, status, userId, remarks })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to update DC status: ${errorText || response.statusText}`);
  }
  return response.json();
}

export interface IndentItem {
  categoryId?: string;
  categoryName?: string;
  productId?: string;
  productName?: string;
  /** Line-item pack size (stored on indent item; API may use `quantity` for qty). */
  size?: string;
  qty?: number;
  quantity?: number;
  unitId?: string;
  unitName?: string;
}

function mongoIdString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && '$oid' in v) {
    return String((v as { $oid: unknown }).$oid);
  }
  if (typeof v === 'object' && v !== null && '_id' in v) {
    return mongoIdString((v as { _id: unknown })._id);
  }
  return undefined;
}

/** ObjectId string, `$oid`, or plain id string from a ref or id field. */
export function linkedEntityId(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const t = value.trim();
    return t ? t : undefined;
  }
  if (typeof value === 'object') {
    return mongoIdString(value);
  }
  return undefined;
}

/** Resolve display label + id from a populated ref, an ObjectId, or extended JSON. */
function productRefToLabelAndId(ref: unknown): { id?: string; label?: string } {
  if (ref == null) return {};
  if (typeof ref === 'string') {
    const t = ref.trim();
    return t ? { id: t } : {};
  }
  if (typeof ref !== 'object' || Array.isArray(ref)) return {};
  const o = ref as Record<string, unknown>;
  const id = mongoIdString(o._id) ?? mongoIdString(ref);
  const label =
    (typeof o.name === 'string' && o.name.trim()) ||
    (typeof o.productName === 'string' && o.productName.trim()) ||
    (typeof o.code === 'string' && o.code.trim()) ||
    (typeof o.sku === 'string' && o.sku.trim()) ||
    undefined;
  return { id: id || undefined, label };
}

function categoryRefToLabelAndId(ref: unknown): { id?: string; label?: string } {
  if (ref == null) return {};
  if (typeof ref === 'string') {
    const t = ref.trim();
    return t ? { id: t } : {};
  }
  if (typeof ref !== 'object' || Array.isArray(ref)) return {};
  const o = ref as Record<string, unknown>;
  const id = mongoIdString(o._id) ?? mongoIdString(ref);
  const label =
    (typeof o.name === 'string' && o.name.trim()) ||
    (typeof o.categoryName === 'string' && o.categoryName.trim()) ||
    (typeof o.code === 'string' && o.code.trim()) ||
    undefined;
  return { id: id || undefined, label };
}

function unitRefToLabelAndId(ref: unknown): { id?: string; label?: string } {
  if (ref == null) return {};
  if (typeof ref === 'string') {
    const t = ref.trim();
    return t ? { id: t } : {};
  }
  if (typeof ref !== 'object' || Array.isArray(ref)) return {};
  const o = ref as Record<string, unknown>;
  const id = mongoIdString(o._id) ?? mongoIdString(ref);
  const label =
    (typeof o.name === 'string' && o.name.trim()) ||
    (typeof o.code === 'string' && o.code.trim()) ||
    undefined;
  return { id: id || undefined, label };
}

/** Backend may return populated refs (`product`, `category`) instead of flat names. */
function normalizeIndentItem(raw: unknown): IndentItem {
  if (!raw || typeof raw !== 'object') {
    return { quantity: 0 };
  }
  const item = raw as Record<string, unknown>;

  const productRef = item.product ?? item.plantProduct;
  const categoryRef = item.category;

  const fromProduct = productRefToLabelAndId(productRef);
  const fromCategory = categoryRefToLabelAndId(categoryRef);

  const productName =
    (typeof item.productName === 'string' && item.productName.trim()) || fromProduct.label || undefined;

  const categoryName =
    (typeof item.categoryName === 'string' && item.categoryName.trim()) || fromCategory.label || undefined;

  const productId =
    (typeof item.productId === 'string' && item.productId.trim()) || fromProduct.id || undefined;

  const categoryId =
    (typeof item.categoryId === 'string' && item.categoryId.trim()) || fromCategory.id || undefined;

  const qty =
    typeof item.qty === 'number'
      ? item.qty
      : typeof item.quantity === 'number'
        ? item.quantity
        : undefined;
  const quantity = typeof item.quantity === 'number' ? item.quantity : qty;

  const size = typeof item.size === 'string' ? item.size : undefined;

  return {
    categoryId,
    categoryName,
    productId,
    productName,
    size,
    qty,
    quantity,
    unitId: (typeof item.unitId === 'string' && item.unitId.trim()) || unitRefToLabelAndId(item.unit).id || undefined,
    unitName: (typeof item.unitName === 'string' && item.unitName.trim()) || unitRefToLabelAndId(item.unit).label || undefined
  };
}

function normalizeIndentRecord(raw: unknown): IndentRecord {
  if (!raw || typeof raw !== 'object') {
    return { _id: '', indentNumber: '', status: '', items: [] };
  }
  const r = raw as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items.map(normalizeIndentItem) : [];
  return {
    _id: String(r._id ?? ''),
    indentNumber: String(r.indentNumber ?? ''),
    status: String(r.status ?? ''),
    currentStep: typeof r.currentStep === 'string' ? r.currentStep : (r.status?.toString().toLowerCase() === 'pending' ? 'SE' : undefined),
    approvalLog: Array.isArray(r.approvalLog) ? r.approvalLog : undefined,
    remarks: typeof r.remarks === 'string' ? r.remarks : undefined,
    items,
    agent: r.agent,
    createdBy: r.createdBy,
    deliveryChallan: r.deliveryChallan,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : undefined
  };
}

export interface IndentRecord {
  _id: string;
  indentNumber: string;
  status: string;
  currentStep?: string;
  approvalLog?: Array<{
    role: string;
    user: unknown;
    status: string;
    remarks: string;
    updatedAt: string;
  }>;
  remarks?: string;
  items: IndentItem[];
  agent?: any;
  createdAt?: string;
  createdBy?: any;
  deliveryChallan?: any;
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

export interface Unit {
  _id: string;
  name: string;
  code: string;
}

/** Active sales route row (from upstream `GET /api/routes` → `{ routes }`). */
export interface SalesRouteRow {
  id: string;
  name: string;
  code: string;
  description?: string;
  plantLabel?: string;
  branchLabel?: string;
  executiveLabel?: string;
  branchManagerLabel?: string;
  areaManagerLabel?: string;
}

/** User row from `GET /api/users/agents?routeId=…`. */
export interface ListedAgent {
  id: string;
  fname: string;
  lname: string;
  displayName: string;
  email?: string;
  mobile?: string;
  userid?: string;
  agentCode?: string;
  branchLabel?: string;
  routeLabel?: string;
  isActive?: boolean;
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

/** Normalize stored / passed token (trim, strip accidental `Bearer ` prefix). */
function resolveAuthToken(explicit?: string | null): string | null {
  const fromStorage =
    explicit != null && String(explicit).trim() !== '' ? String(explicit) : getAuthToken();
  if (fromStorage == null) return null;
  let t = fromStorage.trim();
  if (t.startsWith('Bearer ')) {
    t = t.slice(7).trim();
  }
  return t.length > 0 ? t : null;
}

function buildAuthHeaders(contentType = false, tokenOverride?: string | null): HeadersInit {
  const token = resolveAuthToken(tokenOverride);
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
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object') {
    const value = data as { indents?: unknown; data?: unknown; indent?: unknown };
    if (Array.isArray(value.indents)) list = value.indents;
    else if (Array.isArray(value.data)) list = value.data;
    else if (value.indent && typeof value.indent === 'object') list = [value.indent];
  }
  return list.map(normalizeIndentRecord);
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
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    

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
          _id: agent._id ?? agent.id ?? agent.userId ?? agent.userid,
          id: agent.id ?? agent._id ?? agent.userId ?? agent.userid,
          userId: agent.userId ?? agent.userid ?? agent._id ?? agent.id ?? '',
          userid: agent.userid ?? agent.userId ?? agent._id ?? agent.id ?? '',
          fname: agent.fname,
          lname: agent.lname,
          email: agent.email,
          mobile: agent.mobile,
          agentCode: agent.agentCode,
          creditLimit: agent.creditLimit,
          outstanding: agent.outstanding,
          balance: agent.balance,
          address: agent.address,
          isActive: agent.isActive,
          role: agent.role,
          plant: agent.plant,
          branch: agent.branch,
          route: agent.route,
          department: agent.department,
          executive: agent.executive,
          branchManager: agent.branchManager,
          areaManager: agent.areaManager,
          gmSales: agent.gmSales
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

export async function fetchIndentsApi(
  filters?: { status?: string; date?: string; route?: string },
  token?: string | null
): Promise<IndentRecord[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.date) params.set('date', filters.date);
  if (filters?.route) params.set('route', filters.route);

  const qs = params.toString();
  const url = `${INDENTS_ENDPOINT}${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    headers: buildAuthHeaders(false, token)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to fetch indents: ${errorText || response.statusText}`);
  }
  const data = await response.json();
  return normalizeIndentsPayload(data);
}

export async function deleteIndentApi(id: string, token?: string | null): Promise<void> {
  const response = await fetch(`${INDENTS_ENDPOINT}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(false, token)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to delete indent: ${errorText || response.statusText}`);
  }
}

export async function updateIndentStatusApi(id: string, nextStatus: IndentStatus, token?: string | null): Promise<void> {
  const response = await fetch(`${INDENTS_ENDPOINT}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: buildAuthHeaders(true, token),
    body: JSON.stringify({
      status: nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to update indent: ${errorText || response.statusText}`);
  }
}

export interface CreateIndentRequest {
  route?: string;
  items: Array<{
    category: string;
    product: string;
    /** Plantautomation `Indent` model uses `quantity` (not `qty`). */
    quantity: number;
    size?: string;
    unit?: string;
  }>;
  plant?: string;
  department?: string;
  branch?: string;
  remarks?: string;
  agent?: string;
  executive?: string;
  branchManager?: string;
  areaManager?: string;
  gmSales?: string;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export async function createIndentApi(input: CreateIndentRequest, token?: string | null): Promise<void> {
  if (!resolveAuthToken(token)) {
    throw new Error('Your session has no token. Please sign out and sign in again.');
  }
  const body = omitUndefined({ ...input } as Record<string, unknown>);
  const response = await fetch(INDENTS_ENDPOINT, {
    method: 'POST',
    headers: buildAuthHeaders(true, token),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to create indent: ${errorText || response.statusText}`);
  }
}

export async function resubmitIndentApi(id: string, items: any[], remarks?: string, token?: string | null): Promise<void> {
  const response = await fetch(`${INDENTS_ENDPOINT}?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: buildAuthHeaders(true, token),
    body: JSON.stringify({
      status: 'Pending',
      items,
      remarks: remarks || 'Resubmitted'
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to resubmit indent: ${errorText || response.statusText}`);
  }
}

function refPersonLabel(ref: unknown): string | undefined {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) return undefined;
  const o = ref as Record<string, unknown>;
  const fn = typeof o.fname === 'string' ? o.fname.trim() : '';
  const ln = typeof o.lname === 'string' ? o.lname.trim() : '';
  const full = `${fn} ${ln}`.trim();
  return full || undefined;
}

function refPlaceLabel(ref: unknown): string | undefined {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) return undefined;
  const o = ref as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  const code = typeof o.code === 'string' ? o.code.trim() : '';
  if (name && code) return `${name} (${code})`;
  return name || code || undefined;
}

function normalizeSalesRoute(raw: unknown): SalesRouteRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = mongoIdString(o._id) ?? mongoIdString(o.id);
  if (!id) return null;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  const codeRaw = typeof o.code === 'string' ? o.code.trim() : '';
  const code = codeRaw.toUpperCase();
  if (!name && !code) return null;
  const description = typeof o.description === 'string' ? o.description.trim() : undefined;
  return {
    id,
    name: name || code || id,
    code: code || name || id,
    description: description || undefined,
    plantLabel: refPlaceLabel(o.plant),
    branchLabel: refPlaceLabel(o.branch),
    executiveLabel: refPersonLabel(o.executive) ?? refPersonLabel((o.branch as any)?.executive),
    branchManagerLabel: refPersonLabel(o.branchManager) ?? refPersonLabel((o.branch as any)?.branchManager),
    areaManagerLabel: refPersonLabel(o.areaManager) ?? refPersonLabel((o.branch as any)?.areaManager)
  };
}

function normalizeRoutesPayload(data: unknown): SalesRouteRow[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object') {
    const value = data as { routes?: unknown };
    if (Array.isArray(value.routes)) list = value.routes;
  }
  return list.map(normalizeSalesRoute).filter((row): row is SalesRouteRow => row != null);
}

/**
 * Active routes from same-origin `GET /api/routes` → upstream plant `GET /api/routes`.
 * Optional `plantId` / `branchId` match upstream query filters.
 */
export async function fetchRoutesApi(
  options?: { plantId?: string; branchId?: string },
  token?: string | null
): Promise<SalesRouteRow[]> {
  const params = new URLSearchParams();
  if (options?.plantId?.trim()) params.set('plantId', options.plantId.trim());
  if (options?.branchId?.trim()) params.set('branchId', options.branchId.trim());
  const qs = params.toString();
  const url = `${ROUTES_ENDPOINT}${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: buildAuthHeaders(false, token)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to fetch routes: ${errorText || response.statusText}`);
  }
  const data = await response.json();
  return normalizeRoutesPayload(data);
}

function normalizeListedAgent(raw: unknown): ListedAgent | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = mongoIdString(o._id) ?? mongoIdString(o.id);
  if (!id) return null;
  const fname = typeof o.fname === 'string' ? o.fname.trim() : '';
  const lname = typeof o.lname === 'string' ? o.lname.trim() : '';
  const displayName = `${fname} ${lname}`.trim() || id;
  const email = typeof o.email === 'string' ? o.email.trim() : undefined;
  const mobile = typeof o.mobile === 'string' ? o.mobile.trim() : undefined;
  const userid = typeof o.userid === 'string' ? o.userid.trim() : undefined;
  const agentCode = typeof o.agentCode === 'string' ? o.agentCode.trim() : undefined;
  const isActive = typeof o.isActive === 'boolean' ? o.isActive : undefined;
  return {
    id,
    fname,
    lname,
    displayName,
    email: email || undefined,
    mobile: mobile || undefined,
    userid: userid || undefined,
    agentCode: agentCode || undefined,
    branchLabel: refPlaceLabel(o.branch),
    routeLabel: refPlaceLabel(o.route),
    isActive
  };
}

function normalizeAgentsListPayload(data: unknown): ListedAgent[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === 'object') {
    const value = data as { agents?: unknown };
    if (Array.isArray(value.agents)) list = value.agents;
  }
  return list.map(normalizeListedAgent).filter((row): row is ListedAgent => row != null);
}

/**
 * Agents on a route: `GET /api/users/agents?routeId=…` → upstream plant same path.
 */
export async function fetchAgentsForRouteApi(
  routeId: string,
  token?: string | null
): Promise<ListedAgent[]> {
  const id = routeId.trim();
  if (!id) {
    throw new Error('Choose a route to load agents.');
  }
  const url = `${USERS_AGENTS_ENDPOINT}?routeId=${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: buildAuthHeaders(false, token)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to fetch agents: ${errorText || response.statusText}`);
  }
  const data = await response.json();
  return normalizeAgentsListPayload(data);
}

function normalizeCategory(raw: unknown): Category | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const _id = mongoIdString(o._id) ?? mongoIdString(o.id) ?? undefined;
  if (!_id) return null;
  const name =
    (typeof o.name === 'string' && o.name.trim()) ||
    (typeof o.code === 'string' && o.code.trim()) ||
    '';
  return { _id, name: name || _id };
}

/**
 * Product categories for indents (`categoryType: "Products"`).
 * GET same-origin `/api/categories/products` → upstream plantautomation `/api/categories/products`.
 */
export async function fetchProductCategoriesApi(): Promise<Category[]> {
  const response = await fetch(PRODUCT_CATEGORIES_ENDPOINT, { cache: 'no-store' });
  if (!response.ok) {
    return [];
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return [];
  }
  const rawList: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { categories?: unknown }).categories)
      ? ((data as { categories: unknown[] }).categories ?? [])
      : [];

  const categories = rawList.map(normalizeCategory).filter((c): c is Category => c != null);

  return [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

export async function fetchProductsApi(): Promise<Product[]> {
  const response = await fetch(PRODUCTS_ENDPOINT, { cache: 'no-store' });
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

export async function fetchUnitsApi(): Promise<Unit[]> {
  const response = await fetch(UNITS_ENDPOINT, { cache: 'no-store' });
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  const rawUnits: any[] = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray(data.units)
      ? data.units
      : [];

  return rawUnits.map(u => ({
    _id: u._id || u.id,
    name: u.name || '',
    code: u.code || ''
  })).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
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
