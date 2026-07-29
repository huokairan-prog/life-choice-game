/*
 * 《人生选择》关系系统
 * 使用普通 script 全局变量，支持直接打开 index.html。
 */
(function relationshipSystem(global) {
  'use strict';

  const START_AGE = 21;
  const MAX_VALUE = 100;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return [];
    return [value];
  }

  function stateAge(state) {
    const age = Number(state && state.age);
    return Number.isFinite(age) ? age : START_AGE;
  }

  function stateFlag(state, flag) {
    const flags = (state && (state.flags || state.unlocks || state.milestones)) || {};
    return Array.isArray(flags) ? flags.includes(flag) : Boolean(flags && flags[flag]);
  }

  function stateStat(state, key) {
    if (typeof global.getStat === 'function') return global.getStat(state, key, 0);
    const stats = (state && state.stats) || {};
    return Number(stats[key] !== undefined ? stats[key] : (state && state[key])) || 0;
  }

  function stateResource(state, key) {
    if (typeof global.getResource === 'function') return global.getResource(state, key, 0);
    const resources = (state && (state.resources || state.assets)) || {};
    return Number(resources[key] !== undefined ? resources[key] : (state && state[key])) || 0;
  }

  /** 人物模板是静态数据；createDefaultRelationships 会返回可安全修改的深拷贝。 */
  const RELATIONSHIP_TEMPLATES = [
    {
      id: 'mother', name: '林母', role: '母亲', type: 'family', icon: '🌷', ageAtStart: 47,
      personality: ['细心', '节俭', '嘴硬心软'], occupation: '家庭经营', city: '北方北城',
      relation: 82, trust: 86, affection: 82, status: 'family', available: true,
      description: '总是担心你吃不好、睡不够，也会在关键时刻尊重你的选择。',
      eventHooks: ['family_call', 'family_emergency', 'homecoming'], tags: ['family', 'north_city']
    },
    {
      id: 'father', name: '林父', role: '父亲', type: 'family', icon: '🌲', ageAtStart: 50,
      personality: ['沉稳', '务实', '不善表达'], occupation: '工程技术人员', city: '北方北城',
      relation: 74, trust: 76, affection: 70, status: 'family', available: true,
      description: '很少说大道理，却会用行动支持你去见更大的世界。',
      eventHooks: ['family_call', 'career_advice', 'homecoming'], tags: ['family', 'north_city']
    },
    {
      id: 'li_na', name: '李娜', role: '大学同学', type: 'friend', icon: '📚', ageAtStart: 21,
      personality: ['理性', '真诚', '有主见'], occupation: '体育方向学生', city: '远川',
      relation: 55, trust: 52, affection: 26, status: 'friend', available: true,
      description: '一起熬过期末周，也能在你冲动时给出直白建议。',
      eventHooks: ['university', 'exam', 'reunion'], tags: ['university', 'friend']
    },
    {
      id: 'zhou_yu', name: '周宇', role: '篮球队友', type: 'friend', icon: '🏀', ageAtStart: 22,
      personality: ['热血', '讲义气', '好胜'], occupation: '校队后卫', city: '远川',
      relation: 58, trust: 55, affection: 12, status: 'friend', available: true,
      description: '训练时会狠狠干你一个抢断，场下却是最愿意帮忙的兄弟。',
      eventHooks: ['basketball', 'competition', 'reunion'], tags: ['basketball', 'friend']
    },
    {
      id: 'coach_chen', name: '陈教练', role: '篮球教练', type: 'mentor', icon: '📋', ageAtStart: 39,
      personality: ['严格', '专业', '护短'], occupation: '高校篮球教练', city: '远川',
      relation: 48, trust: 48, affection: 5, status: 'mentor', available: true,
      description: '看重纪律与执行力，认可你后会给出难得的机会。',
      eventHooks: ['basketball_training', 'tryout', 'coach_recommendation'], tags: ['basketball', 'mentor']
    },
    {
      id: 'anna', name: '安娜', role: '酒店同事', type: 'colleague', icon: '🛎️', ageAtStart: 23,
      personality: ['外向', '周到', '效率高'], occupation: '酒店前厅主管', city: '北京',
      relation: 42, trust: 38, affection: 18, status: 'acquaintance', available: false,
      unlockWhen: ['hotel_job_started'],
      description: '懂得如何在忙乱中保持优雅，也能带你认识服务业的另一面。',
      eventHooks: ['hotel', 'shift', 'promotion'], tags: ['hotel', 'work']
    },
    {
      id: 'mike', name: 'Mike', role: '海外朋友', type: 'friend', icon: '🌎', ageAtStart: 24,
      personality: ['随和', '好奇', '守信用'], occupation: '酒店活动专员', city: '佛罗里达',
      relation: 38, trust: 35, affection: 10, status: 'acquaintance', available: false,
      unlockWhen: ['went_abroad', 'work_travel_experience'],
      description: '会邀请你去他的城市，也会在文化差异面前替你解释。',
      eventHooks: ['overseas', 'english', 'travel_invitation'], tags: ['overseas', 'friend']
    },
    {
      id: 'wang_hao', name: '王浩', role: '创业伙伴', type: 'partner', icon: '🤝', ageAtStart: 25,
      personality: ['行动快', '野心强', '有时冒进'], occupation: '本地创业者', city: '北城',
      relation: 35, trust: 30, affection: 8, status: 'acquaintance', available: false,
      unlockWhen: ['first_business_started', 'startup_opportunity'],
      description: '能把一句想法变成一张计划表，但合作前必须把账算清楚。',
      eventHooks: ['startup', 'investment', 'partnership'], tags: ['business', 'north_city']
    },
    {
      id: 'lin_xia', name: '林夏', role: '旅行摄影师', type: 'romance', icon: '📷', ageAtStart: 22,
      personality: ['温柔', '独立', '热爱远方'], occupation: '自由摄影师', city: '太原',
      relation: 25, trust: 20, affection: 16, status: 'single', available: false,
      unlockWhen: ['travel_event', 'creator_account'],
      description: '喜欢清晨的车站和陌生城市的街道，不愿意被任何人定义。',
      eventHooks: ['travel', 'romance', 'long_distance'], tags: ['travel', 'romance']
    },
    {
      id: 'song_yi', name: '宋怡', role: '校园朋友', type: 'romance', icon: '🎧', ageAtStart: 21,
      personality: ['安静', '细腻', '有耐心'], occupation: '音乐教育专业学生', city: '远川',
      relation: 30, trust: 26, affection: 20, status: 'single', available: true,
      description: '不喜欢喧闹的社交场，却会认真听完你讲一整晚的篮球。',
      eventHooks: ['university', 'romance', 'music'], tags: ['university', 'romance']
    },
    {
      id: 'guo_qiang', name: '郭强', role: '商业贵人', type: 'mentor', icon: '💼', ageAtStart: 43,
      personality: ['精明', '重承诺', '看重结果'], occupation: '体育产业投资人', city: '北京',
      relation: 18, trust: 15, affection: 0, status: 'acquaintance', available: false,
      unlockWhen: ['reputation_30', 'startup_opportunity', 'business_event'],
      description: '不轻易给机会，但一旦认可你，可能改变项目的规模。',
      eventHooks: ['business', 'investment', 'mentor_opportunity'], tags: ['business', 'mentor']
    },
    {
      id: 'zhang_min', name: '张敏', role: '自媒体同行', type: 'colleague', icon: '🎥', ageAtStart: 24,
      personality: ['敏锐', '幽默', '目标感强'], occupation: '视频创作者', city: '北京',
      relation: 28, trust: 22, affection: 14, status: 'acquaintance', available: false,
      unlockWhen: ['creator_account', 'video_published'],
      description: '既可能是互相托举的同行，也可能在流量面前变成竞争对手。',
      eventHooks: ['content', 'brand', 'platform'], tags: ['media', 'work']
    }
  ];

  const RELATIONSHIP_BY_ID = Object.create(null);
  RELATIONSHIP_TEMPLATES.forEach(function (template) {
    RELATIONSHIP_BY_ID[template.id] = template;
  });

  const RELATIONSHIP_STAGES = {
    family: [
      { min: 0, id: 'estranged', label: '疏远' },
      { min: 30, id: 'strained', label: '关系紧张' },
      { min: 55, id: 'family', label: '家人' },
      { min: 78, id: 'close_family', label: '亲密家人' }
    ],
    friend: [
      { min: 0, id: 'stranger', label: '陌生' },
      { min: 20, id: 'acquaintance', label: '熟人' },
      { min: 45, id: 'friend', label: '朋友' },
      { min: 70, id: 'close_friend', label: '挚友' },
      { min: 88, id: 'soulmate_friend', label: '人生挚友' }
    ],
    mentor: [
      { min: 0, id: 'unfamiliar', label: '尚未认可' },
      { min: 35, id: 'acquaintance', label: '认识' },
      { min: 58, id: 'mentor', label: '愿意指点' },
      { min: 82, id: 'trusted_protege', label: '得意门生' }
    ],
    partner: [
      { min: 0, id: 'risk', label: '合作存疑' },
      { min: 35, id: 'acquaintance', label: '初步接触' },
      { min: 60, id: 'partner', label: '合作伙伴' },
      { min: 82, id: 'trusted_partner', label: '核心伙伴' }
    ],
    colleague: [
      { min: 0, id: 'awkward', label: '合作不畅' },
      { min: 25, id: 'acquaintance', label: '同事' },
      { min: 55, id: 'trusted_colleague', label: '可靠同事' },
      { min: 80, id: 'close_colleague', label: '默契搭档' }
    ],
    romance: [
      { min: 0, id: 'single', label: '单身' },
      { min: 32, id: 'acquaintance', label: '认识' },
      { min: 52, id: 'ambiguous', label: '暧昧' },
      { min: 68, id: 'dating', label: '恋人' },
      { min: 83, id: 'committed', label: '稳定伴侣' },
      { min: 92, id: 'married', label: '已婚' }
    ]
  };

  function calculateAge(template, state) {
    return Math.max(template.ageAtStart || 0, (template.ageAtStart || 0) + (stateAge(state) - START_AGE));
  }

  function isTemplateUnlocked(template, state) {
    const required = asArray(template.unlockWhen);
    if (!required.length) return true;
    return required.some(function (flag) {
      if (stateFlag(state, flag)) return true;
      if (flag === 'reputation_30') return stateStat(state, 'reputation') >= 30;
      if (flag === 'creator_account') return Boolean(state && (state.creatorAccount || stateFlag(state, 'creator_account')));
      return false;
    });
  }

  function createRelationship(templateOrId, state) {
    const template = typeof templateOrId === 'string' ? RELATIONSHIP_BY_ID[templateOrId] : templateOrId;
    if (!template) return null;
    const relationship = clone(template);
    relationship.age = calculateAge(template, state);
    relationship.available = template.available !== false || isTemplateUnlocked(template, state);
    relationship.met = relationship.available && (template.status !== 'acquaintance' || !template.unlockWhen);
    relationship.memories = [];
    relationship.lastInteraction = null;
    return relationship;
  }

  /** 默认返回数组，和主游戏的 player.relationships 保持一致；传入 { asArray:false } 可获得 id 索引对象。 */
  function createDefaultRelationships(state, options) {
    const settings = Object.assign({ asArray: true, includeLocked: true }, options || {});
    const entries = RELATIONSHIP_TEMPLATES
      .filter(function (template) { return settings.includeLocked || isTemplateUnlocked(template, state); })
      .map(function (template) { return createRelationship(template, state); });
    if (settings.asArray) return entries;
    return entries.reduce(function (result, relationship) {
      result[relationship.id] = relationship;
      return result;
    }, {});
  }

  function isStateObject(value) {
    return Boolean(value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'relationships'));
  }

  function getCollection(source) {
    if (!source) return null;
    return isStateObject(source) ? source.relationships : source;
  }

  function listRelationships(source, state) {
    const collection = getCollection(source);
    if (!collection) return [];
    const values = Array.isArray(collection) ? collection : Object.keys(collection).map(function (id) { return collection[id]; });
    return values.filter(Boolean).map(function (item) {
      const result = item.id && RELATIONSHIP_BY_ID[item.id]
        ? Object.assign(createRelationship(item.id, state), item)
        : item;
      if (state && result.ageAtStart) result.age = calculateAge(result, state);
      return result;
    });
  }

  function getRelationship(source, id, state) {
    if (!id) return null;
    const collection = getCollection(source);
    if (Array.isArray(collection)) {
      return collection.find(function (item) { return item && item.id === id; }) || null;
    }
    if (collection && collection[id]) return collection[id];
    if (!collection && RELATIONSHIP_BY_ID[id]) return createRelationship(id, state);
    return null;
  }

  function ensureRelationship(source, id, state) {
    const collection = getCollection(source);
    let relationship = getRelationship(source, id, state);
    if (relationship) return relationship;
    relationship = createRelationship(id, state);
    if (!relationship || !collection) return relationship;
    if (Array.isArray(collection)) collection.push(relationship);
    else collection[id] = relationship;
    return relationship;
  }

  function getRelationshipStage(relationship) {
    if (!relationship) return { id: 'unknown', label: '未知' };
    if (relationship.status === 'married') return { id: 'married', label: '已婚' };
    if (relationship.status === 'broken_up' || relationship.status === 'separated') return { id: relationship.status, label: relationship.status === 'broken_up' ? '已分手' : '分居中' };
    const type = relationship.type || 'friend';
    const stages = RELATIONSHIP_STAGES[type] || RELATIONSHIP_STAGES.friend;
    const relation = clamp(relationship.relation !== undefined ? relationship.relation : relationship.affinity, 0, MAX_VALUE);
    const trust = clamp(relationship.trust, 0, MAX_VALUE);
    const affection = clamp(relationship.affection, 0, MAX_VALUE);
    const score = type === 'romance' ? relation * 0.4 + trust * 0.25 + affection * 0.35 : relation * 0.55 + trust * 0.45;
    return stages.reduce(function (current, stage) {
      return score >= stage.min ? stage : current;
    }, stages[0]);
  }

  function getRelationshipSummary(relationship) {
    if (!relationship) return null;
    const stage = getRelationshipStage(relationship);
    const relation = clamp(relationship.relation !== undefined ? relationship.relation : relationship.affinity, 0, MAX_VALUE);
    const trust = clamp(relationship.trust, 0, MAX_VALUE);
    const affection = clamp(relationship.affection, 0, MAX_VALUE);
    return {
      id: relationship.id,
      name: relationship.name,
      role: relationship.role,
      icon: relationship.icon || '👤',
      type: relationship.type,
      stage: stage.id,
      stageLabel: stage.label,
      relation: relation,
      trust: trust,
      affection: affection,
      available: relationship.available !== false,
      age: relationship.age,
      status: relationship.status || stage.id
    };
  }

  /**
   * 修改关系数值。source 可以是 state 或 state.relationships；本函数会原地修改，
   * 并返回前后状态与里程碑，方便事件卡展示结果。
   */
  function applyRelationshipDelta(source, id, delta, options) {
    const settings = Object.assign({ state: isStateObject(source) ? source : null, memory: '', month: null }, options || {});
    const relationship = ensureRelationship(source, id, settings.state);
    if (!relationship) return { changed: false, reason: 'relationship_not_found' };

    const changes = delta || {};
    const before = getRelationshipSummary(relationship);
    const aliasRelation = changes.relation !== undefined ? changes.relation : (changes.affinity !== undefined ? changes.affinity : changes.relationship);
    if (aliasRelation !== undefined) relationship.relation = clamp((relationship.relation || 0) + Number(aliasRelation), 0, MAX_VALUE);
    if (changes.trust !== undefined) relationship.trust = clamp((relationship.trust || 0) + Number(changes.trust), 0, MAX_VALUE);
    if (changes.affection !== undefined) relationship.affection = clamp((relationship.affection || 0) + Number(changes.affection), 0, MAX_VALUE);
    if (changes.status) relationship.status = changes.status;
    if (changes.available !== undefined) relationship.available = Boolean(changes.available);
    if (changes.met !== undefined) relationship.met = Boolean(changes.met);
    if (changes.city) relationship.city = changes.city;
    if (changes.occupation) relationship.occupation = changes.occupation;
    if (changes.flags) relationship.flags = Object.assign({}, relationship.flags || {}, changes.flags);

    if (settings.month !== null) relationship.lastInteraction = settings.month;
    const memory = settings.memory || changes.memory;
    if (memory) {
      relationship.memories = Array.isArray(relationship.memories) ? relationship.memories : [];
      relationship.memories.push({ text: String(memory), month: settings.month });
      if (relationship.memories.length > 20) relationship.memories.shift();
    }

    const after = getRelationshipSummary(relationship);
    const milestones = [];
    if (before.stage !== after.stage) milestones.push(after.stageLabel);
    if (relationship.type === 'romance' && after.stage === 'dating' && before.stage !== 'dating') milestones.push('确认恋爱关系');
    if (relationship.type === 'romance' && relationship.status === 'married' && before.status !== 'married') milestones.push('步入婚姻');
    if (relationship.status === 'broken_up' && before.status !== 'broken_up') milestones.push('关系结束');

    return { changed: true, relationship: relationship, before: before, after: after, milestones: milestones };
  }

  function canStartRomance(source, id, state) {
    const relationship = getRelationship(source, id, state) || createRelationship(id, state);
    if (!relationship || relationship.type !== 'romance') return { allowed: false, reason: '不是可发展恋爱关系的角色' };
    if (relationship.available === false) return { allowed: false, reason: '尚未认识对方' };
    if (relationship.status === 'married' || relationship.status === 'broken_up') return { allowed: false, reason: '当前关系状态不允许' };
    const relation = Number(relationship.relation || 0);
    const trust = Number(relationship.trust || 0);
    const affection = Number(relationship.affection || 0);
    if (relation < 52 || trust < 48 || affection < 46) return { allowed: false, reason: '默契与信任还不够' };
    if (state && stateStat(state, 'stress') > 86) return { allowed: false, reason: '你当前压力太大，难以经营关系' };
    return { allowed: true, reason: '你们已经建立了足够的信任' };
  }

  function getAvailableRelationshipTemplates(state) {
    return RELATIONSHIP_TEMPLATES.filter(function (template) { return isTemplateUnlocked(template, state); });
  }

  function updateRelationshipAges(source, state) {
    listRelationships(source, state).forEach(function (relationship) {
      if (relationship.ageAtStart) relationship.age = calculateAge(relationship, state);
    });
    return source;
  }

  global.RELATIONSHIP_TEMPLATES = RELATIONSHIP_TEMPLATES;
  global.RELATIONSHIP_BY_ID = RELATIONSHIP_BY_ID;
  global.RELATIONSHIP_STAGES = RELATIONSHIP_STAGES;
  global.createRelationship = createRelationship;
  global.createDefaultRelationships = createDefaultRelationships;
  global.getRelationship = getRelationship;
  global.listRelationships = listRelationships;
  global.getRelationshipStage = getRelationshipStage;
  global.getRelationshipSummary = getRelationshipSummary;
  global.applyRelationshipDelta = applyRelationshipDelta;
  global.canStartRomance = canStartRomance;
  global.getAvailableRelationshipTemplates = getAvailableRelationshipTemplates;
  global.updateRelationshipAges = updateRelationshipAges;
})(window);
