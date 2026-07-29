/*
 * 电影场景词典（不直接操作 DOM）。
 *
 * 用法：
 *   const scene = window.LIFE_SCENES.resolveScene(player, event);
 *   background.className = `cinematic-scene ${scene.ambientClass}`;
 *
 * 每次返回的都是副本，界面层可安全地追加 class 或覆盖文案。
 */
(function () {
  'use strict';

  const COLOR_TONES = {
    night: { name: '北城夜色', base: '#0c141d', shadow: '#05080b', accent: '#e5a04d', glow: '#f3c36b', text: '#fff4dc' },
    ember: { name: '烟火暖光', base: '#211811', shadow: '#090807', accent: '#ec8c3a', glow: '#ffd080', text: '#fff5df' },
    court: { name: '夏日球场', base: '#10212a', shadow: '#071015', accent: '#f29b38', glow: '#9fd7e6', text: '#f4fbf8' },
    campus: { name: '校园晚风', base: '#18242c', shadow: '#0b1116', accent: '#d2a160', glow: '#a9d6e8', text: '#f7f0df' },
    paper: { name: '清晨教室', base: '#26313a', shadow: '#11181e', accent: '#e4bd75', glow: '#d8e6e1', text: '#fff9ed' },
    work: { name: '城市工作', base: '#172028', shadow: '#090d11', accent: '#d6ad63', glow: '#f4d397', text: '#f8f0df' },
    travel: { name: '远方站台', base: '#101e28', shadow: '#060b10', accent: '#dba451', glow: '#bcdcf0', text: '#f4f6f2' },
    overseas: { name: '公路霓虹', base: '#101824', shadow: '#05070b', accent: '#f09b51', glow: '#8dc5dc', text: '#fbf3e8' },
    rain: { name: '雨夜玻璃', base: '#0d1821', shadow: '#04070b', accent: '#6ca6be', glow: '#d2aa67', text: '#eaf3f4' },
    snow: { name: '雪后清晨', base: '#263440', shadow: '#111a21', accent: '#d9bd83', glow: '#e6f0ed', text: '#faf8ee' },
    family: { name: '家常灯火', base: '#2a1c16', shadow: '#0d0908', accent: '#eea84d', glow: '#ffe0a0', text: '#fff4dd' },
    festival: { name: '春节灯火', base: '#2d130e', shadow: '#120604', accent: '#df4e32', glow: '#f2bf53', text: '#fff3dc' },
    childhood: { name: '旧照片暖光', base: '#37281d', shadow: '#160f0a', accent: '#d9a25e', glow: '#ffe0a8', text: '#fff3db' }
  };

  function pace(speed, entrance, hold, mode) {
    return {
      mode: mode || 'calm',
      entranceMs: entrance,
      holdMs: hold,
      lineGapMs: Math.round(speed * 3.8),
      typewriter: {
        charMs: speed,
        punctuationPauseMs: Math.round(speed * 5.4),
        paragraphPauseMs: Math.round(speed * 11)
      }
    };
  }

  /*
   * ambientClass 只是一组语义化 class。CSS 可以只实现一部分；没有对应样式时也不会影响游戏。
   */
  const DEFINITIONS = {
    'north-city-night-street': {
      id: 'north-city-night-street',
      title: '北城 · 夜行',
      eyebrow: '北方北城 · 晚风刚刚吹起',
      atmosphere: '老街的路灯把影子拉得很长，远处有车灯经过，生活还没有给出答案。',
      ambientClass: 'scene--north-city-night scene--old-street scene--streetlight scene--distant-traffic scene--warm-window',
      typewriter: pace(31, 360, 560, 'lingering').typewriter,
      pacing: pace(31, 360, 560, 'lingering'),
      colorTone: COLOR_TONES.night,
      soundHints: ['夜街环境声', '远处车辆', '轻微风声'],
      location: '北城老街'
    },
    'north-city-barbecue': {
      id: 'north-city-barbecue',
      title: '烧烤摊还亮着',
      eyebrow: '北城 · 夜里十点',
      atmosphere: '炭火噼啪作响，烟雾慢慢飘向路灯。朋友的笑声和心事，都藏在这一桌热气里。',
      ambientClass: 'scene--north-city-barbecue scene--ember-glow scene--slow-smoke scene--bicycle scene--night-crowd',
      typewriter: pace(34, 420, 660, 'warm').typewriter,
      pacing: pace(34, 420, 660, 'warm'),
      colorTone: COLOR_TONES.ember,
      soundHints: ['炭火声', '模糊人声', '杯子轻碰'],
      location: '北城街边'
    },
    'basketball-summer-court': {
      id: 'basketball-summer-court',
      title: '夏天傍晚的球场',
      eyebrow: '篮球场 · 天还没有完全黑',
      atmosphere: '篮球落地一声一声，场灯在风里轻轻晃。汗水会蒸发，手感和倔强不会。',
      ambientClass: 'scene--basketball-court scene--summer-evening scene--court-lights scene--basketball-bounce scene--tree-breeze',
      typewriter: pace(27, 280, 450, 'energetic').typewriter,
      pacing: pace(27, 280, 450, 'energetic'),
      colorTone: COLOR_TONES.court,
      soundHints: ['篮球落地', '鞋底摩擦', '夏夜蝉鸣'],
      location: '露天篮球场'
    },
    'university-dorm': {
      id: 'university-dorm',
      title: '宿舍还没熄灯',
      eyebrow: '大学校园 · 深夜',
      atmosphere: '走廊尽头的灯还亮着。有人在赶作业，有人在和远方的人通话，也有人第一次认真想未来。',
      ambientClass: 'scene--university-dorm scene--corridor-light scene--desk-lamp scene--night-window scene--paper-notes',
      typewriter: pace(33, 340, 520, 'intimate').typewriter,
      pacing: pace(33, 340, 520, 'intimate'),
      colorTone: COLOR_TONES.campus,
      soundHints: ['翻书声', '远处宿舍人声', '风扇低鸣'],
      location: '大学宿舍'
    },
    'university-classroom': {
      id: 'university-classroom',
      title: '教室里的下一页',
      eyebrow: '大学校园 · 上午',
      atmosphere: '粉笔字留在黑板上，阳光擦过课桌。眼前是一张试卷，身后却是整段年轻的时间。',
      ambientClass: 'scene--university-classroom scene--morning-light scene--blackboard scene--floating-dust scene--paper-notes',
      typewriter: pace(30, 320, 500, 'focused').typewriter,
      pacing: pace(30, 320, 500, 'focused'),
      colorTone: COLOR_TONES.paper,
      soundHints: ['翻页声', '粉笔轻响', '窗外鸟鸣'],
      location: '大学教学楼'
    },
    'hotel-lobby': {
      id: 'hotel-lobby',
      title: '酒店的第一盏灯',
      eyebrow: '工作日 · 轮班开始前',
      atmosphere: '玻璃门外的人流不断，前台的灯一直亮着。成年后的第一份责任，往往来得比准备更早。',
      ambientClass: 'scene--hotel-lobby scene--lobby-warm-light scene--glass-door scene--city-reflection scene--soft-traffic',
      typewriter: pace(31, 300, 500, 'steady').typewriter,
      pacing: pace(31, 300, 500, 'steady'),
      colorTone: COLOR_TONES.work,
      soundHints: ['门铃提示', '行李轮声', '大厅空调声'],
      location: '酒店大堂'
    },
    'restaurant-kitchen': {
      id: 'restaurant-kitchen',
      title: '后厨的火候',
      eyebrow: '晚餐高峰 · 后厨',
      atmosphere: '订单一张接一张，油烟和热气扑到脸上。你学会的不是菜谱，是在忙乱里把事情做好。',
      ambientClass: 'scene--restaurant-kitchen scene--kitchen-steam scene--warm-fire scene--metal-reflection scene--busy-shadows',
      typewriter: pace(25, 220, 380, 'urgent').typewriter,
      pacing: pace(25, 220, 380, 'urgent'),
      colorTone: COLOR_TONES.ember,
      soundHints: ['锅铲声', '抽油烟机', '模糊报单声'],
      location: '餐厅后厨'
    },
    'bank-office': {
      id: 'bank-office',
      title: '柜台另一边',
      eyebrow: '工作日 · 城市写字楼',
      atmosphere: '数字在屏幕上跳动，窗外的人赶往不同的方向。钱从不是答案，但每个选择都要算清代价。',
      ambientClass: 'scene--bank-office scene--office-window scene--ledger-light scene--city-grid scene--quiet-motion',
      typewriter: pace(29, 280, 460, 'measured').typewriter,
      pacing: pace(29, 280, 460, 'measured'),
      colorTone: COLOR_TONES.work,
      soundHints: ['键盘声', '纸币清点声', '低声交谈'],
      location: '银行或写字楼'
    },
    'train-station': {
      id: 'train-station',
      title: '站台上的远方',
      eyebrow: '火车站 · 列车缓慢进站',
      atmosphere: '广播报出下一班车，行李箱滚过地面。离开和回家，有时只隔着一张车票。',
      ambientClass: 'scene--train-station scene--platform scene--slow-train scene--station-sign scene--passing-light',
      typewriter: pace(34, 420, 700, 'departure').typewriter,
      pacing: pace(34, 420, 700, 'departure'),
      colorTone: COLOR_TONES.travel,
      soundHints: ['列车进站', '站台广播', '行李箱滚轮'],
      location: '火车站'
    },
    'airport-departure': {
      id: 'airport-departure',
      title: '登机口前的片刻',
      eyebrow: '机场 · 远方正在起飞',
      atmosphere: '电子屏不断刷新目的地。你把证件握在手里，忽然明白远方也需要勇气和准备。',
      ambientClass: 'scene--airport-departure scene--terminal-glass scene--departure-board scene--runway-light scene--moving-crowd',
      typewriter: pace(32, 380, 620, 'departure').typewriter,
      pacing: pace(32, 380, 620, 'departure'),
      colorTone: COLOR_TONES.travel,
      soundHints: ['机场广播', '行李轮声', '远处飞机低鸣'],
      location: '机场'
    },
    'overseas-road': {
      id: 'overseas-road',
      title: '陌生城市的路灯',
      eyebrow: '海外 · 公路没有尽头',
      atmosphere: '霓虹从车窗上划过，英语、车流和新的规则一起涌来。你既是陌生人，也正在成为自己。',
      ambientClass: 'scene--overseas-road scene--highway scene--city-neon scene--car-light scene--moving-silhouette',
      typewriter: pace(32, 360, 580, 'wide').typewriter,
      pacing: pace(32, 360, 580, 'wide'),
      colorTone: COLOR_TONES.overseas,
      soundHints: ['公路车流', '远处警笛', '车内低频'],
      location: '海外城市'
    },
    'rainy-night': {
      id: 'rainy-night',
      title: '雨落在玻璃上',
      eyebrow: '雨夜 · 城市没有睡',
      atmosphere: '雨滴沿着玻璃慢慢滑下，车灯在水面碎成一片。很多决定，都是在这种安静里变得清楚。',
      ambientClass: 'scene--rainy-night scene--rain-glass scene--wet-road scene--passing-car-light scene--blue-window',
      typewriter: pace(38, 500, 760, 'reflective').typewriter,
      pacing: pace(38, 500, 760, 'reflective'),
      colorTone: COLOR_TONES.rain,
      soundHints: ['细雨', '雨刷器', '湿路面车声'],
      location: '雨夜街道'
    },
    'snow-morning': {
      id: 'snow-morning',
      title: '雪后，天亮得很慢',
      eyebrow: '冬天 · 清晨',
      atmosphere: '雪把街道压低了声音，呼出的白气很快散开。你知道日子不会暂停，只是多了一层新的光。',
      ambientClass: 'scene--snow-morning scene--soft-snow scene--dawn-light scene--cold-breath scene--quiet-street',
      typewriter: pace(39, 520, 780, 'still').typewriter,
      pacing: pace(39, 520, 780, 'still'),
      colorTone: COLOR_TONES.snow,
      soundHints: ['踩雪声', '清晨风声', '远处扫雪声'],
      location: '冬日街道'
    },
    'family-dinner': {
      id: 'family-dinner',
      title: '饭菜还热着',
      eyebrow: '家里 · 晚饭时间',
      atmosphere: '桌上的菜冒着热气，父母说的都是小事，却把牵挂藏得很深。门一直为你留着。',
      ambientClass: 'scene--family-dinner scene--dining-warm-light scene--rising-steam scene--home-window scene--table-shadow',
      typewriter: pace(36, 430, 700, 'tender').typewriter,
      pacing: pace(36, 430, 700, 'tender'),
      colorTone: COLOR_TONES.family,
      soundHints: ['碗筷轻碰', '家人低语', '厨房水声'],
      location: '家里饭桌'
    },
    'spring-festival': {
      id: 'spring-festival',
      title: '年夜的街灯',
      eyebrow: '春节 · 故乡的灯火',
      atmosphere: '红灯笼在风里轻晃，街上飘着饭菜香。回家的路很短，离开时却总要想很久。',
      ambientClass: 'scene--spring-festival scene--red-lantern scene--festival-light scene--firework-glow scene--warm-crowd',
      typewriter: pace(35, 460, 720, 'nostalgic').typewriter,
      pacing: pace(35, 460, 720, 'nostalgic'),
      colorTone: COLOR_TONES.festival,
      soundHints: ['远处鞭炮', '春节人声', '碗筷声'],
      location: '北城春节街道'
    },
    'childhood-home': {
      id: 'childhood-home',
      title: '旧电视里的夏天',
      eyebrow: '童年 · 北城小区',
      atmosphere: '电视机的雪花闪了一下，饭菜香从厨房飘出来。那时你还不知道，人生会走得多远。',
      ambientClass: 'scene--childhood-home scene--old-tv scene--family-warm-light scene--photo-grain scene--summer-window',
      typewriter: pace(42, 580, 860, 'memory').typewriter,
      pacing: pace(42, 580, 860, 'memory'),
      colorTone: COLOR_TONES.childhood,
      soundHints: ['老电视雪花', '家人模糊说话', '楼下孩童声'],
      location: '北城小区'
    },
    'quiet-morning': {
      id: 'quiet-morning',
      title: '清晨重新开始',
      eyebrow: '新的一个月 · 天刚亮',
      atmosphere: '窗帘透进一点光。没有人替你决定方向，但你仍然拥有重新开始的一天。',
      ambientClass: 'scene--quiet-morning scene--dawn-light scene--window-curtain scene--soft-dust scene--quiet-room',
      typewriter: pace(34, 400, 620, 'fresh').typewriter,
      pacing: pace(34, 400, 620, 'fresh'),
      colorTone: COLOR_TONES.paper,
      soundHints: ['清晨鸟鸣', '城市低频', '轻微风声'],
      location: '此刻所在的城市'
    }
  };

  const CATEGORY_ALIASES = {
    university: ['university', 'college', 'campus', 'school', 'study', '大学', '校园', '学校', '学习'],
    exam: ['exam', 'test', 'certificate', '考试', '考研', '补考', '试讲', '证书'],
    basketball: ['basketball', 'ball', 'court', 'nba', '篮球', '球场', '控卫', '投篮', '联赛'],
    training: ['training', 'fitness', 'sport', '训练', '健身', '体能', '运动'],
    work: ['work', 'job', 'career', 'parttime', '兼职', '工作', '职业', '实习', '上班'],
    overseas: ['overseas', 'abroad', 'foreign', 'english', '海外', '出国', '美国', '英语', '异国'],
    travel: ['travel', 'trip', 'visa', 'airport', 'flight', '旅行', '出行', '签证', '机场', '航班'],
    family: ['family', 'parents', 'mother', 'father', 'home', '家庭', '家人', '父母', '母亲', '父亲', '回家'],
    friendship: ['friendship', 'friend', 'social', '友情', '朋友', '同学', '队友', '聚会'],
    romance: ['romance', 'love', 'date', 'relationship', '恋爱', '约会', '伴侣', '感情', '婚姻'],
    health: ['health', 'accident', 'medical', '健康', '体检', '受伤', '恢复', '睡眠', '医院'],
    money: ['money', 'finance', 'investment', 'wealth', '金钱', '理财', '投资', '存款', '房贷', '债务'],
    business: ['business', 'startup', 'entrepreneur', '创业', '生意', '合伙', '客户', '订单'],
    media: ['media', 'video', 'creator', 'content', 'mcn', '自媒体', '短视频', '直播', '粉丝'],
    life: ['life', '人生', '生活']
  };

  const KEYWORDS = {
    festival: ['春节', '过年', '年夜饭', '除夕', '灯笼', '拜年', '团圆饭'],
    rain: ['雨夜', '下雨', '雨天', '暴雨', '雨滴', '雨伞', '湿漉', '雨水', 'rain', 'rainy'],
    snow: ['下雪', '雪天', '雪后', '积雪', '冬雪', '雪地', 'snow', 'snowy'],
    train: ['火车', '高铁', '站台', '车站', '进站', '列车', '候车'],
    airport: ['机场', '登机', '航班', '飞机', '转机', '护照', '签证', '出境', '入境'],
    overseas: ['美国', '纽约', 'new york', '洛杉矶', 'los angeles', '加拿大', 'canada', '海外', '国外', '异国', '英文'],
    hotel: ['酒店', '前台', '客诉', '客房', '大堂', '旅馆'],
    restaurant: ['餐厅', '饭店', '后厨', '外卖', '跑单', '点餐', '厨师', '市集'],
    bank: ['银行', '柜台', '金融', '贷款', '理财', '投资', '账单', '存款', '回款', '预算'],
    barbecue: ['烧烤', '夜宵', '烤串', '小聚', '聚餐', '喝酒', '街边摊'],
    basketball: ['篮球', '球场', '控卫', '投篮', '三分', '比赛', '球队', '训练营', '教练'],
    dorm: ['宿舍', '室友', '熄灯', '寝室'],
    classroom: ['教室', '课堂', '考试', '试卷', '课程', '老师', '导师', '毕业', '奖学金', '课题', '双选会'],
    family: ['家人', '家庭', '父母', '母亲', '父亲', '生日', '团聚', '回家', '孩子', '婚姻'],
    morning: ['清晨', '早晨', '上午', '天亮', '晨练', '早上'],
    night: ['深夜', '夜晚', '晚上', '凌晨', '下班后', '晚饭', '月末']
  };

  const STAGE_META = {
    childhood: { label: '童年', sceneId: 'childhood-home' },
    adolescence: { label: '青春期', sceneId: 'basketball-summer-court' },
    university: { label: '大学', sceneId: 'university-dorm' },
    earlyCareer: { label: '初入社会', sceneId: 'north-city-night-street' },
    growth: { label: '成长时期', sceneId: 'north-city-night-street' },
    midlife: { label: '人生中段', sceneId: 'family-dinner' },
    laterLife: { label: '往后岁月', sceneId: 'snow-morning' }
  };

  function text(value) {
    return String(value == null ? '' : value).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function compact(value) {
    return text(value).replace(/[·—–_\-，,。！？!?、：:（）()【】\[\]"'“”‘’]/g, '');
  }

  function wordsFrom(event) {
    const source = event || {};
    return compact([
      source.category, source.type, source.id, source.title, source.name, source.description,
      source.text, source.hint, source.location, source.city, source.country,
      Array.isArray(source.tags) ? source.tags.join(' ') : source.tags,
      source.time, source.timeOfDay, source.sceneTime
    ].join(' '));
  }

  function hasAny(haystack, terms) {
    const target = compact(haystack);
    return (terms || []).some((term) => target.indexOf(compact(term)) !== -1);
  }

  function canonicalCategory(category, event) {
    const raw = compact(category || (event && (event.category || event.type)) || '');
    if (!raw && event) {
      const eventWords = wordsFrom(event);
      for (const [id, aliases] of Object.entries(CATEGORY_ALIASES)) {
        if (hasAny(eventWords, aliases)) return id;
      }
      return 'life';
    }
    for (const [id, aliases] of Object.entries(CATEGORY_ALIASES)) {
      if (hasAny(raw, aliases)) return id;
    }
    return raw || 'life';
  }

  function getStage(player, fallbackAge) {
    const p = player || {};
    const explicit = text(p.lifeStage || p.stage || '');
    const aliases = {
      child: 'childhood', childhood: 'childhood', teen: 'adolescence', adolescence: 'adolescence',
      middle: 'adolescence', highschool: 'adolescence', university: 'university', college: 'university',
      early: 'earlyCareer', earlycareer: 'earlyCareer', career: 'earlyCareer', growth: 'growth',
      mid: 'midlife', midlife: 'midlife', mature: 'midlife', later: 'laterLife', laterlife: 'laterLife'
    };
    if (aliases[explicit]) return aliases[explicit];
    const age = Number(p.age != null ? p.age : fallbackAge);
    if (!Number.isFinite(age)) return 'university';
    if (age <= 12) return 'childhood';
    if (age <= 18) return 'adolescence';
    if (age <= 24) return 'university';
    if (age <= 30) return 'earlyCareer';
    if (age <= 40) return 'growth';
    if (age <= 60) return 'midlife';
    return 'laterLife';
  }

  function getMonth(player, event, overrides) {
    const value = (overrides && overrides.month) || (event && event.month) || (player && player.date && player.date.month);
    const month = Number(value);
    return month >= 1 && month <= 12 ? Math.round(month) : null;
  }

  function getPeriod(event, overrides, month) {
    const source = compact((overrides && (overrides.time || overrides.period)) || (event && (event.timeOfDay || event.time || event.sceneTime)) || wordsFrom(event));
    if (hasAny(source, KEYWORDS.morning)) return 'morning';
    if (hasAny(source, KEYWORDS.night)) return 'night';
    if (hasAny(source, ['中午', '午后', '下午', '傍晚', '黄昏', '白天'])) return 'evening';
    if (month && month >= 6 && month <= 8) return 'summer-evening';
    if (month && (month === 12 || month <= 2)) return 'winter-morning';
    return 'night';
  }

  function getSeason(month) {
    if (!month) return 'all-season';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  function pickSceneId(player, event, overrides) {
    const explicit = overrides && (overrides.sceneId || overrides.id || overrides.forceScene);
    if (explicit && DEFINITIONS[explicit]) return explicit;
    const body = wordsFrom(event);
    const category = canonicalCategory(event && event.category, event);
    const month = getMonth(player, event, overrides);

    // 节日优先于天气：年夜饭不应变成一张普通雪景。
    if (hasAny(body, KEYWORDS.festival)) return 'spring-festival';
    if (hasAny(body, KEYWORDS.snow)) return 'snow-morning';
    if (hasAny(body, KEYWORDS.rain)) return 'rainy-night';
    if (hasAny(body, KEYWORDS.train)) return 'train-station';
    if (hasAny(body, KEYWORDS.airport)) return 'airport-departure';
    if (hasAny(body, KEYWORDS.overseas)) return 'overseas-road';
    if (hasAny(body, KEYWORDS.hotel)) return 'hotel-lobby';
    if (hasAny(body, KEYWORDS.restaurant)) return 'restaurant-kitchen';
    if (hasAny(body, KEYWORDS.bank)) return 'bank-office';
    if (hasAny(body, KEYWORDS.basketball)) return 'basketball-summer-court';
    if (hasAny(body, KEYWORDS.dorm)) return 'university-dorm';
    if (hasAny(body, KEYWORDS.classroom)) return 'university-classroom';
    if (hasAny(body, KEYWORDS.family)) return month === 1 || month === 2 ? 'spring-festival' : 'family-dinner';
    if (hasAny(body, KEYWORDS.barbecue)) return 'north-city-barbecue';

    const categoryScenes = {
      university: 'university-dorm', exam: 'university-classroom', basketball: 'basketball-summer-court', training: 'basketball-summer-court',
      work: 'hotel-lobby', overseas: 'overseas-road', travel: 'airport-departure', family: 'family-dinner',
      friendship: 'north-city-barbecue', romance: 'north-city-barbecue', health: 'quiet-morning', money: 'bank-office',
      business: 'north-city-night-street', media: 'north-city-night-street'
    };
    if (categoryScenes[category]) return categoryScenes[category];
    const stage = getStage(player, event && event.age);
    return (STAGE_META[stage] || STAGE_META.university).sceneId;
  }

  function cloneTone(tone) { return { ...(tone || COLOR_TONES.night) }; }

  function cloneScene(definition) {
    const copy = { ...definition };
    copy.colorTone = cloneTone(definition.colorTone);
    copy.typewriter = { ...(definition.typewriter || {}) };
    copy.pacing = { ...(definition.pacing || {}), typewriter: { ...((definition.pacing && definition.pacing.typewriter) || {}) } };
    copy.soundHints = Array.isArray(definition.soundHints) ? definition.soundHints.slice() : [];
    return copy;
  }

  /**
   * 获取一个可供 UI 直接渲染的场景。
   * 支持 resolveScene(player, event, options)，也支持 resolveScene({ player, event, ...options })。
   */
  function resolveScene(player, event, options) {
    let p = player || {};
    let e = event || {};
    let o = options || {};
    if (arguments.length === 1 && player && typeof player === 'object' && (player.player || player.event || player.sceneId || player.forceScene)) {
      p = player.player || {};
      e = player.event || {};
      o = player;
    }
    const sceneId = pickSceneId(p, e, o);
    const scene = cloneScene(DEFINITIONS[sceneId] || DEFINITIONS['north-city-night-street']);
    const month = getMonth(p, e, o);
    const period = getPeriod(e, o, month);
    const stage = getStage(p, e && e.age);
    const category = canonicalCategory(e && e.category, e);
    const body = wordsFrom(e);

    scene.stage = stage;
    scene.stageLabel = (STAGE_META[stage] || STAGE_META.university).label;
    scene.category = category;
    scene.month = month;
    scene.season = getSeason(month);
    scene.period = period;
    scene.eventId = e && e.id ? e.id : null;
    scene.eventTitle = e && (e.title || e.name) ? (e.title || e.name) : null;
    scene.ambientClass = `${scene.ambientClass} scene--${scene.season} scene--${period}`.replace(/\s+/g, ' ').trim();

    // 当剧情明确提到夜色或清晨时，用轻量 modifier 保留同一场景的情绪，不替换内容场景。
    if (hasAny(body, KEYWORDS.night) && scene.id !== 'rainy-night') scene.ambientClass += ' scene--late-night';
    if (hasAny(body, KEYWORDS.morning) && scene.id !== 'snow-morning') scene.ambientClass += ' scene--at-dawn';
    return scene;
  }

  function getScene(id) {
    return cloneScene(DEFINITIONS[id] || DEFINITIONS['north-city-night-street']);
  }

  function listScenes() {
    return Object.keys(DEFINITIONS).map((id) => getScene(id));
  }

  window.LIFE_SCENES = {
    VERSION: '1.0.0',
    DEFINITIONS,
    COLOR_TONES,
    STAGES: STAGE_META,
    canonicalCategory,
    getStage,
    getScene,
    listScenes,
    resolveScene,
    resolve: resolveScene,
    choose: resolveScene
  };
})();
