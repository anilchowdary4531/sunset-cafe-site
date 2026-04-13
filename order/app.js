const script = document.createElement('script');
script.src = 'data.js';
script.onload = initCustomerApp;
document.head.appendChild(script);

function initCustomerApp() {
  void bootstrapCustomerApp();
}

async function bootstrapCustomerApp() {
  await hydrateMenuFromApi();
  loadMenu();
  const tables = Array.from({ length: 30 }, (_, i) => `Table ${i + 1}`);
  const tableSelect = document.getElementById('tableSelect');
  const loadTableBtn = document.getElementById('loadTableBtn');
  const orderingSection = document.getElementById('orderingSection');
  const activeTableText = document.getElementById('activeTableText');
  const menuGrid = document.getElementById('menuGrid');
  const cartItems = document.getElementById('cartItems');
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  const searchInput = document.getElementById('searchInput');
  const categoryTabs = document.getElementById('categoryTabs');
  const requestWaiterBtn = document.getElementById('requestWaiterBtn');
  const requestBillBtn = document.getElementById('requestBillBtn');
  const viewOrdersBtn = document.getElementById('viewOrdersBtn');
  const ordersModal = document.getElementById('ordersModal');
  const closeOrdersModal = document.getElementById('closeOrdersModal');
  const ordersList = document.getElementById('ordersList');
  const orderNote = document.getElementById('orderNote');
  const customerAuthStatus = document.getElementById('customerAuthStatus');
  const otpModal = document.getElementById('otpModal');
  const closeOtpModal = document.getElementById('closeOtpModal');
  const customerPhoneInput = document.getElementById('customerPhoneInput');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const otpDemoMessage = document.getElementById('otpDemoMessage');
  const otpVerificationSection = document.getElementById('otpVerificationSection');
  const otpInput = document.getElementById('otpInput');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const resendOtpBtn = document.getElementById('resendOtpBtn');
  const otpMetaText = document.getElementById('otpMetaText');
  const otpErrorText = document.getElementById('otpErrorText');
  const connectionBanner = document.getElementById('connectionBanner');
  const connectionBannerText = document.getElementById('connectionBannerText');
  const connectionRetryBtn = document.getElementById('connectionRetryBtn');
  const connectionDismissBtn = document.getElementById('connectionDismissBtn');
  const loginToggleBtn = document.getElementById('loginToggleBtn');
  const profileToggleBtn = document.getElementById('profileToggleBtn');
  const profileTriggerAvatar = document.getElementById('profileTriggerAvatar');
  const profileDrawer = document.getElementById('profileDrawer');
  const profileDrawerBackdrop = document.getElementById('profileDrawerBackdrop');
  const closeProfileDrawerBtn = document.getElementById('closeProfileDrawerBtn');
  const profileForm = document.getElementById('profileForm');
  const profileDisplayNameInput = document.getElementById('profileDisplayNameInput');
  const profilePhoneInput = document.getElementById('profilePhoneInput');
  const profileEmailInput = document.getElementById('profileEmailInput');
  const profileAvatarUrlInput = document.getElementById('profileAvatarUrlInput');
  const profileNotificationsInput = document.getElementById('profileNotificationsInput');
  const profileDarkModeInput = document.getElementById('profileDarkModeInput');
  const profilePreviewAvatar = document.getElementById('profilePreviewAvatar');
  const profileTitle = document.getElementById('profileTitle');
  const resetProfileBtn = document.getElementById('resetProfileBtn');

  const OTP_EXPIRY_MS = 5 * 60 * 1000;
  const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
  const PROFILE_STORAGE_KEY = 'cafe_user_profile_v1';
  const DEFAULT_PROFILE = {
    displayName: 'Guest User',
    phone: '',
    email: '',
    avatarUrl: '',
    notificationsEnabled: true,
    darkModeEnabled: false
  };

  let activeTable = '';
  let cart = [];
  let activeCategory = 'All';
  let pendingOrderAfterOtp = false;
  let otpMetaIntervalId = null;
  let dismissedBannerState = '';
  let currentBannerState = '';
  let profileState = loadProfileState();

  function loadProfileState() {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PROFILE };
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    } catch (_error) {
      return { ...DEFAULT_PROFILE };
    }
  }

  function saveProfileState(nextState) {
    profileState = { ...DEFAULT_PROFILE, ...nextState };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileState));
  }

  function getDisplayInitials(name) {
    const text = String(name || '').trim();
    if (!text) return 'U';
    const parts = text.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'U';
  }

  function renderAvatar(target, profile) {
    if (!target) return;

    if (profile.avatarUrl) {
      target.innerHTML = `<img src="${profile.avatarUrl}" alt="${profile.displayName} avatar" />`;
      return;
    }

    target.textContent = getDisplayInitials(profile.displayName);
  }

  function applyProfileTheme(profile) {
    document.body.classList.toggle('dark-theme', Boolean(profile.darkModeEnabled));
  }

  function syncProfileUi(profile) {
    if (profileDisplayNameInput) profileDisplayNameInput.value = profile.displayName || '';
    if (profilePhoneInput) profilePhoneInput.value = profile.phone || '';
    if (profileEmailInput) profileEmailInput.value = profile.email || '';
    if (profileAvatarUrlInput) profileAvatarUrlInput.value = profile.avatarUrl || '';
    if (profileNotificationsInput) profileNotificationsInput.checked = Boolean(profile.notificationsEnabled);
    if (profileDarkModeInput) profileDarkModeInput.checked = Boolean(profile.darkModeEnabled);
    if (profileTitle) profileTitle.textContent = profile.displayName ? `${profile.displayName}'s Profile` : 'Your Profile';

    renderAvatar(profileTriggerAvatar, profile);
    renderAvatar(profilePreviewAvatar, profile);
    applyProfileTheme(profile);
  }

  function syncProfileFromVerifiedPhone(phone) {
    const normalizedPhone = normalizePhoneNumber(String(phone || ''));
    if (!normalizedPhone) return;

    const nextProfile = {
      ...profileState,
      phone: normalizedPhone
    };

    if (!nextProfile.displayName || nextProfile.displayName === DEFAULT_PROFILE.displayName) {
      const suffix = normalizedPhone.slice(-4);
      nextProfile.displayName = suffix ? `Customer ${suffix}` : DEFAULT_PROFILE.displayName;
    }

    saveProfileState(nextProfile);
    syncProfileUi(profileState);
  }

  function openProfileDrawer() {
    if (!profileDrawer) return;
    syncProfileUi(profileState);
    profileDrawer.classList.remove('hidden');
  }

  function closeProfileDrawer() {
    if (!profileDrawer) return;
    profileDrawer.classList.add('hidden');
  }

  async function handleConnectionRetry() {
    if (!connectionRetryBtn) return;
    connectionRetryBtn.disabled = true;
    await refreshApiHealth();
    connectionRetryBtn.disabled = false;
  }

  if (connectionRetryBtn) {
    connectionRetryBtn.onclick = () => { void handleConnectionRetry(); };
  }

  if (connectionDismissBtn) {
    connectionDismissBtn.onclick = () => {
      dismissedBannerState = currentBannerState;
      if (connectionBanner) connectionBanner.classList.add('hidden');
    };
  }

  if (profileToggleBtn) {
    profileToggleBtn.onclick = openProfileDrawer;
  }

  if (loginToggleBtn) {
    loginToggleBtn.onclick = () => {
      pendingOrderAfterOtp = false;
      openOtpModal();
    };
  }

  if (closeProfileDrawerBtn) {
    closeProfileDrawerBtn.onclick = closeProfileDrawer;
  }

  if (profileDrawerBackdrop) {
    profileDrawerBackdrop.onclick = closeProfileDrawer;
  }

  if (profileAvatarUrlInput) {
    profileAvatarUrlInput.oninput = () => {
      const liveProfile = {
        ...profileState,
        displayName: profileDisplayNameInput?.value.trim() || profileState.displayName,
        avatarUrl: profileAvatarUrlInput.value.trim()
      };
      if (profileTitle) {
        profileTitle.textContent = liveProfile.displayName ? `${liveProfile.displayName}'s Profile` : 'Your Profile';
      }
      renderAvatar(profilePreviewAvatar, liveProfile);
    };
  }

  if (profileDisplayNameInput) {
    profileDisplayNameInput.oninput = () => {
      const liveProfile = {
        ...profileState,
        displayName: profileDisplayNameInput.value.trim(),
        avatarUrl: profileAvatarUrlInput?.value.trim() || ''
      };
      if (profileTitle) {
        profileTitle.textContent = liveProfile.displayName ? `${liveProfile.displayName}'s Profile` : 'Your Profile';
      }
      renderAvatar(profilePreviewAvatar, liveProfile);
    };
  }

  if (profileForm) {
    profileForm.onsubmit = (event) => {
      event.preventDefault();
      const nextState = {
        displayName: profileDisplayNameInput?.value.trim() || DEFAULT_PROFILE.displayName,
        phone: profilePhoneInput?.value.trim() || '',
        email: profileEmailInput?.value.trim() || '',
        avatarUrl: profileAvatarUrlInput?.value.trim() || '',
        notificationsEnabled: Boolean(profileNotificationsInput?.checked),
        darkModeEnabled: Boolean(profileDarkModeInput?.checked)
      };
      saveProfileState(nextState);
      syncProfileUi(profileState);
      closeProfileDrawer();
      alert('Profile settings saved.');
    };
  }

  if (resetProfileBtn) {
    resetProfileBtn.onclick = () => {
      saveProfileState(DEFAULT_PROFILE);
      syncProfileUi(profileState);
    };
  }

  syncProfileUi(profileState);

  function getLastCheckedSuffix(status) {
    if (!status.lastCheckedAt) return '';
    const parsed = new Date(status.lastCheckedAt);
    if (Number.isNaN(parsed.getTime())) return '';
    return ` Last checked ${parsed.toLocaleTimeString()}.`;
  }

  function renderConnectionBanner(status) {
    if (!connectionBanner || !connectionBannerText || !connectionRetryBtn) return;

    if (!status.online) {
      currentBannerState = 'offline';
      if (dismissedBannerState === currentBannerState) {
        connectionBanner.className = 'connection-banner hidden';
        return;
      }

      connectionBanner.className = 'connection-banner connection-offline';
      connectionBannerText.textContent = `Offline mode: using local data until internet is back.${getLastCheckedSuffix(status)}`;
      connectionRetryBtn.classList.remove('hidden');
      return;
    }

    if (status.apiReachable === false) {
      currentBannerState = 'api-down';
      if (dismissedBannerState === currentBannerState) {
        connectionBanner.className = 'connection-banner hidden';
        return;
      }

      connectionBanner.className = 'connection-banner connection-api-down';
      connectionBannerText.textContent = `API unavailable: app is running in fallback mode.${getLastCheckedSuffix(status)}`;
      connectionRetryBtn.classList.remove('hidden');
      return;
    }

    if (status.apiReachable === true) {
      currentBannerState = 'online';
      if (dismissedBannerState === currentBannerState) {
        connectionBanner.className = 'connection-banner hidden';
        return;
      }

      connectionBanner.className = 'connection-banner connection-online';
      connectionBannerText.textContent = `Connected: live backend sync is active.${getLastCheckedSuffix(status)}`;
      connectionRetryBtn.classList.add('hidden');
      return;
    }

    currentBannerState = 'unknown';
    connectionBanner.className = 'connection-banner hidden';
    connectionBannerText.textContent = '';
    connectionRetryBtn.classList.add('hidden');
  }

  tables.forEach((table) => {
    const option = document.createElement('option');
    option.value = table;
    option.textContent = table;
    tableSelect.appendChild(option);
  });

  function getVisibleMenuItems() {
    return loadMenu().filter((item) => item.available !== false);
  }

  function getCategories() {
    return ['All', ...new Set(getVisibleMenuItems().map((item) => item.category))];
  }

  function getMenuItemImageUrl(item) {
    return item.imageUrl || `https://placehold.co/600x400/f6f3ee/8b5e3c?text=${encodeURIComponent(item.name || 'Cafe Item')}`;
  }

  function getMenuItemFallbackImage(item) {
    return `https://placehold.co/600x400/f6f3ee/8b5e3c?text=${encodeURIComponent(item.name || 'Cafe Item')}`;
  }

  function getFoodType(item) {
    const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
    const nonVegPattern = /\b(chicken|mutton|fish|prawn|shrimp|egg|beef|pork|meat|nugget)\b/;
    return nonVegPattern.test(text) ? { label: 'Non-Veg', className: 'nonveg' } : { label: 'Veg', className: 'veg' };
  }

  function getItemOrderCounts() {
    return loadOrders().reduce((counts, order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach((orderedItem) => {
        const key = orderedItem.menuItemId ?? orderedItem.id ?? orderedItem.name;
        if (!key) return;
        const qty = Number(orderedItem.qty || 0);
        if (!Number.isFinite(qty) || qty <= 0) return;
        const normalizedKey = String(key);
        counts[normalizedKey] = (counts[normalizedKey] || 0) + qty;
      });
      return counts;
    }, {});
  }
  subscribeConnectionStatus(renderConnectionBanner);
  void refreshApiHealth();
  window.setInterval(() => { void refreshApiHealth(); }, 30000);

  function normalizePhoneNumber(value) {
    return value.replace(/\D/g, '');
  }

  function maskPhoneNumber(value) {
    const digits = normalizePhoneNumber(String(value || ''));
    if (!digits) return 'Not provided';
    if (digits.length <= 4) return digits;
    return `${'•'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
  }

  function formatStoredDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  function getCustomerSession() {
    if (!activeTable) return null;
    return loadCustomerSessions()[activeTable] || null;
  }

  function saveCustomerSession(phone) {
    if (!activeTable) return;
    const sessions = loadCustomerSessions();
    sessions[activeTable] = {
      phone,
      verifiedAt: new Date().toISOString()
    };
    saveCustomerSessions(sessions);
    syncProfileFromVerifiedPhone(phone);
  }

  function getOtpChallenge() {
    if (!activeTable) return null;
    return loadOtpChallenges()[activeTable] || null;
  }

  function saveOtpChallenge(challenge) {
    if (!activeTable) return;
    const challenges = loadOtpChallenges();
    challenges[activeTable] = challenge;
    saveOtpChallenges(challenges);
  }

  function clearOtpChallenge() {
    if (!activeTable) return;
    const challenges = loadOtpChallenges();
    delete challenges[activeTable];
    saveOtpChallenges(challenges);
  }

  function updateCustomerAuthStatus() {
    const session = getCustomerSession();
    if (loginToggleBtn) {
      if (session?.phone) {
        loginToggleBtn.textContent = 'Verified';
        loginToggleBtn.classList.remove('primary');
        loginToggleBtn.classList.add('verified');
      } else {
        loginToggleBtn.textContent = 'Login';
        loginToggleBtn.classList.add('primary');
        loginToggleBtn.classList.remove('verified');
      }
    }
    customerAuthStatus.classList.toggle('verified', Boolean(session?.phone));
    if (session?.phone) {
      const verifiedAtText = session.verifiedAt ? ` · Verified ${formatStoredDate(session.verifiedAt)}` : '';
      customerAuthStatus.textContent = `Verified phone for ${activeTable}: ${maskPhoneNumber(session.phone)}${verifiedAtText}`;
      return;
    }

    customerAuthStatus.textContent = activeTable
      ? `Phone verification is required before placing an order for ${activeTable}.`
      : 'Phone verification is required before placing an order.';
  }

  function setOtpError(message) {
    otpErrorText.textContent = message || '';
    otpErrorText.classList.toggle('hidden', !message);
  }

  function setOtpDemoMessage(message) {
    otpDemoMessage.textContent = message || '';
    otpDemoMessage.classList.toggle('hidden', !message);
  }

  function stopOtpMetaUpdates() {
    if (otpMetaIntervalId) {
      window.clearInterval(otpMetaIntervalId);
      otpMetaIntervalId = null;
    }
  }

  function updateOtpMeta() {
    const challenge = getOtpChallenge();
    if (!challenge) {
      otpVerificationSection.classList.add('hidden');
      otpMetaText.textContent = '';
      resendOtpBtn.disabled = true;
      return;
    }

    const now = Date.now();
    const expiresInSeconds = Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000));
    const resendInSeconds = Math.max(0, Math.ceil((challenge.cooldownUntil - now) / 1000));

    otpVerificationSection.classList.remove('hidden');
    resendOtpBtn.disabled = resendInSeconds > 0;
    otpMetaText.textContent = expiresInSeconds > 0
      ? `OTP expires in ${expiresInSeconds}s${resendInSeconds > 0 ? ` · Resend available in ${resendInSeconds}s` : ' · You can resend the OTP now.'}`
      : 'OTP expired. Please resend to continue.';
  }

  function startOtpMetaUpdates() {
    stopOtpMetaUpdates();
    updateOtpMeta();
    otpMetaIntervalId = window.setInterval(() => {
      if (otpModal.classList.contains('hidden')) {
        stopOtpMetaUpdates();
        return;
      }
      updateOtpMeta();
    }, 1000);
  }

  function openOtpModal() {
    if (!activeTable) {
      alert('Please select a table.');
      return;
    }

    const session = getCustomerSession();
    const challenge = getOtpChallenge();

    customerPhoneInput.value = challenge?.phone || session?.phone || profileState.phone || customerPhoneInput.value;
    otpInput.value = '';
    setOtpError('');
    setOtpDemoMessage(challenge ? `Demo OTP for ${maskPhoneNumber(challenge.phone)}: ${challenge.code}` : '');
    verifyOtpBtn.textContent = pendingOrderAfterOtp ? 'Verify & Place Order' : 'Verify Phone';
    otpModal.classList.remove('hidden');
    updateOtpMeta();
    startOtpMetaUpdates();
    window.requestAnimationFrame(() => customerPhoneInput.focus());
  }

  function closeOtpDialog() {
    otpModal.classList.add('hidden');
    otpInput.value = '';
    setOtpError('');
    stopOtpMetaUpdates();
  }

  function validatePhoneInput() {
    const phone = normalizePhoneNumber(customerPhoneInput.value);
    if (phone.length < 10 || phone.length > 15) {
      setOtpError('Enter a valid phone number with 10 to 15 digits.');
      return '';
    }
    setOtpError('');
    return phone;
  }

  async function sendOtp() {
    if (!activeTable) {
      setOtpError('Select a table before requesting OTP.');
      return;
    }

    const phone = validatePhoneInput();
    if (!phone) return;

    const existingChallenge = getOtpChallenge();
    const now = Date.now();
    if (existingChallenge && existingChallenge.phone === phone && existingChallenge.cooldownUntil > now) {
      setOtpError(`Please wait ${Math.ceil((existingChallenge.cooldownUntil - now) / 1000)} seconds before resending OTP.`);
      updateOtpMeta();
      return;
    }

    let code = '';
    try {
      const apiChallenge = await sendOtpWithApi(activeTable, phone);
      code = String(apiChallenge.demoCode || '');
      saveOtpChallenge({
        phone,
        code,
        attempts: 0,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(apiChallenge.expiresAt).getTime(),
        cooldownUntil: new Date(apiChallenge.cooldownUntil).getTime()
      });
    } catch (_error) {
      code = String(Math.floor(100000 + Math.random() * 900000));
      saveOtpChallenge({
        phone,
        code,
        attempts: 0,
        createdAt: new Date().toISOString(),
        expiresAt: now + OTP_EXPIRY_MS,
        cooldownUntil: now + OTP_RESEND_COOLDOWN_MS
      });
    }

    otpVerificationSection.classList.remove('hidden');
    otpInput.value = '';
    setOtpError('');
    setOtpDemoMessage(`Demo OTP sent to ${maskPhoneNumber(phone)}: ${code}`);
    updateOtpMeta();
    startOtpMetaUpdates();
    otpInput.focus();
  }

  async function verifyOtpAndContinue() {
    const challenge = getOtpChallenge();

    const phone = validatePhoneInput();
    if (!phone) return;

    const enteredOtp = otpInput.value.replace(/\D/g, '');
    if (enteredOtp.length !== 6) {
      setOtpError('Enter the 6-digit OTP.');
      return;
    }

    try {
      const verifiedSession = await verifyOtpWithApi(activeTable, phone, enteredOtp);
      saveCustomerSession(verifiedSession.phone);
      clearOtpChallenge();
      updateCustomerAuthStatus();
      closeOtpDialog();

      if (pendingOrderAfterOtp) {
        pendingOrderAfterOtp = false;
        await finalizeOrder();
        return;
      }

      alert('Phone verified successfully.');
      return;
    } catch (error) {
      if (!(error instanceof TypeError)) {
        setOtpError(error.message || 'OTP verification failed.');
        return;
      }
    }

    if (!challenge) {
      setOtpError('Send an OTP first.');
      return;
    }

    if (phone !== challenge.phone) {
      setOtpError('The phone number does not match this OTP request. Please resend OTP.');
      return;
    }

    if (challenge.expiresAt < Date.now()) {
      clearOtpChallenge();
      setOtpDemoMessage('');
      updateOtpMeta();
      setOtpError('This OTP has expired. Please request a new OTP.');
      return;
    }

    if (enteredOtp !== challenge.code) {
      const updatedChallenge = {
        ...challenge,
        attempts: (challenge.attempts || 0) + 1
      };

      if (updatedChallenge.attempts >= 5) {
        clearOtpChallenge();
        setOtpDemoMessage('');
        updateOtpMeta();
        setOtpError('Too many incorrect attempts. Please request a new OTP.');
        return;
      }

      saveOtpChallenge(updatedChallenge);
      setOtpError(`Incorrect OTP. ${5 - updatedChallenge.attempts} attempt(s) remaining.`);
      return;
    }

    saveCustomerSession(phone);
    clearOtpChallenge();
    updateCustomerAuthStatus();
    closeOtpDialog();

    if (pendingOrderAfterOtp) {
      pendingOrderAfterOtp = false;
      await finalizeOrder();
      return;
    }

    alert('Phone verified successfully.');
  }

  function renderTabs() {
    const categories = getCategories();
    if (!categories.includes(activeCategory)) {
      activeCategory = 'All';
    }
    categoryTabs.innerHTML = '';
    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = `tab ${activeCategory === cat ? 'active' : ''}`;
      btn.textContent = cat;
      btn.onclick = () => {
        activeCategory = cat;
        renderTabs();
        renderMenu();
      };
      categoryTabs.appendChild(btn);
    });
  }

  function renderMenu() {
    const q = searchInput.value.trim().toLowerCase();
    const orderCounts = getItemOrderCounts();
    const list = getVisibleMenuItems().filter((item) => {
      const matchCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });

    menuGrid.innerHTML = '';
    if (!list.length) {
      menuGrid.innerHTML = '<div class="card menu-card"><p>No items found.</p></div>';
      return;
    }

    list.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'card menu-card';
      const foodType = getFoodType(item);
      const imageSrc = getMenuItemImageUrl(item);
      const fallbackSrc = getMenuItemFallbackImage(item);
      const itemOrderCount = orderCounts[String(item.id)] || orderCounts[item.name] || 0;
      card.innerHTML = `
        <div class="menu-card-media">
          <img class="menu-card-image" src="${imageSrc}" alt="${item.name}" onerror="this.onerror=null;this.src='${fallbackSrc}';" />
          <span class="item-order-count">${itemOrderCount} order${itemOrderCount === 1 ? '' : 's'}</span>
          <span class="food-label ${foodType.className}">${foodType.label}</span>
        </div>
        <div class="tag">${item.category}</div>
        <h4>${item.name}</h4>
        <div class="muted small">${item.description || ''}</div>
        <div class="price">${item.restricted ? 'Staff Approval' : currency(item.price)}</div>
        ${item.restricted ? '<div class="note">Age verification and staff approval required.</div>' : ''}
      `;
      const btn = document.createElement('button');
      btn.className = 'primary full';
      btn.textContent = item.restricted ? 'Request Item' : 'Add to Cart';
      btn.onclick = () => addToCart(item);
      card.appendChild(btn);
      menuGrid.appendChild(card);
    });
  }

  function addToCart(item) {
    if (!activeTable) {
      alert('Please select a table first.');
      return;
    }
    const existing = cart.find((x) => x.id === item.id);
    if (existing && !item.restricted) {
      existing.qty += 1;
    } else {
      cart.push({ ...item, qty: item.restricted ? 1 : 1 });
    }
    renderCart();
  }

  function renderCart() {
    cartItems.innerHTML = '';
    if (!cart.length) {
      cartItems.innerHTML = '<p class="muted">Your cart is empty.</p>';
      updateTotals();
      return;
    }

    cart.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'cart-row';
      row.innerHTML = `
        <div class="cart-line-top">
          <div>
            <strong>${item.name}</strong>
            <div class="muted small">${item.restricted ? 'Staff approval required' : currency(item.price)}</div>
          </div>
          <button data-id="${item.id}" class="remove-btn">Remove</button>
        </div>
      `;

      if (!item.restricted) {
        const qtyWrap = document.createElement('div');
        qtyWrap.className = 'qty-wrap';
        qtyWrap.innerHTML = `
          <button data-act="minus" data-id="${item.id}">-</button>
          <strong>${item.qty}</strong>
          <button data-act="plus" data-id="${item.id}">+</button>
          <span class="muted">${currency(item.qty * item.price)}</span>
        `;
        row.appendChild(qtyWrap);
      }

      cartItems.appendChild(row);
    });

    cartItems.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.onclick = () => {
        cart = cart.filter((x) => String(x.id) !== btn.dataset.id);
        renderCart();
      };
    });

    cartItems.querySelectorAll('[data-act]').forEach((btn) => {
      btn.onclick = () => {
        const item = cart.find((x) => String(x.id) === btn.dataset.id);
        if (!item) return;
        item.qty += btn.dataset.act === 'plus' ? 1 : -1;
        if (item.qty <= 0) cart = cart.filter((x) => x.id !== item.id);
        renderCart();
      };
    });

    updateTotals();
  }

  function updateTotals() {
    const subtotal = cart.filter((x) => !x.restricted).reduce((sum, item) => sum + item.price * item.qty, 0);
    const tax = subtotal * 0.05;
    document.getElementById('subtotal').textContent = currency(subtotal);
    document.getElementById('tax').textContent = currency(tax);
    document.getElementById('total').textContent = currency(subtotal + tax);
  }

  function validateOrder() {
    if (!activeTable) {
      alert('Please select a table.');
      return false;
    }
    if (!cart.length) {
      alert('Please add items to the cart.');
      return false;
    }
    return true;
  }

  async function finalizeOrder() {
    const customerSession = getCustomerSession();
    if (!customerSession?.phone) {
      pendingOrderAfterOtp = true;
      openOtpModal();
      return;
    }

    const now = new Date();
    const regularItems = cart.filter((x) => !x.restricted);
    const restrictedItems = cart.filter((x) => x.restricted);
    const maskedPhone = maskPhoneNumber(customerSession.phone);

    let orderSyncedToApi = true;
    let requestSyncedToApi = true;

    if (regularItems.length) {
      orderSyncedToApi = await createOrderWithFallback({
         table: activeTable,
         note: orderNote.value.trim(),
         customerPhone: customerSession.phone,
         customerPhoneMasked: maskedPhone,
         customerEmail: profileState.email || undefined,
         phoneVerifiedAt: customerSession.verifiedAt || now.toISOString(),
         items: regularItems.map((item) => ({
           menuItemId: typeof item.id === 'number' ? item.id : undefined,
           name: item.name,
           qty: item.qty,
           price: Number(item.price || 0),
           restricted: Boolean(item.restricted)
         }))
       });
     }

     if (restrictedItems.length) {
       requestSyncedToApi = await createRequestWithFallback({
         table: activeTable,
         type: 'Cigarette Request',
         note: restrictedItems.length === 1
           ? `Customer requested ${restrictedItems[0].name}. Staff approval and age verification required.`
           : 'Customer requested restricted items. Staff approval and age verification required.',
         items: restrictedItems.map(({ id, name, qty }) => ({ id, name, qty })),
         customerPhone: customerSession.phone,
         customerPhoneMasked: maskedPhone,
         phoneVerifiedAt: customerSession.verifiedAt || now.toISOString()
       });
     }

    cart = [];
    orderNote.value = '';
    renderCart();
    renderMenu();
    if (orderSyncedToApi && requestSyncedToApi) {
      alert('Order placed successfully.');
    } else {
      console.warn('[CafeApp][finalizeOrder] Fallback mode was used for this table order.', {
        table: activeTable,
        orderSyncedToApi,
        requestSyncedToApi
      });
      alert('Order saved in local fallback mode. Please check connection and retry sync.');
    }
    await renderOrdersForTable();
    updateCustomerAuthStatus();
  }

  async function placeOrder() {
    if (!validateOrder()) return;

    if (!getCustomerSession()?.phone) {
      pendingOrderAfterOtp = true;
      openOtpModal();
      return;
    }

    pendingOrderAfterOtp = false;
    await finalizeOrder();
  }

  async function pushServiceRequest(type) {
    if (!activeTable) {
      alert('Select a table first.');
      return;
    }
    const customerSession = getCustomerSession();
    await createRequestWithFallback({
      table: activeTable,
      type,
      note: `${type} requested by customer.${customerSession?.phone ? ` Verified phone: ${maskPhoneNumber(customerSession.phone)}.` : ''}`,
      customerPhone: customerSession?.phone || '',
      customerPhoneMasked: customerSession?.phone ? maskPhoneNumber(customerSession.phone) : '',
      phoneVerifiedAt: customerSession?.verifiedAt || ''
    });
    alert(`${type} sent to staff.`);
  }

  async function renderOrdersForTable() {
    if (!activeTable) return;
    await hydrateOrdersFromApi(activeTable);
    const tableOrders = loadOrders().filter((order) => order.table === activeTable);
    ordersList.innerHTML = '';
    if (!tableOrders.length) {
      ordersList.innerHTML = '<p class="muted">No orders yet for this table.</p>';
      return;
    }

    tableOrders.forEach((order) => {
      const card = document.createElement('div');
      card.className = 'order-card';
      card.innerHTML = `
        <div class="section-head">
          <div>
            <strong>Order #${order.id}</strong>
            <div class="muted small">${order.createdAt}</div>
          </div>
          <span class="status ${order.status}">${order.status}</span>
        </div>
        <div>${order.items.map((x) => `<div class="line-item">${x.qty} × ${x.name}</div>`).join('')}</div>
        <div class="detail-list">
          ${order.customerPhoneMasked ? `<span class="muted small">Phone: ${order.customerPhoneMasked}</span>` : ''}
          <span class="muted small">Payment: ${order.paymentStatus || 'unpaid'}</span>
          ${order.note ? `<span class="muted small">Note: ${order.note}</span>` : ''}
        </div>
        <div class="bill-summary">
          <div><span>Total</span><strong>${currency(order.total)}</strong></div>
        </div>
      `;
      ordersList.appendChild(card);
    });
  }

  loadTableBtn.onclick = async () => {
     activeTable = tableSelect.value;
    console.info('[CafeApp][table] Loading table data', { table: activeTable });
     activeTableText.textContent = activeTable;
     orderingSection.classList.remove('hidden');
     await hydrateCustomerSessionFromApi(activeTable);
     const hydratedSession = getCustomerSession();
     if (hydratedSession?.phone) {
       syncProfileFromVerifiedPhone(hydratedSession.phone);
     }
     updateCustomerAuthStatus();
     await renderOrdersForTable();
    console.info('[CafeApp][table] Table data loaded', { table: activeTable });
     window.scrollTo({ top: document.body.scrollHeight * 0.1, behavior: 'smooth' });
  };
  searchInput.oninput = renderMenu;
  placeOrderBtn.onclick = () => { void placeOrder(); };
  requestWaiterBtn.onclick = () => { void pushServiceRequest('Call Waiter'); };
  requestBillBtn.onclick = () => { void pushServiceRequest('Request Bill'); };
  viewOrdersBtn.onclick = async () => {
    await renderOrdersForTable();
    ordersModal.classList.remove('hidden');
  };
  closeOrdersModal.onclick = () => ordersModal.classList.add('hidden');
  ordersModal.onclick = (e) => { if (e.target === ordersModal) ordersModal.classList.add('hidden'); };
  closeOtpModal.onclick = () => {
    pendingOrderAfterOtp = false;
    closeOtpDialog();
  };
  otpModal.onclick = (e) => {
    if (e.target === otpModal) {
      pendingOrderAfterOtp = false;
      closeOtpDialog();
    }
  };
  sendOtpBtn.onclick = () => { void sendOtp(); };
  resendOtpBtn.onclick = () => { void sendOtp(); };
  verifyOtpBtn.onclick = () => { void verifyOtpAndContinue(); };
  customerPhoneInput.oninput = () => {
    if (!otpErrorText.classList.contains('hidden')) setOtpError('');
  };
  otpInput.oninput = () => {
    otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
    if (!otpErrorText.classList.contains('hidden')) setOtpError('');
  };
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && profileDrawer && !profileDrawer.classList.contains('hidden')) {
      closeProfileDrawer();
    }
  });

  renderTabs();
  renderMenu();
  renderCart();
  updateCustomerAuthStatus();
}
