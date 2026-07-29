/* 《霍开然的人生选择》成就与结局系统（普通 script 全局版）。 */
(function achievementSystem(global) {
  'use strict';

  function n(value) { const result = Number(value); return Number.isFinite(result) ? result : 0; }
  function getStat(state, key) {
    if (typeof global.getStat === 'function') return global.getStat(state, key, 0);
    return n((state && state.stats && state.stats[key]) ?? (state && state[key]));
  }
  function getResource(state, key) {
    if (typeof global.getResource === 'function') return global.getResource(state, key, 0);
    const bag = (state && (state.resources || state.assets)) || {};
    return n(bag[key] ?? (state && state[key]));
  }
  function flag(state, id) {
    const flags = (state && (state.flags || state.unlocks || state.milestones)) || {};
    return Array.isArray(flags) ? flags.includes(id) : Boolean(flags[id]);
  }
  function careerId(state) {
    if (typeof global.getCareerId === 'function') return global.getCareerId(state);
    return (state && (state.careerId || state.jobId || (state.career && state.career.id) || state.career)) || '';
  }
  function careerIs(state) {
    const ids = Array.prototype.slice.call(arguments, 1);
    const current = careerId(state);
    const history = (state && (state.careerHistory || state.jobHistory || state.workHistory)) || [];
    return ids.includes(current) || history.some(function (entry) {
      const id = typeof entry === 'string' ? entry : entry && (entry.id || entry.careerId);
      return ids.includes(id);
    });
  }
  function age(state) { return n(state && state.age) || 21; }
  function totalAssets(state) {
    const propertyValue = getResource(state, 'propertyValue') || getResource(state, 'realEstateValue') || getResource(state, 'property');
    const carValue = getResource(state, 'carValue') || getResource(state, 'vehicleValue') || getResource(state, 'vehicle');
    return Math.max(0, getResource(state, 'savings') + getResource(state, 'investments') + propertyValue + carValue - getResource(state, 'debt'));
  }
  function relationshipList(state) {
    const relationships = state && state.relationships;
    if (!relationships) return [];
    return Array.isArray(relationships) ? relationships : Object.keys(relationships).map(function (id) { return relationships[id]; });
  }
  function hasRelationship(state, predicate) { return relationshipList(state).some(predicate); }
  function tag(state, target) {
    const tags = (state && (state.personalityTags || state.tags || state.traits)) || [];
    return Array.isArray(tags) ? tags.includes(target) : Boolean(tags[target]);
  }
  function countTimeline(state, keyword) {
    const timeline = (state && state.timeline) || [];
    return timeline.filter(function (item) { return JSON.stringify(item).indexOf(keyword) !== -1; }).length;
  }
  function achievement(id, title, icon, description, category, condition, progress) {
    return { id: id, name: title, title: title, icon: icon, description: description, category: category, condition: condition, progress: progress || null };
  }

  // 40 个成就：condition 始终只读 state，主逻辑可反复安全调用。
  const ACHIEVEMENTS = [
    achievement('first_wage', '第一份工资', '💵', '第一次靠工作获得收入。', '财富', s => flag(s, 'earned_salary') || getResource(s, 'lifetimeIncome') >= 1000),
    achievement('save_10k', '小有积蓄', '🐷', '存款达到 ¥10,000。', '财富', s => getResource(s, 'savings') >= 10000, s => [getResource(s, 'savings'), 10000]),
    achievement('save_100k', '六位数存款', '💰', '存款达到 ¥100,000。', '财富', s => getResource(s, 'savings') >= 100000, s => [getResource(s, 'savings'), 100000]),
    achievement('assets_million', '百万资产', '💎', '净资产达到 ¥1,000,000。', '财富', s => totalAssets(s) >= 1000000, s => [totalAssets(s), 1000000]),
    achievement('assets_ten_million', '千万人生', '👑', '净资产达到 ¥10,000,000。', '财富', s => totalAssets(s) >= 10000000, s => [totalAssets(s), 10000000]),
    achievement('debt_free', '轻装上阵', '🕊️', '还清债务后仍保有 ¥50,000 存款。', '财富', s => getResource(s, 'debt') <= 0 && getResource(s, 'savings') >= 50000),
    achievement('investment_first', '第一次投资', '📊', '完成一次投资。', '财富', s => flag(s, 'first_investment') || getResource(s, 'investments') > 0),
    achievement('investment_master', '理财高手', '📈', '投资资产达到 ¥500,000 且没有负债。', '财富', s => getResource(s, 'investments') >= 500000 && getResource(s, 'debt') <= 0),
    achievement('university_graduate', '毕业季', '🎓', '完成大学毕业。', '成长', s => flag(s, 'graduated') || String(s && s.education || '').indexOf('本科') !== -1),
    achievement('teacher_certificate', '持证上岗', '📜', '获得教师资格证。', '成长', s => flag(s, 'teacher_certificate')),
    achievement('english_80', '英语不再是障碍', '🗣️', '英语能力达到 80。', '成长', s => getStat(s, 'english') >= 80, s => [getStat(s, 'english'), 80]),
    achievement('english_100', '双语人生', '🌐', '英语能力达到满分。', '成长', s => getStat(s, 'english') >= 100, s => [getStat(s, 'english'), 100]),
    achievement('discipline_90', '自律达人', '⏱️', '自律达到 90。', '成长', s => getStat(s, 'discipline') >= 90 || tag(s, '自律达人')),
    achievement('social_80', '社交达人', '🤝', '社交达到 80。', '成长', s => getStat(s, 'social') >= 80 || tag(s, '社交达人')),
    achievement('basketball_champion', '赛场冠军', '🥇', '赢得一项篮球赛事冠军。', '篮球', s => flag(s, 'basketball_champion') || getResource(s, 'basketballWins') >= 1),
    achievement('basketball_legend', '北城篮球之光', '🏀', '篮球能力达到 90 且声望达到 60。', '篮球', s => getStat(s, 'basketball') >= 90 && getStat(s, 'reputation') >= 60),
    achievement('basketball_coach', '桃李满场', '⛹️', '成为篮球教练。', '篮球', s => careerIs(s, 'basketball_assistant', 'youth_basketball_coach', 'club_basketball_coach', 'pro_assistant_coach', 'head_basketball_coach')),
    achievement('pro_basketball', '职业试炼', '🔥', '进入职业或半职业篮球赛场。', '篮球', s => careerIs(s, 'semi_pro_player', 'pro_player')),
    achievement('pe_teacher', '操场上的老师', '🏫', '成为体育教师。', '职业', s => careerIs(s, 'pe_teacher', 'senior_pe_teacher', 'pe_research_lead', 'school_administrator')),
    achievement('hotel_manager', '服务的艺术', '🛎️', '成为酒店经理。', '职业', s => careerIs(s, 'hotel_manager', 'hotel_general_manager', 'international_hotel_manager')),
    achievement('hotel_general_manager', '城市待客厅', '🏙️', '成为酒店总经理或国际酒店管理者。', '职业', s => careerIs(s, 'hotel_general_manager', 'international_hotel_manager')),
    achievement('first_business', '第一次创业', '🚀', '开启第一个创业项目。', '创业', s => flag(s, 'first_business_started') || careerIs(s, 'basketball_camp_founder', 'gym_owner', 'sports_store_owner', 'travel_media_founder', 'hospitality_service_founder', 'startup_founder', 'sports_brand_founder')),
    achievement('business_failure', '交了学费', '🧱', '经历一次创业失败。', '创业', s => flag(s, 'business_failed')),
    achievement('comeback', '东山再起', '🌅', '创业失败后重新实现盈利。', '创业', s => flag(s, 'business_failed') && (flag(s, 'business_profitable') || totalAssets(s) >= 300000)),
    achievement('creator_10k', '万粉起步', '📱', '粉丝数突破 10,000。', '自媒体', s => getResource(s, 'fans') >= 10000, s => [getResource(s, 'fans'), 10000]),
    achievement('creator_100k', '十万目光', '🎥', '粉丝数突破 100,000。', '自媒体', s => getResource(s, 'fans') >= 100000, s => [getResource(s, 'fans'), 100000]),
    achievement('creator_million', '百万粉丝博主', '✨', '粉丝数突破 1,000,000。', '自媒体', s => getResource(s, 'fans') >= 1000000, s => [getResource(s, 'fans'), 1000000]),
    achievement('viral_video', '一夜爆火', '⚡', '有一支视频爆火。', '自媒体', s => flag(s, 'viral_video')),
    achievement('first_abroad', '第一次出发', '✈️', '第一次走出国门。', '旅行', s => flag(s, 'went_abroad') || getResource(s, 'countries') >= 1),
    achievement('five_countries', '五国足迹', '🗺️', '去过至少 5 个国家。', '旅行', s => getResource(s, 'countries') >= 5, s => [getResource(s, 'countries'), 5]),
    achievement('world_traveler', '环球旅行者', '🌍', '去过至少 15 个国家。', '旅行', s => getResource(s, 'countries') >= 15, s => [getResource(s, 'countries'), 15]),
    achievement('first_car', '第一辆车', '🚗', '拥有第一辆车。', '生活', s => getResource(s, 'cars') >= 1 || flag(s, 'car_owned')),
    achievement('first_home', '安家之所', '🏠', '拥有第一套房。', '生活', s => getResource(s, 'property') >= 1 || flag(s, 'home_owned')),
    achievement('marriage', '我们结婚吧', '💍', '步入婚姻。', '关系', s => flag(s, 'married') || hasRelationship(s, r => r && r.status === 'married')),
    achievement('happy_family', '灯火可亲', '👨‍👩‍👧', '拥有稳定的家庭关系与高快乐值。', '关系', s => getStat(s, 'happiness') >= 75 && hasRelationship(s, r => r && r.type === 'family' && n(r.relation) >= 75)),
    achievement('adventurer', '人生冒险家', '🧭', '拥有“冒险家”标签或完成 3 次重大出发。', '人生', s => tag(s, '冒险家') || countTimeline(s, '出发') >= 3),
    achievement('health_guardian', '身体是本钱', '💪', '50 岁后健康仍不低于 80。', '人生', s => age(s) >= 50 && getStat(s, 'health') >= 80),
    achievement('late_bloomer', '大器晚成', '🌱', '40 岁后声望达到 70。', '人生', s => age(s) >= 40 && getStat(s, 'reputation') >= 70),
    achievement('workaholic', '工作狂', '🌙', '获得“工作狂”标签。', '人生', s => tag(s, '工作狂') || flag(s, 'workaholic')),
    achievement('homecoming', '根在北城', '⛰️', '回到北城发展并建立事业。', '人生', s => flag(s, 'returned_to_north_city') && (flag(s, 'business_profitable') || getStat(s, 'reputation') >= 35))
  ];

  const ACHIEVEMENT_BY_ID = Object.create(null);
  ACHIEVEMENTS.forEach(function (item) { ACHIEVEMENT_BY_ID[item.id] = item; });

  function unlockedIds(state, supplied) {
    const source = supplied || (state && (state.achievements || state.unlockedAchievements)) || [];
    if (Array.isArray(source)) return source.map(function (entry) { return typeof entry === 'string' ? entry : entry && entry.id; }).filter(Boolean);
    return Object.keys(source).filter(function (id) { return source[id]; });
  }
  function isAchievementUnlocked(state, id, supplied) { return unlockedIds(state, supplied).includes(id); }
  function checkAchievements(state, suppliedUnlocked) {
    const owned = unlockedIds(state, suppliedUnlocked);
    return ACHIEVEMENTS.filter(function (item) {
      try { return !owned.includes(item.id) && item.condition(state || {}); } catch (error) { return false; }
    }).map(function (item) { return { id: item.id, unlockedAt: state && state.date ? state.date : null }; });
  }
  function unlockNewAchievements(state) {
    const gained = checkAchievements(state);
    if (!state || !gained.length) return gained;
    if (!Array.isArray(state.achievements)) state.achievements = unlockedIds(state);
    gained.forEach(function (item) { if (!state.achievements.includes(item.id)) state.achievements.push(item.id); });
    return gained;
  }
  function getAchievementProgress(itemOrId, state) {
    const item = typeof itemOrId === 'string' ? ACHIEVEMENT_BY_ID[itemOrId] : itemOrId;
    if (!item || !item.progress) return null;
    const values = item.progress(state || {});
    return { current: Math.max(0, n(values[0])), target: Math.max(1, n(values[1])), ratio: Math.min(1, Math.max(0, n(values[0]) / Math.max(1, n(values[1])))) };
  }

  function ending(id, title, icon, description, priority, condition) {
    return { id: id, name: title, title: title, icon: icon, description: description, priority: priority, condition: condition };
  }
  // 23 种人生结局，按 priority 从特殊结局到兜底结局判定。
  const ENDINGS = [
    ending('debt_collapse', '负债的十字路口', '🌧️', '高杠杆和连续失误让你背上重债，但人生仍有重新整理的机会。', 100, s => getResource(s, 'debt') >= 1000000 && totalAssets(s) <= 0),
    ending('health_early_retirement', '因健康提前退场', '🩺', '长期透支让身体按下暂停键，余生的课题变成好好生活。', 98, s => age(s) < 60 && getStat(s, 'health') <= 18),
    ending('young_wealth', '年轻富豪', '👑', '你在仍然年轻时拥有了千万级资产，也要决定财富为谁服务。', 95, s => age(s) <= 45 && totalAssets(s) >= 10000000),
    ending('sports_brand_tycoon', '体育品牌创始人', '🏆', '从热爱篮球到建立品牌，你让一群人因为运动而获得力量。', 93, s => careerIs(s, 'sports_brand_founder') && totalAssets(s) >= 3000000),
    ending('basketball_head_coach', '职业篮球教练', '📣', '你在战术板与赛场边度过一生，把热爱传给了更多球员。', 92, s => careerIs(s, 'head_basketball_coach')),
    ending('north_city_camp_founder', '北城篮球训练营创始人', '🏀', '你回到熟悉的城市，给许多孩子打开了通往球场的大门。', 90, s => careerIs(s, 'basketball_camp_founder') && (flag(s, 'returned_to_north_city') || String(s && s.city || '').includes('北城'))),
    ending('international_hotel_leader', '国际酒店管理者', '🏨', '你在不同国家迎送来往的人群，把中国式的可靠带到更远的地方。', 89, s => careerIs(s, 'international_hotel_manager', 'hotel_general_manager')),
    ending('million_creator', '百万粉丝励志博主', '🎬', '你的镜头记录了真实的成长，也给陌生人带去继续前进的勇气。', 88, s => getResource(s, 'fans') >= 1000000 && careerIs(s, 'major_creator', 'content_studio_founder')),
    ending('travel_media', '旅行自媒体创作者', '🗺️', '你把一次次出发变成工作，也把世界变成了自己的课堂。', 86, s => careerIs(s, 'travel_media_founder') && getResource(s, 'countries') >= 10),
    ending('serial_entrepreneur', '连续创业者', '🚀', '有的项目成功，有的项目失败，但你始终没有停止创造。', 84, s => careerIs(s, 'startup_founder', 'hospitality_service_founder') && (flag(s, 'business_failed') || flag(s, 'business_exit'))),
    ending('overseas_settlement', '海外定居', '🌏', '你在异国建立了自己的生活秩序，也始终记得故乡的方向。', 82, s => flag(s, 'overseas_settled') || (careerIs(s, 'overseas_hotel_supervisor', 'international_hotel_manager', 'overseas_freelancer') && age(s) >= 40)),
    ending('excellent_pe_teacher', '优秀体育教师', '🏫', '你在操场上度过许多个春夏秋冬，学生们记得你教会他们的坚持。', 80, s => careerIs(s, 'senior_pe_teacher', 'pe_research_lead', 'school_administrator')),
    ending('investment_loss', '投资失利后的清醒', '📉', '一次重仓让你失去很多，但也终于学会了风险的重量。', 78, s => flag(s, 'investment_crash') && totalAssets(s) < 100000),
    ending('lonely_success', '孤独的成功者', '🌃', '事业与财富都不差，只是晚归时很少有人等你分享一天。', 75, s => totalAssets(s) >= 1000000 && getStat(s, 'happiness') <= 38 && !hasRelationship(s, r => r && r.status === 'married')),
    ending('happy_family', '家庭幸福', '🏡', '你或许没有成为传说，却拥有一盏愿意为你亮着的灯。', 72, s => getStat(s, 'happiness') >= 72 && (flag(s, 'married') || hasRelationship(s, r => r && r.status === 'married'))),
    ending('return_to_north_city', '回到北城发展', '⛰️', '见过远方后，你选择把能力带回家乡，过踏实而有根的日子。', 70, s => flag(s, 'returned_to_north_city') && getStat(s, 'reputation') >= 35),
    ending('life_adventurer', '人生冒险家', '🧭', '你没有沿着标准答案前进，却把生命走成了自己的地图。', 68, s => (tag(s, '冒险家') || tag(s, '自由灵魂')) && getResource(s, 'countries') >= 8),
    ending('late_bloomer', '大器晚成', '🌱', '前半程并不耀眼，后半程的你却活出了越来越清晰的自己。', 65, s => age(s) >= 50 && getStat(s, 'reputation') >= 70),
    ending('unfulfilled_basketball', '未完成的篮球梦', '⛹️', '你仍会在路过球场时停下来，但这份遗憾也成为继续生活的一部分。', 60, s => getStat(s, 'basketball') >= 70 && !careerIs(s, 'semi_pro_player', 'pro_player', 'basketball_assistant', 'youth_basketball_coach', 'club_basketball_coach', 'head_basketball_coach')),
    ending('ordinary_happy', '普通而幸福的人生', '☀️', '收入未必惊人，但健康、朋友和日常的笑声让这一生温暖完整。', 50, s => getStat(s, 'happiness') >= 60 && getStat(s, 'health') >= 55),
    ending('steady_worker', '平凡上班族', '💼', '你用稳定和责任撑起了生活，也在平凡日子里留下了自己的印记。', 30, s => age(s) >= 45 && getResource(s, 'debt') < 100000),
    ending('quiet_life', '慢慢活着', '🍃', '人生并没有轰轰烈烈的标签，但每一次选择都构成了独一无二的你。', 1, s => Boolean(s))
  ];
  const ENDING_BY_ID = Object.create(null);
  ENDINGS.forEach(function (item) { ENDING_BY_ID[item.id] = item; });
  function determineEnding(state, options) {
    const settings = Object.assign({ requireEnd: false }, options || {});
    const finished = state && (state.gameOver || state.isGameOver || state.ended || age(state) >= 80);
    if (settings.requireEnd && !finished) return null;
    return ENDINGS.find(function (item) { try { return item.condition(state || {}); } catch (error) { return false; } }) || ENDING_BY_ID.quiet_life;
  }
  function getEligibleEndings(state) { return ENDINGS.filter(function (item) { try { return item.condition(state || {}); } catch (error) { return false; } }); }

  global.ACHIEVEMENTS = ACHIEVEMENTS;
  global.ACHIEVEMENT_BY_ID = ACHIEVEMENT_BY_ID;
  global.isAchievementUnlocked = isAchievementUnlocked;
  global.checkAchievements = checkAchievements;
  global.unlockNewAchievements = unlockNewAchievements;
  global.getAchievementProgress = getAchievementProgress;
  global.ENDINGS = ENDINGS;
  global.ENDING_BY_ID = ENDING_BY_ID;
  global.determineEnding = determineEnding;
  global.getEligibleEndings = getEligibleEndings;
})(window);
