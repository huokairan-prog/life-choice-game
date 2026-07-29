/* 付费成长前端：只展示服务端报价/余额/结果，绝不在浏览器计算价格或发放成长币。 */
(function () {
  'use strict';

  const API_BASE = window.LIFE_GROWTH_API_BASE || (location.protocol.startsWith('http') ? '' : 'http://127.0.0.1:8787');
  const TOKEN_KEY = 'hkr-growth-session-token-v1';
  const DEV_USER_KEY = 'hkr-growth-dev-user-v1';
  const ATTRIBUTES = [
    ['strength', '力量', '普通'], ['speed', '速度', '普通'], ['vertical', '弹跳', '高级'], ['basketball', '篮球技术', '高级'],
    ['intelligence', '智力', '高级'], ['emotional_intelligence', '情商', '高级'], ['charm', '魅力', '高级'], ['health', '健康', '普通'],
    ['wealth', '财富能力', '高级'], ['luck', '幸运', '稀有'], ['social', '社交能力', '普通'], ['english', '英语能力', '普通'], ['career', '职业能力', '普通']
  ];
  // 仅用于服务不可达时的骨架展示；选项 ID、现金与价格都必须由服务端复核。
  const INITIAL_CASH_FALLBACK_OPTIONS = [
    { id: 'ordinary', name: '普通起点', initial_cash: 8000, coins_cost: 0, description: '从一笔普通积蓄开始，把机会留给之后的选择。', kind: 'free' },
    { id: 'prepared', name: '准备充分', initial_cash: 20000, coins_cost: 120, description: '多一点缓冲，先把生活过得稳一些。', kind: 'paid' },
    { id: 'steady', name: '稳步起跑', initial_cash: 50000, coins_cost: 380, description: '给训练、学习和第一份机会留出余地。', kind: 'paid' },
    { id: 'venture', name: '创业筹备', initial_cash: 100000, coins_cost: 900, description: '为更大的选择预留一笔启动资金。', kind: 'paid' }
  ];
  const state = {
    token: '', profile: null, products: [], rechargeRecords: [], spendingRecords: [], error: '', loading: false, appliedSignature: '', player: null,
    initialCash: { options: [], selection: null, confirmedPayload: null, loading: false, loaded: false, canSelect: false, error: '' }
  };
  const $ = (selector) => document.querySelector(selector);
  const id = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const coin = (value) => `${Number(value || 0).toLocaleString('zh-CN')} 成长币`;
  const yuan = (cents) => `¥${(Number(cents || 0) / 100).toFixed(2)}`;
  const cash = (value) => `¥${Math.max(0, Number(value || 0)).toLocaleString('zh-CN')}`;

  function ui() { return window.LIFE_UI; }

  function token() {
    if (state.token) return state.token;
    try { state.token = window.LIFE_AUTH_TOKEN || sessionStorage.getItem(TOKEN_KEY) || ''; } catch (_) { state.token = window.LIFE_AUTH_TOKEN || ''; }
    return state.token;
  }

  function storeToken(value) {
    state.token = value || '';
    try { if (value) sessionStorage.setItem(TOKEN_KEY, value); else sessionStorage.removeItem(TOKEN_KEY); } catch (_) { /* 私密浏览模式可继续使用内存 token */ }
  }

  async function request(path, options) {
    const config = options || {};
    const headers = { ...(config.headers || {}) };
    if (config.body) headers['Content-Type'] = 'application/json';
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const response = await fetch(`${API_BASE}${path}`, { method: config.method || 'GET', headers, body: config.body ? JSON.stringify(config.body) : undefined });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error?.message || '成长服务暂时不可用。');
      error.code = payload?.error?.code || 'REQUEST_FAILED';
      error.details = payload?.error?.details || {};
      throw error;
    }
    return payload;
  }

  async function ensureSession() {
    if (token()) return;
    const health = await request('/api/health');
    if (health.environment === 'production') throw Object.assign(new Error('正式环境需要通过账号系统登录后才能使用成长服务。'), { code: 'AUTH_REQUIRED' });
    let userId = '';
    try { userId = localStorage.getItem(DEV_USER_KEY) || ''; } catch (_) { /* 仅开发模式的便利标识 */ }
    if (!userId) {
      userId = `local-player-${id().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}`;
      try { localStorage.setItem(DEV_USER_KEY, userId); } catch (_) { /* no-op */ }
    }
    const session = await request('/api/dev/session', { method: 'POST', body: { user_id: userId } });
    storeToken(session.token);
    state.profile = session.profile;
  }

  function applyProfile(profile) {
    if (!profile) return;
    state.profile = profile;
    const signature = `${profile.attribute_version}:${profile.wallet?.version}:${profile.vip?.level}`;
    const game = window.LIFE_GAME;
    const player = game && game.getPlayer ? game.getPlayer() : state.player;
    // A fresh account deliberately remains unprojected until the one-time, budget-validated
    // character creation seed has reached the server. This avoids replacing a new custom role
    // with a browser-side default while still keeping paid upgrades server-authoritative.
    if (player && profile.initial_attributes_seeded && game && game.applyAuthoritativeProgression && signature !== state.appliedSignature) {
      state.appliedSignature = signature;
      game.applyAuthoritativeProgression(profile);
    }
  }

  function initialCashOption(option) {
    const raw = option || {};
    return {
      id: String(raw.id || raw.option_id || raw.code || ''),
      name: String(raw.name || raw.label || raw.title || '人生起点'),
      initialCash: Number(raw.initial_cash ?? raw.cash ?? raw.cash_amount ?? 0),
      coinsCost: Number(raw.coins_cost ?? raw.cost_coins ?? raw.price_coins ?? 0),
      description: String(raw.description || raw.note || '开局现金由成长服务确认。'),
      kind: String(raw.kind || (Number(raw.coins_cost ?? raw.cost_coins ?? raw.price_coins ?? 0) > 0 ? 'paid' : 'free')),
      selected: raw.selected === true,
      confirmed: raw.confirmed === true,
      locked: raw.locked === true
    };
  }

  function initialCashSelection(value) {
    if (!value || typeof value !== 'object') return null;
    const initialCash = Number(value.initial_cash ?? value.cash ?? value.cash_amount);
    const optionId = String(value.option_id || value.id || value.code || '');
    if (!optionId || !Number.isFinite(initialCash)) return null;
    return {
      optionId,
      initialCash,
      confirmed: value.confirmed === true || value.status === 'confirmed' || value.server_confirmed === true,
      confirmationId: String(value.confirmation_id || value.idempotency_id || value.purchase_id || ''),
      label: String(value.label || value.name || '')
    };
  }

  function setInitialCashResponse(response) {
    const payload = response || {};
    if (payload.profile) applyProfile(payload.profile);
    const rawOptions = payload.options || payload.initial_cash_options || payload.profile?.initial_cash_options;
    if (Array.isArray(rawOptions)) {
      const normalized = rawOptions.map(initialCashOption).filter((item) => item.id && Number.isFinite(item.initialCash));
      if (normalized.length) state.initialCash.options = normalized;
    }
    const rawSelection = payload.selection || payload.initial_cash_selection || payload.selected_option || payload.profile?.selected_option || payload.profile?.initial_cash_state?.selected_option || payload.profile?.initial_cash_selection;
    const selection = initialCashSelection(rawSelection);
    if (selection) {
      state.initialCash.selection = selection;
      if (selection.confirmed) state.initialCash.confirmedPayload = {
        option_id: selection.optionId,
        initial_cash: selection.initialCash,
        confirmation_id: selection.confirmationId,
        confirmed: true
      };
    }
    if (payload.can_select !== undefined) state.initialCash.canSelect = payload.can_select === true;
    else if (payload.profile?.initial_cash_state?.locked !== undefined) state.initialCash.canSelect = !payload.profile.initial_cash_state.locked && !payload.profile.initial_cash_state.selection_confirmed;
    return selection;
  }

  function initialCashOptions() {
    return state.initialCash.options.length ? state.initialCash.options : INITIAL_CASH_FALLBACK_OPTIONS.map(initialCashOption);
  }

  function applyConfirmedInitialCash(player) {
    const payload = state.initialCash.confirmedPayload;
    const game = window.LIFE_GAME;
    const target = player || (game && game.getPlayer ? game.getPlayer() : null);
    if (!payload || !target || !game || typeof game.applyAuthoritativeInitialCash !== 'function') return false;
    // 仅将服务端确认响应交给游戏受控入口；这里不会修改 player.resources.cash。
    game.applyAuthoritativeInitialCash(payload);
    return true;
  }

  function renderInitialCashPicker() {
    document.querySelectorAll('[data-initial-cash-picker]').forEach((picker) => {
      const cards = picker.querySelector('[data-initial-cash-cards]');
      if (!cards) return;
      const selection = state.initialCash.selection;
      const options = initialCashOptions();
      const ready = state.initialCash.loaded && !state.initialCash.loading && state.initialCash.canSelect;
      const status = state.initialCash.loading
        ? '<p class="creator-starting-cash__loading">正在从成长服务读取起点方案…</p>'
        : state.initialCash.error
          ? `<p class="creator-starting-cash__error">${escapeHtml(state.initialCash.error)} <button class="text-button" type="button" data-initial-cash-retry>重新连接</button></p>`
          : '';
      cards.innerHTML = `${options.map((option) => {
        const selected = (selection && selection.optionId === option.id) || option.selected;
        const confirmed = (selected && selection && selection.confirmed) || option.confirmed;
        const cost = Math.max(0, option.coinsCost);
        const action = confirmed ? '已由服务端确认' : cost ? `选择 · ${coin(cost)}` : '选择免费起点';
        return `<article class="creator-cash-option ${selected ? 'is-selected' : ''} ${confirmed ? 'is-confirmed' : ''}"><div class="creator-cash-option__top"><span>${cost ? '成长币起点' : '免费起点'}</span><strong>${cash(option.initialCash)}</strong></div><b>${escapeHtml(option.name)}</b><small>${escapeHtml(option.description)}</small><button type="button" data-initial-cash-option="${escapeHtml(option.id)}" ${!ready || confirmed || option.locked ? 'disabled' : ''}>${escapeHtml(action)}</button></article>`;
      }).join('')}${status}`;
      cards.querySelectorAll('[data-initial-cash-option]').forEach((button) => button.addEventListener('click', () => quoteInitialCash(button.dataset.initialCashOption)));
      cards.querySelector('[data-initial-cash-retry]')?.addEventListener('click', () => loadInitialCashOptions(true));
    });
  }

  async function loadInitialCashOptions(force) {
    if (state.initialCash.loading) return;
    if (state.initialCash.loaded && !force) {
      renderInitialCashPicker();
      return;
    }
    state.initialCash.loading = true;
    state.initialCash.error = '';
    renderInitialCashPicker();
    try {
      await ensureSession();
      const response = await request('/api/growth/initial-cash/options');
      state.initialCash.loaded = true;
      setInitialCashResponse(response);
      applyConfirmedInitialCash();
    } catch (error) {
      state.initialCash.error = error?.message || '暂时无法读取开局现金方案。';
      state.initialCash.loaded = false;
    } finally {
      state.initialCash.loading = false;
      renderInitialCashPicker();
    }
  }

  function mountInitialCashOptions() {
    renderInitialCashPicker();
    // 每次回到创建页都重新读取锁定状态，避免人生开始后仍出现可报价按钮。
    loadInitialCashOptions(true);
  }

  async function quoteInitialCash(optionId) {
    if (!optionId) return;
    if (!state.initialCash.canSelect) {
      ui()?.toast?.('这段人生已经开始，初始现金不能再调整。', 'warning');
      return;
    }
    try {
      const response = await request('/api/growth/initial-cash/quote', { method: 'POST', body: { option_id: optionId } });
      const quote = response.quote || response;
      const quoteId = String(quote.id || quote.quote_id || '');
      const option = initialCashOption(quote.option || initialCashOptions().find((item) => item.id === optionId) || { id: optionId });
      const cost = Number(quote.coins_cost ?? quote.cost_coins ?? option.coinsCost ?? 0);
      const targetCash = Number(quote.initial_cash ?? quote.cash_after ?? option.initialCash);
      const balanceBefore = Number(quote.balance_before ?? state.profile?.wallet?.growth_coins ?? 0);
      const balanceAfter = Number(quote.balance_after ?? (balanceBefore - cost));
      if (!quoteId || !Number.isFinite(targetCash)) throw new Error('成长服务没有返回有效的开局报价。');
      const content = `<p>选择「<b>${escapeHtml(option.name)}</b>」后，你会以 <b>${cash(targetCash)}</b> 开始这一生。</p><p>本次消耗：<b>${coin(cost)}</b></p><p>当前余额：${coin(balanceBefore)}；确认后余额：${coin(Math.max(0, balanceAfter))}</p><p class="growth-modal-note">开局现金、成长币扣除和选择资格均会在服务端再次确认；点击确认前不会扣费。</p>`;
      const action = cost ? `确认消耗 ${coin(cost)}` : '确认免费基础起点';
      ui().showModal({ badge: '¥', kicker: '确认开局资金', title: '确认这次人生起点？', content, actions: `<button class="button button--ghost" type="button" data-modal-close>暂时取消</button><button class="button button--primary" type="button" data-initial-cash-confirm>${escapeHtml(action)}</button>` });
      $('[data-initial-cash-confirm]')?.addEventListener('click', () => confirmInitialCash(quoteId));
    } catch (error) {
      handleError(error);
    }
  }

  async function confirmInitialCash(quoteId) {
    try {
      const response = await request('/api/growth/initial-cash/confirm', { method: 'POST', headers: { 'Idempotency-Key': id() }, body: { quote_id: quoteId } });
      const selection = setInitialCashResponse(response);
      if (!selection || !selection.confirmed) throw new Error('成长服务尚未确认本次开局资金。');
      ui().closeModal();
      applyConfirmedInitialCash();
      renderInitialCashPicker();
      if (ui()?.toast) ui().toast(`开局现金已由服务端确认：${cash(selection.initialCash)}。`, 'success');
    } catch (error) {
      handleError(error);
    }
  }

  async function seedFromPlayer(player) {
    if (!player?.character) return null;
    state.player = player;
    try {
      await ensureSession();
      // 付费起点可能在角色创建页已获服务端确认；角色实例刚创建后才在这里
      // 交给 game.js 的受控入口落地，绝不由 UI 直接写现金。
      applyConfirmedInitialCash(player);
      const response = await request('/api/growth/initialization', { method: 'POST', body: { character: player.character } });
      state.appliedSignature = '';
      applyProfile(response.profile);
      if (!state.initialCash.loaded) await loadInitialCashOptions();
      applyConfirmedInitialCash(player);
      render(player);
      return response;
    } catch (error) {
      // A creation failure should not erase an existing local life; the user can retry from Growth.
      state.error = error?.message || '初始成长档案同步失败。';
      if (ui()?.toast) ui().toast(state.error, 'warning');
      return null;
    }
  }

  async function refresh() {
    state.loading = true;
    state.error = '';
    render();
    try {
      await ensureSession();
      const [profileResponse, productsResponse, rechargeResponse, spendingResponse] = await Promise.all([
        request('/api/growth/profile'), request('/api/products'), request('/api/ledger?type=recharge'), request('/api/ledger?type=spend')
      ]);
      setInitialCashResponse(profileResponse);
      state.products = productsResponse.products || [];
      state.rechargeRecords = rechargeResponse.records || [];
      state.spendingRecords = spendingResponse.records || [];
    } catch (error) {
      state.error = error.message || '成长服务未连接。';
    } finally {
      state.loading = false;
      render();
    }
  }

  function render(player) {
    if (player) state.player = player;
    const root = $('#growth-panel');
    if (!root) return;
    if (state.profile) applyProfile(state.profile);
    if (state.loading && !state.profile) {
      root.querySelector('#growth-content').innerHTML = '<div class="growth-loading">正在连接成长服务…</div>';
      return;
    }
    if (!state.profile) {
      root.querySelector('#growth-content').innerHTML = `<section class="growth-offline"><span>◎</span><div><b>成长服务暂未连接</b><p>${escapeHtml(state.error || '请通过本地服务打开游戏后再使用充值与成长功能。')}</p><button class="button button--primary" type="button" data-growth-refresh>重新连接</button></div></section>`;
      bindPanel();
      return;
    }
    const profile = state.profile;
    const attrs = profile.attributes;
    const effective = profile.effective_attributes || attrs;
    const body = profile.body || {};
    const vip = profile.vip || {};
    root.querySelector('#growth-content').innerHTML = `
      <section class="growth-hero">
        <div class="growth-hero__coin"><span>✦</span><small>成长币</small><b>${Number(profile.wallet.growth_coins).toLocaleString('zh-CN')}</b></div>
        <div class="growth-hero__meta"><span class="growth-vip-badge">${escapeHtml(vip.label || '普通人生')}</span><b>免费成长点 ${Number(profile.wallet.free_growth_points || 0)}</b><small>${vip.next ? `距 VIP${vip.next.level} 还差 ${yuan(vip.next.remaining_cents)}` : '已抵达最高 VIP'}</small></div>
        <div class="growth-hero__actions"><button class="button button--primary" type="button" data-growth-recharge>充值成长币</button><button class="text-button" type="button" data-growth-refresh>刷新余额</button></div>
      </section>
      ${profile.minor?.is_minor ? `<p class="growth-minor-notice">未成年人账户：充值将受到月度额度限制，支付前请确认监护人已知情。</p>` : ''}
      <section class="growth-section growth-body-section"><div class="growth-section__head"><div><p>身体调整</p><h4>把身体，调成适合自己的人生节奏</h4></div><span>BMI ${escapeHtml(body.bmi ?? '--')}</span></div>
        <div class="growth-body-grid">
          ${bodyControl('height', '身高', attrs.height, 150, 220, '厘米')}
          ${bodyControl('weight', '体重', attrs.weight, 40, 160, '公斤')}
        </div>
        <p class="growth-body-hint">${escapeHtml(body.hint || '调整前会由服务器计算价格、BMI 与能力影响，确认后才会扣除成长币。')}</p>
      </section>
      <section class="growth-section"><div class="growth-section__head"><div><p>能力提升</p><h4>每一次升级，都要经过确认</h4></div><span>价格由服务器计算</span></div>
        <div class="growth-attribute-grid">${ATTRIBUTES.map(([key, label, tier]) => attributeCard(key, label, tier, attrs[key], effective[key])).join('')}</div>
      </section>
      <section class="growth-section growth-vip-section"><div class="growth-section__head"><div><p>VIP 人生</p><h4>折扣、幸运与专属身份</h4></div><span>VIP${Number(vip.level || 0)}</span></div>
        <div class="growth-vip-perks"><span>升级 ${Math.round((1 - Number(vip.discount || 1)) * 100)}% 折扣</span><span>每日 ${Number(vip.daily_coins || 0)} 成长币</span><span>幸运 +${Number(vip.luck_bonus || 0)}</span><span>${escapeHtml(vip.avatar_frame || '普通头像框')}</span>${(vip.privileges || []).map((privilege) => `<span>${escapeHtml(privilege)}</span>`).join('')}</div>
        <button class="button button--ghost" type="button" data-growth-daily ${Number(vip.daily_coins || 0) ? '' : 'disabled'}>领取今日成长币</button>
      </section>
      <section class="growth-section"><div class="growth-section__head"><div><p>人生路线</p><h4>有些门，需要先拿到钥匙</h4></div><span>服务器确认</span></div>
        <div class="growth-route-list">${(profile.routes || []).map(routeCard).join('')}</div>
      </section>
      <section class="growth-section growth-records"><div class="growth-section__head"><div><p>账单记录</p><h4>每一枚成长币，都有来处</h4></div><button class="text-button" type="button" data-growth-refresh>刷新</button></div>
        <div class="growth-record-grid"><div><b>充值记录</b>${recordList(state.rechargeRecords, '还没有充值记录')}</div><div><b>消费记录</b>${recordList(state.spendingRecords, '还没有成长币消费记录')}</div></div>
      </section>`;
    bindPanel();
  }

  function bodyControl(key, label, value, min, max, unit) {
    return `<article class="growth-body-control"><div><b>${label}</b><output id="growth-${key}-output">${Number(value)} ${unit}</output></div><input id="growth-${key}-target" type="range" min="${min}" max="${max}" value="${Number(value)}" data-growth-body-input="${key}" /><button class="button button--ghost" type="button" data-growth-body-quote="${key}">预览调整</button></article>`;
  }

  function attributeCard(key, label, tier, value, effectiveValue) {
    const effect = Number(effectiveValue) !== Number(value) ? `<small>身体 / VIP 加成后：${Number(effectiveValue)}</small>` : '<small>可使用免费成长点体验</small>';
    return `<article class="growth-attribute-card"><div class="growth-attribute-card__head"><span class="growth-tier growth-tier--${tier}">${tier}</span><b>${label}</b><strong>${Number(value)}</strong></div>${effect}<div class="growth-attribute-card__actions"><button type="button" data-growth-preview="${key}" data-growth-quantity="1">升级 +1</button><button type="button" data-growth-preview="${key}" data-growth-quantity="5">批量 +5</button></div></article>`;
  }

  function routeCard(route) {
    const disabled = route.unlocked || !route.eligible;
    const label = route.unlocked ? '已开启' : route.eligible ? `开启 · ${coin(route.price_coins)}` : `需 VIP${route.min_vip}`;
    return `<article class="growth-route ${route.unlocked ? 'is-unlocked' : ''}"><div><span>${route.unlocked ? '✦' : '◇'}</span><b>${escapeHtml(route.name)}</b><small>${escapeHtml(route.perk)}</small></div><button type="button" data-growth-route="${escapeHtml(route.id)}" ${disabled ? 'disabled' : ''}>${escapeHtml(label)}</button></article>`;
  }

  function recordList(records, emptyText) {
    if (!records || !records.length) return `<p class="growth-record-empty">${escapeHtml(emptyText)}</p>`;
    return `<ol class="growth-record-list">${records.slice(0, 5).map((record) => `<li><span>${escapeHtml(record.description)}</span><b class="${record.coin_delta >= 0 ? 'is-income' : 'is-spend'}">${record.coin_delta >= 0 ? '+' : ''}${Number(record.coin_delta)} 币</b><small>${escapeHtml(String(record.created_at).slice(0, 16).replace('T', ' '))} · 余额 ${Number(record.balance_after)}</small></li>`).join('')}</ol>`;
  }

  function bindPanel() {
    document.querySelectorAll('[data-growth-refresh]').forEach((button) => button.addEventListener('click', refresh));
    document.querySelectorAll('[data-growth-recharge]').forEach((button) => button.addEventListener('click', openRecharge));
    document.querySelectorAll('[data-growth-preview]').forEach((button) => button.addEventListener('click', () => previewAction({ attribute: button.dataset.growthPreview, quantity: Number(button.dataset.growthQuantity) })));
    document.querySelectorAll('[data-growth-body-input]').forEach((input) => input.addEventListener('input', () => {
      const output = $(`#growth-${input.dataset.growthBodyInput}-output`);
      if (output) output.value = `${input.value} ${input.dataset.growthBodyInput === 'height' ? '厘米' : '公斤'}`;
    }));
    document.querySelectorAll('[data-growth-body-quote]').forEach((button) => button.addEventListener('click', () => {
      const attribute = button.dataset.growthBodyQuote;
      const target = Number($(`#growth-${attribute}-target`)?.value);
      previewAction({ attribute, target });
    }));
    document.querySelectorAll('[data-growth-route]').forEach((button) => button.addEventListener('click', () => confirmRoute(button.dataset.growthRoute)));
    document.querySelectorAll('[data-growth-daily]').forEach((button) => button.addEventListener('click', claimDaily));
  }

  async function previewAction(action) {
    try {
      const response = await request('/api/growth/quote', { method: 'POST', body: { action } });
      const quote = response.quote;
      const bodyChange = Object.entries(quote.body_modifier_delta || {}).map(([key, value]) => `${key === 'basketball' ? '篮球' : key === 'health' ? '健康' : key === 'strength' ? '力量' : '速度'} ${Number(value) > 0 ? '+' : ''}${value}`).join(' · ');
      const content = `<p><b>${escapeHtml(quote.label)}</b>：${quote.before} → <b>${quote.after}</b></p><p>本次消耗：<b>${coin(quote.coins_cost)}</b>${quote.free_points_used ? `（已使用 ${quote.free_points_used} 个免费成长点）` : ''}</p><p>当前余额：${coin(quote.balance_before)}；确认后余额：${coin(Math.max(0, quote.balance_after))}</p>${quote.attribute === 'height' || quote.attribute === 'weight' ? `<p>调整后 BMI：${quote.body_after.bmi} · ${escapeHtml(quote.body_after.body_type)}${bodyChange ? `<br />能力影响：${escapeHtml(bodyChange)}` : ''}</p>` : ''}<p class="growth-modal-note">价格、余额和升级结果将由服务器在确认时再次校验。</p>`;
      ui().showModal({ badge: '✦', kicker: '确认成长', title: '确认这次提升？', content, actions: `<button class="button button--ghost" type="button" data-modal-close>暂时取消</button><button class="button button--primary" type="button" data-growth-confirm>确认消耗 ${coin(quote.coins_cost)}</button>` });
      $('[data-growth-confirm]')?.addEventListener('click', () => confirmUpgrade(quote));
    } catch (error) {
      handleError(error);
    }
  }

  async function confirmUpgrade(quote) {
    try {
      const response = await request('/api/growth/upgrade', { method: 'POST', headers: { 'Idempotency-Key': id() }, body: { quote_id: quote.id } });
      ui().closeModal();
      applyProfile(response.profile);
      await refreshRecords();
      celebrate();
      ui().toast(`升级成功：${quote.label} 已提升至 ${quote.after}。`, 'success');
      render();
    } catch (error) {
      handleError(error);
    }
  }

  function insufficient(details) {
    ui().showModal({ badge: '¥', kicker: '成长币余额', title: '成长币不足，充值后即可继续改变人生。', content: `<p>本次需要 <b>${coin(details.required || 0)}</b>，当前仅有 <b>${coin(details.balance || 0)}</b>。</p><p class="growth-modal-note">购买前会显示真实人民币价格，确认前不会扣费。</p>`, actions: '<button class="button button--ghost" type="button" data-modal-close>暂时取消</button><button class="button button--ghost" type="button" data-growth-view-packages>查看充值套餐</button><button class="button button--primary" type="button" data-growth-go-recharge>立即充值</button>' });
    $('[data-growth-view-packages]')?.addEventListener('click', openRecharge);
    $('[data-growth-go-recharge]')?.addEventListener('click', openRecharge);
  }

  function openRecharge() {
    const profile = state.profile || {};
    const first = Boolean(profile.first_recharge_available);
    ui().showModal({ badge: '¥', kicker: '成长商店', title: '选择成长币套餐', content: `<p>${first ? '首充套餐将获得双倍成长币；同一账号仅一次。' : '所有价格均为人民币，确认前不会扣费。'}</p><div class="growth-package-list">${state.products.map((product) => `<button class="growth-package" type="button" data-growth-product="${escapeHtml(product.sku)}"><b>${yuan(product.price_cents)}</b><span>${coin(product.coins)}${product.first_recharge_bonus ? ` · 首充额外 +${product.first_recharge_bonus}` : ''}</span></button>`).join('')}</div>${profile.minor?.is_minor ? '<p class="growth-minor-notice">未成年人消费提醒：本次充值会计入月度额度。</p>' : ''}`, actions: '<button class="button button--ghost" type="button" data-modal-close>暂时取消</button>' });
    document.querySelectorAll('[data-growth-product]').forEach((button) => button.addEventListener('click', () => confirmRecharge(button.dataset.growthProduct)));
  }

  function confirmRecharge(sku) {
    const product = state.products.find((item) => item.sku === sku);
    if (!product) return;
    ui().showModal({ badge: '¥', kicker: '二次确认', title: `确认充值 ${yuan(product.price_cents)}？`, content: `<p>将购买 <b>${coin(product.coins)}</b>${product.first_recharge_bonus ? `，首充额外赠送 ${coin(product.first_recharge_bonus)}` : ''}。</p><p class="growth-modal-note">点击“确认创建支付订单”后才会跳转或等待微信支付；不会自动扣费。</p>`, actions: '<button class="button button--ghost" type="button" data-modal-close>暂时取消</button><button class="button button--primary" type="button" data-growth-create-order>确认创建支付订单</button>' });
    $('[data-growth-create-order]')?.addEventListener('click', () => createRechargeOrder(product));
  }

  async function createRechargeOrder(product) {
    try {
      const response = await request('/api/payments/orders', { method: 'POST', headers: { 'Idempotency-Key': id() }, body: { sku: product.sku } });
      if (response.development_simulation) {
        ui().showModal({ badge: '⚑', kicker: '开发测试模式', title: '测试订单已创建', content: `<p>这是开发环境模拟充值，不会产生真实收费。订单金额为 <b>${response.order.amount}</b>。</p><p>正式环境不会显示这个按钮，成长币只能由微信支付服务器通知发放。</p>`, actions: `<button class="button button--ghost" type="button" data-modal-close>暂时取消</button><button class="button button--primary" type="button" data-growth-simulate-pay="${escapeHtml(response.order.id)}">模拟支付成功（仅开发）</button>` });
        $('[data-growth-simulate-pay]')?.addEventListener('click', () => completeDevPayment(response.order.id));
      } else if (response.payment && window.WeixinJSBridge) {
        window.WeixinJSBridge.invoke('getBrandWCPayRequest', response.payment, () => ui().toast('支付结果将以微信服务器通知为准。', 'success'));
      } else {
        ui().showModal({ badge: '¥', kicker: '等待支付', title: '支付订单已创建', content: '<p>请在微信完成支付。成长币只会在微信支付服务器确认后到账。</p>', actions: '<button class="button button--primary" type="button" data-modal-close>我知道了</button>' });
      }
    } catch (error) {
      handleError(error);
    }
  }

  async function completeDevPayment(orderId) {
    try {
      const response = await request(`/api/dev/payments/${encodeURIComponent(orderId)}/complete`, { method: 'POST', body: {} });
      ui().closeModal();
      applyProfile(response.profile);
      await refreshRecords();
      celebrate();
      ui().toast(`支付成功，${coin(response.order.total_coins)} 已到账。`, 'success');
      render();
    } catch (error) {
      handleError(error);
    }
  }

  function confirmRoute(routeId) {
    const route = (state.profile?.routes || []).find((item) => item.id === routeId);
    if (!route) return;
    ui().showModal({ badge: '◇', kicker: '人生路线', title: `开启「${route.name}」？`, content: `<p>${escapeHtml(route.perk)}</p><p>本次消耗 <b>${coin(route.price_coins)}</b>，确认后不可撤销。</p>`, actions: '<button class="button button--ghost" type="button" data-modal-close>暂时取消</button><button class="button button--primary" type="button" data-growth-route-confirm>确认开启</button>' });
    $('[data-growth-route-confirm]')?.addEventListener('click', () => purchaseRoute(routeId));
  }

  async function purchaseRoute(routeId) {
    try {
      const response = await request(`/api/routes/${encodeURIComponent(routeId)}/purchase`, { method: 'POST', headers: { 'Idempotency-Key': id() }, body: {} });
      ui().closeModal();
      applyProfile(response.profile);
      await refreshRecords();
      celebrate();
      ui().toast('人生路线已由服务器确认开启。', 'success');
      render();
    } catch (error) {
      handleError(error);
    }
  }

  async function claimDaily() {
    try {
      const response = await request('/api/growth/daily-reward', { method: 'POST', headers: { 'Idempotency-Key': id() }, body: {} });
      applyProfile(response.profile);
      await refreshRecords();
      ui().toast(`已领取 ${coin(response.reward)}。`, 'success');
      render();
    } catch (error) {
      handleError(error);
    }
  }

  async function refreshRecords() {
    const [rechargeResponse, spendingResponse] = await Promise.all([request('/api/ledger?type=recharge'), request('/api/ledger?type=spend')]);
    state.rechargeRecords = rechargeResponse.records || [];
    state.spendingRecords = spendingResponse.records || [];
  }

  function celebrate() {
    const node = $('#growth-success-burst');
    if (!node) return;
    node.classList.remove('is-active');
    requestAnimationFrame(() => node.classList.add('is-active'));
    setTimeout(() => node.classList.remove('is-active'), 1300);
  }

  function handleError(error) {
    if (error?.code === 'INSUFFICIENT_COINS') return insufficient(error.details || {});
    if (error?.code === 'MINOR_LIMIT') return ui().showModal({ badge: '!', kicker: '消费提醒', title: '未成年人充值受到限制', content: `<p>${escapeHtml(error.message)}</p>`, actions: '<button class="button button--primary" type="button" data-modal-close>我知道了</button>' });
    ui().toast(error?.message || '操作未完成，请稍后再试。', 'warning');
  }

  function init() { render(); refresh(); }

  window.LIFE_GROWTH = {
    refresh, render, applyProfile, seedFromPlayer, openRecharge, mountInitialCashOptions,
    getProfile: () => state.profile,
    getInitialCashSelection: () => state.initialCash.selection
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
