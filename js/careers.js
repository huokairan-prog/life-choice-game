/*
 * 《霍开然的人生选择》职业数据层
 *
 * 本文件不依赖 ES Module，便于直接双击打开 index.html。所有公开方法都挂在
 * window 上；游戏主逻辑只需读取 CAREERS 或调用下方的 helper 即可。
 */
(function careerSystem(global) {
  'use strict';

  const STAT_ALIASES = {
    health: ['health', '健康'],
    happiness: ['happiness', 'happy', '快乐'],
    fitness: ['fitness', 'stamina', '体能'],
    basketball: ['basketball', 'basketballSkill', '篮球', '篮球能力'],
    english: ['english', 'englishSkill', '英语', '英语能力'],
    knowledge: ['knowledge', '知识'],
    social: ['social', 'socialSkill', '社交'],
    discipline: ['discipline', 'selfDiscipline', '自律'],
    courage: ['courage', '勇气'],
    stress: ['stress', 'pressure', '压力'],
    reputation: ['reputation', 'fame', '声望'],
    luck: ['luck', '幸运']
  };

  const RESOURCE_ALIASES = {
    money: ['money', 'cash', '存款', '资金'],
    savings: ['savings', 'money', 'cash', '存款', '资金'],
    debt: ['debt', '债务'],
    investments: ['investments', 'investmentAssets', '投资资产'],
    property: ['property', 'properties', '房产'],
    cars: ['cars', 'vehicles', '车辆'],
    fans: ['fans', 'followers', '粉丝'],
    countries: ['countries', 'travelCountries', 'travelCountryCount', '旅行国家数量'],
    workExperience: ['workExperience', 'experience', '工作经验'],
    basketballWins: ['basketballWins', 'basketballAwards', '篮球比赛成绩']
  };

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return [];
    return [value];
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : (fallback === undefined ? 0 : fallback);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readOwnNumber(source, aliases) {
    if (!source || typeof source !== 'object') return undefined;
    for (const key of aliases) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const value = Number(source[key]);
        if (Number.isFinite(value)) return value;
      }
    }
    return undefined;
  }

  /** 读取人物属性，兼容 state.stats 与旧版的顶层字段。 */
  function getStat(state, statKey, fallback) {
    const aliases = STAT_ALIASES[statKey] || [statKey];
    const nested = readOwnNumber(state && state.stats, aliases);
    if (nested !== undefined) return nested;
    const direct = readOwnNumber(state, aliases);
    return direct !== undefined ? direct : (fallback === undefined ? 0 : fallback);
  }

  /** 读取资源，兼容 state.resources/state.assets/顶层字段。 */
  function getResource(state, resourceKey, fallback) {
    const aliases = RESOURCE_ALIASES[resourceKey] || [resourceKey];
    const resourceValue = readOwnNumber(state && state.resources, aliases);
    if (resourceValue !== undefined) return resourceValue;
    const assetValue = readOwnNumber(state && state.assets, aliases);
    if (assetValue !== undefined) return assetValue;
    const direct = readOwnNumber(state, aliases);
    return direct !== undefined ? direct : (fallback === undefined ? 0 : fallback);
  }

  function getAge(state) {
    return finiteNumber(state && state.age, 21);
  }

  function getCareerId(state) {
    if (!state) return '';
    if (typeof state.career === 'string') return state.career;
    if (state.career && typeof state.career.id === 'string') return state.career.id;
    return state.careerId || state.jobId || '';
  }

  function getEducation(state) {
    if (!state) return '';
    const education = state.education || (state.resources && (state.resources.education || state.resources.degree)) || '';
    return Array.isArray(education) ? education.join(' ') : String(education);
  }

  function hasFlag(state, flag) {
    if (!state || !flag) return false;
    const flags = state.flags || state.unlocks || state.milestones || {};
    if (Array.isArray(flags)) return flags.includes(flag);
    return Boolean(flags[flag]);
  }

  function hasAchievement(state, achievementId) {
    const achieved = (state && (state.achievements || state.unlockedAchievements)) || [];
    if (Array.isArray(achieved)) {
      return achieved.some(function (entry) {
        return entry === achievementId || (entry && entry.id === achievementId);
      });
    }
    return Boolean(achieved && achieved[achievementId]);
  }

  function hasCareerHistory(state, careerId) {
    const current = getCareerId(state);
    if (current === careerId) return true;
    const history = (state && (state.careerHistory || state.jobHistory || state.workHistory)) || [];
    return asArray(history).some(function (entry) {
      if (typeof entry === 'string') return entry === careerId;
      return entry && (entry.id === careerId || entry.careerId === careerId);
    });
  }

  function getTrackHistoryCount(state, track) {
    const history = (state && (state.careerHistory || state.jobHistory || state.workHistory)) || [];
    return asArray(history).filter(function (entry) {
      const id = typeof entry === 'string' ? entry : (entry && (entry.id || entry.careerId));
      const career = CAREER_BY_ID[id];
      return career && career.track === track;
    }).length;
  }

  const CAREER_TRACKS = [
    { id: 'student', label: '大学阶段', icon: '🎓', color: '#7f8cff' },
    { id: 'teacher', label: '体育教育', icon: '🏫', color: '#48b7a4' },
    { id: 'basketball', label: '篮球事业', icon: '🏀', color: '#f89d43' },
    { id: 'hotel', label: '酒店管理', icon: '🏨', color: '#6d9dfc' },
    { id: 'media', label: '自媒体', icon: '📹', color: '#e36dac' },
    { id: 'service', label: '普通工作', icon: '💼', color: '#a18cd1' },
    { id: 'business', label: '创业经营', icon: '🚀', color: '#ed6a5a' },
    { id: 'overseas', label: '海外发展', icon: '✈️', color: '#38a9db' }
  ];

  function makeCareer(data) {
    const career = Object.assign({
      tier: 1,
      monthlyIncome: 0,
      incomeRange: [0, 0],
      monthlyStress: 0,
      workHours: 40,
      requirements: {},
      growth: {},
      eventTags: [],
      promotionIds: [],
      description: ''
    }, data);
    // game.js/UI 同时支持 name、industry、level 这几个展示字段。
    career.name = career.name || career.title;
    career.industry = career.industry || ((CAREER_TRACKS.find(function (track) { return track.id === career.track; }) || {}).label || '职业路线');
    career.level = career.level || career.tier;
    return career;
  }

  /*
   * 职业节点保持扁平，便于事件直接用 id 解锁或跳转。
   * monthlyIncome 是税前的典型月收入，不是承诺收益；随机事件可以在此基础上浮动。
   */
  const CAREERS = [
    makeCareer({
      id: 'sports_education_student', title: '体育方向学生', track: 'student', icon: '🎓', tier: 0,
      monthlyIncome: 0, incomeRange: [0, 1500], monthlyStress: 18, workHours: 24,
      growth: { knowledge: 1, fitness: 1, basketball: 1 },
      eventTags: ['university', 'exam', 'basketball', 'part_time'],
      description: '在远川学院学习体育教育，人生还拥有很大的可塑性。'
    }),

    // 体育教师路线
    makeCareer({
      id: 'sports_teaching_intern', title: '体育实习生', track: 'teacher', icon: '🧑‍🏫', tier: 1,
      monthlyIncome: 2200, incomeRange: [1800, 3500], monthlyStress: 30, workHours: 46,
      requirements: { minAge: 21, stats: { knowledge: 40, social: 35 }, educationAny: ['体育教育', '本科', '大专'] },
      growth: { knowledge: 2, social: 1, reputation: 1 },
      eventTags: ['school', 'teacher_exam', 'students'], promotionIds: ['pe_teacher'],
      description: '在校园中学习带队、备课与和学生相处。'
    }),
    makeCareer({
      id: 'pe_teacher', title: '体育教师', track: 'teacher', icon: '🏫', tier: 2,
      monthlyIncome: 6500, incomeRange: [4800, 9000], monthlyStress: 38, workHours: 48,
      requirements: { minAge: 22, stats: { knowledge: 52, social: 45 }, flagsAll: ['teacher_certificate'], educationAny: ['本科', '体育教育'] },
      growth: { knowledge: 1, social: 2, reputation: 1, fitness: 1 },
      eventTags: ['school', 'teacher_exam', 'parents', 'sports_meet'], promotionIds: ['senior_pe_teacher'],
      description: '有相对稳定的节奏，也需要承担学生成长的责任。'
    }),
    makeCareer({
      id: 'senior_pe_teacher', title: '骨干体育教师', track: 'teacher', icon: '⭐', tier: 3,
      monthlyIncome: 9000, incomeRange: [7000, 12500], monthlyStress: 48, workHours: 52,
      requirements: { minAge: 26, stats: { knowledge: 66, social: 55, reputation: 25 }, experience: 36, anyCareerIds: ['pe_teacher', 'sports_teaching_intern'] },
      growth: { knowledge: 2, social: 1, reputation: 2 },
      eventTags: ['school', 'teaching_research', 'competition'], promotionIds: ['pe_research_lead'],
      description: '开始承担校队、公开课和青年教师培养任务。'
    }),
    makeCareer({
      id: 'pe_research_lead', title: '体育教研组长', track: 'teacher', icon: '📚', tier: 4,
      monthlyIncome: 12000, incomeRange: [9000, 17000], monthlyStress: 58, workHours: 55,
      requirements: { minAge: 30, stats: { knowledge: 75, social: 65, reputation: 45 }, experience: 72, anyCareerIds: ['senior_pe_teacher'] },
      growth: { knowledge: 2, social: 2, reputation: 2 },
      eventTags: ['school_management', 'teaching_research', 'public_welfare'], promotionIds: ['school_administrator'],
      description: '你不仅教课，也开始影响一所学校的体育教育理念。'
    }),
    makeCareer({
      id: 'school_administrator', title: '学校管理人员', track: 'teacher', icon: '🏛️', tier: 5,
      monthlyIncome: 17000, incomeRange: [12000, 26000], monthlyStress: 70, workHours: 60,
      requirements: { minAge: 35, stats: { knowledge: 78, social: 75, reputation: 65, discipline: 65 }, experience: 120, anyCareerIds: ['pe_research_lead'] },
      growth: { social: 2, reputation: 3, knowledge: 1 },
      eventTags: ['school_management', 'public_welfare', 'policy'],
      description: '在行政、教育理想与个人生活之间不断寻找平衡。'
    }),

    // 篮球教练与球员路线
    makeCareer({
      id: 'basketball_assistant', title: '篮球助教', track: 'basketball', icon: '🏀', tier: 1,
      monthlyIncome: 3000, incomeRange: [2000, 5000], monthlyStress: 34, workHours: 46,
      requirements: { minAge: 21, stats: { basketball: 48, fitness: 45, social: 38 } },
      growth: { basketball: 2, fitness: 1, social: 1, reputation: 1 },
      eventTags: ['basketball_training', 'youth_sports', 'competition'], promotionIds: ['youth_basketball_coach'],
      description: '从摆器材、记录训练和陪孩子练基本功开始积累口碑。'
    }),
    makeCareer({
      id: 'youth_basketball_coach', title: '青少年篮球教练', track: 'basketball', icon: '⛹️', tier: 2,
      monthlyIncome: 8500, incomeRange: [5500, 15000], monthlyStress: 45, workHours: 52,
      requirements: { minAge: 22, stats: { basketball: 62, fitness: 55, social: 50 }, flagsAny: ['coach_certificate', 'basketball_coach_license'], anyCareerIds: ['basketball_assistant', 'sports_teaching_intern', 'pe_teacher'] },
      growth: { basketball: 2, social: 2, reputation: 2 },
      eventTags: ['basketball_training', 'parents', 'camp'], promotionIds: ['club_basketball_coach', 'basketball_camp_founder'],
      description: '训练效果、家长沟通和续费率一样重要。'
    }),
    makeCareer({
      id: 'club_basketball_coach', title: '篮球俱乐部教练', track: 'basketball', icon: '🏟️', tier: 3,
      monthlyIncome: 15000, incomeRange: [9000, 26000], monthlyStress: 58, workHours: 58,
      requirements: { minAge: 25, stats: { basketball: 72, fitness: 62, social: 58, reputation: 25 }, experience: 30, anyCareerIds: ['youth_basketball_coach'] },
      growth: { basketball: 2, social: 1, reputation: 3 },
      eventTags: ['club', 'competition', 'recruitment'], promotionIds: ['pro_assistant_coach', 'basketball_camp_founder'],
      description: '开始在竞技成绩、招生和教练团队管理中承担更大责任。'
    }),
    makeCareer({
      id: 'pro_assistant_coach', title: '职业队助理教练', track: 'basketball', icon: '📋', tier: 4,
      monthlyIncome: 28000, incomeRange: [18000, 45000], monthlyStress: 72, workHours: 68,
      requirements: { minAge: 29, stats: { basketball: 82, knowledge: 65, social: 65, reputation: 55 }, experience: 72, anyCareerIds: ['club_basketball_coach', 'semi_pro_player'] },
      growth: { basketball: 2, knowledge: 2, reputation: 3 },
      eventTags: ['professional_league', 'tactics', 'competition'], promotionIds: ['head_basketball_coach'],
      description: '录像分析、战术复盘和高强度赛季成为生活的一部分。'
    }),
    makeCareer({
      id: 'head_basketball_coach', title: '职业篮球主教练', track: 'basketball', icon: '🏆', tier: 5,
      monthlyIncome: 55000, incomeRange: [35000, 120000], monthlyStress: 82, workHours: 72,
      requirements: { minAge: 34, stats: { basketball: 88, knowledge: 75, social: 75, reputation: 75, discipline: 70 }, experience: 120, anyCareerIds: ['pro_assistant_coach'] },
      growth: { reputation: 4, knowledge: 2, social: 1 },
      eventTags: ['professional_league', 'media', 'championship'],
      description: '胜负会被放大，但你终于有机会把自己的篮球理念带上最高舞台。'
    }),
    makeCareer({
      id: 'semi_pro_player', title: '半职业篮球运动员', track: 'basketball', icon: '🔥', tier: 2,
      monthlyIncome: 7500, incomeRange: [3000, 16000], monthlyStress: 58, workHours: 54,
      requirements: { minAge: 21, maxAge: 29, stats: { basketball: 76, fitness: 75, health: 62 }, flagsAny: ['school_team', 'competition_medal'] },
      growth: { basketball: 2, fitness: 2, reputation: 2 },
      eventTags: ['tryout', 'competition', 'injury'], promotionIds: ['pro_player', 'basketball_assistant'],
      description: '收入与机会都不稳定，伤病和竞争是每天必须面对的现实。'
    }),
    makeCareer({
      id: 'pro_player', title: '职业篮球运动员', track: 'basketball', icon: '🌟', tier: 4,
      monthlyIncome: 60000, incomeRange: [25000, 250000], monthlyStress: 76, workHours: 68,
      requirements: { minAge: 21, maxAge: 33, stats: { basketball: 90, fitness: 88, health: 72, reputation: 40 }, flagsAll: ['pro_tryout_passed'], anyCareerIds: ['semi_pro_player'] },
      growth: { basketball: 2, fitness: 1, reputation: 5 },
      eventTags: ['professional_league', 'injury', 'endorsement'], promotionIds: ['pro_assistant_coach'],
      description: '少数人抵达的赛场，但高强度竞技生涯从不保证漫长。'
    }),

    // 酒店管理路线
    makeCareer({
      id: 'hotel_intern', title: '酒店实习生', track: 'hotel', icon: '🛎️', tier: 1,
      monthlyIncome: 2500, incomeRange: [1800, 3500], monthlyStress: 32, workHours: 48,
      requirements: { minAge: 20, stats: { social: 38, discipline: 35 } },
      growth: { social: 2, discipline: 1, english: 1 },
      eventTags: ['hotel', 'service', 'shift'], promotionIds: ['hotel_attendant'],
      description: '从客房、前台或餐饮轮岗中理解服务行业的细节。'
    }),
    makeCareer({
      id: 'hotel_attendant', title: '酒店服务员', track: 'hotel', icon: '🛎️', tier: 1,
      monthlyIncome: 4200, incomeRange: [3200, 6000], monthlyStress: 42, workHours: 52,
      requirements: { minAge: 20, stats: { social: 42, discipline: 42 }, anyCareerIds: ['hotel_intern', 'restaurant_server', 'sports_education_student'] },
      growth: { social: 2, discipline: 1, english: 1 },
      eventTags: ['hotel', 'service', 'guest'], promotionIds: ['hotel_team_lead'],
      description: '你开始明白，稳定可靠的服务本身就是一种专业。'
    }),
    makeCareer({
      id: 'hotel_team_lead', title: '酒店领班', track: 'hotel', icon: '🔑', tier: 2,
      monthlyIncome: 6500, incomeRange: [5000, 9000], monthlyStress: 48, workHours: 54,
      requirements: { minAge: 23, stats: { social: 52, discipline: 55 }, experience: 18, anyCareerIds: ['hotel_attendant', 'hotel_intern'] },
      growth: { social: 2, discipline: 2, reputation: 1 },
      eventTags: ['hotel', 'team_management', 'guest'], promotionIds: ['hotel_supervisor'],
      description: '开始负责一班人的排班、培训与客诉处理。'
    }),
    makeCareer({
      id: 'hotel_supervisor', title: '酒店主管', track: 'hotel', icon: '📌', tier: 3,
      monthlyIncome: 9500, incomeRange: [7000, 15000], monthlyStress: 58, workHours: 58,
      requirements: { minAge: 26, stats: { social: 62, discipline: 62, english: 42 }, experience: 42, anyCareerIds: ['hotel_team_lead'] },
      growth: { social: 2, discipline: 1, english: 1, reputation: 2 },
      eventTags: ['hotel', 'team_management', 'guest'], promotionIds: ['hotel_manager', 'overseas_hotel_staff'],
      description: '你的判断会直接影响客人体验和团队氛围。'
    }),
    makeCareer({
      id: 'hotel_manager', title: '酒店经理', track: 'hotel', icon: '🏨', tier: 4,
      monthlyIncome: 18500, incomeRange: [12000, 35000], monthlyStress: 68, workHours: 62,
      requirements: { minAge: 30, stats: { social: 72, discipline: 70, english: 58, knowledge: 55 }, experience: 78, anyCareerIds: ['hotel_supervisor', 'overseas_hotel_supervisor'] },
      growth: { social: 2, knowledge: 2, reputation: 3 },
      eventTags: ['hotel_management', 'international_guest', 'business'], promotionIds: ['hotel_general_manager', 'international_hotel_manager'],
      description: '你管理的不再只是一项服务，而是一整套体验与经营结果。'
    }),
    makeCareer({
      id: 'hotel_general_manager', title: '酒店总经理', track: 'hotel', icon: '🏙️', tier: 5,
      monthlyIncome: 45000, incomeRange: [28000, 100000], monthlyStress: 80, workHours: 70,
      requirements: { minAge: 36, stats: { social: 82, discipline: 76, english: 65, knowledge: 70, reputation: 70 }, experience: 132, anyCareerIds: ['hotel_manager'] },
      growth: { social: 2, knowledge: 2, reputation: 4 },
      eventTags: ['hotel_management', 'investment', 'media'],
      description: '经营指标、人事决策和城市名片般的声誉，都落在你的肩上。'
    }),

    // 自媒体路线
    makeCareer({
      id: 'content_creator', title: '短视频创作者', track: 'media', icon: '📱', tier: 1,
      monthlyIncome: 1200, incomeRange: [0, 6000], monthlyStress: 36, workHours: 35,
      requirements: { minAge: 20, stats: { courage: 38, discipline: 35 } },
      growth: { reputation: 1, social: 1, discipline: 1 },
      eventTags: ['content', 'platform', 'brand'], promotionIds: ['growing_creator'],
      description: '镜头前的表达、选题和持续更新，是一场长期训练。'
    }),
    makeCareer({
      id: 'growing_creator', title: '中小型博主', track: 'media', icon: '🎬', tier: 2,
      monthlyIncome: 8500, incomeRange: [3000, 30000], monthlyStress: 52, workHours: 52,
      requirements: { minAge: 21, stats: { discipline: 55, social: 50, reputation: 22 }, resources: { fans: 10000 }, flagsAny: ['video_published', 'creator_account'] },
      growth: { reputation: 2, social: 2, discipline: 1 },
      eventTags: ['content', 'brand', 'platform'], promotionIds: ['major_creator', 'content_studio_founder'],
      description: '流量变得可见，但稳定产出与商业边界开始考验你。'
    }),
    makeCareer({
      id: 'major_creator', title: '百万粉丝博主', track: 'media', icon: '✨', tier: 4,
      monthlyIncome: 65000, incomeRange: [20000, 300000], monthlyStress: 74, workHours: 62,
      requirements: { minAge: 23, stats: { discipline: 68, social: 65, reputation: 62 }, resources: { fans: 1000000 }, anyCareerIds: ['growing_creator'] },
      growth: { reputation: 4, social: 2, courage: 1 },
      eventTags: ['content', 'brand', 'mcn', 'public_opinion'], promotionIds: ['content_studio_founder'],
      description: '影响力能放大你的表达，也会放大每一次失误。'
    }),
    makeCareer({
      id: 'content_studio_founder', title: '内容公司创始人', track: 'media', icon: '🎥', tier: 5,
      monthlyIncome: 90000, incomeRange: [10000, 500000], monthlyStress: 82, workHours: 70,
      requirements: { minAge: 25, stats: { discipline: 72, social: 72, reputation: 72, knowledge: 62 }, resources: { fans: 300000 }, anyCareerIds: ['growing_creator', 'major_creator'] },
      growth: { reputation: 4, social: 2, knowledge: 2 },
      eventTags: ['content_company', 'investment', 'team_management'],
      description: '从一个账号走向一支团队，创作热爱要接受经营的检验。'
    }),

    // 普通工作路线
    makeCareer({
      id: 'restaurant_server', title: '餐厅员工', track: 'service', icon: '🍜', tier: 1,
      monthlyIncome: 3800, incomeRange: [2800, 5500], monthlyStress: 38, workHours: 54,
      requirements: { minAge: 18, stats: { health: 40, social: 30 } },
      growth: { social: 1, discipline: 1 }, eventTags: ['service', 'part_time'], promotionIds: ['restaurant_shift_lead'],
      description: '节奏很快，却能把人与人之间的真实需求看得很清楚。'
    }),
    makeCareer({
      id: 'restaurant_shift_lead', title: '餐厅领班', track: 'service', icon: '🍽️', tier: 2,
      monthlyIncome: 5800, incomeRange: [4500, 8500], monthlyStress: 48, workHours: 56,
      requirements: { minAge: 21, stats: { social: 48, discipline: 52 }, experience: 12, anyCareerIds: ['restaurant_server'] },
      growth: { social: 2, discipline: 1, reputation: 1 }, eventTags: ['service', 'team_management'], promotionIds: ['operations_manager'],
      description: '你开始处理排班、损耗、客诉和团队合作。'
    }),
    makeCareer({
      id: 'bank_intern', title: '银行实习生', track: 'service', icon: '🏦', tier: 1,
      monthlyIncome: 2800, incomeRange: [1800, 4200], monthlyStress: 42, workHours: 46,
      requirements: { minAge: 20, stats: { knowledge: 48, discipline: 50 } },
      growth: { knowledge: 2, discipline: 1, social: 1 }, eventTags: ['finance', 'office'], promotionIds: ['office_worker'],
      description: '在流程、数字和客户之间建立职业基本功。'
    }),
    makeCareer({
      id: 'office_worker', title: '职场白领', track: 'service', icon: '💻', tier: 2,
      monthlyIncome: 7200, incomeRange: [5000, 12000], monthlyStress: 52, workHours: 50,
      requirements: { minAge: 22, stats: { knowledge: 55, discipline: 55, social: 42 }, educationAny: ['本科', '大专'], anyCareerIds: ['bank_intern', 'sports_education_student', 'restaurant_shift_lead'] },
      growth: { knowledge: 1, social: 1, discipline: 1 }, eventTags: ['office', 'promotion', 'business'], promotionIds: ['operations_manager'],
      description: '一份稳定工作能提供安全感，也会提醒你持续选择想要的人生。'
    }),
    makeCareer({
      id: 'sales_representative', title: '销售顾问', track: 'service', icon: '🤝', tier: 2,
      monthlyIncome: 9000, incomeRange: [3500, 30000], monthlyStress: 62, workHours: 55,
      requirements: { minAge: 20, stats: { social: 55, courage: 48, discipline: 45 } },
      growth: { social: 3, courage: 1, reputation: 1 }, eventTags: ['sales', 'business', 'commission'], promotionIds: ['sales_manager', 'startup_founder'],
      description: '业绩浮动很大，但成交、谈判和客户关系会成为你的硬能力。'
    }),
    makeCareer({
      id: 'sales_manager', title: '销售经理', track: 'service', icon: '📈', tier: 4,
      monthlyIncome: 24000, incomeRange: [12000, 80000], monthlyStress: 72, workHours: 62,
      requirements: { minAge: 27, stats: { social: 72, courage: 62, discipline: 60, reputation: 38 }, experience: 48, anyCareerIds: ['sales_representative'] },
      growth: { social: 2, courage: 1, reputation: 3 }, eventTags: ['sales', 'team_management', 'business'], promotionIds: ['startup_founder'],
      description: '你开始为团队目标负责，收入与压力一起被放大。'
    }),
    makeCareer({
      id: 'fitness_trainer', title: '健身教练', track: 'service', icon: '🏋️', tier: 2,
      monthlyIncome: 7500, incomeRange: [4000, 20000], monthlyStress: 45, workHours: 50,
      requirements: { minAge: 20, stats: { fitness: 64, social: 48, discipline: 52 } },
      growth: { fitness: 2, social: 2, reputation: 1 }, eventTags: ['fitness', 'clients', 'health'], promotionIds: ['gym_owner'],
      description: '帮别人改变身体，也要学会经营自己的客户与口碑。'
    }),
    makeCareer({
      id: 'delivery_rider', title: '外卖骑手', track: 'service', icon: '🛵', tier: 1,
      monthlyIncome: 6000, incomeRange: [3500, 10000], monthlyStress: 55, workHours: 62,
      requirements: { minAge: 18, stats: { health: 52, fitness: 48 } },
      growth: { fitness: 1, discipline: 1 }, eventTags: ['gig_work', 'accident'], promotionIds: ['ride_hailing_driver', 'sales_representative'],
      description: '自由与辛苦并存，天气和订单会直接影响一天的收入。'
    }),
    makeCareer({
      id: 'ride_hailing_driver', title: '网约车司机', track: 'service', icon: '🚗', tier: 1,
      monthlyIncome: 6800, incomeRange: [4000, 12000], monthlyStress: 56, workHours: 60,
      requirements: { minAge: 21, stats: { health: 50, discipline: 45 }, flagsAny: ['drivers_license', 'car_owned'] },
      growth: { social: 1, discipline: 1 }, eventTags: ['gig_work', 'travel', 'accident'], promotionIds: ['sales_representative'],
      description: '一辆车带来流动的收入，也带来长期的疲劳与风险。'
    }),
    makeCareer({
      id: 'operations_manager', title: '运营经理', track: 'service', icon: '🧭', tier: 4,
      monthlyIncome: 19000, incomeRange: [12000, 35000], monthlyStress: 68, workHours: 60,
      requirements: { minAge: 28, stats: { knowledge: 68, social: 65, discipline: 68, reputation: 35 }, experience: 60, anyCareerIds: ['office_worker', 'restaurant_shift_lead'] },
      growth: { knowledge: 2, social: 2, reputation: 2 }, eventTags: ['office', 'team_management', 'business'], promotionIds: ['startup_founder'],
      description: '你开始把零散的人与流程串成一个能运转的系统。'
    }),

    // 创业路线
    makeCareer({
      id: 'basketball_camp_founder', title: '篮球训练营创始人', track: 'business', icon: '🏀', tier: 3,
      monthlyIncome: 18000, incomeRange: [-8000, 80000], monthlyStress: 70, workHours: 65,
      requirements: { minAge: 23, stats: { basketball: 68, social: 60, courage: 62, discipline: 60 }, resources: { savings: 30000 }, anyCareerIds: ['youth_basketball_coach', 'club_basketball_coach', 'basketball_assistant'] },
      growth: { basketball: 1, social: 2, courage: 2, reputation: 3 }, eventTags: ['startup', 'basketball_training', 'parents'], promotionIds: ['sports_brand_founder'],
      description: '创业带来更高上限，也意味着场地、招生和现金流都由你负责。'
    }),
    makeCareer({
      id: 'gym_owner', title: '健身工作室主理人', track: 'business', icon: '🏋️', tier: 3,
      monthlyIncome: 15000, incomeRange: [-15000, 70000], monthlyStress: 70, workHours: 64,
      requirements: { minAge: 23, stats: { fitness: 70, social: 58, courage: 62, discipline: 60 }, resources: { savings: 50000 }, anyCareerIds: ['fitness_trainer'] },
      growth: { social: 2, courage: 2, reputation: 2 }, eventTags: ['startup', 'fitness', 'rent'], promotionIds: ['sports_brand_founder'],
      description: '你把训练理念变成一家店，也把每个月的房租变成压力。'
    }),
    makeCareer({
      id: 'sports_store_owner', title: '体育用品店主', track: 'business', icon: '👟', tier: 2,
      monthlyIncome: 12000, incomeRange: [-10000, 55000], monthlyStress: 64, workHours: 60,
      requirements: { minAge: 22, stats: { social: 52, courage: 58, knowledge: 48 }, resources: { savings: 40000 } },
      growth: { social: 2, knowledge: 2, courage: 1 }, eventTags: ['startup', 'retail', 'inventory'], promotionIds: ['sports_brand_founder'],
      description: '选品、库存和熟客复购决定了这门生意能走多远。'
    }),
    makeCareer({
      id: 'travel_media_founder', title: '旅行内容创业者', track: 'business', icon: '🗺️', tier: 3,
      monthlyIncome: 20000, incomeRange: [-5000, 100000], monthlyStress: 68, workHours: 62,
      requirements: { minAge: 23, stats: { english: 58, social: 60, courage: 65, discipline: 62 }, resources: { countries: 3, fans: 30000 }, anyCareerIds: ['content_creator', 'growing_creator'] },
      growth: { english: 1, reputation: 3, social: 2 }, eventTags: ['startup', 'travel', 'content'], promotionIds: ['content_studio_founder'],
      description: '把远方变成内容与收入，需要持续出发，也需要懂得回本。'
    }),
    makeCareer({
      id: 'hospitality_service_founder', title: '酒店服务公司创始人', track: 'business', icon: '🏢', tier: 4,
      monthlyIncome: 35000, incomeRange: [-30000, 180000], monthlyStress: 80, workHours: 72,
      requirements: { minAge: 28, stats: { social: 72, knowledge: 65, courage: 70, discipline: 70 }, resources: { savings: 150000 }, experience: 60, anyCareerIds: ['hotel_manager', 'hotel_supervisor'] },
      growth: { social: 2, knowledge: 2, courage: 2, reputation: 3 }, eventTags: ['startup', 'hotel', 'team_management'],
      description: '你不再只是服务一家酒店，而是把服务能力卖给许多客户。'
    }),
    makeCareer({
      id: 'startup_founder', title: '连续创业者', track: 'business', icon: '🚀', tier: 5,
      monthlyIncome: 60000, incomeRange: [-100000, 500000], monthlyStress: 86, workHours: 75,
      requirements: { minAge: 26, stats: { social: 75, knowledge: 68, courage: 78, discipline: 72, reputation: 45 }, resources: { savings: 100000 }, flagsAny: ['first_business_started', 'business_exit'] },
      growth: { social: 2, knowledge: 2, courage: 2, reputation: 4 }, eventTags: ['startup', 'investment', 'business_crisis'],
      description: '你愿意一次次下注，也要承担一次次归零的可能。'
    }),
    makeCareer({
      id: 'sports_brand_founder', title: '体育品牌创始人', track: 'business', icon: '👑', tier: 5,
      monthlyIncome: 80000, incomeRange: [-50000, 600000], monthlyStress: 84, workHours: 72,
      requirements: { minAge: 28, stats: { basketball: 72, social: 74, courage: 75, discipline: 72, reputation: 65 }, resources: { savings: 200000 }, anyCareerIds: ['basketball_camp_founder', 'gym_owner', 'sports_store_owner'] },
      growth: { reputation: 4, social: 2, knowledge: 2 }, eventTags: ['startup', 'sports_brand', 'investment'],
      description: '热爱篮球的人很多，把热爱做成长期品牌的人很少。'
    }),

    // 海外发展路线
    makeCareer({
      id: 'overseas_hotel_staff', title: '海外酒店员工', track: 'overseas', icon: '🌍', tier: 2,
      monthlyIncome: 11000, incomeRange: [7000, 18000], monthlyStress: 55, workHours: 48,
      requirements: { minAge: 21, stats: { english: 62, social: 48, courage: 58 }, flagsAny: ['overseas_work_visa', 'work_travel_experience'], anyCareerIds: ['hotel_intern', 'hotel_attendant', 'hotel_supervisor'] },
      growth: { english: 3, social: 1, courage: 1, reputation: 1 }, eventTags: ['overseas', 'hotel', 'culture_shock'], promotionIds: ['overseas_hotel_supervisor'],
      description: '语言和文化差异会让每一天更难，也会让世界更大。'
    }),
    makeCareer({
      id: 'overseas_hotel_supervisor', title: '海外酒店主管', track: 'overseas', icon: '🗝️', tier: 3,
      monthlyIncome: 21000, incomeRange: [14000, 35000], monthlyStress: 63, workHours: 55,
      requirements: { minAge: 24, stats: { english: 72, social: 62, discipline: 62 }, experience: 24, anyCareerIds: ['overseas_hotel_staff', 'hotel_supervisor'] },
      growth: { english: 2, social: 2, reputation: 2 }, eventTags: ['overseas', 'hotel_management', 'immigration'], promotionIds: ['international_hotel_manager'],
      description: '你开始在多元团队中带人，也面对留下还是回国的选择。'
    }),
    makeCareer({
      id: 'international_hotel_manager', title: '国际酒店管理者', track: 'overseas', icon: '🌐', tier: 5,
      monthlyIncome: 60000, incomeRange: [35000, 150000], monthlyStress: 78, workHours: 65,
      requirements: { minAge: 31, stats: { english: 85, social: 78, knowledge: 70, discipline: 70, reputation: 65 }, experience: 90, anyCareerIds: ['overseas_hotel_supervisor', 'hotel_manager'] },
      growth: { english: 2, social: 2, reputation: 4 }, eventTags: ['overseas', 'hotel_management', 'international_business'],
      description: '你能在不同城市、不同文化中搭建专业的服务团队。'
    }),
    makeCareer({
      id: 'overseas_freelancer', title: '海外自由职业者', track: 'overseas', icon: '🧳', tier: 3,
      monthlyIncome: 18000, incomeRange: [3000, 80000], monthlyStress: 60, workHours: 45,
      requirements: { minAge: 22, stats: { english: 70, courage: 68, discipline: 64 }, flagsAny: ['overseas_work_visa', 'long_term_abroad'], resources: { savings: 30000 } },
      growth: { english: 2, courage: 2, social: 1 }, eventTags: ['overseas', 'freelance', 'travel'], promotionIds: ['travel_media_founder'],
      description: '地点更自由，但收入、签证和孤独感都要自己管理。'
    })
  ];

  const CAREER_BY_ID = Object.create(null);
  CAREERS.forEach(function (career) {
    CAREER_BY_ID[career.id] = career;
  });

  const TRACK_BY_ID = Object.create(null);
  CAREER_TRACKS.forEach(function (track) {
    TRACK_BY_ID[track.id] = track;
  });

  function isEducationMatch(state, requiredEducation) {
    const current = getEducation(state).toLowerCase();
    if (!requiredEducation || !requiredEducation.length) return true;
    return requiredEducation.some(function (required) {
      return current.indexOf(String(required).toLowerCase()) !== -1;
    });
  }

  /**
   * 逐项检查职业门槛；返回完整原因以方便 UI 呈现灰色按钮和提示。
   */
  function normalizeCareerArguments(first, second) {
    const firstLooksLikeCareer = typeof first === 'string' || Boolean(first && typeof first === 'object' && (first.id || first.title || first.name) && (first.track || first.requirements || first.monthlyIncome !== undefined));
    const secondLooksLikeCareer = typeof second === 'string' || Boolean(second && typeof second === 'object' && (second.id || second.title || second.name) && (second.track || second.requirements || second.monthlyIncome !== undefined));
    if (firstLooksLikeCareer || !secondLooksLikeCareer) return { career: typeof first === 'string' ? CAREER_BY_ID[first] : first, state: second };
    return { career: typeof second === 'string' ? CAREER_BY_ID[second] : second, state: first };
  }

  function evaluateCareerRequirements(careerOrState, stateOrCareer) {
    const args = normalizeCareerArguments(careerOrState, stateOrCareer);
    const career = args.career;
    const state = args.state;
    if (!career) return { eligible: false, reasons: ['未找到该职业。'], missing: ['career_not_found'] };

    const requirements = career.requirements || {};
    const reasons = [];
    const missing = [];
    const age = getAge(state);

    if (requirements.minAge !== undefined && age < requirements.minAge) {
      reasons.push('需要至少 ' + requirements.minAge + ' 岁');
      missing.push('minAge');
    }
    if (requirements.maxAge !== undefined && age > requirements.maxAge) {
      reasons.push('需要不超过 ' + requirements.maxAge + ' 岁');
      missing.push('maxAge');
    }

    Object.keys(requirements.stats || {}).forEach(function (stat) {
      const needed = requirements.stats[stat];
      if (getStat(state, stat) < needed) {
        reasons.push(((STAT_ALIASES[stat] && STAT_ALIASES[stat][1]) || stat) + '需达到 ' + needed);
        missing.push('stats.' + stat);
      }
    });

    Object.keys(requirements.resources || {}).forEach(function (resource) {
      const needed = requirements.resources[resource];
      if (getResource(state, resource) < needed) {
        const label = resource === 'savings' ? '存款' : ((RESOURCE_ALIASES[resource] && RESOURCE_ALIASES[resource][1]) || resource);
        reasons.push(label + '需达到 ¥' + Math.round(needed).toLocaleString('zh-CN'));
        missing.push('resources.' + resource);
      }
    });

    const experience = getResource(state, 'workExperience');
    if (requirements.experience !== undefined && experience < requirements.experience) {
      reasons.push('需要 ' + requirements.experience + ' 个月工作经验');
      missing.push('experience');
    }

    if (requirements.educationAny && !isEducationMatch(state, requirements.educationAny)) {
      reasons.push('需要相关学历或专业背景');
      missing.push('education');
    }

    asArray(requirements.flagsAll).forEach(function (flag) {
      if (!hasFlag(state, flag)) {
        reasons.push('需要解锁条件：' + flag);
        missing.push('flag.' + flag);
      }
    });

    const anyFlags = asArray(requirements.flagsAny);
    if (anyFlags.length && !anyFlags.some(function (flag) { return hasFlag(state, flag); })) {
      reasons.push('需要满足一项资格或经历');
      missing.push('flagsAny');
    }

    asArray(requirements.achievementsAll).forEach(function (achievement) {
      if (!hasAchievement(state, achievement)) {
        reasons.push('需要成就：' + achievement);
        missing.push('achievement.' + achievement);
      }
    });

    const anyCareerIds = asArray(requirements.anyCareerIds);
    if (anyCareerIds.length && !anyCareerIds.some(function (id) { return hasCareerHistory(state, id); })) {
      reasons.push('需要相关职业经历');
      missing.push('careerHistory');
    }

    const allCareerIds = asArray(requirements.allCareerIds);
    allCareerIds.forEach(function (id) {
      if (!hasCareerHistory(state, id)) {
        reasons.push('需要职业经历：' + (CAREER_BY_ID[id] ? CAREER_BY_ID[id].title : id));
        missing.push('career.' + id);
      }
    });

    if (requirements.trackExperience) {
      Object.keys(requirements.trackExperience).forEach(function (track) {
        const needed = requirements.trackExperience[track];
        if (getTrackHistoryCount(state, track) < needed) {
          reasons.push('需要更多' + ((TRACK_BY_ID[track] && TRACK_BY_ID[track].label) || track) + '经历');
          missing.push('trackExperience.' + track);
        }
      });
    }

    return { eligible: reasons.length === 0, reasons: reasons, missing: missing, career: career };
  }

  function canEnterCareer(careerOrId, state) {
    return evaluateCareerRequirements(careerOrId, state).eligible;
  }

  function getCareer(careerOrId) {
    if (!careerOrId) return null;
    if (typeof careerOrId === 'object') return careerOrId;
    return CAREER_BY_ID[careerOrId] || null;
  }

  function getCareerTrack(trackId) {
    return TRACK_BY_ID[trackId] || null;
  }

  function getCareerIncome(careerOrId, state) {
    const career = getCareer(careerOrId || getCareerId(state));
    if (!career) return 0;
    const modifier = state && state.incomeMultiplier !== undefined ? finiteNumber(state.incomeMultiplier, 1) : 1;
    return Math.round(career.monthlyIncome * Math.max(0, modifier));
  }

  function getAvailableCareers(state, options) {
    const settings = Object.assign({ includeCurrent: false, track: null, tierAtMost: Infinity }, options || {});
    const current = getCareerId(state);
    return CAREERS.filter(function (career) {
      return (settings.includeCurrent || career.id !== current) &&
        (!settings.track || career.track === settings.track) &&
        career.tier <= settings.tierAtMost &&
        canEnterCareer(career, state);
    });
  }

  function getEligiblePromotions(state, careerOrId) {
    const currentCareer = getCareer(careerOrId || getCareerId(state));
    if (!currentCareer) return [];
    return (currentCareer.promotionIds || []).map(getCareer).filter(function (career) {
      return career && canEnterCareer(career, state);
    });
  }

  function getPromotionTarget(state, careerOrId) {
    return getEligiblePromotions(state, careerOrId)[0] || null;
  }

  /** 为主循环提供不直接修改状态的职业切换结果。 */
  function buildCareerChange(careerOrId, state) {
    const career = getCareer(careerOrId);
    const check = evaluateCareerRequirements(career, state);
    if (!check.eligible) return Object.assign({ changed: false }, check);
    return {
      changed: true,
      eligible: true,
      career: clone(career),
      careerId: career.id,
      title: career.title,
      monthlyIncome: getCareerIncome(career, state),
      monthlyStress: career.monthlyStress,
      growth: clone(career.growth),
      eventTags: career.eventTags.slice()
    };
  }

  function getCareerRequirementText(careerOrId, state) {
    const result = evaluateCareerRequirements(careerOrId, state);
    return result.eligible ? '条件已满足' : result.reasons.join('；');
  }

  // 普通脚本环境下的公共 API。
  global.CAREER_TRACKS = CAREER_TRACKS;
  global.CAREERS = CAREERS;
  global.CAREER_BY_ID = CAREER_BY_ID;
  global.getCareer = getCareer;
  global.getCareerTrack = getCareerTrack;
  global.getCareerId = getCareerId;
  global.getStat = getStat;
  global.getResource = getResource;
  global.evaluateCareerRequirements = evaluateCareerRequirements;
  global.canEnterCareer = canEnterCareer;
  global.getAvailableCareers = getAvailableCareers;
  global.getEligiblePromotions = getEligiblePromotions;
  global.getPromotionTarget = getPromotionTarget;
  global.getCareerIncome = getCareerIncome;
  global.buildCareerChange = buildCareerChange;
  global.getCareerRequirementText = getCareerRequirementText;
})(window);
