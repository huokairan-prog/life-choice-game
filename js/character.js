/*
 * 角色创建与成长规则。
 * 这一层不依赖具体事件文案：它把创建时的选择转换成可保存的角色资料、事件倾向、
 * 成功概率、月度维护成本与结局镜头。UI 和 game.js 都只通过 LIFE_CHARACTER 调用它。
 */
(function () {
  'use strict';

  const STEPS = [
    { id: 'identity', label: '基础身份', caption: '第一幕 / 让故事从一个名字开始' },
    { id: 'body', label: '身体外貌', caption: '第二幕 / 身体会记住你的选择' },
    { id: 'personality', label: '性格倾向', caption: '第三幕 / 没有哪一种性格更正确' },
    { id: 'family', label: '初始家庭', caption: '第四幕 / 每个人都有不同的起点' },
    { id: 'talents', label: '天赋能力', caption: '第五幕 / 把有限的底牌押在想去的方向' },
    { id: 'interests', label: '兴趣爱好', caption: '第六幕 / 你会把时间交给什么' },
    { id: 'goals', label: '人生目标', caption: '第七幕 / 先承认你想要的答案' },
    { id: 'difficulty', label: '难度与随机性', caption: '第八幕 / 命运从不完全公平' },
    { id: 'confirm', label: '最终确认', caption: '第九幕 / 这一次，故事由你落笔' }
  ];

  const BODY_KEYS = [
    ['strength', '力量'], ['speed', '速度'], ['endurance', '耐力'], ['agility', '灵活'], ['jump', '弹跳'],
    ['coordination', '协调'], ['reaction', '反应'], ['recovery', '恢复能力'], ['resilience', '抗伤能力']
  ];
  const TALENT_KEYS = [
    ['learning', '学习能力'], ['language', '语言能力'], ['communication', '沟通能力'], ['leadership', '领导力'],
    ['creativity', '创造力'], ['logic', '逻辑能力'], ['emotional', '情商'], ['business', '商业意识'],
    ['finance', '金钱管理'], ['sport', '运动天赋'], ['art', '艺术天赋'], ['technology', '技术能力'],
    ['execution', '执行力'], ['resilience', '抗压能力']
  ];
  const PERSONALITY_KEYS = [
    ['introversion', '内向', '外向'], ['rationality', '理性', '感性'], ['risk', '谨慎', '冒险'], ['assertiveness', '随和', '强势'],
    ['idealism', '现实', '理想主义'], ['spending', '节俭', '享受生活'], ['change', '稳定', '追求变化'], ['attachment', '独立', '依赖关系'],
    ['attention', '低调', '渴望关注'], ['forgiveness', '宽容', '记仇'], ['patience', '耐心', '急躁'], ['discipline', '自律', '随性']
  ];
  const BODY_BUDGET = 300;
  const TALENT_BUDGET = 300;
  // 开局现金不再由角色创建页的数字输入决定。付费档位由成长服务确认后，
  // 通过 game.js 的受控入口覆盖这个免费基础值。
  const FREE_INITIAL_CASH = 8000;

  const OPTIONS = {
    gender: [['male', '男性'], ['female', '女性'], ['custom', '自定义角色']],
    skinTone: [['natural', '自然肤色'], ['warm', '暖小麦色'], ['fair', '偏白'], ['deep', '深色肤色']],
    faceShape: [['oval', '清爽椭圆脸'], ['square', '利落方脸'], ['round', '亲和圆脸'], ['sharp', '立体长脸']],
    hairstyle: [['short', '利落短发'], ['textured', '蓬松碎发'], ['long', '中长发'], ['curly', '自然卷发']],
    hairColor: [['black', '自然黑'], ['brown', '深棕'], ['chestnut', '栗棕'], ['silver', '灰银']],
    eyebrow: [['natural', '自然眉'], ['sharp', '利落眉'], ['soft', '柔和眉']],
    eyes: [['bright', '明亮有神'], ['calm', '安静沉稳'], ['deep', '深邃'], ['smile', '笑眼']],
    nose: [['natural', '自然鼻型'], ['straight', '直挺'], ['soft', '柔和']],
    mouth: [['natural', '自然唇形'], ['smile', '微笑唇'], ['defined', '轮廓分明']],
    beard: [['none', '无胡须'], ['stubble', '短胡茬'], ['beard', '短胡须']],
    mark: [['none', '没有明显痕迹'], ['mole', '一颗小痣'], ['scar', '淡淡的旧伤疤']],
    glasses: [['none', '不戴眼镜'], ['frame', '黑框眼镜'], ['thin', '细框眼镜']],
    style: [['sport', '运动'], ['street', '街头'], ['casual', '普通朴素'], ['literary', '文艺'], ['business', '商务']],
    temperament: [['sunny', '阳光'], ['cool', '冷酷'], ['calm', '沉稳'], ['sport', '运动'], ['literary', '文艺'], ['street', '街头'], ['business', '商务'], ['plain', '普通朴素'], ['bold', '自信张扬'], ['reserved', '安静内敛']],
    familyLocation: [['rural', '农村'], ['town', '小镇'], ['city', '普通城市'], ['capital', '省会城市'], ['tier1', '一线城市'], ['overseas', '海外']],
    wealth: [['extreme', '极限困难'], ['hardship', '比较困难'], ['ordinary', '普通家庭'], ['comfortable', '小康家庭'], ['wealthy', '富裕家庭'], ['veryWealthy', '非常富裕']],
    familyRelation: [['warm', '温暖支持'], ['steady', '普通稳定'], ['strict', '管教严格'], ['conflict', '经常争吵'], ['single', '单亲家庭'], ['grandparents', '隔代抚养'], ['distant', '关系疏远'], ['random', '随机生成']],
    expectation: [['stable', '稳定工作'], ['civil', '考公务员'], ['teacher', '当老师'], ['business', '经商赚钱'], ['overseas', '出国发展'], ['inherit', '继承家庭事业'], ['respect', '尊重玩家选择']],
    educationPlan: [['enrolled', '准备入学 / 在读'], ['defer', '暂不入学 / 稍后决定']],
    familyEducation: [['limited', '教育资源有限'], ['ordinary', '普通教育资源'], ['supportive', '愿意投入教育'], ['abundant', '教育资源丰富']],
    goal: [['sport', '把篮球打成一条路'], ['career', '在职业里站稳脚跟'], ['business', '做出自己的生意'], ['overseas', '去远方生活'], ['relationship', '拥有温暖的家'], ['creator', '让更多人看见我'], ['balanced', '把日子过得丰盛']],
    difficulty: [['story', '电影感', '机会更多，适合体验剧情'], ['realistic', '真实', '风险与机会保持平衡'], ['hard', '现实硬核', '资源紧张，错误代价更高'], ['chaotic', '命运难测', '随机事件起伏更大']],
    randomness: [['low', '偏低', '结果更可控'], ['normal', '普通', '保留人生的不确定'], ['high', '偏高', '意外与惊喜都会更多']]
  };

  const DEFAULT_CONFIG = {
    identity: { name: '霍开然', gender: 'male', age: 22, hometown: '北方北城', educationPlan: 'defer', school: '', major: '', specialty: '篮球 · 控球后卫', idol: '勒布朗·詹姆斯' },
    body: {
      height: 185, weight: 70, muscle: 55, bodyFat: 14,
      physical: { strength: 35, speed: 35, endurance: 34, agility: 35, jump: 38, coordination: 32, reaction: 32, recovery: 28, resilience: 30 }
    },
    appearance: { skinTone: 'warm', faceShape: 'oval', hairstyle: 'textured', hairColor: 'black', eyebrow: 'natural', eyes: 'bright', nose: 'natural', mouth: 'natural', beard: 'none', mark: 'none', glasses: 'none', style: 'sport', temperament: 'sunny' },
    personality: { introversion: 58, rationality: 52, risk: 54, assertiveness: 48, idealism: 60, spending: 48, change: 58, attachment: 36, attention: 44, forgiveness: 62, patience: 57, discipline: 67 },
    family: { location: 'city', wealth: 'ordinary', relation: 'warm', expectation: 'respect', savings: 8000, allowance: 1200, hasHouse: false, hasCar: false, debt: 0, education: 'ordinary' },
    talents: { learning: 20, language: 18, communication: 22, leadership: 18, creativity: 17, logic: 17, emotional: 22, business: 17, finance: 16, sport: 28, art: 12, technology: 14, execution: 24, resilience: 22, luckMode: 'normal', fatePoints: 0 },
    interests: ['篮球', '健身', '旅行', '英语'],
    goals: { primary: 'balanced' },
    difficulty: 'realistic',
    randomness: 'normal'
  };

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function optionLabel(group, value) { const option = (OPTIONS[group] || []).find((item) => item[0] === value); return option ? option[1] : String(value || '未设定'); }
  function getPath(object, path) { return path.split('.').reduce((target, key) => target && target[key], object); }
  function setPath(object, path, value) { const parts = path.split('.'); const key = parts.pop(); const target = parts.reduce((cursor, part) => cursor[part] || (cursor[part] = {}), object); target[key] = value; }

  function rangeForGender(gender) {
    if (gender === 'female') return { min: 140, max: 200 };
    if (gender === 'custom') return { min: 140, max: 220 };
    return { min: 150, max: 210 };
  }
  function getPointCost(value) {
    const point = clamp(Math.round(value), 0, 100);
    if (point <= 60) return point;
    if (point <= 80) return 60 + (point - 60) * 2;
    return 100 + (point - 80) * 3;
  }
  function pointSpent(values, keys) { return keys.reduce((total, pair) => total + getPointCost(values[pair[0]]), 0); }
  function getBodyPointSpent(config) { return pointSpent(config.body.physical, BODY_KEYS); }
  function getBodyPointsRemaining(config) { return BODY_BUDGET - getBodyPointSpent(config); }
  function getAbilityPointSpent(config) { return pointSpent(config.talents, TALENT_KEYS); }
  function getAbilityPointsRemaining(config) { return TALENT_BUDGET - getAbilityPointSpent(config); }
  function fitBudget(values, keys, budget) {
    let spent = pointSpent(values, keys);
    while (spent > budget) {
      const largest = keys.map((item) => item[0]).sort((a, b) => values[b] - values[a])[0];
      if (!largest || values[largest] <= 0) break;
      values[largest] -= 1;
      spent = pointSpent(values, keys);
    }
  }
  function maxValueWithinBudget(values, keys, key, next, budget) {
    const draft = { ...values, [key]: clamp(next, 0, 100) };
    if (pointSpent(draft, keys) <= budget) return draft[key];
    let candidate = draft[key];
    while (candidate > 0) {
      candidate -= 1;
      draft[key] = candidate;
      if (pointSpent(draft, keys) <= budget) return candidate;
    }
    return values[key];
  }
  function setPhysical(config, key, value) {
    const physical = config.body.physical;
    physical[key] = maxValueWithinBudget(physical, BODY_KEYS, key, value, BODY_BUDGET);
  }
  function setTalent(config, key, value) {
    config.talents[key] = maxValueWithinBudget(config.talents, TALENT_KEYS, key, value, TALENT_BUDGET);
  }

  function getBMI(height, weight) { const meters = Number(height) / 100; return meters > 0 ? Math.round((Number(weight) / (meters * meters)) * 10) / 10 : 0; }
  function getHeightDescriptor(height) {
    if (height < 150) return '身材较矮';
    if (height <= 165) return '偏矮';
    if (height <= 175) return '中等';
    if (height <= 185) return '较高';
    if (height <= 195) return '高挑';
    return '非常高';
  }
  function getBodyType(body) {
    const bmi = getBMI(body.height, body.weight);
    const muscle = Number(body.muscle || 0);
    const fat = Number(body.bodyFat || 0);
    if (muscle >= 70 && fat <= 16) return '高挑精瘦的运动型身材';
    if (muscle >= 65 && bmi >= 25) return '高大强壮的力量型身材';
    if (muscle >= 52 && fat <= 19) return '紧凑灵活的运动型身材';
    if (muscle >= 62) return '肩背厚实的健壮体型';
    if (bmi < 18.5) return '偏瘦轻盈的体型';
    if (fat >= 30 || bmi >= 29) return '壮硕饱满的体型';
    if (fat >= 24 || bmi >= 25) return '微胖结实的体型';
    if (muscle <= 20) return '缺乏锻炼的普通体型';
    return '匀称自然的体型';
  }
  function getBodyDescription(config) {
    const body = config.body || config;
    const type = getBodyType(body);
    const heightWord = getHeightDescriptor(body.height);
    const muscleLine = body.muscle >= 61 ? '长期训练让肩背和腿部更有力量。' : body.muscle <= 20 ? '现在的身体仍在等待被好好照顾。' : '身体有着日常活动留下的结实感。';
    return `你身高${body.height}厘米，体重${body.weight}公斤，${heightWord}，体型${type}。${muscleLine}`;
  }
  function getHealthHint(body, gender) {
    const bmi = getBMI(body.height, body.weight);
    const lowFat = gender === 'female' ? 14 : 7;
    const highFat = gender === 'female' ? 38 : 35;
    if (body.bodyFat < lowFat) return `以当前身体情况看，体脂偏低会影响精力、恢复和情绪，别把“更瘦”当成唯一答案。`;
    if (body.bodyFat > highFat) return '体脂偏高会让耐力和关节承受更多压力，循序渐进比苛刻节食更可靠。';
    if (bmi < 18.5) return '偏轻不等于不健康，但规律饮食与力量训练会让身体更有底气。';
    if (bmi > 28 && body.muscle < 60) return '体重带来额外关节压力，优先建立舒适、能坚持的运动习惯。';
    if (body.height >= 196) return '身高会带来场上视野，也要留意关节维护、交通空间和合身衣物。';
    return 'BMI只是一个参考；体能、恢复、饮食和心情同样重要。';
  }
  function getLuckValue(config) {
    const mode = config.talents && config.talents.luckMode;
    const base = mode === 'low' ? 38 : mode === 'high' ? 62 : 50;
    return clamp(base + Number(config.talents && config.talents.fatePoints || 0) * 4, 25, 75);
  }

  function normalizeConfig(raw) {
    const config = copy(DEFAULT_CONFIG);
    const data = raw || {};
    ['identity', 'body', 'appearance', 'personality', 'family', 'talents', 'goals'].forEach((key) => Object.assign(config[key], data[key] || {}));
    config.body.physical = { ...DEFAULT_CONFIG.body.physical, ...((data.body && data.body.physical) || {}) };
    config.interests = Array.isArray(data.interests) ? data.interests.slice(0, 6) : config.interests;
    config.difficulty = data.difficulty || config.difficulty;
    config.randomness = data.randomness || config.randomness;
    config.identity.name = String(config.identity.name || '霍开然').slice(0, 16);
    config.identity.age = clamp(Math.round(config.identity.age), 0, 30);
    if (!['enrolled', 'defer'].includes(config.identity.educationPlan)) config.identity.educationPlan = 'enrolled';
    const heightRange = rangeForGender(config.identity.gender);
    config.body.height = clamp(Math.round(config.body.height), heightRange.min, heightRange.max);
    config.body.weight = clamp(Math.round(config.body.weight), 35, 180);
    config.body.muscle = clamp(Math.round(config.body.muscle), 0, 100);
    config.body.bodyFat = clamp(Math.round(config.body.bodyFat), 5, 45);
    BODY_KEYS.forEach(([key]) => config.body.physical[key] = clamp(Math.round(config.body.physical[key]), 0, 100));
    TALENT_KEYS.forEach(([key]) => config.talents[key] = clamp(Math.round(config.talents[key]), 0, 100));
    PERSONALITY_KEYS.forEach(([key]) => config.personality[key] = clamp(Math.round(config.personality[key]), 0, 100));
    config.talents.fatePoints = clamp(Math.round(config.talents.fatePoints), -2, 2);
    fitBudget(config.body.physical, BODY_KEYS, BODY_BUDGET);
    fitBudget(config.talents, TALENT_KEYS, TALENT_BUDGET);
    return config;
  }

  function validateConfig(config) {
    const normalized = normalizeConfig(config);
    const errors = [];
    if (!normalized.identity.name.trim()) errors.push('请给主角留下一个名字。');
    if (getBodyPointsRemaining(normalized) < 0) errors.push('身体属性点超过了可分配上限。');
    if (getAbilityPointsRemaining(normalized) < 0) errors.push('能力天赋点超过了可分配上限。');
    if (!normalized.interests.length) errors.push('至少保留一个你愿意投入时间的兴趣。');
    return { valid: errors.length === 0, errors, config: normalized };
  }

  function wealthSetup(wealth) {
    return {
      extreme: { cash: 0, allowance: 600, debt: 9000, property: 0, vehicle: 0, pressure: 10, resource: -10 },
      hardship: { cash: 1200, allowance: 800, debt: 2600, property: 0, vehicle: 0, pressure: 5, resource: -4 },
      ordinary: { cash: 8000, allowance: 1200, debt: 0, property: 0, vehicle: 0, pressure: 0, resource: 0 },
      comfortable: { cash: 30000, allowance: 2200, debt: 0, property: 0, vehicle: 0, pressure: 1, resource: 4 },
      wealthy: { cash: 120000, allowance: 4800, debt: 0, property: 420000, vehicle: 85000, pressure: 5, resource: 8 },
      veryWealthy: { cash: 420000, allowance: 8000, debt: 0, property: 1200000, vehicle: 250000, pressure: 9, resource: 12 }
    }[wealth] || { cash: 8000, allowance: 1200, debt: 0, property: 0, vehicle: 0, pressure: 0, resource: 0 };
  }
  function familyRelationshipBase(relation) {
    return { warm: 76, steady: 58, strict: 51, conflict: 34, single: 55, grandparents: 63, distant: 31, random: 50 }[relation] || 50;
  }
  function traitDirection(config, key) { return (Number(config.personality[key] || 50) - 50) / 50; }
  function talentScore(config, key) { return Number(config.talents[key] || 0); }

  function applyCharacterConfig(player, rawConfig) {
    const config = normalizeConfig(rawConfig);
    const body = config.body;
    const physical = body.physical;
    const bodyType = getBodyType(body);
    const startDate = player.date || { year: 2026, month: 7 };
    const birthMonth = 6;
    player.character = copy(config);
    player.identity = copy(config.identity);
    player.name = config.identity.name;
    player.hometown = config.identity.hometown || '北方北城';
    // 年龄和教育计划共同决定身份；学校字段可以留空，不会被默认大学强行补回。
    const age = config.identity.age;
    const requestedSchool = String(config.identity.school || '').trim();
    const isAdultStudent = age >= 19 && config.identity.educationPlan === 'enrolled' && Boolean(requestedSchool);
    player.educationStatus = age < 6 ? 'not_ready' : (config.identity.educationPlan === 'defer' ? 'deferred' : (age < 19 ? 'schooling' : (isAdultStudent ? 'enrolled' : 'deferred')));
    player.university = isAdultStudent ? requestedSchool : '';
    player.major = isAdultStudent ? String(config.identity.major || '').trim() : '';
    player.education = player.educationStatus === 'enrolled'
      ? (player.major ? `${player.major}在读` : '在读')
      : (player.educationStatus === 'deferred' ? '暂不入学 / 稍后决定' : (player.educationStatus === 'schooling' ? '基础教育阶段' : '尚未入学'));
    player.specialty = config.identity.specialty;
    player.idol = config.identity.idol;
    player.birth = { year: Number(startDate.year) - config.identity.age - (Number(startDate.month) < birthMonth ? 1 : 0), month: birthMonth, day: 12 };
    player.age = config.identity.age;
    player.body = { ...copy(body), bmi: getBMI(body.height, body.weight), build: bodyType, description: getBodyDescription(config), healthHint: getHealthHint(body, config.identity.gender) };
    player.height = body.height;
    player.weight = body.weight;
    player.bodyDescription = player.body.description;
    player.appearance = copy(config.appearance);
    player.personality = copy(config.personality);
    player.family = copy(config.family);
    player.talents = copy(config.talents);
    player.interests = config.interests.slice();
    player.goals = copy(config.goals);
    player.difficulty = config.difficulty;
    player.randomness = config.randomness;
    player.ambition = Math.round(50 + traitDirection(config, 'risk') * 12 + traitDirection(config, 'change') * 12 + talentScore(config, 'execution') * 0.45);
    const setup = wealthSetup(config.family.wealth);
    // 家庭背景仍会影响生活成本、债务、资产与剧情，但不再让玩家用本地表单
    // 任意写入开局现金。更高开局只能由成长服务的报价和确认接口授予。
    player.resources.cash = FREE_INITIAL_CASH;
    // 未成年阶段没有个人学费、房租或债务结算，家庭背景仍会保留在档案中。
    player.resources.monthlyExpense = age < 18 ? 0 : Math.max(500, setup.allowance);
    player.resources.debt = age < 18 ? 0 : Math.max(0, setup.debt);
    if (age < 18) {
      player.resources.travelCountries = 0;
      player.resources.workExperience = 0;
    }
    // 资产页使用这个字段展示教育状态；它必须与当前年龄保持一致，不能让
    // 0 岁角色仍显示默认模板中的“本科在读”。
    player.resources.degree = player.education;
    player.resources.property = config.family.hasHouse ? Math.max(setup.property, 300000) : setup.property;
    player.resources.vehicle = config.family.hasCar ? Math.max(setup.vehicle, 60000) : setup.vehicle;
    const stats = player.stats;
    const heightSport = body.height < 166 ? 4 : body.height <= 185 ? 8 : body.height <= 195 ? 6 : 2;
    const mobility = (physical.speed + physical.agility + physical.coordination + physical.reaction) / 4;
    const athlete = (physical.strength + physical.endurance + physical.jump + physical.resilience) / 4;
    stats.health = clamp(56 + physical.resilience * 0.35 + physical.recovery * 0.22 - Math.max(0, body.bodyFat - 30) * 0.45 - Math.max(0, 8 - body.bodyFat) * 0.7, 20, 95);
    stats.fitness = clamp(30 + athlete * 0.48 + body.muscle * 0.18 - Math.max(0, body.bodyFat - 25) * 0.45, 15, 96);
    stats.basketball = clamp(22 + talentScore(config, 'sport') * 0.65 + heightSport + mobility * 0.14 + physical.jump * 0.16, 10, 94);
    stats.english = clamp(18 + talentScore(config, 'language') * 0.9 + talentScore(config, 'learning') * 0.2, 10, 90);
    stats.knowledge = clamp(25 + talentScore(config, 'learning') * 0.72 + talentScore(config, 'logic') * 0.32, 15, 90);
    stats.social = clamp(25 + talentScore(config, 'communication') * 0.7 + talentScore(config, 'emotional') * 0.4 + traitDirection(config, 'introversion') * 8, 10, 92);
    stats.discipline = clamp(28 + talentScore(config, 'execution') * 0.65 - traitDirection(config, 'discipline') * 12, 10, 95);
    stats.courage = clamp(30 + traitDirection(config, 'risk') * 18 + traitDirection(config, 'change') * 13 + talentScore(config, 'resilience') * 0.24, 10, 94);
    stats.luck = getLuckValue(config);
    stats.happiness = clamp(60 + (config.family.relation === 'warm' ? 8 : config.family.relation === 'conflict' ? -8 : 0) + (config.interests.length - 3) * 2, 25, 92);
    stats.pressure = clamp(24 + setup.pressure + (config.family.relation === 'strict' ? 7 : config.family.relation === 'conflict' ? 12 : 0), 5, 75);
    stats.reputation = config.family.wealth === 'veryWealthy' ? 14 : config.family.wealth === 'wealthy' ? 10 : 8;
    player.eventBias = player.eventBias || {};
    const bias = player.eventBias;
    const interestMap = { '篮球': 'basketball', '健身': 'training', '旅行': 'travel', '英语': 'overseas', '创业': 'business', '自媒体': 'media', '音乐': 'media', '阅读': 'university', '摄影': 'media', '投资': 'investment', '陪伴家人': 'family' };
    config.interests.forEach((interest) => { const key = interestMap[interest]; if (key) bias[key] = (bias[key] || 0) + 2; });
    const goalMap = { sport: 'basketball', career: 'promotion', business: 'business', overseas: 'overseas', relationship: 'family', creator: 'media', balanced: 'life' };
    const goalKey = goalMap[config.goals.primary] || 'life';
    bias[goalKey] = (bias[goalKey] || 0) + 4;
    player.tags = Array.from(new Set([...(player.tags || []), bodyType, optionLabel('temperament', config.appearance.temperament), optionLabel('wealth', config.family.wealth)]));
    const familyBase = familyRelationshipBase(config.family.relation);
    (player.relationships || []).forEach((relation) => {
      if (relation.type === 'family' || /父|母|家/.test(relation.relation || relation.role || relation.name || '')) {
        if (relation.relation !== undefined) relation.relation = familyBase;
        else relation.value = familyBase;
      }
    });
    player.flags = Array.isArray(player.flags) ? player.flags : [];
    [
      'university_student', 'primary_student', 'youth_student', 'early_childhood',
      'childhood_exploration', 'youth_exploration', 'free_exploration',
      // createNewPlayer 的成人模板标记不应带进婴幼儿或自定义的新人生。
      'us_work_travel', 'canada_visa', 'driver_license'
    ].forEach((flag) => {
      const index = player.flags.indexOf(flag);
      if (index >= 0) player.flags.splice(index, 1);
    });
    if (age < 18) {
      ['us_work_travel', 'canada_visa', 'driver_license'].forEach((flag) => {
        const index = player.flags.indexOf(flag);
        if (index >= 0) player.flags.splice(index, 1);
      });
      player.careerHistory = (player.careerHistory || []).filter((id) => id !== 'sports_education_student');
    } else if (player.educationStatus !== 'enrolled') {
      player.careerHistory = (player.careerHistory || []).filter((id) => id !== 'sports_education_student');
    }
    if (age <= 5) {
      player.career = { id: 'early_childhood', name: '在家成长中', level: 0, industry: '成长' };
      player.flags.push('early_childhood');
    } else if (age <= 12) {
      player.career = { id: player.educationStatus === 'deferred' ? 'childhood_exploration' : 'primary_student', name: player.educationStatus === 'deferred' ? '自由成长中' : '小学阶段', level: 0, industry: '成长' };
      if (player.educationStatus !== 'deferred') player.flags.push('primary_student');
    } else if (age <= 18) {
      player.career = { id: player.educationStatus === 'deferred' ? 'youth_exploration' : 'youth_student', name: player.educationStatus === 'deferred' ? '自由探索中' : '青春学习阶段', level: 0, industry: '成长' };
      if (player.educationStatus !== 'deferred') player.flags.push('youth_student');
    } else if (player.educationStatus === 'enrolled') {
      player.career = { id: 'sports_education_student', name: player.major ? `${player.major}学生` : '在读学生', level: 0, industry: '教育' };
      player.flags.push('university_student');
    } else {
      player.career = { id: 'free_exploration', name: '自由探索中', level: 0, industry: '人生' };
      player.flags.push('free_exploration');
    }
    player.careerHistory = [player.career.id];
    if (setup.debt > 0 && age >= 18 && !player.flags.includes('has_debt')) player.flags.push('has_debt');
    if (config.family.wealth === 'wealthy' || config.family.wealth === 'veryWealthy') player.flags.push('family_wealthy');
    if (config.family.relation === 'strict') player.flags.push('family_strict');
    if (config.family.expectation === 'overseas') player.flags.push('family_overseas_expectation');
    return player;
  }

  function categoryName(event) {
    const raw = String((event && (event.category || event.type || event.id || event.title)) || '').toLowerCase();
    if (/篮球|basket|训练|fitness|sport/.test(raw)) return 'sport';
    if (/英语|海外|travel|visa|airport|出国|美国|海外/.test(raw)) return 'overseas';
    if (/钱|投资|理财|money|finance|bank/.test(raw)) return 'money';
    if (/自媒体|视频|直播|内容|media|creator|content/.test(raw)) return 'media';
    if (/创业|生意|business|合伙/.test(raw)) return 'business';
    if (/恋爱|感情|朋友|友情|family|父|母|家/.test(raw)) return 'relationship';
    if (/大学|考试|学习|university|exam|study/.test(raw)) return 'study';
    if (/工作|职业|酒店|餐厅|work|career/.test(raw)) return 'work';
    return 'life';
  }
  function wealthOpportunity(wealth) { return { extreme: -0.12, hardship: -0.06, ordinary: 0, comfortable: 0.05, wealthy: 0.1, veryWealthy: 0.13 }[wealth] || 0; }
  function difficultyOpportunity(difficulty) { return { story: 0.13, realistic: 0, hard: -0.12, chaotic: 0 }[difficulty] || 0; }
  function appearanceModifier(config, category) {
    const look = config.appearance || {};
    let value = 0;
    if (category === 'relationship') {
      if (look.eyes === 'bright' || look.eyes === 'smile') value += 0.035;
      if (look.mouth === 'smile' || look.temperament === 'sunny') value += 0.03;
      if (look.skinTone === 'warm' || look.style === 'casual') value += 0.015;
      if (look.mark === 'scar') value += 0.012;
    }
    if (category === 'media') {
      if (look.style === 'street' || look.style === 'literary') value += 0.035;
      if (look.hairstyle === 'textured' || look.hairColor === 'chestnut' || look.hairColor === 'silver') value += 0.025;
      if (look.faceShape === 'sharp' || look.temperament === 'bold') value += 0.025;
    }
    if (category === 'study' && (look.glasses !== 'none' || look.eyebrow === 'sharp')) value += 0.02;
    if (category === 'sport' && (look.style === 'sport' || look.temperament === 'sport')) value += 0.03;
    if (category === 'work' && (look.style === 'business' || look.beard !== 'none' || look.nose === 'straight')) value += 0.025;
    return value;
  }
  function familyModifier(config, category) {
    const family = config.family || {};
    let value = 0;
    if (category === 'overseas' && family.location === 'overseas') value += 0.18;
    if (category === 'work' && (family.location === 'capital' || family.location === 'tier1')) value += 0.05;
    if (category === 'business' && (family.location === 'town' || family.location === 'rural')) value += 0.035;
    if (category === 'study') value += { limited: -0.06, ordinary: 0, supportive: 0.06, abundant: 0.1 }[family.education] || 0;
    const expectedCategory = { civil: 'work', teacher: 'study', business: 'business', overseas: 'overseas', inherit: 'business', stable: 'work' }[family.expectation];
    if (expectedCategory === category) value += family.relation === 'strict' ? 0.07 : 0.04;
    return value;
  }
  function personalityModifier(config, category) {
    const trait = (key) => traitDirection(config, key);
    if (category === 'sport') return trait('discipline') * -0.045 + trait('risk') * 0.03;
    if (category === 'study') return trait('rationality') * -0.07 + trait('patience') * -0.06 + trait('discipline') * -0.06;
    if (category === 'overseas') return trait('change') * 0.09 + trait('risk') * 0.06 + trait('idealism') * 0.035;
    if (category === 'money') return trait('rationality') * -0.08 + trait('spending') * -0.055 + trait('patience') * -0.05;
    if (category === 'business') return trait('risk') * 0.11 + trait('assertiveness') * 0.07 + trait('idealism') * 0.04;
    if (category === 'media') return trait('attention') * 0.11 + trait('change') * 0.045 + trait('idealism') * 0.035;
    if (category === 'relationship') return trait('introversion') * 0.08 + trait('attachment') * 0.065 + trait('forgiveness') * -0.035;
    if (category === 'work') return trait('assertiveness') * 0.045 + trait('patience') * -0.06 + trait('discipline') * -0.06;
    return 0;
  }
  function getEventWeightMultiplier(player, event) {
    if (!player || !player.character) return 1;
    const config = player.character;
    const category = categoryName(event);
    const body = config.body;
    let modifier = 1;
    if (category === 'sport') {
      modifier += (talentScore(config, 'sport') - 18) / 100;
      modifier += body.height >= 176 && body.height <= 195 ? 0.1 : body.height >= 196 ? 0.03 : body.height < 166 ? 0.05 : 0;
      modifier += (body.physical.jump + body.physical.coordination - 70) / 420;
    }
    if (category === 'overseas') modifier += (talentScore(config, 'language') - 18) / 110;
    if (category === 'money') modifier += wealthOpportunity(config.family.wealth) * 0.45 + (talentScore(config, 'finance') - 16) / 150;
    if (category === 'business') modifier += (talentScore(config, 'business') + talentScore(config, 'communication') + talentScore(config, 'leadership') - 54) / 210;
    if (category === 'media') modifier += (talentScore(config, 'creativity') + talentScore(config, 'art') + talentScore(config, 'technology') - 43) / 210;
    if (category === 'relationship') modifier += (talentScore(config, 'emotional') - 20) / 180;
    if (category === 'study') modifier += (talentScore(config, 'learning') + talentScore(config, 'logic') - 37) / 190;
    if (category === 'work') modifier += (talentScore(config, 'execution') + talentScore(config, 'technology') - 38) / 190;
    modifier += appearanceModifier(config, category) + familyModifier(config, category) + personalityModifier(config, category);
    const goalMap = { sport: 'sport', career: 'work', business: 'business', overseas: 'overseas', relationship: 'relationship', creator: 'media', balanced: 'life' };
    if (goalMap[config.goals.primary] === category) modifier += 0.18;
    modifier += difficultyOpportunity(config.difficulty);
    if (config.randomness === 'low') modifier = 1 + (modifier - 1) * 0.62;
    if (config.randomness === 'high') modifier *= 0.78 + Math.random() * 0.48;
    return clamp(modifier, 0.45, 1.85);
  }
  function getOutcomeModifier(player, event, option) {
    if (!player || !player.character) return 0;
    const config = player.character;
    const category = categoryName(event || option);
    let score = 0;
    const physique = config.body.physical;
    if (category === 'sport') score += (talentScore(config, 'sport') - 18) / 95 + (physique.jump + physique.coordination + physique.speed - 105) / 340;
    if (category === 'study') score += (talentScore(config, 'learning') + talentScore(config, 'logic') - 37) / 170;
    if (category === 'overseas') score += (talentScore(config, 'language') - 18) / 110;
    if (category === 'work') score += (talentScore(config, 'execution') + talentScore(config, 'communication') + talentScore(config, 'technology') - 60) / 230;
    if (category === 'money') score += (talentScore(config, 'finance') - 16) / 130;
    if (category === 'business') score += (talentScore(config, 'business') + talentScore(config, 'leadership') + talentScore(config, 'creativity') - 52) / 220;
    if (category === 'media') score += (talentScore(config, 'creativity') + talentScore(config, 'art') + talentScore(config, 'technology') - 43) / 190;
    if (category === 'relationship') score += (talentScore(config, 'emotional') - 20) / 135;
    score += appearanceModifier(config, category) + familyModifier(config, category) + personalityModifier(config, category);
    score += (getLuckValue(config) - 50) / 300;
    if (config.difficulty === 'hard') score -= 0.08;
    if (config.difficulty === 'story') score += 0.07;
    if (config.randomness === 'high') score *= 0.68;
    return clamp(score, -0.32, 0.35);
  }
  function meetsCharacterConditions(player, conditions) {
    if (!conditions || !player || !player.character) return true;
    const c = player.character;
    const body = c.body;
    const checks = conditions.character || conditions;
    if (checks.minHeight !== undefined && body.height < checks.minHeight) return false;
    if (checks.maxHeight !== undefined && body.height > checks.maxHeight) return false;
    if (checks.minMuscle !== undefined && body.muscle < checks.minMuscle) return false;
    if (checks.maxBodyFat !== undefined && body.bodyFat > checks.maxBodyFat) return false;
    if (checks.bodyType && !String(getBodyType(body)).includes(checks.bodyType)) return false;
    if (checks.familyWealth && ![].concat(checks.familyWealth).includes(c.family.wealth)) return false;
    if (checks.goal && ![].concat(checks.goal).includes(c.goals.primary)) return false;
    if (checks.interests && ![].concat(checks.interests).every((interest) => c.interests.includes(interest))) return false;
    for (const [key, target] of Object.entries(checks.personality || {})) if (Number(c.personality[key] || 0) < Number(target)) return false;
    for (const [key, target] of Object.entries(checks.talents || {})) if (Number(c.talents[key] || 0) < Number(target)) return false;
    return true;
  }
  function getMonthlyEffects(player) {
    if (!player || !player.character) return null;
    const c = player.character;
    const body = c.body;
    const training = Number((player.activity && (player.activity.basketball || 0)) || 0) + Number((player.activity && (player.activity.training || 0)) || 0);
    const effect = { money: 0, stats: {}, bodyDelta: {} };
    // 婴幼儿和未成年人的饮食、居住与照护属于家庭叙事，不从个人现金中扣除。
    if (Number(player.age) < 18) return effect;
    const nutrition = Math.max(0, Math.round((body.muscle - 45) * 7 + Math.max(0, body.height - 180) * 2));
    if (nutrition) effect.money -= nutrition;
    if (body.muscle >= 72 && training < 2) { effect.bodyDelta.muscle = -1; effect.stats.fitness = -1; }
    if (body.bodyFat < 8) { effect.stats.health = -2; effect.stats.happiness = -1; }
    if (body.bodyFat > 35) { effect.stats.fitness = -1; effect.stats.health = -1; }
    if (body.height >= 198 && body.physical.resilience < 45) effect.stats.health = (effect.stats.health || 0) - 1;
    if (training >= 4 && body.physical.recovery < 40) effect.stats.health = (effect.stats.health || 0) - 1;
    if (c.difficulty === 'hard') effect.stats.pressure = (effect.stats.pressure || 0) + 1;
    if (c.randomness === 'high' && Math.random() < 0.07) effect.stats.happiness = (effect.stats.happiness || 0) + (Math.random() < 0.5 ? -2 : 2);
    return effect;
  }
  function applyMonthlyCharacterEffects(player) {
    const effect = getMonthlyEffects(player);
    if (effect && effect.bodyDelta && player.character) {
      Object.entries(effect.bodyDelta).forEach(([key, delta]) => {
        player.character.body[key] = clamp(player.character.body[key] + delta, key === 'bodyFat' ? 5 : 0, key === 'bodyFat' ? 45 : 100);
      });
      player.body = { ...player.character.body, bmi: getBMI(player.character.body.height, player.character.body.weight), build: getBodyType(player.character.body), description: getBodyDescription(player.character), healthHint: getHealthHint(player.character.body, player.character.identity.gender) };
    }
    return effect;
  }
  function deriveCharacterTags(player) {
    if (!player || !player.character) return [];
    const c = player.character;
    const tags = [];
    tags.push(getBodyType(c.body));
    if (talentScore(c, 'sport') >= 26) tags.push('运动天赋');
    if (talentScore(c, 'language') >= 24) tags.push('语言直觉');
    if (traitDirection(c, 'risk') > 0.38) tags.push('敢闯');
    if (c.family.relation === 'warm') tags.push('家里一直在等你');
    if (c.goals.primary === 'business') tags.push('不甘心一直普通');
    return tags;
  }
  function getCharacterEnding(player) {
    if (!player || !player.character) return null;
    const c = player.character;
    const netWorth = player.resources ? (Number(player.resources.cash || 0) + Number(player.resources.investments || 0) + Number(player.resources.property || 0) - Number(player.resources.debt || 0)) : 0;
    const parents = (player.relationships || []).filter((item) => /父|母/.test(item.name || item.role || '')).map((item) => Number(item.relation ?? item.value ?? item.affection ?? 50));
    const familyScore = parents.length ? parents.reduce((sum, value) => sum + value, 0) / parents.length : 50;
    if (c.goals.primary === 'sport' && player.stats.basketball >= 86 && player.resources.basketballGames >= 20) return { id: 'court-long-night', name: '球场灯还亮着', icon: '🏀', description: '你没有把热爱交给时间。很多年后，球场的灯再亮起时，仍有人记得你的脚步和传球。' };
    if (c.goals.primary === 'business' && netWorth >= 1200000 && (player.activity.business || 0) >= 12) return { id: 'small-city-builder', name: '从小城走出的生意', icon: '✦', description: '你把一次次算账、碰壁和坚持，做成了自己的生意。故乡不再只是起点，也是你愿意回来的地方。' };
    if (c.goals.primary === 'overseas' && player.resources.travelCountries >= 8 && player.stats.english >= 75) return { id: 'faraway-light', name: '远方也有灯火', icon: '✈', description: '你终于在陌生城市有了熟悉的路。远方没有替你解决一切，却让你成为了更完整的自己。' };
    if (c.goals.primary === 'relationship' && familyScore >= 78 && player.stats.happiness >= 68) return { id: 'table-kept-warm', name: '饭菜一直热着', icon: '⌂', description: '你把很多次匆忙的回家、认真地倾听和不轻易缺席，过成了一张始终有人等你的饭桌。' };
    if (c.goals.primary === 'creator' && player.resources.followers >= 120000 && player.stats.reputation >= 70) return { id: 'ordinary-camera', name: '镜头留下了生活', icon: '◉', description: '你没有把自己活成模板。镜头里那些具体的日子，反而让更多人认出了你。' };
    return null;
  }

  function htmlEscape(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function selectHtml(path, current, group, label) { return `<label class="creator-field"><span>${label}</span><select data-character-path="${path}">${(OPTIONS[group] || []).map((item) => `<option value="${item[0]}" ${item[0] === current ? 'selected' : ''}>${item[1]}</option>`).join('')}</select></label>`; }
  function sliderHtml(path, value, min, max, step, label, suffix) { return `<label class="creator-slider"><span><b>${label}</b><output data-character-output="${path}">${value}${suffix || ''}</output></span><input type="range" min="${min}" max="${max}" step="${step || 1}" value="${value}" data-character-path="${path}" data-character-range="true" /></label>`; }
  function checklistHtml(config) {
    const all = ['篮球', '健身', '旅行', '英语', '创业', '自媒体', '阅读', '摄影', '投资', '陪伴家人'];
    return `<div class="creator-checklist">${all.map((interest) => `<label class="creator-check ${config.interests.includes(interest) ? 'is-checked' : ''}"><input type="checkbox" value="${interest}" data-character-interest ${config.interests.includes(interest) ? 'checked' : ''}/><span>${interest}</span></label>`).join('')}</div>`;
  }
  function bodyLiveHtml(config) {
    const body = config.body;
    return `<aside class="creator-live-card"><p>身体档案</p><strong data-body-live="summary">${htmlEscape(getBodyType(body))}</strong><span>身高 ${body.height} cm · 体重 ${body.weight} kg · BMI <b data-body-live="bmi">${getBMI(body.height, body.weight)}</b></span><small data-body-live="hint">${htmlEscape(getHealthHint(body, config.identity.gender))}</small></aside>`;
  }
  function familyFinancePreview(config) {
    const setup = wealthSetup(config.family.wealth);
    return `<aside class="creator-live-card creator-live-card--finance"><p>家庭节奏</p><strong>${optionLabel('wealth', config.family.wealth)}</strong><span>每月生活成本 <b data-family-finance="expense">¥${setup.allowance.toLocaleString('zh-CN')}</b> · 初始债务 <b data-family-finance="debt">¥${setup.debt.toLocaleString('zh-CN')}</b></span><small>这些来自家庭背景；开局现金请在下方选择，由成长服务确认。</small></aside>`;
  }
  function initialCashPickerHtml() {
    return `<section class="creator-starting-cash" data-initial-cash-picker aria-live="polite"><div class="creator-starting-cash__head"><div><p>开局现金</p><h3>选择这一生的第一笔筹码</h3></div><span>服务端确认</span></div><p class="creator-starting-cash__copy">免费基础起点可直接体验；付费起点会先展示成长币消耗、余额和确认结果，前端不会自行发放现金。</p><div class="creator-starting-cash__cards" data-initial-cash-cards><p class="creator-starting-cash__loading">正在获取可选起点…</p></div></section>`;
  }
  function renderStepHtml(rawConfig, stepIndex) {
    const config = normalizeConfig(rawConfig);
    const step = STEPS[stepIndex] || STEPS[0];
    const body = config.body;
    const physical = body.physical;
    if (step.id === 'identity') return `<div class="creator-form creator-form--two"><label class="creator-field creator-field--wide"><span>姓名</span><input data-character-path="identity.name" value="${htmlEscape(config.identity.name)}" maxlength="16" /></label>${selectHtml('identity.gender', config.identity.gender, 'gender', '性别')} ${sliderHtml('identity.age', config.identity.age, 0, 30, 1, '开局年龄', ' 岁')}<label class="creator-field"><span>籍贯</span><input data-character-path="identity.hometown" value="${htmlEscape(config.identity.hometown)}" /></label><label class="creator-field"><span>专项</span><input data-character-path="identity.specialty" value="${htmlEscape(config.identity.specialty)}" /></label><label class="creator-field creator-field--wide"><span>偶像</span><input data-character-path="identity.idol" value="${htmlEscape(config.identity.idol)}" /></label><p class="creator-field-hint creator-field--wide">学校与专业信息不会显示在游戏资料中，你可以专注于自己想走的人生方向。</p></div>`;
    if (step.id === 'body') {
      const range = rangeForGender(config.identity.gender);
      return `<div class="creator-form"><div class="creator-slider-grid">${sliderHtml('body.height', body.height, range.min, range.max, 1, '身高', ' cm')}${sliderHtml('body.weight', body.weight, 35, 180, 1, '体重', ' kg')}${sliderHtml('body.muscle', body.muscle, 0, 100, 1, '肌肉量', '')}${sliderHtml('body.bodyFat', body.bodyFat, 5, 45, 1, '体脂率', '%')}</div>${bodyLiveHtml(config)}<div class="creator-form creator-form--three">${selectHtml('appearance.skinTone', config.appearance.skinTone, 'skinTone', '肤色')}${selectHtml('appearance.faceShape', config.appearance.faceShape, 'faceShape', '脸型')}${selectHtml('appearance.hairstyle', config.appearance.hairstyle, 'hairstyle', '发型')}${selectHtml('appearance.hairColor', config.appearance.hairColor, 'hairColor', '发色')}${selectHtml('appearance.eyebrow', config.appearance.eyebrow, 'eyebrow', '眉毛')}${selectHtml('appearance.eyes', config.appearance.eyes, 'eyes', '眼睛')}${selectHtml('appearance.nose', config.appearance.nose, 'nose', '鼻子')}${selectHtml('appearance.mouth', config.appearance.mouth, 'mouth', '嘴型')}${selectHtml('appearance.beard', config.appearance.beard, 'beard', '胡须')}${selectHtml('appearance.mark', config.appearance.mark, 'mark', '痣或伤疤')}${selectHtml('appearance.glasses', config.appearance.glasses, 'glasses', '眼镜')}${selectHtml('appearance.style', config.appearance.style, 'style', '穿衣风格')}${selectHtml('appearance.temperament', config.appearance.temperament, 'temperament', '整体气质')}</div><p class="creator-points">身体属性点：<b data-body-points>${getBodyPointsRemaining(config)}</b> / ${BODY_BUDGET} 剩余 · 61以上每点消耗2点，81以上消耗3点</p><div class="creator-attribute-grid">${BODY_KEYS.map(([key, label]) => sliderHtml(`body.physical.${key}`, physical[key], 0, 100, 1, label, '')).join('')}</div></div>`;
    }
    if (step.id === 'personality') return `<p class="creator-note">滑向任何一边都有礼物，也都有代价。它会改变对话、关系、创业意愿和随机事件。</p><div class="creator-personality-list">${PERSONALITY_KEYS.map(([key, left, right]) => `<label class="personality-row"><span>${left}</span><input type="range" min="0" max="100" value="${config.personality[key]}" data-character-path="personality.${key}" data-character-range="true"/><b>${right}</b></label>`).join('')}</div>`;
    if (step.id === 'family') return `<div class="creator-form creator-form--two">${selectHtml('family.location', config.family.location, 'familyLocation', '家庭所在地')}${selectHtml('family.wealth', config.family.wealth, 'wealth', '家庭经济')}${selectHtml('family.relation', config.family.relation, 'familyRelation', '家庭关系')}${selectHtml('family.expectation', config.family.expectation, 'expectation', '父母期望')}${selectHtml('family.education', config.family.education, 'familyEducation', '家庭教育资源')}<label class="creator-check"><input type="checkbox" data-character-path="family.hasHouse" ${config.family.hasHouse ? 'checked' : ''}/><span>家里有房</span></label><label class="creator-check"><input type="checkbox" data-character-path="family.hasCar" ${config.family.hasCar ? 'checked' : ''}/><span>家里有车</span></label></div>${familyFinancePreview(config)}${initialCashPickerHtml()}`;
    if (step.id === 'talents') return `<p class="creator-points">能力天赋点：<b data-talent-points>${getAbilityPointsRemaining(config)}</b> / ${TALENT_BUDGET} 剩余 · 运气只能使用命运点微调</p><div class="creator-attribute-grid">${TALENT_KEYS.map(([key, label]) => sliderHtml(`talents.${key}`, config.talents[key], 0, 100, 1, label, '')).join('')}</div><div class="creator-form creator-form--two">${selectHtml('talents.luckMode', config.talents.luckMode, 'randomness', '命运底色')} ${sliderHtml('talents.fatePoints', config.talents.fatePoints, -2, 2, 1, '命运点', '')}</div>`;
    if (step.id === 'interests') return `<p class="creator-note">选择 1–6 项。兴趣会带来更容易遇到的事件，也会让你在长期投入中更有成长。</p>${checklistHtml(config)}`;
    if (step.id === 'goals') return `<div class="creator-goals">${(OPTIONS.goal || []).map(([id, label]) => `<label class="creator-goal ${config.goals.primary === id ? 'is-selected' : ''}"><input type="radio" name="life-goal" value="${id}" data-character-path="goals.primary" ${config.goals.primary === id ? 'checked' : ''}/><span>${label}</span><small>${{ sport: '球场、训练与教练路线', career: '专业、履历与稳定上升', business: '资金、合伙与风险选择', overseas: '英语、签证与异国生活', relationship: '关系、陪伴与家庭章节', creator: '内容、名气与表达', balanced: '健康、关系与多元选择' }[id]}</small></label>`).join('')}</div>`;
    if (step.id === 'difficulty') return `<div class="creator-goals">${(OPTIONS.difficulty || []).map(([id, label, note]) => `<label class="creator-goal ${config.difficulty === id ? 'is-selected' : ''}"><input type="radio" name="difficulty" value="${id}" data-character-path="difficulty" ${config.difficulty === id ? 'checked' : ''}/><span>${label}</span><small>${note}</small></label>`).join('')}</div><div class="creator-form creator-form--two">${selectHtml('randomness', config.randomness, 'randomness', '事件随机性')}<aside class="creator-live-card"><p>命运不是数值</p><strong>${optionLabel('randomness', config.randomness)}</strong><small>随机性高时，意外与惊喜都会更常出现；低时，你的长期能力更能决定结果。</small></aside></div>`;
    const profile = getBodyDescription(config);
    return `<div class="creator-confirmation"><p class="eyebrow">LIFE FILE / READY</p><h3>${htmlEscape(config.identity.name)}，${config.identity.age} 岁</h3><p>${htmlEscape(profile)}</p><dl><div><dt>性格</dt><dd>${optionLabel('temperament', config.appearance.temperament)}</dd></div><div><dt>家庭</dt><dd>${optionLabel('wealth', config.family.wealth)} · ${optionLabel('familyRelation', config.family.relation)}</dd></div><div><dt>目标</dt><dd>${optionLabel('goal', config.goals.primary)}</dd></div><div><dt>难度</dt><dd>${optionLabel('difficulty', config.difficulty)}</dd></div></dl><p class="creator-note">这些选择会改变事件出现率、成功概率、月度维护、关系张力和最后的人生结局。没有完美开局，只有你愿意承担的那条路。</p></div>`;
  }
  function renderCreatorStep(container, rawConfig, stepIndex, onChange) {
    if (!container) return;
    let config = normalizeConfig(rawConfig);
    const step = STEPS[stepIndex] || STEPS[0];
    container.innerHTML = renderStepHtml(config, stepIndex);
    const notify = (path) => { if (typeof onChange === 'function') onChange(config, path); };
    const updateLive = () => {
      const body = config.body;
      container.querySelectorAll('[data-character-output]').forEach((output) => {
        const value = getPath(config, output.dataset.characterOutput);
        const suffix = output.dataset.characterOutput === 'body.height' ? ' cm' : output.dataset.characterOutput === 'body.weight' ? ' kg' : output.dataset.characterOutput === 'body.bodyFat' ? '%' : '';
        output.textContent = `${value}${suffix}`;
      });
      const summary = container.querySelector('[data-body-live="summary"]'); if (summary) summary.textContent = getBodyType(body);
      const bmi = container.querySelector('[data-body-live="bmi"]'); if (bmi) bmi.textContent = getBMI(body.height, body.weight);
      const hint = container.querySelector('[data-body-live="hint"]'); if (hint) hint.textContent = getHealthHint(body, config.identity.gender);
      const bodyPoints = container.querySelector('[data-body-points]'); if (bodyPoints) bodyPoints.textContent = getBodyPointsRemaining(config);
      const talentPoints = container.querySelector('[data-talent-points]'); if (talentPoints) talentPoints.textContent = getAbilityPointsRemaining(config);
      if (step.id === 'family') {
        const setup = wealthSetup(config.family.wealth);
        const expense = container.querySelector('[data-family-finance="expense"]');
        const debt = container.querySelector('[data-family-finance="debt"]');
        if (expense) expense.textContent = `¥${setup.allowance.toLocaleString('zh-CN')}`;
        if (debt) debt.textContent = `¥${setup.debt.toLocaleString('zh-CN')}`;
      }
    };
    container.querySelectorAll('[data-character-path]').forEach((input) => {
      const updateValue = () => {
      const path = input.dataset.characterPath;
      let value = input.type === 'checkbox' ? input.checked : input.value;
      if (/^(body\.|talents\.|personality\.|identity\.age|family\.(savings|allowance|debt))/.test(path)) value = Number(value);
      if (path.indexOf('body.physical.') === 0) { setPhysical(config, path.split('.').pop(), value); input.value = getPath(config, path); }
      else if (path.indexOf('talents.') === 0 && ['luckMode', 'fatePoints'].indexOf(path.split('.').pop()) === -1) { setTalent(config, path.split('.').pop(), value); input.value = getPath(config, path); }
      else setPath(config, path, value);
      config = normalizeConfig(config);
      updateLive();
      notify(path);
      };
      input.addEventListener('input', updateValue);
      if (input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'radio') input.addEventListener('change', updateValue);
    });
    container.querySelectorAll('[data-character-interest]').forEach((input) => input.addEventListener('change', () => {
      const interest = input.value;
      if (input.checked && !config.interests.includes(interest) && config.interests.length < 6) config.interests.push(interest);
      if (!input.checked) config.interests = config.interests.filter((item) => item !== interest);
      input.closest('.creator-check')?.classList.toggle('is-checked', input.checked);
      notify('interests');
    }));
    updateLive();
    if (step.id === 'family') {
      // growth.js 自己读取、报价和确认开局现金；角色创建层只提供稳定的挂载点。
      window.LIFE_GROWTH?.mountInitialCashOptions?.(container);
    }
    return config;
  }

  window.LIFE_CHARACTER = {
    VERSION: '1.0.0', STEPS, OPTIONS, BODY_KEYS, TALENT_KEYS, PERSONALITY_KEYS,
    BODY_BUDGET, TALENT_BUDGET, defaultConfig: copy(DEFAULT_CONFIG), createDefaultConfig: () => copy(DEFAULT_CONFIG),
    normalizeConfig, validateConfig, getBMI, getBodyType, getBodyDescription, getHeightDescriptor, getHealthHint, getLuckValue,
    getPointCost, getBodyPointSpent, getBodyPointsRemaining, getAbilityPointSpent, getAbilityPointsRemaining, setPhysical, setTalent,
    applyCharacterConfig, getEventWeightMultiplier, getOutcomeModifier, meetsCharacterConditions, getMonthlyEffects, applyMonthlyCharacterEffects,
    deriveCharacterTags, getCharacterEnding, renderStepHtml, renderCreatorStep, optionLabel
  };
})();
