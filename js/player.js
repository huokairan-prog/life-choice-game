/* 人物初始数据与通用数值工具。此文件不直接操作界面，方便以后扩展人物。 */
(function () {
  const BIRTH = { year: 2004, month: 7, day: 1 };

  const STAT_META = {
    health: { label: '健康', icon: '♥', color: 'mint' },
    happiness: { label: '快乐', icon: '☀', color: 'yellow' },
    fitness: { label: '体能', icon: '⚡', color: 'orange' },
    basketball: { label: '篮球', icon: '●', color: 'orange' },
    english: { label: '英语', icon: 'A', color: 'blue' },
    knowledge: { label: '知识', icon: '✦', color: 'purple' },
    social: { label: '社交', icon: '◎', color: 'pink' },
    discipline: { label: '自律', icon: '✓', color: 'mint' },
    courage: { label: '勇气', icon: '▲', color: 'red' },
    pressure: { label: '压力', icon: '≈', color: 'red', reverse: true },
    reputation: { label: '声望', icon: '♛', color: 'yellow' },
    luck: { label: '幸运', icon: '✧', color: 'purple' }
  };

  const INITIAL_STATS = {
    health: 78,
    happiness: 70,
    fitness: 74,
    basketball: 62,
    english: 38,
    knowledge: 52,
    social: 56,
    discipline: 61,
    courage: 55,
    pressure: 28,
    reputation: 8,
    luck: 50
  };

  const FOCUS_PRESETS = {
    basketball: {
      label: '专注篮球训练',
      story: '你把清晨和傍晚交给球场。汗水未必立刻给答案，却会留下底气。',
      effects: { stats: { basketball: 7, fitness: 5, discipline: 3, pressure: 2 }, flagsAdd: ['basketball_focus'], eventBias: { basketball: 4, training: 3 } }
    },
    english: {
      label: '努力提升英语',
      story: '你开始认真听每一段英语播客，把陌生的单词变成未来的门票。',
      effects: { stats: { english: 8, knowledge: 3, discipline: 3, happiness: -1 }, flagsAdd: ['english_focus'], eventBias: { english: 4, overseas: 3 } }
    },
    money: {
      label: '开始寻找赚钱机会',
      story: '你第一次把“想赚钱”拆成了一个个能完成的小目标。',
      effects: { stats: { courage: 5, social: 2, pressure: 3 }, money: 1000, flagsAdd: ['money_focus'], eventBias: { work: 4, money: 3, business: 2 } }
    },
    media: {
      label: '尝试经营自媒体',
      story: '镜头前的你还不够自然，但你决定先发出第一条视频。',
      effects: { stats: { reputation: 4, courage: 4, discipline: -1 }, followers: 30, flagsAdd: ['media_focus'], eventBias: { media: 5, travel: 2 } }
    },
    balanced: {
      label: '平衡发展',
      story: '你不急着定义自己，先把每一件重要的小事做好。',
      effects: { stats: { health: 2, happiness: 3, knowledge: 2, discipline: 2, pressure: -3 }, flagsAdd: ['balanced_focus'], eventBias: { life: 2, family: 2, friendship: 2 } }
    }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
  }

  function getAge(date, birth) {
    const d = date || { year: 2026, month: 7 };
    const b = birth || BIRTH;
    return d.year - b.year - (d.month < b.month ? 1 : 0);
  }

  function englishLevel(value) {
    if (value >= 90) return '接近母语';
    if (value >= 75) return '流利沟通';
    if (value >= 60) return '中高级';
    if (value >= 45) return '日常交流';
    if (value >= 30) return '基础入门';
    return '起步阶段';
  }

  function createNewPlayer() {
    const now = { year: 2026, month: 7 };
    return {
      version: 3,
      name: '霍开然',
      birth: BIRTH,
      hometown: '北方北城',
      university: '',
      major: '',
      startedAt: Date.now(),
      date: now,
      age: getAge(now, BIRTH),
      stats: { ...INITIAL_STATS },
      resources: {
        cash: 8000,
        monthlyIncome: 0,
        monthlyExpense: 1500,
        debt: 0,
        investments: 0,
        property: 0,
        vehicle: 0,
        followers: 0,
        travelCountries: 2,
        workExperience: 0,
        basketballGames: 0,
        basketballWins: 0,
        degree: '未设定'
      },
      career: { id: 'life_explorer', name: '正在探索方向', level: 0, industry: '人生' },
      careerHistory: ['life_explorer'],
      education: '正在书写自己的履历',
      educationStatus: 'deferred',
      relationships: [],
      achievements: [],
      achievementDates: {},
      timeline: [],
      seenEvents: {},
      currentEvent: null,
      currentEventId: null,
      selectedOption: null,
      eventCooldowns: {},
      flags: ['us_work_travel', 'canada_visa', 'driver_license'],
      tags: [],
      eventBias: {},
      choices: {},
      foreshadows: [],
      milestones: {},
      relationshipsHistory: [],
      activity: {
        basketball: 0,
        english: 0,
        work: 0,
        travel: 2,
        business: 0,
        media: 0,
        investment: 0,
        family: 0,
        social: 0,
        study: 0
      },
      pendingResult: null,
      isGameOver: false,
      ending: null,
      introFocus: null,
      lastMonthlyResult: null,
      storyArc: {
        id: 'north_city_opportunity',
        title: '北城机会',
        started: false,
        step: 0,
        total: 3,
        completed: false,
        completedAt: null,
        followUpMonth: null,
        followUpResolved: false,
        lastChoiceId: null,
        outcome: null
      }
    };
  }

  function normalizePlayer(raw) {
    const fresh = createNewPlayer();
    const data = raw && typeof raw === 'object' ? raw : {};
    const player = {
      ...fresh,
      ...data,
      date: { ...fresh.date, ...(data.date || {}) },
      birth: { ...BIRTH, ...(data.birth || {}) },
      stats: { ...fresh.stats, ...(data.stats || {}) },
      resources: { ...fresh.resources, ...(data.resources || {}) },
      career: { ...fresh.career, ...(data.career || {}) },
      careerHistory: Array.isArray(data.careerHistory) ? data.careerHistory : fresh.careerHistory,
      // 空字符串是「暂不入学」的有效选择，不能被旧默认值覆盖。
      education: Object.prototype.hasOwnProperty.call(data, 'education') ? data.education : fresh.education,
      educationStatus: data.educationStatus || (data.university ? 'enrolled' : 'deferred'),
      activity: { ...fresh.activity, ...(data.activity || {}) },
      eventBias: { ...(data.eventBias || {}) },
      flags: Array.isArray(data.flags) ? data.flags : fresh.flags,
      tags: Array.isArray(data.tags) ? data.tags : [],
      relationships: Array.isArray(data.relationships) ? data.relationships : [],
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      timeline: Array.isArray(data.timeline) ? data.timeline : [],
      seenEvents: data.seenEvents || {},
      eventCooldowns: data.eventCooldowns || {},
      choices: data.choices || {},
      foreshadows: Array.isArray(data.foreshadows) ? data.foreshadows : [],
      milestones: data.milestones || {},
      achievementDates: data.achievementDates || {},
      storyArc: { ...fresh.storyArc, ...(data.storyArc || {}) }
    };
    player.date.month = clamp(Math.round(player.date.month), 1, 12);
    player.date.year = Math.max(2026, Math.round(player.date.year));
    player.age = getAge(player.date, player.birth);
    Object.keys(STAT_META).forEach((key) => {
      player.stats[key] = clamp(Number(player.stats[key]), 0, 100);
    });
    ['cash', 'monthlyIncome', 'monthlyExpense', 'debt', 'investments', 'property', 'vehicle', 'followers', 'travelCountries', 'workExperience', 'basketballGames', 'basketballWins'].forEach((key) => {
      player.resources[key] = Math.max(0, Number(player.resources[key]) || 0);
    });
    return player;
  }

  function getNetWorth(player) {
    const r = player.resources;
    return Math.round(r.cash + r.investments + r.property + r.vehicle - r.debt);
  }

  function getLifeStage(player) {
    const age = Math.max(0, Number(player && player.age) || 0);
    // 早年阶段不借用大学事件：不同年龄应有不同的生活问题。
    if (age <= 5) return 'early_childhood';
    if (age <= 12) return 'childhood';
    if (age <= 18) return 'youth';
    if (age <= 24) return player && player.educationStatus === 'enrolled' ? 'university' : 'exploration';
    if (age < 27) return 'early';
    if (age < 36) return 'growth';
    if (age < 51) return 'mid';
    if (age < 65) return 'mature';
    return 'later';
  }

  function formatMoney(value) {
    const n = Math.round(Number(value) || 0);
    return `${n < 0 ? '-' : ''}¥${Math.abs(n).toLocaleString('zh-CN')}`;
  }

  function dateLabel(player) {
    return `${player.date.year}年${player.date.month}月`;
  }

  window.LIFE_PLAYER = {
    BIRTH,
    STAT_META,
    INITIAL_STATS,
    FOCUS_PRESETS,
    clamp,
    getAge,
    englishLevel,
    createNewPlayer,
    normalizePlayer,
    getNetWorth,
    getLifeStage,
    formatMoney,
    dateLabel
  };
})();
