/*
 * 《人生选择》核心循环。
 * 事件数据、职业、关系和成就都放在独立文件中；本文件负责把它们串成可持续游玩的每月人生。
 */
(function () {
  'use strict';

  const P = () => window.LIFE_PLAYER;
  const S = () => window.LIFE_SAVE;
  const U = () => window.LIFE_UI;
  const C = () => window.LIFE_CHARACTER;
  let player = null;
  let introFocus = 'balanced';
  let creatorConfig = null;
  let creatorStep = 0;
  const TURN_MONTHS = 2;

  const categoryLabels = {
    university: '大学', exam: '考试', basketball: '篮球', training: '训练', work: '工作', parttime: '兼职',
    overseas: '海外', english: '英语', travel: '旅行', visa: '签证', friendship: '友情', romance: '感情',
    family: '家庭', health: '健康', accident: '突发', money: '金钱', business: '创业', media: '自媒体',
    investment: '投资', promotion: '职业', life: '人生', study: '学习', social: '社交'
  };

  function canonicalCategory(category, eventId) {
    const map = {
      '大学与考试': 'university', '篮球与训练': 'basketball', '篮球训练与比赛': 'basketball', '工作与兼职': 'work',
      '海外与英语': 'overseas', '海外与旅行': 'overseas', '旅行与签证': 'travel', '友情与恋爱': 'friendship',
      '友情与家庭': 'friendship', '恋爱与关系': 'romance', '家庭与健康': 'health', '健康与意外': 'health',
      '突发事件': 'accident',
      '金钱与投资': 'money', '金钱与理财': 'money', '创业与自媒体': 'business', '创业与生意': 'business',
      '投资与理财': 'investment', '职业发展': 'promotion', '自媒体': 'media'
    };
    const text = String(eventId || '');
    if (category === '创业与自媒体' && /(video|media|creator|content|mcn|fan)/i.test(text)) return 'media';
    return map[category] || category || 'life';
  }

  function monthIndex(date) {
    return date.year * 12 + date.month;
  }

  function clone(data) {
    return data ? JSON.parse(JSON.stringify(data)) : data;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function weightedPick(items, weightKey) {
    if (!items || !items.length) return null;
    const total = items.reduce((sum, item) => sum + Math.max(0, Number(item[weightKey || 'weight']) || 1), 0);
    let point = Math.random() * Math.max(total, 1);
    for (const item of items) {
      point -= Math.max(0, Number(item[weightKey || 'weight']) || 1);
      if (point <= 0) return item;
    }
    return items[items.length - 1];
  }

  const NORTH_CITY_STORY_ID = 'north_city_opportunity';
  const NORTH_CITY_STORY_TOTAL = 3;

  function startNorthCityStory() {
    if (!player) return;
    player.storyArc = {
      id: NORTH_CITY_STORY_ID,
      title: '北城机会',
      started: true,
      step: 0,
      total: NORTH_CITY_STORY_TOTAL,
      completed: false,
      completedAt: null,
      followUpMonth: null,
      followUpResolved: false,
      lastChoiceId: null,
      outcome: null
    };
  }

  function hasFlag(flag) {
    return Boolean(player && Array.isArray(player.flags) && player.flags.includes(flag));
  }

  /*
   * 新玩家的前三幕不是三张互不相干的随机卡片，而是一条会记住选择的短篇主线。
   * 这段剧情承担开局教学、即时目标和六个月后的长期回响。
   */
  function getNorthCityOpeningEvent() {
    const arc = player && player.storyArc;
    if (!arc || !arc.started || arc.completed || arc.id !== NORTH_CITY_STORY_ID) return null;
    const step = Math.max(0, Math.min(NORTH_CITY_STORY_TOTAL - 1, Number(arc.step) || 0));
    if (step === 0) {
      return {
        id: 'north_city_story_call', storyArcId: NORTH_CITY_STORY_ID, storyStep: 0, sceneId: 'north-city-call',
        category: 'basketball', surprise: true, eyebrow: '序章 · 第一幕 / 陌生来电',
        title: '凌晨十一点，陌生号码打来',
        description: '北城的球场刚关灯。电话那头说城市联队临时少一名后卫，四十分钟后试训。机会来得不像机会，更像一道没有准备时间的考题。',
        hint: '这不是独立事件；你的决定会改变接下来的两幕',
        options: [
          { id: 'north_call_go_now', label: '抓起球鞋，马上赶过去', hint: '抢时间，也承担准备不足', result: '你在路边拦下车，把心跳声当成了出发哨。', effects: { money: -68, stats: { courage: 4, basketball: 2, pressure: 3 }, activity: { basketball: 1 }, flagsAdd: ['north_call_go_now'] } },
          { id: 'north_call_prepare', label: '争取明晚，做一份训练清单', hint: '用准备换稳定表现', result: '你没有被“立刻”牵着走。对方沉默片刻，答应给你二十四小时。', effects: { stats: { discipline: 4, knowledge: 2, pressure: 2 }, activity: { basketball: 1 }, flagsAdd: ['north_call_prepare'] } },
          { id: 'north_call_verify', label: '先核实身份，再和家人商量', hint: '谨慎，但可能错过窗口', result: '你查清了联系人，也把这通电话带回了饭桌。机会没有消失，只是变得更真实。', effects: { stats: { knowledge: 3, social: 2, pressure: -1 }, activity: { family: 1 }, flagsAdd: ['north_call_verify'] } }
        ]
      };
    }
    if (step === 1 && hasFlag('north_call_go_now')) {
      return {
        id: 'north_city_story_midnight_tryout', storyArcId: NORTH_CITY_STORY_ID, storyStep: 1, sceneId: 'midnight-tryout',
        category: 'basketball', surprise: true, eyebrow: '序章 · 第二幕 / 临时试训',
        title: '灯坏了一半的午夜试训',
        description: '场边没有观众，教练只看三件事：你能不能处理压力、愿不愿意防守、最后一球敢不敢要。你的腿还没完全热开。',
        hint: '第一幕的冒险让你更早站上球场，也让失误代价更高',
        options: [
          { id: 'north_tryout_attack', label: '主动要球，打最擅长的一次突破', hint: '高风险 · 高曝光', result: '你在防守合拢前完成上篮。落地不算漂亮，但所有人都抬起了头。', effects: { stats: { basketball: 5, courage: 4, reputation: 3, pressure: 4 }, basketballGames: 1, flagsAdd: ['north_tryout_attack'] } },
          { id: 'north_tryout_team', label: '先防守和传球，让队友变得更好', hint: '稳定 · 团队印象', result: '你没有刷出耀眼的数据，却让这一组人突然像一支球队。', effects: { stats: { basketball: 3, social: 4, discipline: 3, reputation: 2 }, basketballGames: 1, flagsAdd: ['north_tryout_team'] } },
          { id: 'north_tryout_guard', label: '感觉小腿发紧，主动要求暂停', hint: '保护健康 · 可能失去位置', result: '你没有拿身体赌一次陌生试训。教练没表态，却记下了你的判断。', effects: { stats: { health: 3, discipline: 2, courage: 1, reputation: -1 }, flagsAdd: ['north_tryout_guard'] } }
        ]
      };
    }
    if (step === 1 && hasFlag('north_call_prepare')) {
      return {
        id: 'north_city_story_preparation', storyArcId: NORTH_CITY_STORY_ID, storyStep: 1, sceneId: 'midnight-tryout',
        category: 'training', surprise: true, eyebrow: '序章 · 第二幕 / 二十四小时',
        title: '把二十四小时拆成一张清单',
        description: '体能、录像、睡眠和路线都被你写进清单。时间仍然不够，但你可以决定把有限的精力放在哪里。',
        hint: '第一幕的准备为你打开了更稳定、也更克制的选择',
        options: [
          { id: 'north_prepare_video', label: '研究对手录像，练三个最实用的回合', hint: '理解比赛 · 稳定发挥', result: '你没有练花哨动作，只把最可能遇到的三个回合走了一遍。', effects: { stats: { basketball: 4, knowledge: 3, discipline: 2 }, flagsAdd: ['north_prepare_video'] } },
          { id: 'north_prepare_body', label: '减少加练，优先恢复和睡眠', hint: '健康 · 临场状态', result: '第二天站上球场时，你的呼吸比其他人更稳。', effects: { stats: { health: 4, fitness: 2, pressure: -2 }, flagsAdd: ['north_prepare_body'] } },
          { id: 'north_prepare_network', label: '请老队友模拟高强度对抗', hint: '关系 · 真实压力', result: '朋友陪你练到灯熄。那些不留情面的防守，比鼓励更有用。', effects: { stats: { basketball: 3, social: 3, pressure: 2 }, relationships: { friends: 3 }, flagsAdd: ['north_prepare_network'] } }
        ]
      };
    }
    if (step === 1) {
      return {
        id: 'north_city_story_family_table', storyArcId: NORTH_CITY_STORY_ID, storyStep: 1, sceneId: 'family-dinner-new',
        category: 'family', surprise: true, eyebrow: '序章 · 第二幕 / 饭桌决定',
        title: '饭菜还热着，机会摆上了桌',
        description: '家人没有替你做决定。父亲只问：“如果最后没选上，你会不会后悔去过？”屋外的城市很亮，桌上忽然安静下来。',
        hint: '谨慎让你看清风险，也让真正想要的东西浮出水面',
        options: [
          { id: 'north_family_go', label: '告诉家人：我还是想去试一次', hint: '获得支持 · 勇气', result: '没有人再劝你稳一点。母亲把没吃完的饭装进盒子，让你路上带着。', effects: { stats: { courage: 4, happiness: 3, pressure: -2 }, relationships: { parents: 4 }, flagsAdd: ['north_family_go'] } },
          { id: 'north_family_terms', label: '先问清合同、训练量和受伤保障', hint: '规则意识 · 谈判', result: '你把热血旁边的条款逐条问清，对方第一次认真把你当成成年人。', effects: { stats: { knowledge: 4, social: 3, courage: 2 }, flagsAdd: ['north_family_terms'] } },
          { id: 'north_family_decline', label: '拒绝这次，把录像投给更合适的队伍', hint: '放弃窗口 · 保留主动', result: '你挂断电话，却没有关掉那条路。你开始剪一段真正代表自己的比赛录像。', effects: { stats: { discipline: 3, happiness: -1, pressure: -2 }, followers: 30, flagsAdd: ['north_family_decline'] } }
        ]
      };
    }
    const momentum = hasFlag('north_tryout_attack') || hasFlag('north_tryout_team') || hasFlag('north_prepare_video') || hasFlag('north_family_go');
    return {
      id: 'north_city_story_list', storyArcId: NORTH_CITY_STORY_ID, storyStep: 2, sceneId: momentum ? 'midnight-tryout' : 'north-city-call',
      category: 'basketball', surprise: true, eyebrow: '序章 · 第三幕 / 名单之前',
      title: '名单公布前的最后十分钟',
      description: momentum
        ? '教练发来一句很短的话：“我们还差最后一个决定。”你知道，真正被选择的从来不只是球技，还有你准备承担怎样的生活。'
        : '试训机会没有按想象推进，但那段录像被另一位教练看到。命运没有给原来的答案，却递来一个新的入口。',
      hint: '前两幕已经改变了现在可走的路；这一幕决定序章结局',
      options: [
        { id: 'north_final_roster', label: '争取名单位置，把训练写进生活', hint: momentum ? '主线结局 · 城市联队' : '主动争取 · 仍有机会', result: momentum ? '名单刷新时，霍开然的名字出现在最后一行。真正困难的部分，现在才开始。' : '你没有被直接选中，却争取到跟队训练资格。门没有全开，但足够你走进去。', effects: { stats: { basketball: 4, discipline: 3, reputation: momentum ? 5 : 2, pressure: 3 }, basketballGames: 1, flagsAdd: ['north_story_roster'] } },
        { id: 'north_final_creator', label: '记录全过程，把故事发出去', hint: '主线结局 · 内容创作者', result: '你没有把镜头只对准结果。犹豫、汗水和那通电话，让更多人第一次记住了你。', effects: { followers: 480, stats: { reputation: 4, courage: 3, social: 2 }, activity: { media: 2 }, flagsAdd: ['north_story_creator'] } },
        { id: 'north_final_independent', label: '不追名单，按自己的节奏继续成长', hint: '主线结局 · 独立路线', result: '你把“被选中”从人生目标里拿掉。球场仍在，训练仍在，而决定权回到了自己手里。', effects: { stats: { health: 3, happiness: 3, discipline: 4, pressure: -4 }, flagsAdd: ['north_story_independent'] } }
      ]
    };
  }

  function getNorthCityFollowUpEvent() {
    const arc = player && player.storyArc;
    if (!arc || !arc.completed || arc.followUpResolved || !Number.isFinite(Number(arc.followUpMonth))) return null;
    if (monthIndex(player.date) < Number(arc.followUpMonth)) return null;
    const outcome = arc.outcome;
    if (outcome === 'north_final_creator') {
      return {
        id: 'north_city_story_echo_creator', storyArcId: NORTH_CITY_STORY_ID, storyFollowUp: true, sceneId: 'north-city-call', category: 'media', surprise: true,
        eyebrow: '主线回响 · 六个月后', title: '那段视频，终于被正确的人看见',
        description: '一家本地运动品牌联系你。他们不只想买一次曝光，还想让你讲清楚普通人为什么仍愿意认真训练。', hint: '六个月前的选择正在改变今天',
        options: [
          { id: 'north_echo_tell_truth', label: '保留真实经历，只接符合方向的合作', result: '你第一次在合作里守住了自己的表达。', effects: { money: 3800, followers: 900, stats: { reputation: 4, discipline: 2 } } },
          { id: 'north_echo_take_offer', label: '抓住热度，做一轮高频内容', result: '关注迅速增长，压力也像未读消息一样堆起来。', effects: { money: 7200, followers: 1800, stats: { reputation: 3, pressure: 5 } } }
        ]
      };
    }
    if (outcome === 'north_final_independent') {
      return {
        id: 'north_city_story_echo_independent', storyArcId: NORTH_CITY_STORY_ID, storyFollowUp: true, sceneId: 'family-dinner-new', category: 'life', surprise: true,
        eyebrow: '主线回响 · 六个月后', title: '你没进名单，却成了球场上最稳定的人',
        description: '附近的青少年训练营问你愿不愿意周末带一组孩子。没有聚光灯，但有人真的需要你的经验。', hint: '没有被选中的路，也可能长出自己的答案',
        options: [
          { id: 'north_echo_coach', label: '答应带队，认真准备第一节课', result: '孩子们记住的不是你的履历，而是你第一次叫对了每个人的名字。', effects: { money: 1200, monthlyIncome: 900, stats: { social: 4, happiness: 4, reputation: 3 }, workExperience: 1 } },
          { id: 'north_echo_keep_training', label: '婉拒邀请，继续专注自己的训练', result: '你没有因为一份肯定改变方向，也没有因此否定它。', effects: { stats: { basketball: 4, discipline: 3, happiness: 1 } } }
        ]
      };
    }
    return {
      id: 'north_city_story_echo_roster', storyArcId: NORTH_CITY_STORY_ID, storyFollowUp: true, sceneId: 'midnight-tryout', category: 'basketball', surprise: true,
      eyebrow: '主线回响 · 六个月后', title: '主场最后一攻，球到了你手里',
      description: '比分相同，时间只剩八秒。六个月前你争取的是一个名字，今晚你要决定怎样使用这次信任。', hint: '能力会影响结果，但选择仍然属于你',
      options: [
        { id: 'north_echo_last_shot', label: '相信手感，投最后一球', result: '球在空中停了很久。灯亮之前，它干净地穿过篮网。', effects: { stats: { basketball: 5, courage: 4, reputation: 6, pressure: 3 }, basketballGames: 1, basketballWins: 1 } },
        { id: 'north_echo_read_defense', label: '阅读夹击，把球传给空位队友', result: '助攻没有绝杀镜头耀眼，却让全队一起冲向了你。', effects: { stats: { basketball: 3, social: 4, reputation: 5 }, basketballGames: 1, basketballWins: 1 } }
      ]
    };
  }

  function getStoryDrivenEvent() {
    return getNorthCityOpeningEvent() || getNorthCityFollowUpEvent();
  }

  function updateStoryArcAfterChoice(event, option, changes) {
    const arc = player && player.storyArc;
    if (!arc || !event || event.storyArcId !== NORTH_CITY_STORY_ID) return;
    arc.lastChoiceId = option.id || option.label;
    if (event.storyFollowUp) {
      arc.followUpResolved = true;
      recordDelta(changes, '主线回响', 1, 'milestone');
      addTimeline('北城机会 · 回响', `六个月前的选择在今天得到回应：${option.label}。`, 'milestone');
      return;
    }
    arc.step = Math.max(Number(arc.step) || 0, Number(event.storyStep) + 1);
    if (arc.step >= NORTH_CITY_STORY_TOTAL) {
      arc.completed = true;
      arc.completedAt = monthIndex(player.date);
      arc.followUpMonth = arc.completedAt + 6;
      arc.outcome = option.id || null;
      recordDelta(changes, '序章完成', 1, 'milestone');
      addTimeline('北城机会 · 序章完成', `你用「${option.label}」结束了序章。这个答案会在六个月后再次出现。`, 'milestone');
    }
  }

  function getCareer(id) {
    if (typeof window.getCareer === 'function') return window.getCareer(id);
    if (Array.isArray(window.CAREERS)) return window.CAREERS.find((career) => career.id === id) || null;
    return null;
  }

  function careerIncome(career) {
    if (!career) return 0;
    return Number(career.monthlyIncome ?? career.income ?? career.salary ?? 0) || 0;
  }

  function careerLabel() {
    return player && player.career ? player.career.name : '待定';
  }

  function safeArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return [];
    return [value];
  }

  // Paid progression is only a projection of a signed server snapshot. It never contains
  // a wallet balance or a client-calculated price, so changing a local save cannot buy or unlock anything.
  function paidAttributes(state) {
    const values = state && state.paidGrowth && state.paidGrowth.effectiveAttributes;
    return values && typeof values === 'object' ? values : {};
  }

  function effectiveGameStat(state, key) {
    const local = Number(state && state.stats && state.stats[key]) || 0;
    const paid = paidAttributes(state);
    const average = (...keys) => keys.reduce((total, item) => total + (Number(paid[item]) || 0), 0) / keys.length;
    const mapped = {
      health: paid.health,
      fitness: average('strength', 'speed', 'vertical'),
      basketball: paid.basketball,
      english: paid.english,
      knowledge: paid.intelligence,
      social: average('social', 'emotional_intelligence'),
      discipline: paid.career,
      reputation: paid.charm,
      luck: paid.luck
    }[key];
    return Math.max(local, Number.isFinite(mapped) ? mapped : 0);
  }

  function paidCategoryFactor(category) {
    const paid = paidAttributes(player);
    if (!Object.keys(paid).length) return 0;
    const keys = {
      basketball: ['basketball', 'strength', 'speed', 'vertical'], training: ['strength', 'speed', 'vertical', 'health'],
      university: ['intelligence', 'career'], exam: ['intelligence', 'career'], study: ['intelligence', 'career'],
      work: ['career', 'intelligence', 'social'], parttime: ['career', 'social'], promotion: ['career', 'social', 'intelligence'],
      overseas: ['english', 'social', 'emotional_intelligence'], english: ['english', 'intelligence'], travel: ['english', 'luck'], visa: ['english', 'career'],
      friendship: ['social', 'emotional_intelligence', 'charm'], romance: ['social', 'emotional_intelligence', 'charm'], social: ['social', 'emotional_intelligence', 'charm'],
      money: ['wealth', 'intelligence', 'luck'], investment: ['wealth', 'intelligence', 'luck'], business: ['wealth', 'career', 'social'],
      media: ['charm', 'social', 'career'], health: ['health', 'strength'], accident: ['health', 'luck']
    }[category] || ['career', 'health', 'luck'];
    const score = keys.reduce((sum, key) => sum + (Number(paid[key]) || 50), 0) / keys.length;
    return (score - 50) / 320;
  }

  function includesAll(source, expected) {
    const values = safeArray(expected);
    return values.every((value) => source.includes(value));
  }

  function includesAny(source, expected) {
    const values = safeArray(expected);
    return values.some((value) => source.includes(value));
  }

  /* 可复用的条件解释器。事件和隐藏选项都使用同一套条件。 */
  function meetsConditions(conditions, state) {
    if (!conditions) return true;
    if (typeof conditions === 'function') {
      try { return Boolean(conditions(state)); } catch (_) { return false; }
    }
    if (Array.isArray(conditions)) return conditions.every((item) => meetsConditions(item, state));
    if (typeof conditions !== 'object') return Boolean(conditions);
    if (conditions.all && !safeArray(conditions.all).every((item) => meetsConditions(item, state))) return false;
    if (conditions.any && !safeArray(conditions.any).some((item) => meetsConditions(item, state))) return false;
    if (conditions.not && safeArray(conditions.not).some((item) => meetsConditions(item, state))) return false;
    if (conditions.minAge !== undefined && state.age < conditions.minAge) return false;
    if (conditions.maxAge !== undefined && state.age > conditions.maxAge) return false;
    if (conditions.stage && !safeArray(conditions.stage).includes(P().getLifeStage(state))) return false;
    if (conditions.career && !safeArray(conditions.career).includes(state.career.id)) return false;
    if (conditions.careers && !safeArray(conditions.careers).includes(state.career.id)) return false;
    if (conditions.notCareer && safeArray(conditions.notCareer).includes(state.career.id)) return false;
    if ((conditions.flags || conditions.flagsAll) && !includesAll(state.flags, conditions.flags || conditions.flagsAll)) return false;
    if ((conditions.anyFlags || conditions.flagsAny) && !includesAny(state.flags, conditions.anyFlags || conditions.flagsAny)) return false;
    if ((conditions.notFlags || conditions.flagsNone) && includesAny(state.flags, conditions.notFlags || conditions.flagsNone)) return false;
    if (conditions.tags && !includesAll(state.tags, conditions.tags)) return false;
    if (conditions.anyTags && !includesAny(state.tags, conditions.anyTags)) return false;

    const statRequirements = conditions.stats || conditions.minStats || conditions.statsMin || {};
    for (const [rawKey, target] of Object.entries(statRequirements)) {
      const key = rawKey === 'stress' ? 'pressure' : rawKey;
      const actual = effectiveGameStat(state, key);
      if (typeof target === 'number' && actual < target) return false;
      if (target && typeof target === 'object') {
        if (target.min !== undefined && actual < target.min) return false;
        if (target.max !== undefined && actual > target.max) return false;
      }
    }

    const resourceRequirements = conditions.resources || conditions.minResources || conditions.resourcesMin || {};
    for (const [key, target] of Object.entries(resourceRequirements)) {
      const actual = Number(state.resources[key]) || 0;
      if (typeof target === 'number' && actual < target) return false;
      if (target && typeof target === 'object') {
        if (target.min !== undefined && actual < target.min) return false;
        if (target.max !== undefined && actual > target.max) return false;
      }
    }
    const workExperienceMin = conditions.workExperienceMin ?? conditions.minWorkExperience;
    const travelMin = conditions.travelMin ?? conditions.minTravelCountries ?? conditions.travelCountriesMin;
    const cashMin = conditions.minCash ?? conditions.cashMin ?? conditions.moneyMin;
    const cashMax = conditions.maxCash ?? conditions.cashMax;
    const followersMin = conditions.minFollowers ?? conditions.followersMin;
    if (workExperienceMin !== undefined && state.resources.workExperience < workExperienceMin) return false;
    if (travelMin !== undefined && state.resources.travelCountries < travelMin) return false;
    if (cashMin !== undefined && state.resources.cash < cashMin) return false;
    if (cashMax !== undefined && state.resources.cash > cashMax) return false;
    if (followersMin !== undefined && state.resources.followers < followersMin) return false;
    if (conditions.investmentAssetsMin !== undefined && state.resources.investments < conditions.investmentAssetsMin) return false;
    if (conditions.debtMin !== undefined && state.resources.debt < conditions.debtMin) return false;
    if (conditions.relationshipMin) {
      const groups = conditions.relationshipMin;
      const groupIds = {
        parents: ['mother', 'father'], family: ['mother', 'father'], friends: ['li_na', 'zhou_yu'], friend: ['li_na'], teammates: ['zhou_yu'], partner: ['song_yi', 'lin_xia'], overseas_friend: ['mike']
      };
      const related = Object.entries(groups).every(([key, minimum]) => {
        const ids = groupIds[key] || [key];
        return ids.some((id) => {
          const rel = state.relationships.find((item) => item.id === id || item.name === id);
          return rel && Number(rel.relation ?? rel.value ?? rel.affection ?? 0) >= Number(minimum);
        });
      });
      if (!related) return false;
    }
    if (conditions.minNetWorth !== undefined && P().getNetWorth(state) < conditions.minNetWorth) return false;
    if (conditions.choice && !Object.entries(conditions.choice).every(([key, value]) => state.choices[key] === value)) return false;
    if (conditions.foreshadow && !state.foreshadows.some((item) => (typeof item === 'string' ? item : item.id) === conditions.foreshadow)) return false;
    if (C() && typeof C().meetsCharacterConditions === 'function' && !C().meetsCharacterConditions(state, conditions)) return false;
    return true;
  }

  function eventStageMatches(event) {
    const stage = P().getLifeStage(player);
    const stages = event.stages || event.stage;
    if (stages) {
      const accepted = {
        early_childhood: ['early_childhood', 'infant', 'toddler'],
        childhood: ['childhood', 'primary'],
        youth: ['youth', 'teen', 'middle_school'],
        university: ['university', 'universal'],
        exploration: ['exploration', 'early', 'earlyCareer', 'universal'],
        early: ['early', 'earlyCareer', 'universal'],
        growth: ['growth', 'career', 'universal'],
        mid: ['mid', 'career', 'midlife', 'universal'],
        mature: ['mature', 'career', 'midlife', 'universal'],
        later: ['later', 'career', 'midlife', 'laterLife', 'universal']
      }[stage] || [stage, 'universal'];
      if (!safeArray(stages).some((item) => accepted.includes(item))) return false;
    }
    if (event.minAge !== undefined && player.age < event.minAge) return false;
    if (event.maxAge !== undefined && player.age > event.maxAge) return false;
    return meetsConditions(event.conditions || event.requirements, player);
  }

  function eventOnCooldown(event) {
    const last = player.seenEvents[event.id];
    const cooldown = Number(event.cooldown ?? 10);
    return last !== undefined && monthIndex(player.date) - last < cooldown;
  }

  function eventWeight(event) {
    const category = canonicalCategory(event.category, event.id);
    const focus = Number(player.eventBias[category] || 0);
    const activity = Number(player.activity[category] || 0);
    const unseenBoost = player.seenEvents[event.id] ? 0 : 1.7;
    const stageBoost = (event.stages || []).includes(P().getLifeStage(player)) ? 1.1 : 1;
    const characterMultiplier = C() && typeof C().getEventWeightMultiplier === 'function'
      ? Number(C().getEventWeightMultiplier(player, event) || 1)
      : 1;
    return Math.max(1, (Number(event.weight) || 10) * (1 + focus * 0.08 + Math.min(activity, 24) * 0.01) * unseenBoost * stageBoost * characterMultiplier);
  }

  function getFallbackEvent() {
    const age = Math.max(0, Number(player && player.age) || 0);
    // 事件库尚未覆盖早年时，不让婴幼儿落入求职、英语课或大学考试的通用兜底。
    if (age <= 2) return {
      id: 'early-childhood-home', category: 'family', title: '家里的灯还亮着',
      description: '你还不会说完整的句子。有人把你抱在怀里，窗外的风和屋里的声音，慢慢构成了你最早的世界。',
      options: [
        { id: 'safe-sleep', label: '在熟悉的怀抱里安稳睡去', hint: '安全感与健康', effects: { stats: { health: 2, happiness: 2, pressure: -2 }, activity: { family: 1 } }, result: '这一晚没有什么大事发生，但被好好照顾的感觉，会在很久以后留在你身上。' },
        { id: 'watch-light', label: '睁着眼看窗边的光影', hint: '好奇心', effects: { stats: { knowledge: 1, happiness: 1 }, activity: { family: 1 } }, result: '光影在墙上移动。你还不懂世界，却已经在认真看它。' }
      ]
    };
    if (age <= 5) return {
      id: 'childhood-play', category: 'life', title: '楼下的小空地',
      description: '傍晚的楼下有孩子在追着影子跑。家人叫你别走太远，但也没有催你马上回家。',
      options: [
        { id: 'play-together', label: '加入他们，一起跑一会儿', hint: '快乐与协调', effects: { stats: { happiness: 3, fitness: 1, social: 1 }, activity: { social: 1 } }, result: '你跑得满头是汗，第一次知道朋友可以只是一起笑很久。' },
        { id: 'ask-story', label: '回家缠着家人讲一个故事', hint: '语言与安全感', effects: { stats: { knowledge: 1, happiness: 2 }, activity: { family: 1 } }, result: '故事讲到最后，你已经困得睁不开眼，却还记得其中一个勇敢的人。' }
      ]
    };
    if (age <= 12 && player.educationStatus === 'deferred') return {
      id: 'childhood-community', category: 'life', title: '社区活动室的下午',
      description: '今天没有固定的课表。社区活动室开着门，院子里有人修自行车，也有人在教孩子画画。',
      options: [
        { id: 'learn-skill', label: '跟着大人学一个小手艺', hint: '动手与耐心', effects: { stats: { knowledge: 1, discipline: 1 }, activity: { study: 1 } }, result: '你学会的还不多，但第一次发现知识不只写在课本里。' },
        { id: 'neighborhood-game', label: '和邻居孩子一起玩', hint: '友情与快乐', effects: { stats: { happiness: 2, social: 1 }, activity: { social: 1 } }, result: '你们把一个普通下午，玩成了只属于彼此的冒险。' },
        { id: 'family-errand', label: '帮家人跑一趟小事', hint: '责任感', effects: { stats: { discipline: 1, happiness: 1 }, activity: { family: 1 } }, result: '事情很小，但家人认真地对你说了声谢谢。' }
      ]
    };
    if (age <= 12) return {
      id: 'childhood-schoolyard', category: 'study', title: '放学后的操场',
      description: '铃声响过，操场还留着一点太阳。作业本、朋友和一只旧球，都在等你决定先碰哪一个。',
      options: [
        { id: 'finish-homework', label: '先把作业写完', hint: '耐心与学习', effects: { stats: { knowledge: 2, discipline: 1 }, activity: { study: 1 } }, result: '你一笔一画写完最后一道题，天色也慢慢暗了下来。' },
        { id: 'play-ball', label: '和朋友再玩十分钟', hint: '体能与友情', effects: { stats: { fitness: 1, happiness: 2, social: 1 }, activity: { social: 1 } }, result: '球在地上弹了很多下，朋友喊你的名字比任何铃声都更响。' },
        { id: 'go-home', label: '回家帮忙摆饭桌', hint: '家庭关系', effects: { stats: { happiness: 1, discipline: 1 }, activity: { family: 2 } }, result: '饭菜的热气扑到脸上。你听见大人聊天，也知道自己被算在这个家里。' }
      ]
    };
    if (age <= 18 && player.educationStatus === 'deferred') return {
      id: 'youth-community-route', category: 'life', title: '没有课表的傍晚',
      description: '你暂时没有走进教室。街区的店铺在交班，球场有人约局，手机里也有一个免费的技能课程链接。',
      options: [
        { id: 'practice-skill', label: '跟着课程练一项技能', hint: '自学与执行', effects: { stats: { knowledge: 2, discipline: 2 }, activity: { study: 1 } }, result: '没有人点名，你还是把第一节课学完了。' },
        { id: 'help-neighbor', label: '去熟人店里搭把手', hint: '社会经验', effects: { stats: { social: 1, courage: 1 }, activity: { work: 1 } }, result: '你没有赚到多少钱，却第一次听懂了大人们说的“做事要有交代”。' },
        { id: 'court-community', label: '去球场和人打一会儿', hint: '热爱与连接', effects: { stats: { fitness: 2, basketball: 1, happiness: 1 }, activity: { basketball: 1 } }, result: '球场的灯亮起时，你知道自己仍然有可以认真投入的事。' }
      ]
    };
    if (age <= 18) return {
      id: 'youth-crossroads', category: 'life', title: '青春期的傍晚',
      description: '教室的灯亮着，操场的灯也亮着。你开始发现，时间不够用不是因为一天变短，而是想去的地方变多了。',
      options: [
        { id: 'study-plan', label: '列一张明天的学习计划', hint: '长期积累', effects: { stats: { knowledge: 2, discipline: 2, pressure: 1 }, activity: { study: 1 } }, result: '计划未必每一项都会完成，但你第一次认真给未来留出位置。' },
        { id: 'court-evening', label: '去操场打到天黑', hint: '热爱与体能', effects: { stats: { fitness: 2, basketball: 1, happiness: 1 }, activity: { basketball: 1 } }, result: '最后一球落地时，天已经黑了。你把热爱暂时放在了比成绩更前面的位置。' },
        { id: 'talk-family', label: '和家人聊聊最近的迷茫', hint: '关系与勇气', effects: { stats: { happiness: 2, courage: 1, pressure: -2 }, activity: { family: 1 } }, result: '他们未必立刻给出答案，但你发现说出来以后，路没有那么窄。' }
      ]
    };
    if (age <= 24 && player.educationStatus !== 'enrolled') return {
      id: 'young-adult-exploration', category: 'life', title: '还没有写进简历的日子',
      description: '你没有急着把自己交给一所学校。早班车、人群和一份空白笔记本，都在提醒你：自由也需要自己安排。',
      options: [
        { id: 'try-parttime', label: '去试一份短期工作', hint: '经验与独立', effects: { money: 300, stats: { social: 1, courage: 1 }, activity: { work: 1 } }, result: '报酬不多，但你第一次把自己的时间换成了真实的经验。' },
        { id: 'course-first', label: '报一门想学的线上课', hint: '继续学习', effects: { money: -120, stats: { knowledge: 2, discipline: 1 }, activity: { study: 1 } }, result: '没有课表替你安排，你决定先给自己上一课。' },
        { id: 'city-walk', label: '去陌生街区走走', hint: '视野与心情', effects: { money: -80, stats: { happiness: 2, courage: 1 }, activity: { travel: 1 } }, result: '你没走多远，却第一次认真看见了这座城市还有别的路。' }
      ]
    };
    return {
      id: 'monthly-reflection',
      category: 'life',
      title: '一个平常的月末',
      description: '没有惊天动地的消息。你拥有一段可以自己安排的时间，也拥有下一步的选择。',
      options: [
        { id: 'rest', label: '好好休息，整理生活', hint: '恢复状态', effects: { stats: { health: 2, happiness: 3, pressure: -5 } }, result: '你把节奏慢了下来，发现生活并不只由结果组成。' },
        { id: 'practice', label: '完成一组自我训练', hint: '提升体能与自律', effects: { stats: { fitness: 2, discipline: 2, pressure: 1 }, activity: { basketball: 1 } }, result: '训练结束后，你的呼吸很重，心里却更踏实。' },
        { id: 'learn', label: '学一节英语课', hint: '积累长期能力', effects: { stats: { english: 2, knowledge: 1, discipline: 1 }, activity: { english: 1 } }, result: '你没有立刻看见变化，但今天记住的表达，会在未来派上用场。' }
      ]
    };
  }

  function pickEvent() {
    const allEvents = Array.isArray(window.EVENTS) ? window.EVENTS : [];
    const candidates = allEvents.filter((event) => event && eventStageMatches(event) && !eventOnCooldown(event));
    const surpriseCandidates = candidates.filter((event) => event.surprise);
    const source = surpriseCandidates.length && Math.random() < 0.28 ? surpriseCandidates : candidates;
    const selected = getStoryDrivenEvent()
      || weightedPick(source.map((event) => ({ ...event, _pickWeight: eventWeight(event) })), '_pickWeight')
      || getFallbackEvent();
    player.seenEvents[selected.id] = monthIndex(player.date);
    player.currentEvent = selected;
    player.currentEventId = selected.id;
    player.selectedOption = null;
    return selected;
  }

  function getVisibleOptions(event) {
    const standard = safeArray(event.options);
    const hidden = safeArray(event.hiddenOptions).filter((option) => meetsConditions(option.conditions || option.requirements || option.showIf, player));
    const base = [...standard, ...hidden].filter((option) => !option.conditions || meetsConditions(option.conditions, player));
    const tailored = getCharacterOptions(event, base.length >= 4 ? 1 : Math.max(0, 4 - base.length));
    return base.length >= 4 && tailored.length ? [...base.slice(0, 3), tailored[0]] : [...base, ...tailored];
  }

  /* 这些不是装饰性标签：创建角色时的身体、家庭、外貌和能力会偶尔打开专属选择。 */
  function getCharacterOptions(event, room) {
    if (!room || !player || !player.character) return [];
    const character = player.character;
    const body = character.body || {};
    const appearance = character.appearance || {};
    const category = canonicalCategory(event && event.category, event && event.id);
    const extra = [];
    const add = (option) => { if (extra.length < room) extra.push(option); };
    if (category === 'basketball' || category === 'training') {
      if (body.height <= 165) add({ id: `low-center-${event.id}`, label: '压低重心，把这次机会打成一次突破', hint: '灵活性与低重心优势', result: '你没有试图长成别人。低重心和第一步，让对手不得不重新判断你。', effects: { stats: { basketball: 2, fitness: 1, courage: 1, pressure: 1 }, activity: { basketball: 1 }, flagsAdd: ['low_center_advantage'] } });
      else if (body.height >= 196) add({ id: `tall-vision-${event.id}`, label: '利用视野和身高，主动掌控节奏', hint: '高个球员的视野与对抗', result: '你把身高带来的目光，变成了阅读比赛的耐心。', effects: { stats: { basketball: 2, reputation: 1, pressure: 1 }, activity: { basketball: 1 }, flagsAdd: ['tall_court_vision'] } });
      if (body.muscle >= 68 && extra.length < room) add({ id: `strength-work-${event.id}`, label: '加一组对抗训练，但把恢复留在计划里', hint: '力量与恢复能力都会被考验', result: '力量不是硬扛。你学会了在对抗后给身体留出恢复的余地。', effects: { stats: { fitness: 2, discipline: 1, pressure: 1 }, activity: { basketball: 1 } } });
    }
    if (category === 'friendship' || category === 'romance' || category === 'social') {
      if (Number(character.personality && character.personality.introversion) <= 42) add({ id: `quiet-presence-${event.id}`, label: '不抢着表现，认真听完对方想说的话', hint: '安静内敛也能建立连接', result: '你没有说太多，但对方记住了你认真听着的样子。', effects: { stats: { social: 1, happiness: 1 }, relationships: { friends: 4 }, activity: { social: 1 } } });
      else if (appearance.temperament === 'sunny' || appearance.temperament === 'bold') add({ id: `warm-intro-${event.id}`, label: '先把真实的自己介绍出去', hint: '外向与表达会带来新的关系', result: '你没有把这次相遇演成表演，只是把自己的热情递了出去。', effects: { stats: { social: 2, courage: 1, reputation: 1 }, relationships: { friends: 3 }, activity: { social: 1 } } });
    }
    if (category === 'money' || category === 'business' || category === 'investment') {
      if (['extreme', 'hardship'].includes(character.family && character.family.wealth)) add({ id: `ledger-first-${event.id}`, label: '先把每一笔风险写在纸上，再决定要不要赌', hint: '困难开局的谨慎与执行', result: '你没有钱可以浪费，于是比很多人更早学会了算清代价。', effects: { stats: { knowledge: 1, discipline: 2, courage: 1 }, activity: { money: 1 }, flagsAdd: ['careful_budgeting'] } });
      else if (['wealthy', 'veryWealthy'].includes(character.family && character.family.wealth)) add({ id: `rules-before-money-${event.id}`, label: '不急着动用家庭资源，先问清楚规则', hint: '资源之外，也要建立边界', result: '你发现真正能保护自己的，不是账户里的数字，而是把规则说清楚的能力。', effects: { stats: { knowledge: 2, courage: 1, reputation: 1 }, activity: { business: 1 }, flagsAdd: ['independent_finance'] } });
    }
    if (category === 'overseas' && Number(character.talents && character.talents.language) >= 24) add({ id: `language-door-${event.id}`, label: '用英语亲自确认细节，不把机会交给猜测', hint: '语言能力打开更清晰的选择', result: '这一次，你没有只听懂表面。语言让你真正参与了自己的远方。', effects: { stats: { english: 2, knowledge: 1, courage: 1 }, activity: { english: 1, travel: 1 }, flagsAdd: ['language_opens_door'] } });
    if ((category === 'work' || category === 'life') && body.height >= 196 && extra.length < room) add({ id: `tailored-life-${event.id}`, label: '不再将就不合身的尺寸，按自己的身体安排生活', hint: '高个生活的细节与成本', result: '你花了一点钱，也替自己争取了一点舒适。长成什么样，都值得被认真对待。', effects: { money: -180, stats: { happiness: 2, health: 1 }, flagsAdd: ['tailored_life'] } });
    const routes = new Set((player.paidGrowth && player.paidGrowth.routes) || []);
    const routeOption = (routeId, matches, option) => { if (routes.has(routeId) && matches && extra.length < room) add({ ...option, id: `server-route-${routeId}-${event.id}`, hint: `服务器已确认 · ${option.hint}` }); };
    routeOption('basketball_star', category === 'basketball' || category === 'training', { label: '接受俱乐部经纪人的闭门试训', hint: '篮球巨星路线', result: '训练馆的灯比街边球场更亮。你知道，这次机会不会替你投进任何一个球，但它让更多人看见了你。', effects: { stats: { basketball: 3, fitness: 1, reputation: 2, pressure: 1 }, activity: { basketball: 2 }, flagsAdd: ['basketball_star_route'] } });
    routeOption('business_tycoon', category === 'business' || category === 'money' || category === 'investment', { label: '带着合伙人档案，先把账和风险写清楚', hint: '商业富豪路线', result: '你没有急着谈梦想。你先问了现金流、退出条件和谁该为最坏的结果负责。', effects: { stats: { knowledge: 2, social: 1, courage: 1 }, activity: { business: 2 }, flagsAdd: ['business_tycoon_route'] } });
    routeOption('world_traveler', category === 'travel' || category === 'visa' || category === 'overseas', { label: '把下一张机票订到没去过的城市', hint: '环球旅行路线', result: '登机口的电子屏亮起。你把远方从“以后再说”，改成了一张确切的行程单。', effects: { money: -1800, stats: { english: 1, courage: 2, happiness: 2 }, travelCountries: 1, activity: { travel: 2 }, flagsAdd: ['world_traveler_route'] } });
    routeOption('top_creator', category === 'media' || category === 'social', { label: '进棚拍下那条你一直想讲的故事', hint: '顶级网红路线', result: '镜头亮起时，你没有再替自己找借口。城市的夜色、球场和你的野心，都被留进了这条内容里。', effects: { stats: { reputation: 4, courage: 1, social: 1 }, followers: 1600, activity: { media: 2 }, flagsAdd: ['top_creator_route'] } });
    routeOption('overseas_study', category === 'overseas' || category === 'english' || category === 'university', { label: '预约留学顾问，把申请材料逐项打磨', hint: '海外留学路线', result: '你把一叠材料摊在桌上，也把“去远方”变成了一串需要完成的清单。', effects: { money: -3200, stats: { english: 3, knowledge: 2, discipline: 1 }, activity: { english: 2, study: 1 }, flagsAdd: ['overseas_study_route'] } });
    routeOption('elite_family', category === 'work' || category === 'money' || category === 'life', { label: '在家族顾问面前，把自己的生活规则先说清楚', hint: '豪门人生路线', result: '资源能让路变宽，却不能替你决定方向。你第一次把想要的房子、车和人生边界，说得很具体。', effects: { stats: { courage: 2, reputation: 2, happiness: 1 }, property: 180000, vehicle: 65000, flagsAdd: ['elite_family_route'] } });
    routeOption('civic_elite', category === 'promotion' || category === 'work' || category === 'business', { label: '赴一场高阶圆桌会，少说一点，多听一层规则', hint: '政商精英路线', result: '一张名片不会立刻改变命运，但你开始理解，真正重要的信息往往藏在散场后的十分钟。', effects: { stats: { social: 3, knowledge: 2, reputation: 3, courage: 1 }, activity: { business: 1, work: 1 }, flagsAdd: ['civic_elite_route'] } });
    return extra;
  }

  function signedNumber(value) {
    return value > 0 ? `+${value}` : `${value}`;
  }

  function describeEffects(effects) {
    const lines = [];
    if (!effects || typeof effects !== 'object') return lines;
    Object.entries(effects.stats || {}).forEach(([key, value]) => {
      const label = P().STAT_META[key] ? P().STAT_META[key].label : key;
      lines.push(`${label}${signedNumber(value)}`);
    });
    const money = Number(effects.money ?? effects.cash ?? effects.incomeOnce ?? 0);
    if (money) lines.push(`${P().formatMoney(money)}`);
    const followers = Number(effects.followers || 0);
    if (followers) lines.push(`粉丝${signedNumber(followers)}`);
    return lines;
  }

  function conditionBonus(rule) {
    if (!rule) return 0;
    let bonus = 0;
    const stats = rule.stats || rule.statBonuses || {};
    Object.entries(stats).forEach(([key, scale]) => {
      const actual = effectiveGameStat(player, key);
      if (typeof scale === 'number') bonus += (actual / 100) * scale;
      else if (scale && typeof scale === 'object') {
        const threshold = Number(scale.threshold || scale.min || 50);
        if (actual >= threshold) bonus += Number(scale.bonus || scale.value || 0);
      }
    });
    safeArray(rule.flags).forEach((flag) => { if (player.flags.includes(flag)) bonus += 0.05; });
    return bonus;
  }

  function chooseOutcome(option) {
    const embeddedEffects = option.effects || {};
    const outcomes = safeArray(option.outcomes || option.randomOutcomes || embeddedEffects.outcomes || embeddedEffects.randomOutcomes);
    if (!outcomes.length) return { ...option, effects: clone(option.effects || {}) };
    const luckFactor = ((player.stats.luck || 50) - 50) / 250;
    const stressPenalty = Math.max(0, (player.stats.pressure || 0) - 60) / 300;
    const category = canonicalCategory(player.currentEvent && player.currentEvent.category, player.currentEvent && player.currentEvent.id);
    const relevantStats = {
      basketball: ['basketball', 'fitness', 'discipline'],
      university: ['knowledge', 'discipline', 'social'],
      work: ['knowledge', 'social', 'discipline'],
      overseas: ['english', 'courage', 'social'],
      travel: ['english', 'courage', 'knowledge'],
      friendship: ['social', 'happiness', 'courage'],
      health: ['health', 'discipline'],
      money: ['knowledge', 'discipline', 'luck'],
      investment: ['knowledge', 'discipline', 'luck'],
      business: ['courage', 'knowledge', 'social', 'discipline'],
      media: ['discipline', 'social', 'reputation', 'luck'],
      promotion: ['knowledge', 'social', 'discipline', 'reputation']
    }[category] || ['discipline', 'knowledge', 'courage'];
    const abilityFactor = (relevantStats.reduce((sum, key) => sum + effectiveGameStat(player, key), 0) / relevantStats.length - 50) / 260;
    const paidFactor = paidCategoryFactor(category);
    const characterFactor = C() && typeof C().getOutcomeModifier === 'function'
      ? Number(C().getOutcomeModifier(player, player.currentEvent, option) || 0)
      : 0;
    const adjusted = outcomes.map((outcome, index) => {
      let weight = Number(outcome.weight || outcome.chance || 1);
      const inferredSuccess = index === 0 && outcomes.length > 1;
      const inferredFailure = index === outcomes.length - 1 && outcomes.length > 1;
      if (outcome.type === 'success' || outcome.success || inferredSuccess) weight *= 1 + luckFactor + abilityFactor + paidFactor + characterFactor + conditionBonus(option.successBy || option.requirements) - stressPenalty;
      if (outcome.type === 'failure' || outcome.failure || inferredFailure) weight *= 1 - luckFactor - abilityFactor - paidFactor - characterFactor + stressPenalty;
      return { ...outcome, _pickWeight: Math.max(0.05, weight) };
    });
    const outcome = weightedPick(adjusted, '_pickWeight') || adjusted[0];
    return {
      ...option,
      ...outcome,
      effects: { ...Object.fromEntries(Object.entries(option.effects || {}).filter(([key]) => key !== 'outcomes' && key !== 'randomOutcomes')), ...(outcome.effects || {}) },
      result: outcome.result || outcome.description || option.result
    };
  }

  function recordDelta(changes, label, value, kind) {
    if (!value) return;
    changes.push({ label, value, kind: kind || (value >= 0 ? 'positive' : 'negative') });
  }

  function changeStat(key, amount, changes) {
    if (key === 'stress') key = 'pressure';
    if (!(key in player.stats)) return;
    const before = player.stats[key];
    player.stats[key] = P().clamp(before + Number(amount || 0), 0, 100);
    const actual = player.stats[key] - before;
    recordDelta(changes, P().STAT_META[key].label, actual, P().STAT_META[key].reverse ? (actual < 0 ? 'positive' : 'negative') : undefined);
  }

  function changeResource(key, amount, changes, label) {
    if (!(key in player.resources)) return;
    const before = Number(player.resources[key] || 0);
    player.resources[key] = Math.max(0, before + Number(amount || 0));
    const actual = player.resources[key] - before;
    if (actual) recordDelta(changes, label || key, actual);
  }

  function addFlag(flag) {
    if (flag && !player.flags.includes(flag)) player.flags.push(flag);
  }

  function removeFlag(flag) {
    const i = player.flags.indexOf(flag);
    if (i >= 0) player.flags.splice(i, 1);
  }

  function updateRelationship(id, delta, extras, changes) {
    const groupIds = {
      parents: ['mother', 'father'], family: ['mother', 'father'], friends: ['li_na', 'zhou_yu'], friend: ['li_na'], teammates: ['zhou_yu'], partner: ['song_yi', 'lin_xia'], overseas_friend: ['mike']
    };
    const targets = (groupIds[id] || [id]).map((targetId) => player.relationships.find((item) => item.id === targetId || item.name === targetId)).filter(Boolean);
    if (!targets.length) return;
    targets.forEach((rel) => {
    const before = Number(rel.relation ?? rel.value ?? rel.affection ?? 0);
    if (rel.relation !== undefined) rel.relation = P().clamp(before + Number(delta || 0), 0, 100);
    else if (rel.value !== undefined) rel.value = P().clamp(before + Number(delta || 0), 0, 100);
    else rel.affection = P().clamp(before + Number(delta || 0), 0, 100);
    if (extras && extras.trust) rel.trust = P().clamp((rel.trust || 0) + Number(extras.trust), 0, 100);
    if (extras && extras.affection && rel.affection !== undefined) rel.affection = P().clamp(rel.affection + Number(extras.affection), 0, 100);
    const after = Number(rel.relation ?? rel.value ?? rel.affection ?? 0);
    if (after !== before) recordDelta(changes, `${rel.name}关系`, after - before);
    });
  }

  function setCareer(careerId, changes) {
    const career = getCareer(careerId);
    if (!career) return;
    const old = player.career;
    player.career = {
      id: career.id,
      name: career.name || career.title || '新职业',
      industry: career.industry || career.category || career.track || '职业',
      level: career.level || career.rank || career.tier || 1
    };
    const newIncome = careerIncome(career);
    if (newIncome) player.resources.monthlyIncome = newIncome;
    addFlag(`career_${career.id}`);
    recordDelta(changes, '职业', 1, 'milestone');
    if (old.id !== career.id) {
      if (!Array.isArray(player.careerHistory)) player.careerHistory = [];
      if (!player.careerHistory.includes(old.id)) player.careerHistory.push(old.id);
      if (!player.careerHistory.includes(career.id)) player.careerHistory.push(career.id);
      addTimeline('职业变化', `你成为了${career.name || career.title}。`, 'career');
    }
  }

  /* 所有效果统一在这里落账，避免事件系统和 UI 混在一起。 */
  function applyEffects(effects, changes) {
    const effect = effects || {};
    Object.entries(effect.stats || {}).forEach(([key, amount]) => changeStat(key, amount, changes));

    const money = Number(effect.money ?? effect.cash ?? effect.incomeOnce ?? 0);
    if (money) {
      player.resources.cash += money;
      recordDelta(changes, '现金', money);
    }
    if (effect.monthlyIncome || effect.income) changeResource('monthlyIncome', Number(effect.monthlyIncome ?? effect.income), changes, '月收入');
    if (effect.monthlyExpense || effect.expense) changeResource('monthlyExpense', Number(effect.monthlyExpense ?? effect.expense), changes, '月支出');
    if (effect.followers) changeResource('followers', Number(effect.followers), changes, '粉丝');
    if (effect.travel || effect.travelCountries) changeResource('travelCountries', Number(effect.travel ?? effect.travelCountries), changes, '旅行国家');
    if (effect.experience || effect.workExperience) changeResource('workExperience', Number(effect.experience ?? effect.workExperience), changes, '工作经验');
    if (effect.basketballGames) changeResource('basketballGames', Number(effect.basketballGames), changes, '篮球比赛');
    if (effect.basketballWins) changeResource('basketballWins', Number(effect.basketballWins), changes, '篮球胜场');
    if (effect.investments || effect.investment || effect.investmentAssets) {
      const amount = Number(effect.investments ?? effect.investment ?? effect.investmentAssets);
      player.resources.investments = Math.max(0, player.resources.investments + amount);
      recordDelta(changes, '投资资产', amount);
    }
    if (effect.debt) {
      player.resources.debt = Math.max(0, player.resources.debt + Number(effect.debt));
      recordDelta(changes, '债务', Number(effect.debt), Number(effect.debt) < 0 ? 'positive' : 'negative');
    }
    if (effect.property) {
      player.resources.property = Math.max(0, player.resources.property + Number(effect.property));
      addFlag('owns_property');
      recordDelta(changes, '房产资产', Number(effect.property), 'milestone');
    }
    if (effect.vehicle) {
      player.resources.vehicle = Math.max(0, player.resources.vehicle + Number(effect.vehicle));
      addFlag('owns_vehicle');
      recordDelta(changes, '车辆资产', Number(effect.vehicle), 'milestone');
    }
    if (effect.degree) {
      player.resources.degree = effect.degree;
      player.education = effect.degree;
    }
    if (effect.career || effect.setCareer) setCareer(effect.career || effect.setCareer, changes);
    if (effect.flagsAdd || effect.addFlags || effect.flags) safeArray(effect.flagsAdd || effect.addFlags || effect.flags).forEach(addFlag);
    if (effect.flagsRemove || effect.removeFlags) safeArray(effect.flagsRemove || effect.removeFlags).forEach(removeFlag);
    if (effect.tagsAdd) safeArray(effect.tagsAdd).forEach((tag) => { if (!player.tags.includes(tag)) player.tags.push(tag); });
    if (effect.activity) {
      Object.entries(effect.activity).forEach(([key, amount]) => {
        player.activity[key] = Math.max(0, (player.activity[key] || 0) + Number(amount || 0));
      });
    }
    if (effect.categoryActivity) {
      Object.entries(effect.categoryActivity).forEach(([key, amount]) => {
        player.activity[key] = Math.max(0, (player.activity[key] || 0) + Number(amount || 0));
      });
    }
    if (effect.eventBias) Object.entries(effect.eventBias).forEach(([key, amount]) => { player.eventBias[key] = (player.eventBias[key] || 0) + Number(amount || 0); });
    if (effect.relationship) {
      if (Array.isArray(effect.relationship)) effect.relationship.forEach((entry) => updateRelationship(entry.id || entry.name, entry.delta ?? entry.value ?? 0, entry, changes));
      else updateRelationship(effect.relationship.id || effect.relationship.name, effect.relationship.delta ?? effect.relationship.value ?? 0, effect.relationship, changes);
    }
    if (effect.relationships) Object.entries(effect.relationships).forEach(([id, delta]) => updateRelationship(id, typeof delta === 'object' ? delta.delta : delta, delta, changes));
    if (effect.foreshadow) addForeshadow(effect.foreshadow);
    if (effect.unlockEvents) safeArray(effect.unlockEvents).forEach(addFlag);
    if (effect.ending) endGame(effect.ending);
  }

  function addForeshadow(value) {
    const item = typeof value === 'string' ? { id: value, text: '你埋下了一颗尚未发芽的种子。' } : value;
    if (!item || !item.id || player.foreshadows.some((entry) => (typeof entry === 'string' ? entry : entry.id) === item.id)) return;
    player.foreshadows.push({
      id: item.id,
      text: item.text || item.description || '你埋下了一颗尚未发芽的种子。',
      dueInMonths: Number(item.dueInMonths || item.delay || 18),
      createdAt: monthIndex(player.date),
      effects: item.effects || null
    });
    addTimeline('人生伏笔', item.text || item.description || '你感觉这次选择会在未来再次出现。', 'foreshadow');
  }

  function resolveForeshadows() {
    if (!player.foreshadows.length) return;
    const current = monthIndex(player.date);
    const keep = [];
    player.foreshadows.forEach((item) => {
      if (typeof item === 'string') {
        keep.push(item);
        return;
      }
      const elapsed = current - (item.createdAt || current);
      if (elapsed >= (item.dueInMonths || 18) && Math.random() < 0.32) {
        const changes = [];
        if (item.effects) applyEffects(item.effects, changes);
        else applyEffects({ stats: { reputation: 2, happiness: 2 }, money: randomInt(300, 1800) }, changes);
        addTimeline('旧日回响', item.text || '你曾经埋下的善意，在今天悄悄回应了你。', 'foreshadow');
      } else {
        keep.push(item);
      }
    });
    player.foreshadows = keep;
  }

  function addTimeline(title, text, type, meta) {
    if (!player) return;
    player.timeline.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: P().dateLabel(player),
      age: player.age,
      title,
      text,
      type: type || 'life',
      meta: meta || null
    });
    player.timeline = player.timeline.slice(0, 180);
  }

  function deriveTags() {
    const a = player.activity;
    const tags = new Set(player.tags);
    if ((a.travel || 0) >= 6) tags.add('旅行家');
    if ((a.business || 0) >= 6) tags.add('创业者');
    if ((a.basketball || 0) >= 10 || player.stats.basketball >= 82) tags.add('篮球狂热者');
    if (player.stats.discipline >= 82) tags.add('自律达人');
    if (player.stats.courage >= 80 && (a.travel || 0) + (a.business || 0) >= 8) tags.add('冒险家');
    if (player.stats.social >= 82) tags.add('社交达人');
    if ((a.family || 0) >= 8) tags.add('家庭主义者');
    if ((a.work || 0) >= 14 && player.stats.pressure >= 62) tags.add('工作狂');
    if ((a.investment || 0) >= 8 && P().getNetWorth(player) >= 300000) tags.add('理财高手');
    if (player.stats.courage >= 72 && player.stats.happiness >= 70 && (a.travel || 0) >= 4) tags.add('自由灵魂');
    if (C() && typeof C().deriveCharacterTags === 'function') C().deriveCharacterTags(player).forEach((tag) => tags.add(tag));
    player.tags = Array.from(tags).slice(0, 10);
  }

  function checkAchievements() {
    if (typeof window.checkAchievements !== 'function') return [];
    let unlocked = [];
    try { unlocked = window.checkAchievements(player) || []; } catch (error) { console.warn('成就检查失败：', error); }
    const newOnes = unlocked.filter((achievement) => {
      const id = typeof achievement === 'string' ? achievement : achievement.id;
      if (!id || player.achievements.includes(id)) return false;
      player.achievements.push(id);
      player.achievementDates[id] = P().dateLabel(player);
      return true;
    });
    newOnes.forEach((achievement) => {
      const id = typeof achievement === 'string' ? achievement : achievement.id;
      const item = (window.ACHIEVEMENT_BY_ID && window.ACHIEVEMENT_BY_ID[id]) || (window.ACHIEVEMENTS || []).find((a) => a.id === id) || (typeof achievement === 'string' ? null : achievement);
      if (item) {
        const title = item.name || item.title || id;
        addTimeline('成就解锁', `获得「${title}」：${item.description || item.desc || ''}`, 'achievement');
        U().toast(`成就解锁：${title}`, 'achievement');
      }
    });
    return newOnes;
  }

  function monthlySettlement() {
    const changes = [];
    const hasPersonalEconomy = Number(player.age) >= 18;
    const career = hasPersonalEconomy ? getCareer(player.career.id) : null;
    const standardIncome = careerIncome(career);
    if (standardIncome > 0 && player.resources.monthlyIncome < standardIncome) player.resources.monthlyIncome = standardIncome;
    const income = hasPersonalEconomy ? Math.max(0, Math.round(player.resources.monthlyIncome)) : 0;
    const expense = hasPersonalEconomy ? Math.max(0, Math.round(player.resources.monthlyExpense)) : 0;
    const net = income - expense;
    player.resources.cash += net;
    if (net) recordDelta(changes, '月度结余', net);
    if (player.resources.cash < 0) {
      player.resources.debt += Math.abs(player.resources.cash);
      player.resources.cash = 0;
      changeStat('pressure', 4, changes);
      addFlag('has_debt');
    }
    if (hasPersonalEconomy && player.resources.debt > 0) {
      const interest = Math.max(1, Math.round(player.resources.debt * 0.006));
      player.resources.debt += interest;
      recordDelta(changes, '债务利息', interest, 'negative');
    }
    if (hasPersonalEconomy && player.resources.investments > 0) {
      const volatility = player.flags.includes('high_risk_investment') ? 0.09 : 0.025;
      const change = Math.round(player.resources.investments * ((Math.random() * 2 - 1) * volatility + 0.003));
      player.resources.investments = Math.max(0, player.resources.investments + change);
      if (change) recordDelta(changes, '投资浮动', change);
    }
    if (hasPersonalEconomy && !/student|学生/.test(player.career.id || '')) player.resources.workExperience += 1;
    if (player.stats.pressure >= 75) {
      changeStat('health', -2, changes);
      changeStat('happiness', -3, changes);
    } else if (player.stats.pressure <= 30) {
      changeStat('health', 1, changes);
    }
    changeStat('pressure', hasPersonalEconomy && /student|学生/.test(player.career.id || '') ? -1 : (hasPersonalEconomy ? 1 : -1), changes);
    if (C() && typeof C().applyMonthlyCharacterEffects === 'function') {
      const characterEffects = C().applyMonthlyCharacterEffects(player);
      if (characterEffects) {
        applyEffects(characterEffects, changes);
        Object.entries(characterEffects.bodyDelta || {}).forEach(([key, value]) => recordDelta(changes, key === 'muscle' ? '肌肉量维护' : key, value, value < 0 ? 'negative' : 'positive'));
      }
    }
    player.lastMonthlyResult = changes;
    return changes;
  }

  function advanceDate() {
    player.date.month += 1;
    if (player.date.month > 12) {
      player.date.month = 1;
      player.date.year += 1;
      addTimeline('新的一年', `${player.date.year}年到来了。你开始重新衡量时间、关系和想去的远方。`, 'milestone');
    }
    player.age = P().getAge(player.date, player.birth);
    syncAgePhase();
  }

  // 从 0 岁开局时，身份会随年龄自然切换；只接管成长阶段的临时身份，
  // 不覆盖玩家后来主动选择的职业。
  function syncAgePhase() {
    if (!player || !player.character) return;
    const identity = player.character.identity || {};
    const age = Number(player.age) || 0;
    const deferred = identity.educationPlan === 'defer';
    const hasSchool = Boolean(String(identity.school || '').trim());
    const priorStatus = player.educationStatus;
    let nextStatus = age < 6 ? 'not_ready' : (deferred ? 'deferred' : (age < 19 ? 'schooling' : (hasSchool ? 'enrolled' : 'deferred')));
    player.educationStatus = nextStatus;
    if (nextStatus === 'enrolled') {
      player.university = String(identity.school || '').trim();
      player.major = String(identity.major || '').trim();
      player.education = player.major ? `${player.major}在读` : '在读';
    } else if (nextStatus === 'schooling') {
      player.university = '';
      player.major = '';
      player.education = '基础教育阶段';
    } else if (nextStatus === 'deferred') {
      player.university = '';
      player.major = '';
      player.education = '暂不入学 / 稍后决定';
    } else {
      player.university = '';
      player.major = '';
      player.education = '尚未入学';
    }
    player.resources.degree = player.education;
    const transitional = /^(early_childhood|primary_student|childhood_exploration|youth_student|youth_exploration|sports_education_student|free_exploration)$/.test(String(player.career && player.career.id || ''));
    if (!transitional) return;
    let nextCareer = null;
    if (age < 6) nextCareer = { id: 'early_childhood', name: '在家成长中', level: 0, industry: '成长' };
    else if (age <= 12) nextCareer = nextStatus === 'deferred'
      ? { id: 'childhood_exploration', name: '自由成长中', level: 0, industry: '成长' }
      : { id: 'primary_student', name: '小学阶段', level: 0, industry: '成长' };
    else if (age <= 18) nextCareer = nextStatus === 'deferred'
      ? { id: 'youth_exploration', name: '自由探索中', level: 0, industry: '成长' }
      : { id: 'youth_student', name: '青春学习阶段', level: 0, industry: '成长' };
    else if (age === 19) nextCareer = nextStatus === 'enrolled'
      ? { id: 'sports_education_student', name: player.major ? `${player.major}学生` : '在读学生', level: 0, industry: '教育' }
      : { id: 'free_exploration', name: '自由探索中', level: 0, industry: '人生' };
    if (nextCareer && player.career.id !== nextCareer.id) {
      player.career = nextCareer;
      player.careerHistory = Array.isArray(player.careerHistory) ? player.careerHistory : [];
      if (player.careerHistory[player.careerHistory.length - 1] !== nextCareer.id) player.careerHistory.push(nextCareer.id);
      addTimeline('成长阶段', nextStatus === 'enrolled' ? '你走进了新的学习阶段。' : '你进入了新的成长阶段，接下来的路仍由你决定。', 'milestone');
    }
    if (priorStatus !== nextStatus && age >= 18) {
      addTimeline('教育安排', nextStatus === 'enrolled' ? '你决定继续读书，把新的知识写进自己的人生。' : '你暂时没有入学，选择先把时间交给另一条路。', 'milestone');
    }
  }

  function maybeEndForHealth() {
    if (player.age >= 80) {
      endGame();
      return true;
    }
    if (player.stats.health <= 4 && player.age >= 45 && Math.random() < 0.18) {
      endGame('health_early_retirement');
      return true;
    }
    return false;
  }

  function determineEnding() {
    if (C() && typeof C().getCharacterEnding === 'function') {
      const characterEnding = C().getCharacterEnding(player);
      if (characterEnding) return characterEnding;
    }
    if (typeof window.determineEnding === 'function') {
      try {
        const candidate = window.determineEnding(player);
        if (candidate) return candidate;
      } catch (error) { console.warn('结局判断失败：', error); }
    }
    return { id: 'ordinary_happy', name: '普通而幸福的人生', description: '你没有把人生过成一条直线，却把重要的人和事留在了身边。', icon: '☀' };
  }

  function endGame(forcedId) {
    if (player.isGameOver) return;
    let ending = forcedId && Array.isArray(window.ENDINGS) ? window.ENDINGS.find((item) => item.id === forcedId) : null;
    ending = ending || determineEnding();
    player.isGameOver = true;
    player.ending = ending;
    addTimeline('人生结局', `你迎来了「${ending.name || ending.title}」。${ending.description || ''}`, 'ending');
    persist();
    U().renderGame(player, api());
    U().showEnding(ending, player, api());
  }

  function resultNarrative(option, resolved, changes) {
    const base = resolved.result || resolved.description || option.result || '这次选择留下了新的痕迹。';
    const hints = [];
    if (changes.some((item) => item.label === '现金' && item.value > 0)) hints.push('这让你对下一步多了一点底气。');
    if (changes.some((item) => item.label === '压力' && item.value > 0)) hints.push('不过，你也感觉肩上的压力更重了。');
    return `${base}${hints.length ? ` ${hints[0]}` : ''}`;
  }

  function selectOption(index) {
    if (!player || player.isGameOver || player.selectedOption !== null) return;
    const options = getVisibleOptions(player.currentEvent || getFallbackEvent());
    const option = options[index];
    if (!option) return;
    if (!meetsConditions(option.requirements, player)) {
      U().toast(option.lockedText || '现在的条件还不足以选择这一项。', 'warning');
      return;
    }
    const resolved = chooseOutcome(option);
    const changes = [];
    applyEffects(resolved.effects || {}, changes);
    player.selectedOption = index;
    player.choices[player.currentEvent.id] = option.id || option.label;
    updateStoryArcAfterChoice(player.currentEvent, option, changes);
    const category = canonicalCategory(player.currentEvent.category, player.currentEvent.id);
    player.activity[category] = (player.activity[category] || 0) + 1;
    deriveTags();
    const narrative = resultNarrative(option, resolved, changes);
    player.pendingResult = { title: resolved.outcomeTitle || player.currentEvent.title, narrative, changes, optionLabel: option.label };
    addTimeline(player.currentEvent.title, `选择「${option.label}」：${narrative}`, category, { changes });
    checkAchievements();
    persist();
    U().renderGame(player, api());
    U().showResult(player.pendingResult, api());
  }

  function nextMonth() {
    if (!player || player.isGameOver) return;
    if (player.selectedOption === null) {
      U().toast('先做出这个月的人生选择。', 'warning');
      return;
    }
    const isOpeningStoryTurn = Boolean(player.currentEvent && player.currentEvent.storyArcId && !player.currentEvent.storyFollowUp);
    const monthsToAdvance = isOpeningStoryTurn ? 1 : TURN_MONTHS;
    let settlementCount = 0;
    for (let month = 0; month < monthsToAdvance; month += 1) {
      monthlySettlement();
      settlementCount += 1;
      advanceDate();
      resolveForeshadows();
      deriveTags();
      checkAchievements();
      if (maybeEndForHealth()) return;
    }
    pickEvent();
    player.pendingResult = null;
    persist();
    U().renderGame(player, api());
    if (settlementCount) {
      const net = ((player.resources.monthlyIncome || 0) - (player.resources.monthlyExpense || 0)) * monthsToAdvance;
      const message = isOpeningStoryTurn
        ? `序章进入下一幕 · 本月结余 ${P().formatMoney(net)}`
        : `已快进 ${monthsToAdvance} 个月 · 期间结余 ${P().formatMoney(net)}`;
      U().toast(message, isOpeningStoryTurn ? 'milestone' : 'finance');
    }
  }

  function renderCreator() {
    if (!creatorConfig || !C() || typeof U().renderCreator !== 'function') return;
    creatorConfig = U().renderCreator(creatorConfig, creatorStep, (nextConfig) => { creatorConfig = nextConfig; }) || creatorConfig;
  }

  function resetCreatorViewport() {
    requestAnimationFrame(() => {
      document.getElementById('creator-screen')?.scrollIntoView({ block: 'start' });
    });
  }

  function openCreator() {
    if (!C() || typeof U().renderCreator !== 'function') {
      introFocus = 'basketball';
      U().showScreen('intro-screen');
      U().renderIntro(P().FOCUS_PRESETS, introFocus);
      return;
    }
    creatorConfig = C().createDefaultConfig();
    creatorStep = 0;
    U().showScreen('creator-screen');
    renderCreator();
    resetCreatorViewport();
  }

  function startNew() {
    if (U().playOpening) U().playOpening(openCreator);
    else openCreator();
  }

  function openStoryIntro() {
    U().showScreen('story-screen');
    requestAnimationFrame(() => document.getElementById('story-back-btn')?.focus());
  }

  function closeStoryIntro() {
    U().showScreen('splash-screen');
    U().renderSplash(S().hasSave());
  }

  function creatorBack() {
    if (!creatorConfig || creatorStep <= 0) return;
    creatorStep -= 1;
    renderCreator();
    resetCreatorViewport();
  }

  function creatorNext() {
    if (!creatorConfig || !C()) return;
    const validation = C().validateConfig(creatorConfig);
    creatorConfig = validation.config;
    if (!validation.valid) { U().toast(validation.errors[0], 'warning'); return; }
    creatorStep = Math.min(C().STEPS.length - 1, creatorStep + 1);
    renderCreator();
    resetCreatorViewport();
  }

  function creatorClose() {
    creatorConfig = null;
    creatorStep = 0;
    U().showScreen('splash-screen');
    U().renderSplash(S().hasSave());
  }

  function confirmCreator() {
    if (!creatorConfig || !C()) return;
    const validation = C().validateConfig(creatorConfig);
    creatorConfig = validation.config;
    if (!validation.valid) { U().toast(validation.errors[0], 'warning'); return; }
    player = P().createNewPlayer();
    if (typeof window.createDefaultRelationships === 'function') player.relationships = window.createDefaultRelationships();
    C().applyCharacterConfig(player, creatorConfig);
    startNorthCityStory();
    player.introFocus = (player.goals && player.goals.primary) || 'balanced';
    const goalLabel = C().optionLabel ? C().optionLabel('goal', player.goals.primary) : '把人生走成自己的样子';
    addTimeline('人生启程', `${player.date.year}年夏天，${player.age}岁的${player.name}从${player.hometown}出发。你决定：${goalLabel}。`, 'milestone');
    addTimeline('第一份人生档案', player.bodyDescription || '你把这一生，先写成了自己的样子。', 'life');
    deriveTags();
    pickEvent();
    checkAchievements();
    persist();
    U().showScreen('game-screen');
    U().renderGame(player, api());
    window.LIFE_GROWTH?.seedFromPlayer?.(player);
  }

  function pickIntroFocus(key) {
    if (!P().FOCUS_PRESETS[key]) return;
    introFocus = key;
    U().renderIntro(P().FOCUS_PRESETS, introFocus);
  }

  function confirmIntro() {
    if (C()) {
      creatorConfig = C().createDefaultConfig();
      const focusToGoal = { basketball: 'sport', english: 'overseas', money: 'business', media: 'creator', balanced: 'balanced' };
      creatorConfig.goals.primary = focusToGoal[introFocus] || 'balanced';
      creatorStep = C().STEPS.length - 1;
      return confirmCreator();
    }
    player = P().createNewPlayer();
    if (typeof window.createDefaultRelationships === 'function') player.relationships = window.createDefaultRelationships();
    player.introFocus = introFocus;
    startNorthCityStory();
    const focus = P().FOCUS_PRESETS[introFocus] || P().FOCUS_PRESETS.balanced;
    const changes = [];
    applyEffects(focus.effects, changes);
    addTimeline('人生启程', `${player.date.year}年夏天，${player.age}岁的${player.name}站在人生的十字路口。你决定：${focus.label}。`, 'milestone');
    addTimeline('初始选择', focus.story, 'life');
    pickEvent();
    checkAchievements();
    persist();
    U().showScreen('game-screen');
    U().renderGame(player, api());
  }

  function continueGame() {
    const loaded = S().loadGame();
    if (!loaded) {
      U().toast('没有找到可继续的有效存档。', 'warning');
      return;
    }
    player = loaded;
    if (!player.relationships.length && typeof window.createDefaultRelationships === 'function') player.relationships = window.createDefaultRelationships();
    if (!player.currentEvent && !player.isGameOver) pickEvent();
    U().showScreen('game-screen');
    U().renderGame(player, api());
    window.LIFE_GROWTH?.seedFromPlayer?.(player);
    if (player.isGameOver && player.ending) U().showEnding(player.ending, player, api());
  }

  function showAchievements() {
    if (!player) {
      U().showAchievementsPreview(window.ACHIEVEMENTS || []);
      return;
    }
    U().openPanel('achievements');
  }

  function openStartRoute(route) {
    if (!player) {
      if (route === 'archive') U().showAchievementsPreview(window.ACHIEVEMENTS || []);
      else U().toast('先开启一段人生，这里才会写下属于你的记忆。', 'warning');
      return;
    }
    const tab = { archive: 'profile', gallery: 'timeline', settings: 'settings' }[route] || 'life';
    U().showScreen('game-screen');
    U().renderGame(player, api());
    U().openPanel(tab);
  }

  function handleRelationshipAction(id, action) {
    if (!player) return;
    const relation = player.relationships.find((item) => item.id === id);
    if (!relation) return;
    const changes = [];
    const actions = {
      contact: { text: `你主动联系了${relation.name}，你们聊起了近况。`, effects: { relationships: { [id]: 4 }, stats: { happiness: 1 }, activity: { social: 1 } } },
      visit: { text: `你抽出时间见了${relation.name}。`, effects: { money: -120, relationships: { [id]: 6 }, stats: { happiness: 3 }, activity: { social: 1, family: relation.type === 'family' ? 1 : 0 } } },
      gift: { text: `你认真挑选了一份小礼物送给${relation.name}。`, effects: { money: -260, relationships: { [id]: 8 }, stats: { happiness: 2 } } }
    };
    const actionData = actions[action];
    if (!actionData) return;
    if (player.resources.cash + (actionData.effects.money || 0) < 0) {
      U().toast('现金不足，先把生活过稳一点。', 'warning');
      return;
    }
    applyEffects(actionData.effects, changes);
    addTimeline('关系经营', actionData.text, 'relationship');
    deriveTags();
    checkAchievements();
    persist();
    U().renderGame(player, api());
    U().toast(actionData.text, 'relationship');
  }

  function applyForCareer(careerId) {
    if (!player || player.isGameOver) return;
    const career = getCareer(careerId);
    if (!career) return;
    let allowed = true;
    if (typeof window.canEnterCareer === 'function') {
      try { allowed = window.canEnterCareer(career, player); } catch (_) { allowed = false; }
    } else allowed = meetsConditions(career.conditions || career.requirements, player);
    if (!allowed) {
      U().toast(career.lockedText || '你的经历或能力还不足以进入这份职业。', 'warning');
      return;
    }
    const changes = [];
    setCareer(careerId, changes);
    if (career.entryEffects) applyEffects(career.entryEffects, changes);
    addTimeline('职业选择', `你决定尝试${career.name}这条路。`, 'career');
    checkAchievements();
    persist();
    U().renderGame(player, api());
    U().toast(`职业已更新：${career.name}`, 'career');
  }

  function exportSave() {
    if (!player) { U().toast('开始一段人生后才能导出存档。', 'warning'); return; }
    S().downloadSave(player);
    U().toast('存档已导出。', 'success');
  }

  function importSave(file) {
    S().importSave(file).then((loaded) => {
      player = loaded;
      if (!player.relationships.length && typeof window.createDefaultRelationships === 'function') player.relationships = window.createDefaultRelationships();
      if (!player.currentEvent && !player.isGameOver) pickEvent();
      persist();
      U().showScreen('game-screen');
      U().renderGame(player, api());
      U().toast('存档导入成功。', 'success');
    }).catch((error) => U().toast(`导入失败：${error.message || '文件格式不正确'}`, 'warning'));
  }

  function deleteSave() {
    if (!confirm('确定要删除当前本地存档吗？此操作无法撤销。')) return;
    S().deleteSave();
    player = null;
    U().showScreen('splash-screen');
    U().renderSplash(S().hasSave());
    U().toast('存档已删除。', 'success');
  }

  function persist() {
    if (player) S().saveGame(player);
  }

  function applyAuthoritativeProgression(snapshot) {
    if (!player || !snapshot || !snapshot.attributes || !snapshot.initial_attributes_seeded) return;
    const raw = snapshot.attributes;
    const effective = snapshot.effective_attributes || raw;
    const previous = player.paidGrowth && player.paidGrowth.effectiveAttributes;
    const previousRoutes = new Set((player.paidGrowth && player.paidGrowth.routes) || []);
    const asNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const clamp = (value) => P().clamp(Math.round(value), 0, 100);
    const derived = {
      health: asNumber(effective.health, 0),
      fitness: (asNumber(effective.strength, 0) + asNumber(effective.speed, 0) + asNumber(effective.vertical, 0)) / 3,
      basketball: asNumber(effective.basketball, 0),
      english: asNumber(effective.english, 0),
      knowledge: asNumber(effective.intelligence, 0),
      social: (asNumber(effective.social, 0) + asNumber(effective.emotional_intelligence, 0)) / 2,
      discipline: asNumber(effective.career, 0),
      reputation: asNumber(effective.charm, 0),
      luck: asNumber(effective.luck, 0)
    };
    const previousDerived = previous ? {
      health: asNumber(previous.health, 0),
      fitness: (asNumber(previous.strength, 0) + asNumber(previous.speed, 0) + asNumber(previous.vertical, 0)) / 3,
      basketball: asNumber(previous.basketball, 0),
      english: asNumber(previous.english, 0),
      knowledge: asNumber(previous.intelligence, 0),
      social: (asNumber(previous.social, 0) + asNumber(previous.emotional_intelligence, 0)) / 2,
      discipline: asNumber(previous.career, 0),
      reputation: asNumber(previous.charm, 0),
      luck: asNumber(previous.luck, 0)
    } : null;

    player.character = player.character || {};
    player.character.body = player.character.body || {};
    player.character.body.physical = player.character.body.physical || {};
    player.body = player.body || {};
    player.body.physical = player.body.physical || {};
    player.character.body.height = asNumber(raw.height, player.character.body.height || 185);
    player.character.body.weight = asNumber(raw.weight, player.character.body.weight || 70);
    player.body.height = player.character.body.height;
    player.body.weight = player.character.body.weight;
    player.height = player.body.height;
    player.weight = player.body.weight;
    [['strength', 'strength'], ['speed', 'speed'], ['vertical', 'jump']].forEach(([serverKey, localKey]) => {
      const value = asNumber(raw[serverKey], 0);
      player.character.body.physical[localKey] = value;
      player.body.physical[localKey] = value;
    });
    const characterApi = C();
    if (characterApi && typeof characterApi.getBMI === 'function') player.body.bmi = characterApi.getBMI(player.body.height, player.body.weight);
    if (characterApi && typeof characterApi.getBodyType === 'function') player.body.build = characterApi.getBodyType(player.body);
    if (characterApi && typeof characterApi.getBodyDescription === 'function') {
      player.body.description = characterApi.getBodyDescription({ body: player.body });
      player.bodyDescription = player.body.description;
    }

    // Initial creator data already shaped the local story; after that only server-confirmed
    // differences are applied. A local edit can never change the wallet or unlock routes.
    if (previousDerived) {
      Object.entries(derived).forEach(([key, value]) => {
        if (!(key in player.stats)) return;
        player.stats[key] = clamp(Number(player.stats[key] || 0) + (value - previousDerived[key]));
      });
    }
    const unlockedRoutes = (snapshot.routes || []).filter((route) => route.unlocked).map((route) => route.id);
    player.paidGrowth = {
      attributes: { ...raw },
      effectiveAttributes: { ...effective },
      attributeVersion: snapshot.attribute_version,
      vipLevel: Number(snapshot.vip && snapshot.vip.level) || 0,
      routes: unlockedRoutes,
      syncedAt: Date.now()
    };
    player.serverRoutes = player.paidGrowth.routes.slice();
    (snapshot.routes || []).filter((route) => route.unlocked && !previousRoutes.has(route.id)).forEach((route) => {
      addTimeline('服务器确认路线', `「${route.name}」已由成长服务确认开启：${route.perk}。`, 'milestone', { route: route.id, serverConfirmed: true });
    });
    persist();
    U().renderGame(player, api());
  }

  /* 开局现金只接收成长服务确认后的快照。角色创建页从不把本地输入写进现金。 */
  function applyAuthoritativeInitialCash(snapshot) {
    if (!player || !snapshot || typeof snapshot !== 'object') return false;
    const selection = snapshot.initial_cash && typeof snapshot.initial_cash === 'object'
      ? snapshot.initial_cash
      : (snapshot.selection && typeof snapshot.selection === 'object' ? snapshot.selection : snapshot);
    const confirmed = selection.confirmed === true || selection.status === 'confirmed' || selection.server_confirmed === true;
    const amount = Number(selection.initial_cash ?? selection.cash ?? selection.cash_amount);
    const optionId = String(selection.option_id || selection.id || selection.code || '');
    if (!confirmed || !optionId || !Number.isFinite(amount) || amount < 0) return false;
    const cash = Math.round(amount);
    const confirmationId = String(selection.confirmation_id || selection.purchase_id || selection.idempotency_id || '');
    const previous = player.serverInitialCash || {};
    const changed = previous.optionId !== optionId || Number(previous.amount) !== cash || previous.confirmationId !== confirmationId;
    player.resources.cash = cash;
    player.serverInitialCash = { optionId, amount: cash, confirmationId, confirmed: true, syncedAt: Date.now() };
    if (changed) addTimeline('人生起点确认', `成长服务已确认你的开局现金：${P().formatMoney(cash)}。`, 'milestone', { optionId, serverConfirmed: true });
    persist();
    U().renderGame(player, api());
    return true;
  }

  function api() {
    return {
      selectOption,
      nextMonth,
      showAchievements,
      handleRelationshipAction,
      applyForCareer,
      exportSave,
      importSave,
      deleteSave,
      startNew,
      openStoryIntro,
      closeStoryIntro,
      openCreator,
      creatorBack,
      creatorNext,
      creatorClose,
      confirmCreator,
      openStartRoute,
      continueGame,
      pickIntroFocus,
      confirmIntro,
      getVisibleOptions,
      getCareer,
      describeEffects,
      getPlayer: () => player,
      formatMoney: (value) => P().formatMoney(value),
      getNetWorth: () => player ? P().getNetWorth(player) : 0,
      applyAuthoritativeProgression,
      applyAuthoritativeInitialCash,
      categoryLabels
    };
  }

  function bindControls() {
    const byId = (id) => document.getElementById(id);
    byId('start-new-btn')?.addEventListener('click', startNew);
    byId('continue-btn')?.addEventListener('click', continueGame);
    byId('achievement-start-btn')?.addEventListener('click', () => openStartRoute('archive'));
    byId('gallery-start-btn')?.addEventListener('click', () => openStartRoute('gallery'));
    byId('start-settings-btn')?.addEventListener('click', () => openStartRoute('settings'));
    byId('story-intro-btn')?.addEventListener('click', openStoryIntro);
    byId('story-back-btn')?.addEventListener('click', closeStoryIntro);
    byId('story-start-btn')?.addEventListener('click', startNew);
    byId('intro-confirm-btn')?.addEventListener('click', confirmIntro);
    byId('creator-back-btn')?.addEventListener('click', creatorBack);
    byId('creator-next-btn')?.addEventListener('click', creatorNext);
    byId('creator-confirm-btn')?.addEventListener('click', confirmCreator);
    byId('creator-close-btn')?.addEventListener('click', creatorClose);
    byId('next-month-btn')?.addEventListener('click', nextMonth);
    byId('export-save-btn')?.addEventListener('click', exportSave);
    byId('new-save-btn')?.addEventListener('click', startNew);
    byId('delete-save-btn')?.addEventListener('click', deleteSave);
    byId('import-save-input')?.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) importSave(file);
      event.target.value = '';
    });
    document.addEventListener('click', (event) => {
      const focusButton = event.target.closest('[data-intro-focus], [data-intro-choice]');
      if (focusButton) pickIntroFocus(focusButton.dataset.introFocus || focusButton.dataset.introChoice);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !byId('story-screen')?.classList.contains('is-hidden')) closeStoryIntro();
    });
  }

  function init() {
    if (!P() || !S() || !U()) {
      console.error('游戏基础脚本加载不完整。');
      return;
    }
    bindControls();
    U().renderSplash(S().hasSave());
    U().showScreen('splash-screen');
  }

  window.LIFE_GAME = api();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
