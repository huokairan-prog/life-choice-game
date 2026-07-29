/* 界面渲染层：只读取游戏状态并更新 DOM，不处理回合规则。 */
(function () {
  'use strict';

  let activeTab = 'life';
  let toastTimer = null;
  let typeTimer = null;
  let typeToken = 0;
  let montageTimers = [];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const money = (value) => window.LIFE_PLAYER.formatMoney(value);

  function showScreen(id) {
    clearMontageTimers();
    $$('.screen').forEach((screen) => screen.classList.toggle('is-hidden', screen.id !== id));
  }

  function clearMontageTimers() {
    montageTimers.forEach((timer) => clearTimeout(timer));
    montageTimers = [];
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value == null ? '' : String(value);
  }

  function typeNarrative(value, settings) {
    const node = $('#event-description');
    if (!node) return;
    clearTimeout(typeTimer);
    const token = ++typeToken;
    const copy = String(value || '你在等待下一段人生故事。');
    const charMs = Math.max(12, Math.min(42, Number(settings && settings.charMs) || 19));
    node.textContent = '';
    node.setAttribute('aria-busy', 'true');
    let cursor = 0;
    function write() {
      if (token !== typeToken) return;
      cursor += cursor < 42 ? 1 : cursor < 110 ? 2 : 3;
      node.textContent = copy.slice(0, cursor);
      if (cursor < copy.length) {
        const last = copy.charAt(cursor - 1);
        const pause = /[，。！？；、]/.test(last) ? charMs * 3.2 : charMs;
        typeTimer = setTimeout(write, pause);
      } else {
        node.removeAttribute('aria-busy');
      }
    }
    write();
  }

  function renderSplash(hasSave) {
    const button = $('#continue-btn');
    if (!button) return;
    button.disabled = !hasSave;
    button.classList.toggle('is-hidden', !hasSave);
  }

  function renderIntro(presets, selected) {
    const preset = presets[selected] || presets.balanced;
    $$('[data-intro-choice], [data-intro-focus]').forEach((button) => {
      const key = button.dataset.introChoice || button.dataset.introFocus;
      button.classList.toggle('is-selected', key === selected);
      button.setAttribute('aria-pressed', key === selected ? 'true' : 'false');
    });
    const note = $('#intro-selection-note');
    if (note) note.textContent = `已选择：${preset.label}`;
    const copy = $('#intro-copy');
    if (copy) copy.textContent = preset.story || '选择一个方向，它会影响你更容易遇到的人生机会。';
  }

  function mood(player) {
    const s = player.stats;
    if (s.health < 28) return { icon: '♥', text: '需要好好休息' };
    if (s.pressure >= 72) return { icon: '≈', text: '压力正在累积' };
    if (s.happiness >= 78 && s.health >= 60) return { icon: '☀', text: '状态很好' };
    if (s.courage >= 75) return { icon: '▲', text: '正在勇敢前进' };
    return { icon: '☀', text: '稳步向前' };
  }

  function noteForStat(key, value) {
    const notes = {
      health: value < 35 ? '身体在提醒你慢下来' : value > 75 ? '状态充满韧性' : '身体是人生的底气',
      happiness: value < 35 ? '别忽略真实的感受' : value > 75 ? '你仍然热爱生活' : '保持对生活的热情',
      fitness: value > 75 ? '训练留下了力量' : '训练带来回报',
      basketball: value > 80 ? '球场正在记住你' : '控球后卫的基本功',
      english: value > 75 ? '世界开始听懂你' : '远方需要语言通行证',
      knowledge: value > 75 ? '理解力正在积累' : '持续学习，持续清醒',
      social: value > 75 ? '你正在连接更多人' : '关系是另一种财富',
      discipline: value > 75 ? '长期主义开始开花' : '你比昨天更接近目标',
      courage: value > 75 ? '你敢于选择未知' : '迈出第一步很重要',
      pressure: value > 70 ? '该留一点时间给自己' : '留一点时间给自己',
      reputation: value > 75 ? '你的行动被人看见' : '让行动为你说话',
      luck: value > 70 ? '命运常有一点惊喜' : '命运总有一点惊喜'
    };
    return notes[key] || '';
  }

  function eventIcon(category) {
    const dictionary = {
      basketball: '🏀', training: '⚡', university: '▤', exam: '✎', work: '▣', parttime: '⌂', overseas: '✈', english: 'A', travel: '◌', visa: '▱', friendship: '♡', romance: '♡', family: '⌂', health: '♥', accident: '!', money: '¥', business: '▲', media: '◉', investment: '◇', promotion: '♛', life: '⟡', study: '✦', social: '◎',
      '大学与考试': '✎', '篮球与训练': '🏀', '工作与兼职': '▣', '海外与英语': '✈', '旅行与签证': '◌', '友情与恋爱': '♡', '家庭与健康': '♥', '金钱与投资': '¥', '创业与自媒体': '▲', '职业发展': '♛', '人生选择': '⟡'
    };
    return dictionary[category] || '⟡';
  }

  function labelForCategory(category, api) {
    return (api.categoryLabels && api.categoryLabels[category]) || category || '人生';
  }

  function renderHeader(player) {
    setText('#date-display', `${player.date.year} 年 ${player.date.month} 月`);
    setText('#age-display', `${player.age} 岁`);
    setText('#player-name', player.name || '霍开然');
    const careerName = String(player.career?.name || '').trim();
    const visibleCareer = /(学校|大学|专业|学生|在读)/.test(careerName) ? '正在探索方向' : (careerName || '正在探索方向');
    setText('#career-display', visibleCareer);
    setText('#city-display', player.location || player.hometown || '北方 · 北城');
    const currentMood = mood(player);
    const moodNode = $('#mood-display');
    if (moodNode) moodNode.innerHTML = `<i aria-hidden="true">${currentMood.icon}</i> ${escapeHtml(currentMood.text)}`;
  }

  function healthPhrase(player) {
    const health = Number(player.stats.health || 0);
    if (health < 32) return '身体已经在提醒你慢下来';
    if (health < 54) return '最近有些疲惫';
    if (health > 78) return '状态还很有韧性';
    return '身体还撑得住';
  }

  function ambitionPhrase(player) {
    const goal = player.goals && (player.goals.primary || player.goals.id || player.goals.name);
    const ambition = Number(player.ambition || (player.talents && player.talents.ambition) || player.stats.courage || 50);
    if (goal && /家庭|稳定/.test(goal)) return '想把重要的人照顾好';
    if (ambition >= 76) return '不甘心一直普通';
    if (ambition <= 35) return '先把眼前的日子过稳';
    return '想看看更远的地方';
  }

  function relationScore(player, kind) {
    const list = (player.relationships || []).filter((relation) => {
      if (kind === 'family') return relation.type === 'family';
      if (kind === 'friend') return relation.type === 'friend' || relation.type === 'mentor' || relation.type === 'colleague';
      return relation.type === 'romance';
    });
    if (!list.length) return null;
    return list.reduce((sum, relation) => sum + Number(relation.relation ?? relation.value ?? relation.affection ?? 50), 0) / list.length;
  }

  function relationPhrase(player, kind) {
    const value = relationScore(player, kind);
    if (value === null) return kind === 'love' ? '还在慢慢发生' : kind === 'friend' ? '很久没有联系老朋友' : '家里一直在等你';
    if (kind === 'family') return value >= 75 ? '家里一直在等你' : value < 42 ? '有些话还没说开' : '偶尔也该打个电话';
    if (kind === 'friend') return value >= 72 ? '有人愿意听你说话' : value < 42 ? '很久没有联系老朋友' : '关系需要一点主动';
    return value >= 68 ? '有人把你放在心上' : value < 35 ? '还在慢慢发生' : '暧昧里也有答案';
  }

  function renderScene(player, event) {
    const stage = $('#scene-stage');
    if (!stage) return null;
    const sceneApi = window.LIFE_SCENES;
    const scene = sceneApi && typeof sceneApi.resolveScene === 'function'
      ? sceneApi.resolveScene(player, event || {})
      : null;
    const oldClasses = Array.from(stage.classList).filter((name) => name.indexOf('scene--') === 0);
    oldClasses.forEach((name) => stage.classList.remove(name));
    if (scene) {
      scene.ambientClass.split(/\s+/).filter(Boolean).forEach((name) => stage.classList.add(name));
      stage.dataset.scene = scene.id;
      stage.style.setProperty('--scene-base', scene.colorTone.base);
      stage.style.setProperty('--scene-shadow', scene.colorTone.shadow);
      stage.style.setProperty('--scene-accent', scene.colorTone.accent);
      stage.style.setProperty('--scene-glow', scene.colorTone.glow);
      stage.style.setProperty('--scene-text', scene.colorTone.text);
    }
    return scene;
  }

  function renderQuickStats(player) {
    setText('#money-display', money(player.resources.cash));
    setText('#money-change', player.resources.debt > 0 ? `债务 ${money(player.resources.debt)}` : '可自由支配现金');
    setText('#income-display', money(player.resources.monthlyIncome));
    setText('#expense-display', `支出 ${money(player.resources.monthlyExpense)}`);
    setText('#reputation-display', String(Math.round(player.stats.reputation)));
    setText('#fans-display', Number(player.resources.followers).toLocaleString('zh-CN'));
    setText('#health-phrase', healthPhrase(player));
    setText('#mood-phrase', mood(player).text);
    setText('#family-phrase', relationPhrase(player, 'family'));
    setText('#friendship-phrase', relationPhrase(player, 'friend'));
    setText('#love-phrase', relationPhrase(player, 'love'));
    setText('#ambition-phrase', ambitionPhrase(player));
  }

  function renderEvent(player, api) {
    const event = player.currentEvent || {};
    const scene = renderScene(player, event);
    setText('#event-type', scene ? scene.eyebrow : labelForCategory(event.category, api));
    setText('#month-count-display', String(Math.max(1, (player.date.year - 2026) * 12 + player.date.month - 6)));
    setText('#event-icon', eventIcon(event.category));
    setText('#event-title', event.title || (scene && scene.title) || '命运正在酝酿');
    typeNarrative(event.description || (scene && scene.atmosphere) || '你在等待下一段人生故事。', scene && scene.typewriter);
    const hint = $('#event-hint');
    if (hint) hint.innerHTML = `<i aria-hidden="true">◎</i> ${escapeHtml(event.hint || (scene && scene.soundHints[0]) || '每个选择都会留下痕迹')}`;
    const choices = api.getVisibleOptions(event);
    const selected = player.selectedOption !== null;
    const choiceList = $('#choice-list');
    choiceList.innerHTML = choices.map((option, index) => {
      const letter = String.fromCharCode(65 + index);
      const effectPreview = typeof api.describeEffects === 'function'
        ? api.describeEffects(option.effects).slice(0, 2).join(' · ')
        : '';
      const hint = option.hint || option.risk || option.preview || effectPreview || '影响会在之后慢慢显现';
      const picked = selected && index === player.selectedOption;
      return `<button class="choice-button ${picked ? 'is-picked' : ''}" type="button" data-event-choice="${index}" ${selected ? 'disabled' : ''}><span class="choice-button__letter">${letter}</span><span class="choice-button__body"><strong class="choice-button__title">${escapeHtml(option.label)}</strong><small class="choice-button__hint">${escapeHtml(hint)} ${picked ? '（已选择）' : ''}</small></span><span class="choice-button__arrow" aria-hidden="true">›</span></button>`;
    }).join('');
    choiceList.querySelectorAll('[data-event-choice]').forEach((button) => button.addEventListener('click', () => api.selectOption(Number(button.dataset.eventChoice))));
    renderResult(player);
  }

  function renderResult(player) {
    const resultPanel = $('#result-panel');
    const next = $('#next-month-btn');
    if (!player.pendingResult) {
      resultPanel.classList.add('is-hidden');
      next.classList.add('is-hidden');
      return;
    }
    resultPanel.classList.remove('is-hidden');
    next.classList.remove('is-hidden');
    $('#result-description').textContent = player.pendingResult.narrative || '这个决定已经成为你人生的一部分。';
    $('#effect-list').innerHTML = (player.pendingResult.changes || []).map((item) => {
      const prefix = item.value > 0 && item.kind !== 'milestone' ? '+' : '';
      const value = item.kind === 'milestone' ? '新篇章' : `${prefix}${item.value}`;
      const negative = item.kind === 'negative' || (item.value < 0 && item.kind !== 'positive');
      return `<span class="effect-pill ${negative ? 'is-negative' : ''}">${escapeHtml(item.label)} ${escapeHtml(value)}</span>`;
    }).join('') || '<span class="effect-pill">人生继续向前</span>';
  }

  function renderStats(player) {
    Object.entries(window.LIFE_PLAYER.STAT_META).forEach(([key]) => {
      const value = Math.round(player.stats[key] || 0);
      const card = $(`.stat-card[data-stat="${key}"]`);
      const output = $(`#stat-${key}`);
      const note = $(`#stat-${key}-note`);
      if (output) output.textContent = String(value);
      if (note) note.textContent = noteForStat(key, value);
      const meter = card && card.querySelector('.meter i');
      if (meter) meter.style.width = `${Math.max(0, Math.min(100, value))}%`;
    });
  }

  function relationValue(rel) { return Math.round(Number(rel.relation ?? rel.value ?? rel.affection ?? rel.relationship ?? 50) || 0); }
  function relationDescription(rel) { return rel.status || rel.description || rel.personality || rel.role || rel.job || '在你的人生中留下不同的光。'; }

  function renderRelationships(player, api) {
    const list = $('#relationship-list');
    const relationships = Array.isArray(player.relationships) ? player.relationships : [];
    $('#relationship-count').textContent = `${relationships.length} 人`;
    const lowest = relationships.slice().sort((a, b) => relationValue(a) - relationValue(b))[0];
    if (lowest) $('#relationship-tip').textContent = relationValue(lowest) < 42 ? `不妨主动联系一下${lowest.name}。` : `和${lowest.name}保持联系，会让人生更温暖。`;
    list.innerHTML = relationships.map((rel) => {
      const value = relationValue(rel);
      return `<article class="relationship-card"><span class="relationship-avatar">${escapeHtml((rel.name || '人').slice(0, 1))}</span><div class="relationship-card__body"><div class="relationship-card__head"><b>${escapeHtml(rel.name || '未命名角色')}</b><span>${value} / 100</span></div><small>${escapeHtml(relationDescription(rel))}</small><div class="meter relationship-meter"><i style="width:${value}%"></i></div><div class="relationship-actions"><button type="button" data-relation-action="contact" data-relation-id="${escapeHtml(rel.id)}">联系</button><button type="button" data-relation-action="visit" data-relation-id="${escapeHtml(rel.id)}">见面</button></div></div></article>`;
    }).join('') || '<p class="empty-state">还没有可以记录的关系。</p>';
    list.querySelectorAll('[data-relation-action]').forEach((button) => button.addEventListener('click', () => api.handleRelationshipAction(button.dataset.relationId, button.dataset.relationAction)));
  }

  function renderAssets(player, api) {
    const r = player.resources;
    $('#net-worth-display').textContent = money(api.getNetWorth());
    $('#debt-display').textContent = `债务 ${money(r.debt)}`;
    $('#investment-display').textContent = `投资 ${money(r.investments)}`;
    $('#asset-income').textContent = money(r.monthlyIncome);
    $('#property-display').textContent = r.property > 0 ? money(r.property) : '暂无';
    $('#vehicle-display').textContent = r.vehicle > 0 ? money(r.vehicle) : '暂无';
    $('#asset-fans').textContent = Number(r.followers).toLocaleString('zh-CN');
    $('#travel-display').textContent = `${r.travelCountries} 个`;
    $('#experience-display').textContent = `${r.workExperience} 月`;
    $('#english-level-display').textContent = window.LIFE_PLAYER.englishLevel(player.stats.english);
    $('#education-display').textContent = r.degree;
    const tags = player.tags.length ? player.tags : ['积极向上', '可靠', '勤奋'];
    $('#personality-tags').innerHTML = tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
    renderCareerOpportunities(player, api);
  }

  function renderCareerOpportunities(player, api) {
    let holder = $('#career-opportunities');
    if (!holder) {
      holder = document.createElement('section');
      holder.id = 'career-opportunities';
      holder.className = 'career-opportunities';
      $('#assets-panel').appendChild(holder);
    }
    const careers = Array.isArray(window.CAREERS) ? window.CAREERS : [];
    const available = careers.filter((career) => {
      if (career.id === player.career.id) return false;
      try { return typeof window.canEnterCareer === 'function' ? window.canEnterCareer(career, player) : true; } catch (_) { return false; }
    }).slice(0, 4);
    holder.innerHTML = `<p class="choice-label">职业机会</p><div class="career-current">当前职业：<b>${escapeHtml(player.career.name)}</b></div><div class="career-list">${available.map((career) => `<button class="career-option" type="button" data-career-id="${escapeHtml(career.id)}"><span>✦</span><b>${escapeHtml(career.name || career.title)}</b><small>${escapeHtml(career.industry || career.category || career.track || '职业路线')} · ${money(career.monthlyIncome || career.income || 0)}/月</small></button>`).join('') || '<p class="empty-state">继续积累能力，会有新的职业机会。</p>'}</div>`;
    holder.querySelectorAll('[data-career-id]').forEach((button) => button.addEventListener('click', () => api.applyForCareer(button.dataset.careerId)));
  }

  function renderAchievements(player) {
    const items = Array.isArray(window.ACHIEVEMENTS) ? window.ACHIEVEMENTS : [];
    const unlocked = new Set(player.achievements || []);
    $('#achievement-unlocked-count').textContent = String(unlocked.size);
    $('#achievement-total-count').textContent = String(items.length);
    const percent = items.length ? Math.round((unlocked.size / items.length) * 100) : 0;
    $('#achievement-progress-text').textContent = `${percent}%`;
    $('#achievement-progress-bar').style.width = `${percent}%`;
    $('#achievement-list').innerHTML = items.map((item) => {
      const got = unlocked.has(item.id);
      return `<article class="achievement-card ${got ? 'is-unlocked' : ''}"><span class="achievement-card__icon">${got ? escapeHtml(item.icon || '✦') : '⌑'}</span><b>${escapeHtml(item.name || item.title)}</b><small>${escapeHtml(got ? (item.description || item.desc || '已成为人生的一部分。') : (item.secret || '尚未解锁的人生印记'))}</small>${got ? '' : '<span class="achievement-card__lock">锁定</span>'}</article>`;
    }).join('');
  }

  function renderTimeline(player) {
    const entries = Array.isArray(player.timeline) ? player.timeline : [];
    $('#timeline-entry-count').textContent = `${entries.length} 条记录`;
    $('#timeline-summary').firstElementChild.textContent = `从 ${entries.length ? entries[entries.length - 1].date : '2026 年 7 月'} 出发`;
    $('#timeline-list').innerHTML = entries.map((entry) => `<li class="timeline-entry"><span class="timeline-entry__date">${escapeHtml(entry.date || '')} · ${escapeHtml(entry.age || '')} 岁</span><div class="timeline-entry__card"><b>${escapeHtml(entry.title || '人生片段')}</b><p>${escapeHtml(entry.text || '')}</p></div></li>`).join('') || '<li class="empty-state">第一段人生记忆正在等待发生。</li>';
  }

  function renderProfile(player) {
    const character = player.character || {};
    const identity = character.identity || player.identity || {};
    const body = character.body || player.body || {};
    const appearance = character.appearance || player.appearance || {};
    const talents = character.talents || player.talents || {};
    const interests = character.interests || player.interests || [];
    const birth = player.birth || { year: 2004, month: 7, day: 1 };
    const height = body.height || player.height || 185;
    const weight = body.weight || player.weight || 70;
    const build = body.description || body.build || player.bodyDescription || '高挑精瘦的运动型身材';
    const name = player.name || identity.name || '霍开然';
    setText('#profile-name', name);
    setText('#profile-signature', String(name).replace(/\s/g, ' ').toUpperCase() || 'HUO KAIRAN');
    setText('#profile-birth', `${birth.year} 年 ${birth.month} 月 ${birth.day || 12} 日`);
    setText('#profile-origin', player.hometown || identity.hometown || '北方北城');
    setText('#profile-build', `${height} cm / ${weight} kg`);
    const directionLabel = player.educationStatus === 'deferred'
      ? '自由探索中'
      : player.educationStatus === 'not_ready'
        ? '童年起点'
        : player.educationStatus === 'schooling'
          ? '成长进行时'
          : '正在书写自己的履历';
    setText('#profile-school', directionLabel);
    setText('#profile-specialty', identity.specialty || player.specialty || '篮球 · 控球后卫');
    setText('#profile-idol', identity.idol || player.idol || '迈克尔·乔丹');
    const traitList = Object.keys(character.personality || player.personality || {}).slice(0, 3).join('、');
    const interestsText = Array.isArray(interests) ? interests.slice(0, 4).join('、') : String(interests || '篮球、健身、旅行、英语');
    const talentLine = talents && talents.sport ? '运动的直觉让他在球场上更有底气。' : '';
    setText('#profile-description', `${build}。${traitList ? `性格倾向：${traitList}。` : ''} 喜欢${interestsText || '篮球、健身、旅行、英语'}。${talentLine}`);
  }

  function renderCreatorPreview(config) {
    const character = window.LIFE_CHARACTER;
    if (!character || !config) return;
    const body = config.body || {};
    const identity = config.identity || {};
    const build = character.getBodyType ? character.getBodyType(body) : '正在塑造';
    const difficulty = character.optionLabel ? character.optionLabel('difficulty', config.difficulty) : (config.difficulty || '真实');
    setText('#creator-preview-name', identity.name || '霍开然');
    setText('#creator-preview-origin', identity.hometown || '北方 · 北城');
    setText('#creator-preview-height', `${body.height || 185} cm`);
    setText('#creator-preview-build', build);
    setText('#creator-preview-difficulty', difficulty);
    setText('#creator-preview-story', character.getBodyDescription ? character.getBodyDescription(config) : '他还不知道，许多看似普通的日子，会在很久以后成为答案。');
    const avatar = $('#creator-avatar');
    if (avatar) {
      avatar.dataset.temperament = (config.appearance && config.appearance.temperament) || 'sunny';
      const mark = avatar.querySelector('span');
      if (mark) mark.textContent = String(identity.name || '霍').trim().slice(0, 1) || '霍';
    }
  }

  function renderCreator(rawConfig, stepIndex, onChange) {
    const character = window.LIFE_CHARACTER;
    if (!character) return rawConfig;
    const config = character.normalizeConfig ? character.normalizeConfig(rawConfig) : rawConfig;
    const step = Math.max(0, Math.min((character.STEPS || []).length - 1, Number(stepIndex) || 0));
    const meta = (character.STEPS || [])[step] || { label: '角色创建', caption: '写下这一生的开头' };
    setText('#creator-step-number', `${String(step + 1).padStart(2, '0')} / ${String((character.STEPS || []).length || 9).padStart(2, '0')}`);
    setText('#creator-step-title', meta.label);
    setText('#creator-step-caption', meta.caption);
    $$('#creator-progress li').forEach((item, index) => {
      item.classList.toggle('is-current', index === step);
      item.classList.toggle('is-complete', index < step);
    });
    const back = $('#creator-back-btn');
    const next = $('#creator-next-btn');
    const confirm = $('#creator-confirm-btn');
    if (back) back.disabled = step === 0;
    if (next) next.classList.toggle('is-hidden', step === (character.STEPS || []).length - 1);
    if (confirm) confirm.classList.toggle('is-hidden', step !== (character.STEPS || []).length - 1);
    renderCreatorPreview(config);
    const holder = $('#creator-step-body');
    if (character.renderCreatorStep && holder) {
      character.renderCreatorStep(holder, config, step, (nextConfig) => {
        renderCreatorPreview(nextConfig);
        if (typeof onChange === 'function') onChange(nextConfig);
      });
    }
    return config;
  }

  function renderGame(player, api) {
    if (!player) return;
    renderHeader(player); renderQuickStats(player); renderEvent(player, api); renderProfile(player); renderStats(player); renderRelationships(player, api); renderAssets(player, api); renderAchievements(player); renderTimeline(player);
    if (window.LIFE_GROWTH && typeof window.LIFE_GROWTH.render === 'function') window.LIFE_GROWTH.render(player);
    openPanel(activeTab, false);
  }

  function openPanel(tab, shouldScroll) {
    activeTab = tab || 'life';
    $$('.tab-panel').forEach((panel) => panel.classList.toggle('is-hidden', panel.dataset.panel !== activeTab));
    $$('.nav-item').forEach((button) => button.classList.toggle('is-active', button.dataset.tab === activeTab));
    if (shouldScroll !== false && $('#game-content')) $('#game-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showModal({ badge = '✦', kicker = '人生提醒', title = '新的篇章', content = '', actions = null }) {
    $('#modal-badge').textContent = badge; $('#modal-kicker').textContent = kicker; $('#modal-title').textContent = title; $('#modal-content').innerHTML = content;
    $('#modal-actions').innerHTML = actions || '<button class="button button--primary" type="button" data-modal-close>我知道了</button>';
    $('#modal').classList.remove('is-hidden');
  }
  function closeModal() { $('#modal').classList.add('is-hidden'); }
  function playOpening(onDone) {
    const frames = [
      { date: '2004 年 7 月 1 日', title: '北方 · 北城', line: '一个普通家庭里，一个新的故事开始了。', cue: '老电视闪了一下，厨房里有人在说话。' },
      { date: '2012 年夏天', title: '小区篮球场', line: '球第一次落在地上，远处的路灯刚刚亮起。', cue: '篮球落地，一声，又一声。' },
      { date: '2026 年盛夏', title: '北城的夜晚', line: '从这里出发，走向一个没有标准答案的人生。', cue: '远处有火车进站，街边的烧烤摊还亮着。' }
    ];
    let frameIndex = 0;
    let finished = false;
    const renderFrame = () => {
      const frame = frames[frameIndex];
      setText('#montage-date', frame.date);
      setText('#montage-title', frame.title);
      setText('#montage-line', frame.line);
      setText('#montage-cue', frame.cue);
      const montage = $('#opening-montage');
      if (montage) {
        montage.dataset.frame = String(frameIndex + 1);
        montage.classList.remove('is-cutting');
        requestAnimationFrame(() => montage.classList.add('is-cutting'));
      }
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      clearMontageTimers();
      $('#montage-skip-btn')?.removeEventListener('click', finish);
      if (typeof onDone === 'function') onDone();
    };
    showScreen('opening-montage');
    renderFrame();
    $('#montage-skip-btn')?.addEventListener('click', finish, { once: true });
    [1300, 2600, 3900].forEach((at, index) => {
      montageTimers.push(setTimeout(() => {
        if (index < 2) { frameIndex = index + 1; renderFrame(); }
        else finish();
      }, at));
    });
  }
  function showResult() { const panel = $('#result-panel'); panel.classList.remove('is-hidden'); setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 40); }
  function showEnding(ending, player, api) {
    const content = `<p>${escapeHtml(ending.description || '这段人生抵达了自己的答案。')}</p><p>你拥有 <b>${escapeHtml(money(api.getNetWorth()))}</b> 净资产、${escapeHtml(player.resources.travelCountries)} 个旅行国家和 ${escapeHtml(player.achievements.length)} 枚人生印记。</p>`;
    showModal({ badge: ending.icon || '☀', kicker: '人生结局', title: ending.name || ending.title || '人生谢幕', content, actions: '<button class="button button--primary" type="button" data-ending-restart>再开启一段人生</button>' });
    $('[data-ending-restart]')?.addEventListener('click', () => { closeModal(); api.startNew(); });
  }
  function showAchievementsPreview(items) { showModal({ badge: '✦', kicker: '人生印记', title: `${items.length || 30} 种人生可能`, content: '<p>从第一次工资、第一次远行，到东山再起和家庭幸福。每一次选择都可能点亮不同的印记。</p><p>开始新人生后，你可以随时在“成就”页查看进度。</p>' }); }
  function toast(message, type) {
    const node = $('#toast'); if (!node) return;
    const icons = { warning: '!', achievement: '✦', finance: '¥', relationship: '♡', career: '▲', success: '✓' };
    $('#toast-icon').textContent = icons[type] || '✓'; $('#toast-message').textContent = message; node.classList.remove('is-hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.add('is-hidden'), 2800);
  }

  function bindStaticUi() {
    $$('.nav-item').forEach((button) => button.addEventListener('click', () => openPanel(button.dataset.tab)));
    document.addEventListener('click', (event) => { if (event.target.closest('[data-modal-close]')) closeModal(); });
    $('#intro-back-btn')?.addEventListener('click', () => showScreen('splash-screen'));
    $('#quick-save-btn')?.addEventListener('click', () => { const api = window.LIFE_GAME; const player = api && api.getPlayer(); if (player) { window.LIFE_SAVE.saveGame(player); toast('已保存当前人生。', 'success'); } });
    $('#about-game-btn')?.addEventListener('click', () => showModal({ badge: 'i', kicker: '关于游戏', title: '人生选择', content: '<p>剧情人生可在本地运行；成长币、付费属性、VIP 与路线资格由成长服务保存和确认。</p><p>每个月的选择会改写属性、关系、职业、资产与结局。人生没有唯一的胜利条件，快乐、健康、关系和勇气同样重要。</p>' }));
    $('#timeline-filter-btn')?.addEventListener('click', () => toast('时间线已按最近记录展示。', 'success'));
  }

  window.LIFE_UI = { showScreen, renderSplash, renderIntro, renderCreator, renderCreatorPreview, renderGame, openPanel, showModal, closeModal, playOpening, showResult, showEnding, showAchievementsPreview, toast };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindStaticUi); else bindStaticUi();
})();
