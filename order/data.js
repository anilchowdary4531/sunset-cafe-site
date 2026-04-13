const STORAGE_KEYS = {
  menu: 'cafe_menu_items_v1',
  orders: 'cafe_orders_v1',
  requests: 'cafe_requests_v1',
  customerSessions: 'cafe_customer_sessions_v1',
  otpChallenges: 'cafe_otp_challenges_v1',
  adminAccessToken: 'cafe_admin_access_token_v1'
};

const API_BASE_URL = window.CAFE_API_BASE_URL || 'http://localhost:4000';

function logApiIssue(scope, error, meta = {}) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[CafeApp][${scope}] ${message}`, meta);
}

const connectionListeners = new Set();
const connectionStatus = {
  online: navigator.onLine,
  apiReachable: null,
  lastCheckedAt: null
};

const defaultMenu = [
  { id: 1, name: 'Veg Sandwich', category: 'Food', price: 5.5, description: 'Fresh grilled sandwich', imageUrl: 'https://loremflickr.com/640/480/veg,sandwich,food?lock=11' },
  { id: 2, name: 'Chicken Burger', category: 'Food', price: 7.9, description: 'Served with sauce', imageUrl: 'https://loremflickr.com/640/480/chicken,burger,food?lock=12' },
  { id: 3, name: 'French Fries', category: 'Snacks', price: 3.8, description: 'Crispy salted fries', imageUrl: 'https://loremflickr.com/640/480/french,fries,snacks?lock=13' },
  { id: 4, name: 'Samosa Plate', category: 'Snacks', price: 4.2, description: '2 pieces with chutney', imageUrl: 'https://loremflickr.com/640/480/samosa,indian,snack?lock=14' },
  { id: 5, name: 'Cappuccino', category: 'Coffee', price: 4.0, description: 'Classic foam coffee', imageUrl: 'https://loremflickr.com/640/480/cappuccino,coffee?lock=15' },
  { id: 6, name: 'Cold Coffee', category: 'Coffee', price: 4.8, description: 'Chilled with ice', imageUrl: 'https://loremflickr.com/640/480/iced,coffee?lock=16' },
  { id: 7, name: 'Masala Tea', category: 'Tea', price: 2.5, description: 'Indian spiced tea', imageUrl: 'https://loremflickr.com/640/480/masala,tea?lock=17' },
  { id: 8, name: 'Green Tea', category: 'Tea', price: 2.3, description: 'Light and refreshing', imageUrl: 'https://loremflickr.com/640/480/green,tea?lock=18' },
  { id: 9, name: 'Orange Juice', category: 'Juices', price: 3.9, description: 'Fresh juice', imageUrl: 'https://loremflickr.com/640/480/orange,juice,drink?lock=19' },
  { id: 10, name: 'Mango Shake', category: 'Juices', price: 4.5, description: 'Thick and sweet', imageUrl: 'https://loremflickr.com/640/480/mango,shake,drink?lock=20' },
  { id: 11, name: 'Vanilla Scoop', category: 'Ice Cream', price: 2.9, description: 'Single scoop', imageUrl: 'https://loremflickr.com/640/480/vanilla,ice,cream?lock=21' },
  { id: 12, name: 'Chocolate Sundae', category: 'Ice Cream', price: 4.9, description: 'With chocolate syrup', imageUrl: 'https://loremflickr.com/640/480/chocolate,sundae,dessert?lock=22' },
  { id: 13, name: 'Cigarette Request', category: 'Cigarettes', price: 0, description: 'Staff approval required', restricted: true, imageUrl: 'https://loremflickr.com/640/480/no,smoking,warning?lock=23' },
  { id: 14, name: 'Chicken Nuggets', category: 'Snacks', price: 5.9, description: 'Crispy chicken nuggets with dip', imageUrl: 'https://loremflickr.com/640/480/chicken,nuggets,food?lock=24' }
];

function getAdminAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.adminAccessToken) || '';
}

function setAdminAccessToken(token) {
  localStorage.setItem(STORAGE_KEYS.adminAccessToken, token || '');
}

function clearAdminAccessToken() {
  localStorage.removeItem(STORAGE_KEYS.adminAccessToken);
}

async function requestJson(path, options = {}, requiresAdmin = false) {
  const requestOptions = { ...options };
  const headers = { ...(requestOptions.headers || {}) };
  if (requiresAdmin) {
    const token = getAdminAccessToken();
    if (!token) {
      throw new Error('Admin login required');
    }
    headers.Authorization = `Bearer ${token}`;
  }
  if (Object.keys(headers).length) {
    requestOptions.headers = headers;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, requestOptions);
  } catch (error) {
    setApiReachable(false);
    logApiIssue('request', error, { path, baseUrl: API_BASE_URL, method: requestOptions.method || 'GET' });
    throw error;
  }

  setApiReachable(true);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = body?.error || `Request failed (${response.status})`;
    logApiIssue('response', new Error(errorMessage), { path, status: response.status, method: requestOptions.method || 'GET' });
    throw new Error(errorMessage);
  }

  return body;
}

function emitConnectionStatus() {
  const snapshot = getConnectionStatus();
  connectionListeners.forEach((listener) => listener(snapshot));
}

function setApiReachable(value) {
  connectionStatus.apiReachable = value;
  connectionStatus.lastCheckedAt = new Date().toISOString();
  emitConnectionStatus();
}

function getConnectionStatus() {
  return {
    online: connectionStatus.online,
    apiReachable: connectionStatus.apiReachable,
    lastCheckedAt: connectionStatus.lastCheckedAt
  };
}

function subscribeConnectionStatus(listener) {
  connectionListeners.add(listener);
  listener(getConnectionStatus());
  return () => connectionListeners.delete(listener);
}

async function refreshApiHealth() {
  if (!navigator.onLine) {
    setApiReachable(false);
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
    setApiReachable(response.ok);
    return response.ok;
  } catch (_error) {
    setApiReachable(false);
    return false;
  }
}

window.addEventListener('online', () => {
  connectionStatus.online = true;
  emitConnectionStatus();
  void refreshApiHealth();
});

window.addEventListener('offline', () => {
  connectionStatus.online = false;
  setApiReachable(false);
});

function normalizeOrder(order) {
  return {
    id: order.id,
    table: order.table,
    note: order.note || '',
    status: order.status,
    subtotal: Number(order.subtotal || 0),
    tax: Number(order.tax || 0),
    total: Number(order.total || 0),
    customerPhone: order.customerPhone || '',
    customerPhoneMasked: order.customerPhoneMasked || '',
    customerEmail: order.customerEmail || '',
    paymentStatus: order.paymentStatus || 'unpaid',
    paidAt: order.paidAt || '',
    phoneVerifiedAt: order.phoneVerifiedAt || '',
    createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString(),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
        restricted: Boolean(item.restricted)
      }))
      : []
  };
}

function normalizeRequest(request) {
  return {
    id: request.id,
    table: request.table,
    type: request.type,
    note: request.note || '',
    status: request.status,
    items: request.items || [],
    customerPhone: request.customerPhone || '',
    customerPhoneMasked: request.customerPhoneMasked || '',
    phoneVerifiedAt: request.phoneVerifiedAt || '',
    createdAt: request.createdAt ? new Date(request.createdAt).toLocaleString() : new Date().toLocaleString()
  };
}

function loadMenu() {
  const raw = localStorage.getItem(STORAGE_KEYS.menu);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.menu, JSON.stringify(defaultMenu));
    return defaultMenu.map((item) => ({ ...item, available: item.available !== false, imageUrl: item.imageUrl || '' }));
  }
  return JSON.parse(raw).map((item) => ({ ...item, available: item.available !== false, imageUrl: item.imageUrl || '' }));
}

async function hydrateMenuFromApi() {
  try {
    const remoteMenu = await requestJson('/api/menu');
    if (!Array.isArray(remoteMenu)) return false;

    const normalizedMenu = remoteMenu.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: Number(item.price || 0),
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      restricted: Boolean(item.restricted),
      available: item.available !== false
    }));

    saveMenu(normalizedMenu);
    return true;
  } catch (_error) {
    return false;
  }
}

async function createMenuItemWithFallback(payload) {
  try {
    await requestJson('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, true);
    await hydrateMenuFromApi();
    return true;
  } catch (_error) {
    const menu = loadMenu();
    menu.push({ id: Date.now(), available: payload.available !== false, imageUrl: payload.imageUrl || '', ...payload });
    saveMenu(menu);
    return false;
  }
}

async function fetchAdminMenu() {
  const remoteMenu = await requestJson('/api/menu/all', { method: 'GET' }, true);
  const normalizedMenu = Array.isArray(remoteMenu) ? remoteMenu.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: Number(item.price || 0),
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    restricted: Boolean(item.restricted),
    available: item.available !== false
  })) : [];
  saveMenu(normalizedMenu);
  return normalizedMenu;
}

async function updateMenuAvailability(id, available) {
  try {
    await requestJson(`/api/menu/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available })
    }, true);
    await fetchAdminMenu();
    return true;
  } catch (_error) {
    const menu = loadMenu().map((item) => (String(item.id) === String(id)
      ? { ...item, available: Boolean(available) }
      : item));
    saveMenu(menu);
    return false;
  }
}

async function deleteMenuItemWithFallback(id) {
  try {
    await requestJson(`/api/menu/${id}`, { method: 'DELETE' }, true);
    await hydrateMenuFromApi();
    return true;
  } catch (_error) {
    saveMenu(loadMenu().filter((item) => String(item.id) !== String(id)));
    return false;
  }
}

function saveMenu(menu) {
  localStorage.setItem(STORAGE_KEYS.menu, JSON.stringify(menu));
}
function loadOrders() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.orders) || '[]');
}

async function hydrateOrdersFromApi(table) {
  try {
    const query = table ? `?table=${encodeURIComponent(table)}` : '';
    const remoteOrders = await requestJson(`/api/orders${query}`);
    const normalizedOrders = Array.isArray(remoteOrders) ? remoteOrders.map(normalizeOrder) : [];
    saveOrders(normalizedOrders);
    return normalizedOrders;
  } catch (_error) {
    logApiIssue('hydrateOrdersFromApi', _error, { table });
    return loadOrders();
  }
}

async function createOrderWithFallback(payload) {
  try {
    const createdOrder = await requestJson('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const existing = loadOrders();
    existing.unshift(normalizeOrder(createdOrder));
    saveOrders(existing);
    return true;
  } catch (_error) {
    logApiIssue('createOrderWithFallback', _error, { table: payload.table, itemCount: payload.items?.length || 0 });
    const now = new Date();
    const regularItems = payload.items.filter((item) => !item.restricted);
    const subtotal = regularItems.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;
    const localOrders = loadOrders();
    localOrders.unshift({
      id: Date.now(),
      table: payload.table,
      note: payload.note || '',
      status: 'received',
      subtotal,
      tax,
      total,
      customerPhone: payload.customerPhone,
      customerPhoneMasked: payload.customerPhoneMasked,
      customerEmail: payload.customerEmail || '',
      paymentStatus: 'unpaid',
      paidAt: '',
      phoneVerifiedAt: payload.phoneVerifiedAt || now.toISOString(),
      createdAt: now.toLocaleString(),
      items: payload.items.map((item) => ({
        id: item.menuItemId || Date.now(),
        menuItemId: item.menuItemId,
        name: item.name,
        qty: item.qty,
        price: Number(item.price || 0),
        restricted: Boolean(item.restricted)
      }))
    });
    saveOrders(localOrders);
    return false;
  }
}

async function updateOrderStatusWithFallback(id, status) {
  try {
    await requestJson(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const orders = loadOrders().map((order) => (String(order.id) === String(id) ? { ...order, status } : order));
    saveOrders(orders);
    return true;
  } catch (_error) {
    const orders = loadOrders();
    const localOrder = orders.find((order) => String(order.id) === String(id));
    if (localOrder) {
      localOrder.status = status;
      saveOrders(orders);
    }
    return false;
  }
}

async function updateOrderPaymentWithFallback(id, status) {
  try {
    await requestJson(`/api/orders/${id}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const paidAt = status === 'paid' ? new Date().toISOString() : '';
    const orders = loadOrders().map((order) => (String(order.id) === String(id)
      ? { ...order, paymentStatus: status, paidAt }
      : order));
    saveOrders(orders);
    return true;
  } catch (_error) {
    const orders = loadOrders();
    const localOrder = orders.find((order) => String(order.id) === String(id));
    if (localOrder) {
      localOrder.paymentStatus = status;
      localOrder.paidAt = status === 'paid' ? new Date().toISOString() : '';
      saveOrders(orders);
    }
    return false;
  }
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
}
function loadRequests() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.requests) || '[]');
}

async function hydrateRequestsFromApi() {
  try {
    const remoteRequests = await requestJson('/api/requests');
    const normalizedRequests = Array.isArray(remoteRequests) ? remoteRequests.map(normalizeRequest) : [];
    saveRequests(normalizedRequests);
    return normalizedRequests;
  } catch (_error) {
    return loadRequests();
  }
}

async function createRequestWithFallback(payload) {
  try {
    const createdRequest = await requestJson('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const existing = loadRequests();
    existing.unshift(normalizeRequest(createdRequest));
    saveRequests(existing);
    return true;
  } catch (_error) {
    logApiIssue('createRequestWithFallback', _error, { table: payload.table, type: payload.type });
    const existing = loadRequests();
    existing.unshift({
      id: Date.now(),
      table: payload.table,
      type: payload.type,
      note: payload.note,
      status: 'pending',
      items: payload.items || [],
      customerPhone: payload.customerPhone || '',
      customerPhoneMasked: payload.customerPhoneMasked || '',
      phoneVerifiedAt: payload.phoneVerifiedAt || '',
      createdAt: new Date().toLocaleString()
    });
    saveRequests(existing);
    return false;
  }
}

async function updateRequestStatusWithFallback(id, status) {
  try {
    await requestJson(`/api/requests/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const requests = loadRequests().map((request) => (String(request.id) === String(id) ? { ...request, status } : request));
    saveRequests(requests);
    return true;
  } catch (_error) {
    const requests = loadRequests();
    const localRequest = requests.find((request) => String(request.id) === String(id));
    if (localRequest) {
      localRequest.status = status;
      saveRequests(requests);
    }
    return false;
  }
}

async function clearCompletedRequestsWithFallback() {
  try {
    await requestJson('/api/requests/completed', { method: 'DELETE' });
  } catch (_error) {
    // No-op: keep local fallback below.
  }

  saveRequests(loadRequests().filter((request) => request.status !== 'completed'));
}

function saveRequests(requests) {
  localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(requests));
}
function loadCustomerSessions() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.customerSessions) || '{}');
}

async function hydrateCustomerSessionFromApi(table) {
  if (!table) return null;

  try {
    const session = await requestJson(`/api/auth/session/${encodeURIComponent(table)}`);
    const sessions = loadCustomerSessions();
    sessions[table] = {
      phone: session.phone,
      verifiedAt: session.verifiedAt
    };
    saveCustomerSessions(sessions);
    return sessions[table];
  } catch (_error) {
    return loadCustomerSessions()[table] || null;
  }
}

async function sendOtpWithApi(table, phone) {
  return requestJson('/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, phone })
  });
}

async function verifyOtpWithApi(table, phone, code) {
  return requestJson('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, phone, code })
  });
}

function saveCustomerSessions(sessions) {
  localStorage.setItem(STORAGE_KEYS.customerSessions, JSON.stringify(sessions));
}
function loadOtpChallenges() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.otpChallenges) || '{}');
}
function saveOtpChallenges(challenges) {
  localStorage.setItem(STORAGE_KEYS.otpChallenges, JSON.stringify(challenges));
}

async function adminLogin(email, password) {
  const response = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response?.user || response.user.role !== 'ADMIN') {
    throw new Error('Only admin users can access this page');
  }

  setAdminAccessToken(response.accessToken);
  return response.user;
}

async function fetchAdminUsers() {
  return requestJson('/api/admin/users', { method: 'GET' }, true);
}

async function createStaffUser(email, password) {
  return requestJson('/api/admin/users/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }, true);
}

async function updateStaffAccess(userId, allowStaffAccess) {
  return requestJson(`/api/admin/users/${encodeURIComponent(userId)}/access`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allowStaffAccess })
  }, true);
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function currency(n) {
  return inrFormatter.format(Number(n) || 0);
}
