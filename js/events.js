/* 游戏事件目录：普通 script 直接加载，window.EVENTS 会被暴露给游戏逻辑。 */
const stat = (stats = {}, rest = {}) => ({ stats, ...rest });
const choice = (id, label, result, effects = {}, rest = {}) => ({
  id, label, result, effects, ...rest,
});
const event = (id, category, data) => ({
  id,
  category,
  stages: ['universal'],
  minAge: 21,
  maxAge: 80,
  weight: 5,
  cooldown: 8,
  conditions: {},
  tags: [],
  hiddenOptions: [],
  ...data,
});

const UNIVERSITY_EVENTS = [
  event('university_basketball_match', '大学与考试', {
    stages: ['university'], maxAge: 24, weight: 11, cooldown: 10,
    tags: ['篮球', '校队'],
    title: '大学篮球比赛',
    description: '学校即将举行篮球比赛，教练问你是否愿意增加训练时间。',
    options: [
      choice('extra_practice', '每天加练两小时', '连续的加练让你的脚步更稳，但身体也积累了疲劳。', stat({ basketball: 5, fitness: 3, discipline: 2, stress: 4, health: -1 }, { flagsAdd: ['trained_hard'] }), { risk: '中等' }),
      choice('keep_routine', '保持原来的训练量', '你维持住节奏，没有惊喜，也没有明显透支。', stat({ basketball: 1, fitness: 1, stress: 1 })),
      choice('study_english', '暂停训练，改练英语', '你错过了一些默契训练，却把晚上留给了英语听力。', stat({ english: 4, knowledge: 1, basketball: -1, stress: -1 })),
    ],
    hiddenOptions: [
      choice('apply_captain', '主动申请担任球队队长', '队友愿意听你的安排，你第一次感到带队不只是技术。', stat({ basketball: 2, social: 3, reputation: 3, stress: 3 }, { flagsAdd: ['team_captain'] }), { conditions: { statsMin: { basketball: 60, social: 50, reputation: 20 } } }),
    ],
  }),
  event('final_exam_week', '大学与考试', {
    stages: ['university'], maxAge: 24, weight: 10,
    title: '期末周到了',
    description: '几门课程的考试挤在同一周，宿舍里开始有人通宵。',
    options: [
      choice('library_sprint', '去图书馆冲刺', '你把手机调成静音，终于啃完了最难的章节。', stat({ knowledge: 4, discipline: 3, stress: 3, happiness: -1 })),
      choice('study_group', '约同学组成学习小组', '讨论让你找到了遗漏的知识点，也认识了靠谱的同学。', stat({ knowledge: 2, social: 3, stress: 1 }, { flagsAdd: ['study_group'] })),
      choice('gamble_on_notes', '只背重点笔记', '你用最省力的方式上考场，结果有些看运气。', stat({ stress: 1 }, { outcomes: [
        { weight: 58, result: '重点押中，你惊险过关。', effects: stat({ knowledge: 1, luck: 1 }) },
        { weight: 42, result: '考题超出范围，你只能准备补考。', effects: stat({ knowledge: -1, stress: 4, reputation: -1 }, { flagsAdd: ['needs_makeup_exam'] }) },
      ] })),
    ],
  }),
  event('teacher_certificate_plan', '大学与考试', {
    stages: ['university', 'earlyCareer'], maxAge: 27, weight: 8,
    title: '教师资格证报名',
    description: '学长提醒你，教师资格证的报名窗口快要关闭。',
    options: [
      choice('register_and_prepare', '报名并制定复习表', '你给未来多留了一条稳定的路。', stat({ knowledge: 3, discipline: 3, stress: 2 }, { money: -350, flagsAdd: ['teacher_certificate_preparing'] })),
      choice('postpone', '等明年状态更好再考', '你暂时卸下压力，但机会也向后推了一年。', stat({ stress: -2, courage: -1 })),
      choice('ask_senior', '请上岸学长带着复习', '有人帮你拆解重点，效率比一个人硬扛高得多。', stat({ knowledge: 4, social: 2, money: -500 }, { flagsAdd: ['teacher_exam_mentor'] })),
    ],
  }),
  event('sports_class_practicum', '大学与考试', {
    stages: ['university'], maxAge: 24, weight: 8,
    title: '体育课试讲',
    description: '实习指导老师让你给一群陌生学生上一节篮球基础课。',
    options: [
      choice('prepare_lesson', '认真设计教案和分组', '课堂节奏很顺，孩子们下课时还在问下次能不能继续。', stat({ knowledge: 2, social: 2, discipline: 2, reputation: 2 }, { workExperience: 1, flagsAdd: ['teaching_practicum'] })),
      choice('freestyle_demo', '靠球技现场带动气氛', '学生玩得很开心，但动作细节没有被真正纠正。', stat({ basketball: 1, social: 2, reputation: 1, knowledge: -1 })),
      choice('observe_first', '先旁听其他老师的课', '你学到了控场技巧，却错过了最直接的实践机会。', stat({ knowledge: 2, stress: -1 })),
    ],
  }),
  event('dorm_room_conflict', '大学与考试', {
    stages: ['university'], maxAge: 24, weight: 6,
    title: '宿舍作息冲突',
    description: '室友深夜打游戏的声音影响了你的训练恢复和复习。',
    options: [
      choice('calm_talk', '心平气和地沟通', '你们商定了安静时间，关系没有被一时情绪毁掉。', stat({ social: 2, happiness: 1, stress: -2 }, { flagsAdd: ['roommate_trust'] })),
      choice('endure', '忍一忍，戴耳塞', '矛盾没有爆发，但睡眠质量持续下降。', stat({ discipline: 1, health: -1, stress: 2 })),
      choice('argue', '当场争吵', '声音终于停了，宿舍气氛却冷了下来。', stat({ courage: 1, social: -3, happiness: -2, stress: 3 })),
    ],
  }),
  event('scholarship_application', '大学与考试', {
    stages: ['university'], maxAge: 24, weight: 7,
    title: '奖学金评选',
    description: '学院公布奖学金申请通知，你的成绩和活动经历都还不错。',
    options: [
      choice('polish_materials', '认真整理材料并申请', '材料清楚地展现了你的努力，评审给了正面反馈。', stat({ discipline: 2, knowledge: 1, reputation: 2 }, { outcomes: [
        { weight: 58, result: '你获得了奖学金。', effects: stat({ happiness: 3, reputation: 2 }, { money: 3000, flagsAdd: ['won_scholarship'] }) },
        { weight: 42, result: '这次名额有限，但老师记住了你的名字。', effects: stat({ reputation: 1, courage: 1 }) },
      ] })),
      choice('let_it_go', '把机会让给更需要的同学', '你没有得到资金，却收获了一种踏实感。', stat({ happiness: 2, social: 1, courage: 1 })),
      choice('rush_submission', '临截止前随便提交', '材料缺少亮点，结果也没有太大意外。', stat({ stress: 1, reputation: -1 })),
    ],
  }),
  event('graduation_direction', '大学与考试', {
    stages: ['university'], minAge: 22, maxAge: 25, weight: 10, cooldown: 12,
    title: '毕业方向的岔路',
    description: '同学们开始投简历、备考或打听海外机会，你也必须做一个优先级。',
    options: [
      choice('teacher_path', '优先准备教师招聘', '稳定的目标让你有了清晰的日程。', stat({ knowledge: 3, discipline: 3, stress: 2 }, { flagsAdd: ['teacher_path'] })),
      choice('coach_path', '把重心放到篮球教练路线上', '你开始寻找带队和培训的机会。', stat({ basketball: 3, fitness: 2, courage: 2 }, { flagsAdd: ['coach_path'] })),
      choice('hotel_path', '投递酒店和服务业岗位', '你愿意从服务细节中学习管理。', stat({ english: 1, social: 2, courage: 1 }, { flagsAdd: ['hotel_path'] })),
      choice('explore_path', '先空出时间探索更多可能', '自由让你兴奋，也让不确定感随之增加。', stat({ courage: 2, happiness: 1, stress: 2 }, { flagsAdd: ['explorer_path'] })),
    ],
  }),
  event('research_project_invite', '大学与考试', {
    stages: ['university'], maxAge: 24, weight: 6,
    title: '运动康复课题邀请',
    description: '老师邀请你参与一项关于青少年运动损伤的校内课题。',
    options: [
      choice('join_project', '加入并负责数据整理', '你学会了把训练经验变成可验证的结论。', stat({ knowledge: 4, discipline: 2, reputation: 1 }, { workExperience: 1, flagsAdd: ['research_experience'] })),
      choice('only_attend', '只参加几次讨论', '你听到了新观点，但没有真正留下成果。', stat({ knowledge: 1 })),
      choice('decline_for_training', '拒绝，专注个人训练', '你保住了训练时间，也失去了一次学术经历。', stat({ basketball: 2, fitness: 1, knowledge: -1 })),
    ],
  }),
  event('campus_club_election', '大学与考试', {
    stages: ['university'], maxAge: 24, weight: 6,
    title: '社团负责人竞选',
    description: '篮球社要选新负责人，大家鼓励你站出来试试。',
    options: [
      choice('run_for_lead', '准备竞选并上台演讲', '你把一学期的活动设想讲得很具体。', stat({ social: 3, courage: 3, reputation: 2, stress: 2 }, { outcomes: [
        { weight: 52, result: '你当选了，第一次开始管理一群人。', effects: stat({ reputation: 3 }, { flagsAdd: ['club_leader'] }) },
        { weight: 48, result: '你落选了，但台下有人认可你的表达。', effects: stat({ courage: 2, social: 1 }) },
      ] })),
      choice('support_friend', '支持更有经验的朋友', '你成为可靠的执行者，也建立了互相信任。', stat({ social: 2, happiness: 1 }, { flagsAdd: ['club_core_member'] })),
      choice('skip_election', '不参与，留给训练和学习', '你少了一项负担，履历也少了一笔经历。', stat({ discipline: 1, stress: -1 })),
    ],
  }),
  event('makeup_exam', '大学与考试', {
    stages: ['university'], maxAge: 24, weight: 5,
    conditions: { flagsAll: ['needs_makeup_exam'] },
    title: '补考通知',
    description: '那门没过的课程给了你最后一次机会。',
    options: [
      choice('focus_makeup', '暂停娱乐，全力准备', '你把漏洞一个个补上，终于把这关跨过去。', stat({ knowledge: 3, discipline: 4, stress: 3 }, { flagsRemove: ['needs_makeup_exam'], reputation: 1 })),
      choice('ask_tutor', '请同学一对一讲题', '有人把难点拆开讲，你避免了继续拖延。', stat({ knowledge: 3, social: 2 }, { money: -300, flagsRemove: ['needs_makeup_exam'] })),
      choice('ignore_again', '继续拖着不管', '问题没有消失，毕业计划变得更不确定。', stat({ stress: 5, reputation: -3, happiness: -3 }, { flagsAdd: ['graduation_delayed'] })),
    ],
  }),
  event('university_job_fair', '大学与考试', {
    stages: ['university'], minAge: 22, maxAge: 25, weight: 8,
    title: '校园双选会',
    description: '体育、酒店、销售和培训机构都在礼堂摆出了展位。',
    options: [
      choice('targeted_interviews', '带着简历投递三个方向', '你不再只凭感觉，而是开始比较不同人生的代价。', stat({ courage: 2, social: 2, knowledge: 1 }, { flagsAdd: ['job_market_exposure'] })),
      choice('hotel_interview', '重点面试酒店岗位', '面试官认可你的服务经历，留下了联系方式。', stat({ english: 1, social: 2, reputation: 1 }, { flagsAdd: ['hotel_interviewed'] })),
      choice('training_interview', '重点面试体育培训机构', '你看见了行业的真实收入与压力。', stat({ basketball: 1, social: 2 }, { flagsAdd: ['training_interviewed'] })),
      choice('leave_early', '觉得迷茫，提前离开', '你暂时逃开了选择，但焦虑并没有离开。', stat({ stress: 2, courage: -1 })),
    ],
  }),
  event('college_friend_reunion', '大学与考试', {
    stages: ['university', 'earlyCareer'], maxAge: 29, weight: 5,
    title: '老同学的小聚',
    description: '队友们约你吃饭，有人已经拿到工作，也有人准备考研。',
    options: [
      choice('go_network', '去聚一聚，认真听大家的近况', '一段随意聊天给了你新的信息和联系人。', stat({ social: 3, happiness: 2 }, { relationship: { teammates: 3 }, flagsAdd: ['alumni_network'] })),
      choice('go_relax', '去吃饭，但不聊前途', '你短暂放松下来，压力被稀释了一些。', stat({ happiness: 3, stress: -2 }, { money: -180 })),
      choice('stay_home', '留在宿舍继续卷', '效率不一定更高，但你没有中断自己的计划。', stat({ discipline: 2, stress: 1, social: -1 })),
    ],
  }),
  event('graduate_school_choice', '大学与考试', {
    stages: ['university', 'earlyCareer'], minAge: 22, maxAge: 27, weight: 6,
    title: '考研还是就业',
    description: '家人问你是否要继续读研，身边的选择变得嘈杂。',
    options: [
      choice('prepare_master', '备考体育教育研究生', '你为长期学历投入时间，短期收入被按下暂停。', stat({ knowledge: 4, discipline: 3, stress: 4 }, { money: -1800, flagsAdd: ['graduate_exam_preparing'] })),
      choice('work_first', '先工作，积累现实经验', '你把书本外的世界放在了第一位。', stat({ courage: 2, workExperience: 1 }, { flagsAdd: ['work_first'] })),
      choice('hybrid', '边工作边备考', '两条路都没放弃，代价是更少的休息时间。', stat({ knowledge: 2, discipline: 3, stress: 5, health: -1 }, { flagsAdd: ['dual_track'] })),
    ],
  }),
  event('graduation_photo', '大学与考试', {
    stages: ['university'], minAge: 22, maxAge: 25, weight: 4,
    title: '毕业合影那天',
    description: '拍完合影，校园里忽然有了告别的意味。',
    options: [
      choice('thank_mentors', '郑重感谢老师和队友', '你留下的不只是合影，还有一批愿意帮你的前辈。', stat({ social: 3, happiness: 2, reputation: 2 }, { flagsAdd: ['mentor_network'] })),
      choice('quiet_goodbye', '安静地走一圈校园', '你整理了自己真正想要的生活。', stat({ happiness: 2, knowledge: 1, courage: 1 })),
      choice('skip_event', '不想煽情，直接回去赶计划', '你保持了节奏，但多年后偶尔会想起这天。', stat({ discipline: 1, happiness: -1 })),
    ],
  }),
];

const BASKETBALL_EVENTS = [
  event('morning_strength_cycle', '篮球训练与比赛', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 42, weight: 9,
    title: '清晨力量训练计划',
    description: '你制定了连续六周的力量和核心训练计划。',
    options: [
      choice('complete_cycle', '严格完成六周计划', '规律训练给了你更扎实的身体基础。', stat({ fitness: 5, health: 2, discipline: 4, basketball: 1, stress: 2 }, { flagsAdd: ['strength_base'] })),
      choice('light_cycle', '每周练三次，留出恢复日', '进步慢一些，但你把训练做成了可持续的习惯。', stat({ fitness: 3, health: 2, discipline: 2 })),
      choice('skip_cycle', '先把精力留给其他事情', '短期轻松了，身体状态却没有新的变化。', stat({ stress: -1, fitness: -1 })),
    ],
  }),
  event('ankle_discomfort', '篮球训练与比赛', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 45, weight: 6,
    conditions: { statsMin: { fitness: 35 } },
    title: '脚踝有点不对劲',
    description: '一次急停后脚踝隐隐作痛，周末还有重要比赛。',
    options: [
      choice('rest_and_rehab', '休息并做康复训练', '你忍住上场冲动，身体给了你更长的回报。', stat({ health: 3, fitness: -1, discipline: 2, stress: 1 }, { money: -300, flagsAdd: ['rehab_aware'] })),
      choice('play_through_pain', '贴上护踝继续训练', '你没有缺席，但伤痛被放大了。', stat({ basketball: 1, courage: 1, health: -4, stress: 3 }, { outcomes: [
        { weight: 65, result: '你撑过了比赛，仍需要尽快恢复。', effects: stat({ reputation: 1, fitness: -1 }) },
        { weight: 35, result: '一次落地不稳让伤情加重。', effects: stat({ health: -6, fitness: -4 }, { flagsAdd: ['ankle_injury'] }) },
      ] })),
      choice('see_specialist', '去运动康复机构评估', '专业意见让你知道该怎么恢复，而不是靠硬扛。', stat({ knowledge: 2, health: 3 }, { money: -800, flagsRemove: ['ankle_injury'] })),
    ],
  }),
  event('city_amateur_league', '篮球训练与比赛', {
    stages: ['university', 'earlyCareer'], maxAge: 33, weight: 8,
    conditions: { statsMin: { basketball: 42 } },
    title: '城市业余联赛报名',
    description: '一支本地球队缺少控球后卫，邀请你参加周末联赛。',
    options: [
      choice('join_league', '报名并稳定参赛', '高强度对抗让你的比赛阅读能力快速成长。', stat({ basketball: 4, fitness: 2, social: 2, stress: 2 }, { money: -600, basketballGames: 4, flagsAdd: ['amateur_league_player'] })),
      choice('join_as_sub', '先做替补，观察节奏', '你压力较小地进入了更高水平的圈子。', stat({ basketball: 2, social: 2, courage: 1 }, { money: -300, basketballGames: 2 })),
      choice('decline_for_work', '因为工作安排拒绝', '你保住了收入，却有一点不甘心。', stat({ income: 300, happiness: -1, basketball: -1 })),
    ],
    hiddenOptions: [
      choice('organize_team', '拉上旧队友，自己组队参赛', '你不只在场上控球，也开始协调人和事。', stat({ basketball: 3, social: 4, courage: 3, reputation: 2 }, { money: -1800, basketballGames: 5, flagsAdd: ['team_organizer'] }), { conditions: { statsMin: { social: 58, reputation: 18 }, flagsAny: ['team_captain', 'club_leader'] } }),
    ],
  }),
  event('three_point_slump', '篮球训练与比赛', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 42, weight: 6,
    title: '投篮手感低迷',
    description: '连续几场比赛三分命中率很低，你开始怀疑自己的训练。',
    options: [
      choice('film_review', '看录像找出问题', '你发现出手选择和疲劳比手型更关键。', stat({ basketball: 3, knowledge: 2, discipline: 2, stress: -1 })),
      choice('shoot_more', '每天加投五百球', '重复带来一点信心，也让手腕开始疲劳。', stat({ basketball: 3, discipline: 3, fitness: -1, stress: 2 })),
      choice('take_break', '休息几天，调整心态', '你没有立刻变强，但焦虑不再控制你。', stat({ happiness: 2, stress: -3, basketball: -1 })),
    ],
  }),
  event('coach_certificate_course', '篮球训练与比赛', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 45, weight: 7,
    conditions: { statsMin: { basketball: 40, knowledge: 35 } },
    title: '篮球教练证培训',
    description: '省城有一期开设中的教练培训，报名费和时间都不便宜。',
    options: [
      choice('take_course', '报名并认真完成培训', '你开始用系统方法理解训练、沟通和安全。', stat({ basketball: 3, knowledge: 4, reputation: 2, discipline: 2 }, { money: -4200, flagsAdd: ['coach_certificate'] })),
      choice('audit_course', '只去旁听公开课', '你获得一些灵感，但没有拿到正式资质。', stat({ knowledge: 2, basketball: 1 }, { money: -400 })),
      choice('postpone_course', '等收入稳定后再说', '财务压力小了，职业转型也被往后推。', stat({ stress: -1, courage: -1 })),
    ],
  }),
  event('youth_assistant_coach', '篮球训练与比赛', {
    stages: ['university', 'earlyCareer'], maxAge: 34, weight: 8,
    conditions: { flagsAny: ['coach_path', 'coach_certificate'], statsMin: { basketball: 45 } },
    title: '青少年队助教机会',
    description: '一家训练机构缺人，问你愿不愿意周末带基础班。',
    options: [
      choice('take_assistant_job', '接受周末助教', '孩子们的进步让你第一次看见教练工作的意义。', stat({ basketball: 2, social: 3, reputation: 2, stress: 2 }, { money: 1600, income: 500, workExperience: 2, flagsAdd: ['assistant_coach'] })),
      choice('trial_month', '先试带一个月', '你用低风险确认了自己是否喜欢这份工作。', stat({ basketball: 1, social: 2 }, { money: 600, workExperience: 1 })),
      choice('decline_assistant', '拒绝，继续做自己的训练', '技术没有停下，但带人的能力仍没有被验证。', stat({ fitness: 2, basketball: 2, social: -1 })),
    ],
  }),
  event('semi_pro_tryout', '篮球训练与比赛', {
    stages: ['university', 'earlyCareer'], maxAge: 29, weight: 4, cooldown: 16,
    conditions: { statsMin: { basketball: 70, fitness: 65 } },
    title: '半职业球队试训',
    description: '朋友转来一支半职业球队的试训通知，竞争者很多。',
    options: [
      choice('go_all_in', '请假参加完整试训', '你把最好的状态留在场上，结果仍取决于实力和时机。', stat({ courage: 4, basketball: 2, fitness: 2, stress: 4 }, { money: -1200, outcomes: [
        { weight: 22, result: '教练留下了你，梦想获得了一次现实入口。', effects: stat({ reputation: 6, happiness: 5 }, { income: 5000, workExperience: 3, flagsAdd: ['semi_pro_player'], setCareer: 'semi_pro_player' }) },
        { weight: 78, result: '你没有入选，但拿到了非常具体的改进建议。', effects: stat({ courage: 2, basketball: 2, happiness: -2 }, { flagsAdd: ['pro_tryout_experience'] }) },
      ] })),
      choice('go_for_experience', '只把它当一次学习', '你保持了心态，也看到了与职业级别的差距。', stat({ basketball: 2, knowledge: 2, courage: 1 }, { money: -800, flagsAdd: ['pro_tryout_experience'] })),
      choice('skip_tryout', '不去，继续稳妥路径', '你没有承担风险，也错过了一次验证。', stat({ stress: -1, courage: -2 })),
    ],
  }),
  event('local_kids_free_clinic', '篮球训练与比赛', {
    stages: ['earlyCareer', 'career'], maxAge: 45, weight: 6,
    conditions: { statsMin: { basketball: 48 } },
    title: '社区公益篮球课',
    description: '社区邀请你周末带一场免费的儿童篮球体验课。',
    options: [
      choice('lead_clinic', '认真带完并记录反馈', '家长看见你的耐心，有人主动询问长期课程。', stat({ social: 3, reputation: 4, happiness: 2 }, { money: -300, followers: 80, flagsAdd: ['community_coach'], unlockEvents: ['basketball_camp_startup'] })),
      choice('bring_friend', '带一位朋友共同组织', '分工减轻了压力，也考验你们的默契。', stat({ social: 3, reputation: 2 }, { money: -500, flagsAdd: ['coach_partner_test'] })),
      choice('decline_free_work', '拒绝，优先做有偿工作', '你守住了时间边界，但少了一次口碑积累。', stat({ income: 600, reputation: -1 })),
    ],
  }),
  event('basketball_shoe_sponsor', '篮球训练与比赛', {
    stages: ['earlyCareer', 'career'], maxAge: 42, weight: 3,
    conditions: { statsMin: { reputation: 45, basketball: 55 } },
    title: '本地球鞋店合作',
    description: '一家球鞋店希望你在比赛和视频里展示他们的新品。',
    options: [
      choice('accept_sponsor', '接受合作并认真试穿', '合作金额不大，但你学会了维护商业信用。', stat({ reputation: 2, social: 2 }, { money: 2500, followers: 200, flagsAdd: ['local_sponsor'] })),
      choice('negotiate_quality', '先测试产品质量再谈', '你把长期口碑放在短期收入前面。', stat({ knowledge: 1, reputation: 3, courage: 1 })),
      choice('reject_sponsor', '拒绝不适合自己的推广', '你少赚了一笔钱，但账号调性更清晰。', stat({ reputation: 1, courage: 1 })),
    ],
  }),
  event('team_conflict', '篮球训练与比赛', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 45, weight: 5,
    title: '队内球权争议',
    description: '比赛输球后，有队友抱怨你持球时间太长。',
    options: [
      choice('review_together', '约队友看录像沟通', '你们把情绪换成了具体回合的讨论。', stat({ social: 3, basketball: 2, reputation: 1, stress: -1 })),
      choice('prove_on_court', '下场比赛用表现回应', '你更努力了，但矛盾没有被真正说开。', stat({ basketball: 2, stress: 3, social: -1 })),
      choice('walk_away', '离开这支球队', '你退出了消耗关系，也失去稳定比赛平台。', stat({ courage: 1, happiness: -1, social: -3 }, { flagsAdd: ['left_team'] })),
    ],
  }),
  event('sports_injury_prevention_workshop', '篮球训练与比赛', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 50, weight: 5,
    title: '运动损伤预防讲座',
    description: '一位康复师在场馆开设免费讲座，内容涉及膝踝和热身。',
    options: [
      choice('attend_and_note', '去听并做笔记', '你开始把长期健康当作竞技能力的一部分。', stat({ knowledge: 3, health: 2, discipline: 1 }, { flagsAdd: ['injury_prevention'] })),
      choice('share_with_team', '听完后整理给队友', '你获得了队友的信任，也巩固了知识。', stat({ knowledge: 3, social: 3, reputation: 1 })),
      choice('skip_workshop', '觉得没时间，不参加', '当下没有损失，只是少了一次预防机会。', stat({ discipline: -1 })),
    ],
  }),
  event('regional_championship', '篮球训练与比赛', {
    stages: ['university', 'earlyCareer'], maxAge: 32, weight: 5, cooldown: 14,
    conditions: { statsMin: { basketball: 55 }, flagsAny: ['amateur_league_player', 'team_organizer', 'team_captain'] },
    title: '地区冠军赛',
    description: '球队一路打进淘汰赛，最后一场要面对实力更强的对手。',
    options: [
      choice('study_opponent', '提前研究对手并带动全队准备', '准备让你们在开局没有慌乱。', stat({ basketball: 3, knowledge: 2, social: 2, stress: 3 }, { outcomes: [
        { weight: 40, result: '你们拿下冠军，队友把你抛向半空。', effects: stat({ happiness: 5, reputation: 5, basketball: 2 }, { money: 2000, basketballWins: 1, flagsAdd: ['regional_champion'] }) },
        { weight: 60, result: '你们惜败，但打出了真正成熟的一场球。', effects: stat({ courage: 2, reputation: 2, basketball: 1 }) },
      ] })),
      choice('play_free', '放下包袱，按感觉打', '你在场上享受了比赛，但战术执行有些松散。', stat({ happiness: 3, basketball: 1, stress: -1 }, { outcomes: [
        { weight: 25, result: '手感火热，你们意外完成逆转。', effects: stat({ reputation: 4, luck: 2 }, { basketballWins: 1 }) },
        { weight: 75, result: '关键回合缺少配合，遗憾止步。', effects: stat({ happiness: -2, courage: 1 }) },
      ] })),
      choice('sit_out', '因伤或工作选择缺席', '你做了克制的决定，队伍少了一名轮换。', stat({ health: 2, happiness: -2, reputation: -1 })),
    ],
  }),
  event('basketball_content_collab', '篮球训练与比赛', {
    stages: ['earlyCareer', 'career'], maxAge: 48, weight: 5,
    conditions: { statsMin: { basketball: 50 }, flagsAny: ['content_creator', 'community_coach', 'assistant_coach'] },
    title: '篮球博主联动邀请',
    description: '一位同城博主邀请你拍一条控卫技巧教学视频。',
    options: [
      choice('prepare_collab', '认真准备脚本和示范', '专业内容让观众记住了你的教学风格。', stat({ basketball: 2, reputation: 3, social: 2 }, { followers: 1200, flagsAdd: ['basketball_creator'] })),
      choice('improvise_collab', '临场发挥，突出个人风格', '视频有趣但不够系统，评论区褒贬不一。', stat({ courage: 2, followers: 450, reputation: 1, stress: 1 })),
      choice('decline_collab', '拒绝，先打磨基本功', '你少了一次曝光，继续把注意力放在能力上。', stat({ basketball: 2, discipline: 1 })),
    ],
  }),
  event('basketball_training_camp', '创业与生意', {
    stages: ['earlyCareer', 'career'], minAge: 22, maxAge: 48, weight: 7, cooldown: 14,
    conditions: { statsMin: { basketball: 50 }, flagsAny: ['assistant_coach', 'coach_certificate', 'community_coach', 'coach_path'] },
    tags: ['创业', '篮球'],
    title: '篮球训练营创业',
    description: '你考虑在北城开设青少年篮球训练营，家长需求似乎正在增长。',
    options: [
      choice('rent_venue_startup', '租场地正式创业', '你签下场地，把梦想变成了每月都要面对的账单。', stat({ courage: 4, reputation: 2, stress: 5 }, { money: -30000, expense: 6500, flagsAdd: ['basketball_camp_owner'], setCareer: 'basketball_camp_founder', outcomes: [
        { weight: 48, result: '首期招生超出预期，场馆很快热闹起来。', effects: stat({ happiness: 4, reputation: 4 }, { money: 18000, income: 9000, workExperience: 3 }) },
        { weight: 52, result: '招生不足，现金流压力立刻显现。', effects: stat({ stress: 5, courage: 1 }, { money: -9000, debt: 5000 }) },
      ] })),
      choice('part_time_students', '先兼职带几个学生', '规模不大，但你验证了家长愿意为哪种服务付费。', stat({ basketball: 2, social: 3, reputation: 2 }, { money: 2600, income: 1500, workExperience: 2, flagsAdd: ['basketball_camp_pilot'] })),
      choice('find_partner', '找朋友合伙', '你们把场地、招生和教学分开讨论，合作结果并不完全可控。', stat({ social: 3, courage: 2, stress: 2 }, { money: -8000, outcomes: [
        { weight: 55, result: '分工清晰，第一期顺利开班。', effects: stat({ reputation: 3, happiness: 3 }, { money: 9000, income: 4000, flagsAdd: ['basketball_camp_partner'] }) },
        { weight: 45, result: '对投入和分工的理解不同，合作在开始前就卡住了。', effects: stat({ social: -2, stress: 3 }, { money: -1500 }) },
      ] })),
      choice('give_up_startup', '暂时放弃创业', '你没有损失资金，但这个念头会在之后反复回来。', stat({ stress: -2, courage: -1 })),
    ],
    hiddenOptions: [
      choice('pre_sell_camp', '先做预售和体验营再租场地', '你用一周体验课拿到了首批家长的信任。', stat({ knowledge: 3, social: 3, courage: 2 }, { money: -2500, income: 2500, flagsAdd: ['basketball_camp_validated'] }), { conditions: { statsMin: { knowledge: 55, social: 55 }, moneyMin: 5000 } }),
    ],
  }),
  event('coach_parent_complaint', '篮球训练与比赛', {
    stages: ['earlyCareer', 'career'], maxAge: 50, weight: 4,
    conditions: { flagsAny: ['assistant_coach', 'basketball_camp_owner', 'basketball_camp_pilot', 'basketball_camp_partner'] },
    title: '家长的投诉电话',
    description: '一位家长认为孩子训练三周后进步不明显，情绪很激动。',
    options: [
      choice('show_progress_report', '拿出训练记录并沟通目标', '事实降低了误解，家长愿意再观察一个周期。', stat({ knowledge: 2, social: 3, reputation: 2, stress: 1 })),
      choice('refund_quickly', '直接退一部分费用', '你平息了冲突，但长期利润受到影响。', stat({ happiness: -1, stress: -2 }, { money: -700, reputation: 1 })),
      choice('argue_back', '坚持自己没问题', '你守住了面子，却失去了一次口碑修复机会。', stat({ courage: 1, social: -3, reputation: -3, stress: 3 })),
    ],
  }),
  event('veteran_team_invitation', '篮球训练与比赛', {
    stages: ['career', 'midlife'], minAge: 32, maxAge: 55, weight: 4,
    conditions: { statsMin: { basketball: 45 } },
    title: '老友球队的邀请',
    description: '多年未见的队友邀请你参加周末的老友联赛。',
    options: [
      choice('return_to_court', '回到场上，控制强度', '你重新找回了球场上的快乐，也学会保护自己。', stat({ happiness: 4, social: 3, fitness: 1, health: 1 }, { basketballGames: 2, flagsAdd: ['veteran_player'] })),
      choice('coach_from_sideline', '去现场当临时教练', '你不再追逐每一个球，却享受帮助别人变好的感觉。', stat({ basketball: 1, knowledge: 2, reputation: 2, social: 2 })),
      choice('decline_for_rest', '留给家庭和休息', '你没有赴约，但身体和生活都更从容。', stat({ health: 2, happiness: 1 })),
    ],
  }),
];

const WORK_EVENTS = [
  event('restaurant_part_time_shift', '工作与兼职', {
    stages: ['university', 'earlyCareer'], maxAge: 30, weight: 8,
    title: '餐厅兼职缺人',
    description: '一家餐厅正在招周末兼职，时薪不高，但可以立刻上岗。',
    options: [
      choice('take_shift', '接受周末班次', '你学会在忙碌中和陌生人打交道，也多了一点现金。', stat({ social: 2, discipline: 1, stress: 2 }, { money: 1200, workExperience: 1, flagsAdd: ['restaurant_experience'] })),
      choice('negotiate_hours', '只接不影响训练的班次', '收入少一些，但你守住了自己的重点。', stat({ discipline: 2, social: 1 }, { money: 650, workExperience: 1 })),
      choice('decline_shift', '不接，专注学业和训练', '你没有增加收入，也避免了过度消耗。', stat({ health: 1, stress: -1 })),
    ],
  }),
  event('bank_internship', '工作与兼职', {
    stages: ['university', 'earlyCareer'], maxAge: 27, weight: 5,
    title: '银行实习机会',
    description: '亲戚推荐你去银行做短期实习，工作内容比你想象得细碎。',
    options: [
      choice('accept_internship', '接受，体验规范化工作', '流程和耐心训练了你的细节意识。', stat({ knowledge: 2, discipline: 3, stress: 2, social: 1 }, { money: 1800, workExperience: 2, flagsAdd: ['bank_intern'] })),
      choice('accept_for_network', '重点认识业务前辈', '你对金融和人情有了更现实的理解。', stat({ social: 3, knowledge: 2 }, { money: 1200, workExperience: 1, flagsAdd: ['bank_network'] })),
      choice('decline_bank', '拒绝，选择更贴近兴趣的工作', '你保留了方向感，但少了一段正式履历。', stat({ courage: 1, happiness: 1 })),
    ],
  }),
  event('hotel_front_desk_offer', '工作与兼职', {
    stages: ['university', 'earlyCareer'], maxAge: 32, weight: 7,
    conditions: { flagsAny: ['hotel_path', 'hotel_interviewed', 'restaurant_experience'] },
    title: '酒店前台录用通知',
    description: '一家连锁酒店愿意给你前台岗位，轮班制意味着生活节奏会改变。',
    options: [
      choice('accept_front_desk', '接受岗位，从前台做起', '你在高峰入住时学会了保持冷静和礼貌。', stat({ english: 2, social: 3, discipline: 2, stress: 3 }, { income: 4200, workExperience: 2, flagsAdd: ['hotel_employee'], setCareer: 'hotel_service_staff' })),
      choice('ask_management_track', '询问管理培训生机会', '对方没有承诺，但愿意把你的资料转给人力部门。', stat({ courage: 2, social: 2, reputation: 1 }, { flagsAdd: ['hotel_management_candidate'] })),
      choice('decline_front_desk', '拒绝轮班，继续找机会', '你保住了个人节奏，也承受了更久的不确定。', stat({ happiness: 1, stress: 2 })),
    ],
  }),
  event('hotel_guest_complaint', '工作与兼职', {
    stages: ['earlyCareer', 'career'], maxAge: 48, weight: 6,
    conditions: { flagsAny: ['hotel_employee', 'hotel_management_candidate'] },
    title: '深夜客诉',
    description: '凌晨的客人投诉房间噪音很大，值班同事也在等你的决定。',
    options: [
      choice('solve_with_upgrade', '协调升级房间并跟进', '问题被妥善处理，客人离开时还向你道谢。', stat({ social: 3, reputation: 3, stress: 2 }, { money: -300, workExperience: 1 })),
      choice('follow_policy', '严格按流程处理', '你没有越权，但客人的情绪没有完全平复。', stat({ discipline: 2, knowledge: 1, stress: 1, reputation: 1 })),
      choice('pass_to_manager', '把问题交给上级', '风险被转移，成长机会也被转移。', stat({ stress: -1, courage: -1, reputation: -1 })),
    ],
  }),
  event('sales_job_offer', '工作与兼职', {
    stages: ['earlyCareer'], maxAge: 35, weight: 7,
    title: '销售岗位的高提成诱惑',
    description: '一家公司开出不低的提成方案，但底薪一般、压力很大。',
    options: [
      choice('accept_sales', '接受，挑战高收入', '你开始面对拒绝和业绩数字，成长与压力一起到来。', stat({ social: 3, courage: 3, stress: 4 }, { income: 3800, workExperience: 2, flagsAdd: ['sales_role'], setCareer: 'sales_representative' })),
      choice('trial_sales', '争取一个月试岗', '你用最小成本测试自己能否接受这份节奏。', stat({ social: 2, courage: 2, stress: 2 }, { money: 2200, workExperience: 1, flagsAdd: ['sales_trial'] })),
      choice('avoid_sales', '拒绝，选择更稳定的工作', '你获得了确定感，但收入上限也更清楚。', stat({ stress: -2, courage: -1 })),
    ],
  }),
  event('delivery_gig', '工作与兼职', {
    stages: ['university', 'earlyCareer'], maxAge: 32, weight: 5,
    title: '临时跑单的选择',
    description: '手头有点紧，朋友说晚上跑几小时同城配送就能补上生活费。',
    options: [
      choice('run_delivery', '接几晚订单', '钱来得很快，身体和时间也被切得很碎。', stat({ discipline: 2, fitness: 1, stress: 3, health: -1 }, { money: 900, workExperience: 1 })),
      choice('sell_unused_items', '卖掉闲置物品', '你清理了生活，也换回一点缓冲资金。', stat({ knowledge: 1, happiness: 1 }, { money: 700 })),
      choice('borrow_small', '向朋友借一笔短期周转', '燃眉之急被解决，人情债也被记下。', stat({ social: -1, stress: -1 }, { money: 1200, debt: 1200, flagsAdd: ['friend_loan'] })),
    ],
  }),
  event('workplace_mentor', '工作与兼职', {
    stages: ['earlyCareer', 'career'], maxAge: 45, weight: 6,
    conditions: { workExperienceMin: 1 },
    title: '愿意带你的前辈',
    description: '一位经验丰富的同事愿意每周抽时间，教你处理真实工作问题。',
    options: [
      choice('learn_seriously', '每次都带着问题请教', '你把碎片经验串成了可复用的方法。', stat({ knowledge: 3, social: 2, discipline: 2, reputation: 1 }, { flagsAdd: ['work_mentor'] })),
      choice('socialize_only', '多请吃饭，少谈工作', '关系变近了一些，但能力提升有限。', stat({ social: 3, money: -500 })),
      choice('stay_independent', '坚持自己摸索', '自主性没有错，只是成长速度慢一些。', stat({ courage: 1, knowledge: 1, stress: 2 })),
    ],
  }),
  event('office_presentation', '工作与兼职', {
    stages: ['earlyCareer', 'career'], maxAge: 48, weight: 6,
    title: '第一次公开汇报',
    description: '部门负责人让你向客户或领导讲解一份你参与的方案。',
    options: [
      choice('prepare_thoroughly', '反复练习并准备数据', '你的表达比自己预想得更稳。', stat({ knowledge: 2, social: 3, courage: 3, reputation: 2, stress: 2 })),
      choice('speak_freely', '不写稿，临场发挥', '你显得自然，但有几个关键数据没有说清。', stat({ courage: 3, social: 1, reputation: 1, stress: 1 })),
      choice('ask_colleague', '请同事替你讲', '你暂时躲开了舞台，下一次仍会来到。', stat({ stress: -1, courage: -2, reputation: -1 })),
    ],
  }),
  event('overtime_deadline', '工作与兼职', {
    stages: ['earlyCareer', 'career'], maxAge: 52, weight: 8,
    title: '项目最后期限',
    description: '团队的项目赶在月底交付，连续加班几乎不可避免。',
    options: [
      choice('stay_late', '扛下关键部分', '项目完成得不错，但你的恢复时间被透支。', stat({ discipline: 3, reputation: 2, stress: 5, health: -2, happiness: -2 }, { money: 1200, workExperience: 1 })),
      choice('negotiate_scope', '提出缩减范围和分工', '你没有逃避，而是用更清楚的边界解决问题。', stat({ knowledge: 2, social: 2, courage: 2, stress: 2 })),
      choice('protect_rest', '按时下班，拒绝无效加班', '你守住健康，但有同事误解了你的态度。', stat({ health: 2, happiness: 1, reputation: -1, courage: 1 })),
    ],
  }),
  event('side_hustle_design', '工作与兼职', {
    stages: ['earlyCareer', 'career'], maxAge: 46, weight: 6,
    title: '下班后的副业想法',
    description: '朋友邀请你一起接一些短视频剪辑和本地商家推广的活。',
    options: [
      choice('take_side_hustle', '每周固定两晚接单', '你增加了现金流，也开始失去一部分休息。', stat({ knowledge: 2, discipline: 3, stress: 3 }, { money: 2600, workExperience: 1, flagsAdd: ['side_hustle'] })),
      choice('build_portfolio_first', '先免费做两件作品', '收入还没来，但你积累了展示能力。', stat({ knowledge: 3, reputation: 1, discipline: 2 }, { flagsAdd: ['creative_portfolio'] })),
      choice('decline_side_hustle', '不接，保持生活稳定', '你拥有更多恢复时间。', stat({ health: 1, happiness: 2, stress: -2 })),
    ],
  }),
  event('job_hopping_offer', '工作与兼职', {
    stages: ['earlyCareer', 'career'], minAge: 24, maxAge: 45, weight: 5, cooldown: 12,
    conditions: { workExperienceMin: 2 },
    title: '猎头的电话',
    description: '一份新工作给出更高收入，但团队文化和城市都未知。',
    options: [
      choice('take_new_job', '接受更高薪的机会', '你得到新的舞台，也从头建立关系和信任。', stat({ courage: 3, social: 1, stress: 4 }, { income: 3500, workExperience: 1, flagsAdd: ['job_hopper'] })),
      choice('negotiate_current', '用机会和现公司谈发展', '你争取到了一点空间，也让上级开始重新评估你。', stat({ courage: 2, reputation: 1, stress: 2 }, { income: 1200 })),
      choice('stay_put', '拒绝，继续沉淀', '短期钱少了，长期信任可能更稳。', stat({ discipline: 2, reputation: 2, stress: -1 })),
    ],
  }),
  event('freelance_translation_gig', '工作与兼职', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 50, weight: 5,
    conditions: { statsMin: { english: 52 } },
    title: '英文资料翻译小单',
    description: '一家本地企业需要把产品资料翻成英文，朋友把你推荐过去。',
    options: [
      choice('take_translation', '接下并认真核对术语', '客户认可你的可靠，后续还可能有更多合作。', stat({ english: 3, knowledge: 2, reputation: 2 }, { money: 2200, workExperience: 1, flagsAdd: ['translation_client'] })),
      choice('use_ai_carefully', '用工具辅助，再逐句校对', '效率提高了，质量没有被牺牲。', stat({ english: 2, knowledge: 3, discipline: 1 }, { money: 1800, flagsAdd: ['ai_workflow'] })),
      choice('decline_translation', '担心能力不够，拒绝', '你避免了出错，也错过了练手的机会。', stat({ stress: -1, courage: -1 })),
    ],
  }),
  event('business_trip_first', '工作与兼职', {
    stages: ['earlyCareer', 'career'], maxAge: 50, weight: 4,
    conditions: { workExperienceMin: 2 },
    title: '第一次出差',
    description: '公司让你和同事去外地拜访客户，临行前你有些紧张。',
    options: [
      choice('prepare_client_research', '提前研究客户需求', '你在会议里问出了关键问题。', stat({ knowledge: 3, social: 2, reputation: 2, courage: 1 }, { money: -300, workExperience: 1 })),
      choice('focus_relationship', '重点维护饭桌和会后关系', '对方觉得你真诚，但方案细节还需要补。', stat({ social: 3, reputation: 1, knowledge: -1 }, { money: -700 })),
      choice('let_senior_lead', '全程跟着前辈学习', '你降低了失误，却没有让客户真正记住你。', stat({ knowledge: 2, stress: -1 })),
    ],
  }),
  event('workplace_mistake', '工作与兼职', {
    stages: ['earlyCareer', 'career'], maxAge: 55, weight: 5,
    title: '工作上的小失误',
    description: '一份文件的数字填错了，暂时还没有造成严重损失。',
    options: [
      choice('report_immediately', '立刻说明并提出补救方案', '诚实让你难堪一阵，却避免了更大的问题。', stat({ courage: 3, reputation: 1, stress: 3, knowledge: 1 })),
      choice('fix_quietly', '自己悄悄改正', '你解决了眼前问题，但始终担心留下痕迹。', stat({ discipline: 1, stress: 3 })),
      choice('hide_mistake', '赌一把，不说也不改', '事情被发现后，信任比数字损失得更多。', stat({ reputation: -4, stress: 5, happiness: -2 }, { flagsAdd: ['workplace_trust_damage'] })),
    ],
  }),
  event('return_to_north_city_offer', '工作与兼职', {
    stages: ['earlyCareer', 'career'], minAge: 24, maxAge: 48, weight: 4, cooldown: 18,
    title: '回北城发展的邀请',
    description: '家乡的熟人提供了一个稳定机会，收入不如大城市但生活成本更低。',
    options: [
      choice('return_home', '回北城，靠近家人', '你重新拥有熟悉的人情和节奏。', stat({ happiness: 3, social: 2, stress: -2 }, { expense: -1800, flagsAdd: ['returned_to_north_city'] })),
      choice('negotiate_remote', '争取远程或两地模式', '你保留更多可能，也让生活变得更复杂。', stat({ courage: 2, knowledge: 1, stress: 3 }, { flagsAdd: ['hybrid_city_life'] })),
      choice('stay_away', '留在外地继续闯', '你选择更大的舞台，也承受更高生活成本。', stat({ courage: 2, reputation: 1, stress: 2 }, { expense: 1500, flagsAdd: ['big_city_life'] })),
    ],
  }),
];

const OVERSEAS_EVENTS = [
  event('us_hotel_work_opportunity', '海外与旅行', {
    stages: ['university', 'earlyCareer'], maxAge: 30, weight: 8, cooldown: 18,
    tags: ['美国', '酒店', '海外'], title: '美国酒店工作机会',
    description: '你收到一个赴美酒店工作的机会，但需要支付前期费用，也意味着离开熟悉的环境。',
    options: [
      choice('accept_us_hotel', '接受机会', '你带着不安登上飞机，陌生环境逼着你更快开口说英语。', stat({ courage: 4, english: 5, social: 2, stress: 4 }, { money: -12000, workExperience: 3, travelCountries: 1, flagsAdd: ['usa_work_experience', 'overseas_living'], setCareer: 'overseas_hotel_worker' })),
      choice('decline_us_hotel', '放弃机会', '熟悉的生活让你放松下来，但偶尔仍会想起那张机票。', stat({ stress: -2, happiness: 1, courage: -1 }, { flagsAdd: ['missed_us_work'] })),
      choice('research_us_offer', '先向家人和朋友了解情况', '你核实了费用、合同和住宿，决定变得更理性。', stat({ knowledge: 3, social: 3, stress: -1 }, { outcomes: [
        { weight: 68, result: '信息确认无误，你更有底气作决定。', effects: stat({ courage: 2 }, { flagsAdd: ['verified_us_offer'] }) },
        { weight: 32, result: '你发现合同有模糊条款，及时避开了风险。', effects: stat({ knowledge: 3, luck: 2 }, { flagsAdd: ['avoided_bad_offer'] }) },
      ] })),
    ],
    hiddenOptions: [
      choice('negotiate_us_support', '用英语与雇主谈住宿和补贴', '你争取到更清楚的支持条款。', stat({ english: 3, courage: 3, reputation: 1 }, { money: -7000, flagsAdd: ['usa_work_experience', 'overseas_living', 'negotiated_offer'] }), { conditions: { statsMin: { english: 62, courage: 55 } } }),
    ],
  }),
  event('us_hotel_first_shift', '海外与旅行', {
    stages: ['earlyCareer'], maxAge: 32, weight: 7,
    conditions: { flagsAll: ['usa_work_experience'] },
    title: '美国酒店的第一班', description: '泳池、客房和前台的工作同时冒出来，你听不懂几位客人的口音。',
    options: [
      choice('ask_and_repeat', '礼貌确认每一句需求', '你虽然慢，却没有把事情做错。', stat({ english: 3, social: 2, courage: 2, stress: 2 }, { workExperience: 1 })),
      choice('follow_colleague', '跟着同事观察流程', '你快速学会基本步骤，但主动表达仍需练习。', stat({ knowledge: 2, english: 1, stress: 1 })),
      choice('pretend_understand', '假装听懂，先答应下来', '一个小误会让你意识到语言不能靠蒙。', stat({ english: 1, stress: 3, reputation: -1 })),
    ],
  }),
  event('overseas_loneliness', '海外与旅行', {
    stages: ['earlyCareer', 'career'], maxAge: 45, weight: 5,
    conditions: { flagsAny: ['overseas_living', 'usa_work_experience'] },
    title: '异国的孤独夜晚', description: '下班后房间很安静，时差让你很难和家人同步说话。',
    options: [
      choice('call_home', '给家人打电话', '熟悉的声音让你重新稳定下来。', stat({ happiness: 3, stress: -3, social: 1 }, { relationship: { parents: 3 } })),
      choice('join_local_activity', '参加当地的语言或运动活动', '你带着尴尬走进人群，意外认识了新朋友。', stat({ english: 3, social: 3, courage: 2, happiness: 2 }, { flagsAdd: ['overseas_friends'] })),
      choice('stay_isolated', '把自己关在房间里刷手机', '短暂麻木之后，情绪变得更低。', stat({ happiness: -3, stress: 3, health: -1 })),
    ],
  }),
  event('english_speaking_club', '海外与旅行', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 55, weight: 8,
    title: '英语角的陌生话题', description: '英语角的主持人邀请你聊旅行和体育，你担心自己表达不够好。',
    options: [
      choice('speak_first', '主动先开口', '犯了几个语法错误，但每次都比上次更自然。', stat({ english: 4, courage: 3, social: 2 })),
      choice('listen_and_note', '先听别人说并记笔记', '你学到不少地道表达，输出仍需要下一步。', stat({ english: 3, knowledge: 2, courage: -1 })),
      choice('skip_club', '不去，自己背单词', '你完成了任务，却没有练习真实对话。', stat({ english: 2, discipline: 2, social: -1 })),
    ],
  }),
  event('online_english_tutor', '海外与旅行', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 55, weight: 5,
    title: '一对一英语老师', description: '一位外教推出口语课程，价格不低，但能针对你的弱点练习。',
    options: [
      choice('buy_course', '购买十二节课', '你开始能用英语讲完整的经历，而不只是回答问题。', stat({ english: 5, discipline: 2, courage: 1 }, { money: -2600, flagsAdd: ['english_tutor'] })),
      choice('try_one_class', '先试听一节', '试听让你明确了听力和发音的问题。', stat({ english: 2, knowledge: 1 }, { money: -180 })),
      choice('self_study', '用播客和影剧自学', '成本很低，进度取决于你是否能持续。', stat({ english: 2, discipline: 3 })),
    ],
  }),
  event('canada_travel_invitation', '海外与旅行', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 52, weight: 6, cooldown: 16,
    conditions: { flagsNone: ['canada_visa_expired'] },
    title: '海外旅行邀请', description: '朋友邀请你去加拿大旅行，十年签证正好给了你一次出发的可能。',
    options: [
      choice('leave_now', '立即出发', '瀑布的水汽和陌生城市让你重新感到世界很大。', stat({ happiness: 5, english: 2, courage: 3 }, { money: -11000, travelCountries: 1, flagsAdd: ['visited_canada'] })),
      choice('make_budget', '先制定详细预算', '你把交通、住宿和保险逐项算清，旅程更从容。', stat({ knowledge: 3, discipline: 3, happiness: 3 }, { money: -7600, travelCountries: 1, flagsAdd: ['visited_canada', 'budget_traveler'] })),
      choice('refuse_for_work', '因为工作拒绝', '你多赚了一些钱，但错过了和朋友共同经历的时间。', stat({ income: 800, happiness: -2, discipline: 1 })),
    ],
    hiddenOptions: [
      choice('turn_trip_into_content', '把旅行做成系列短视频', '你旅行时也在观察故事和镜头，回国后素材足够剪很久。', stat({ creativity: 2, reputation: 2, english: 2 }, { money: -9000, travelCountries: 1, followers: 1800, flagsAdd: ['visited_canada', 'travel_creator_material'] }), { conditions: { flagsAny: ['content_creator', 'basketball_creator'], statsMin: { discipline: 58 } } }),
    ],
  }),
  event('visa_document_check', '海外与旅行', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 58, weight: 4,
    title: '签证与证件检查', description: '你发现护照和签证材料的有效期需要提前确认。',
    options: [
      choice('organize_documents', '整理证件并做电子备份', '你避免了临出发才发现问题的尴尬。', stat({ discipline: 3, knowledge: 2, stress: -1 }, { money: -200, flagsAdd: ['travel_documents_ready'] })),
      choice('renew_early', '提前办理更新', '这笔钱花得不显眼，却给未来留下自由。', stat({ discipline: 2, courage: 1 }, { money: -900, flagsRemove: ['canada_visa_expired'] })),
      choice('ignore_documents', '觉得还有时间，先不管', '眼下没有变化，未来的机会会多一层不确定。', stat({ discipline: -2 })),
    ],
  }),
  event('korea_city_walk', '海外与旅行', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 55, weight: 4,
    conditions: { travelCountriesMin: 1 },
    title: '韩国朋友的城市漫步邀请', description: '一位在韩国认识的朋友邀请你去看另一种城市生活。',
    options: [
      choice('visit_korea', '请假去一趟', '走在陌生街区里，你的旅行经验又多了一种颜色。', stat({ happiness: 4, courage: 2, social: 2 }, { money: -6500, travelCountries: 1, flagsAdd: ['visited_korea'] })),
      choice('plan_later', '约定未来再去', '你保存了联系，也把旅程留给更合适的时机。', stat({ social: 2, happiness: 1 }, { relationship: { overseas_friend: 2 } })),
      choice('decline_korea', '因预算紧张婉拒', '你诚实说明情况，关系没有因此断掉。', stat({ social: 1, discipline: 1 })),
    ],
  }),
  event('airport_missed_connection', '海外与旅行', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 60, weight: 3,
    conditions: { travelCountriesMin: 1 },
    title: '转机时间不够', description: '航班延误后，你可能赶不上下一程。',
    options: [
      choice('ask_airline', '冷静找航司协调', '你用清晰表达拿到了改签和住宿安排。', stat({ english: 2, social: 2, courage: 2, stress: 2 }, { money: -300 })),
      choice('buy_new_ticket', '自己买票确保行程', '你保住了时间，但花了一笔不在预算内的钱。', stat({ courage: 1, stress: 1 }, { money: -2800 })),
      choice('wait_it_out', '接受延误，调整计划', '旅程慢下来，意外多出了一段独处时间。', stat({ happiness: 1, stress: -1 }, { money: -700 })),
    ],
  }),
  event('overseas_job_extension', '海外与旅行', {
    stages: ['earlyCareer'], maxAge: 34, weight: 4,
    conditions: { flagsAny: ['usa_work_experience', 'overseas_living'] },
    title: '海外工作续约', description: '雇主问你是否愿意延长合同，收入会增加，但离家更久。',
    options: [
      choice('extend_contract', '续约一年', '你获得了更长的国际工作履历，也要面对长期孤独。', stat({ english: 4, courage: 2, stress: 3, happiness: -1 }, { money: 28000, workExperience: 3, flagsAdd: ['overseas_contract_extended'] })),
      choice('return_with_savings', '按计划回国发展', '你带回积蓄和经历，开始重新适应国内节奏。', stat({ happiness: 2, social: 2 }, { money: 12000, flagsAdd: ['returned_from_abroad'] })),
      choice('negotiate_remote', '询问远程或季节工安排', '你尝试创造一条折中路线。', stat({ english: 2, courage: 3, knowledge: 1 }, { flagsAdd: ['international_work_flex'] })),
    ],
  }),
  event('english_exam_opportunity', '海外与旅行', {
    stages: ['university', 'earlyCareer'], maxAge: 35, weight: 5,
    title: '英语考试报名期', description: '一项英语考试成绩可能帮助你申请项目或海外岗位。',
    options: [
      choice('register_exam', '报名并做真题', '你获得了一次可量化展示能力的机会。', stat({ english: 3, discipline: 3, stress: 2 }, { money: -600, flagsAdd: ['english_exam_candidate'], outcomes: [
        { weight: 50, result: '成绩达标，你对外展示英语的底气更足。', effects: stat({ english: 3, reputation: 2 }, { flagsAdd: ['english_certificate'] }) },
        { weight: 50, result: '成绩不够理想，但你知道下一步该补什么。', effects: stat({ knowledge: 2, courage: 1 }) },
      ] })),
      choice('practice_free', '先用免费资源练三个月', '你省下费用，也需要更强自律。', stat({ english: 3, discipline: 3 })),
      choice('skip_exam', '不考，用实际沟通证明自己', '你避免考试焦虑，但少了一张正式凭证。', stat({ courage: 1, stress: -1 })),
    ],
  }),
  event('travel_insurance_choice', '海外与旅行', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 65, weight: 3,
    conditions: { travelCountriesMin: 1 },
    title: '出行保险要不要买', description: '旅行前，朋友提醒你医疗和行程延误风险不该完全靠运气。',
    options: [
      choice('buy_insurance', '购买合适的旅行保险', '你花了一笔小钱，换来更稳的出行底气。', stat({ knowledge: 2, discipline: 1 }, { money: -420, flagsAdd: ['travel_insured'] })),
      choice('basic_insurance', '只买基础保障', '预算得到控制，保障也相对有限。', stat({ knowledge: 1 }, { money: -160 })),
      choice('skip_insurance', '不买，觉得不会出事', '钱留在了手里，风险也留在了路上。', stat({ luck: -1 })),
    ],
  }),
  event('foreign_friend_referral', '海外与旅行', {
    stages: ['earlyCareer', 'career'], maxAge: 50, weight: 4,
    conditions: { statsMin: { english: 60 }, flagsAny: ['overseas_friends', 'usa_work_experience', 'english_certificate'] },
    title: '海外朋友的转介绍', description: '一位海外朋友把一个短期项目介绍给你，需要快速确认。',
    options: [
      choice('take_project', '接下项目并守住交付', '跨文化协作让你的沟通能力升级。', stat({ english: 4, social: 2, reputation: 3, stress: 3 }, { money: 8000, workExperience: 2, flagsAdd: ['international_project'] })),
      choice('verify_project', '先做尽调再决定', '你没有被热情冲昏头，发现项目规模比想象更小。', stat({ knowledge: 3, courage: 1 }, { money: 1200, workExperience: 1 })),
      choice('pass_project', '因时间不够婉拒', '你维护了关系，也保留了当前节奏。', stat({ social: 2, discipline: 1 })),
    ],
  }),
  event('passport_stamp_reflection', '海外与旅行', {
    stages: ['career', 'midlife'], minAge: 30, maxAge: 65, weight: 3,
    conditions: { travelCountriesMin: 3 },
    title: '翻看护照上的印章', description: '多年的旅程让你想知道：下一段人生是否还要把远方放在重要位置。',
    options: [
      choice('plan_next_country', '制定下一个国家计划', '你没有停止好奇心。', stat({ happiness: 3, courage: 2, knowledge: 1 }, { money: -800, flagsAdd: ['travel_goal'] })),
      choice('share_travel_lessons', '把旅行经验分享给年轻人', '你的故事让别人也敢于出发。', stat({ reputation: 2, social: 2, happiness: 2 }, { followers: 300 })),
      choice('prioritize_home', '把时间更多留给家人', '你不是放弃远方，而是换了一种陪伴方式。', stat({ happiness: 2, relationship: { family: 3 } })),
    ],
  }),
];

const RELATIONSHIP_EVENTS = [
  event('old_teammate_request', '友情与家庭', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 52, weight: 6,
    title: '老队友的求助', description: '一位队友临时需要你帮忙带课或顶班，正好撞上你的休息日。',
    options: [
      choice('help_teammate', '答应帮忙', '你付出了时间，也让对方记住了这份可靠。', stat({ social: 3, reputation: 2, happiness: 1, stress: 1 }, { relationship: { teammates: 4 }, flagsAdd: ['helped_teammate'] })),
      choice('help_later', '解释情况，另约时间帮他', '你守住边界，也没有让关系断掉。', stat({ social: 1, discipline: 1 })),
      choice('refuse_coldly', '直接拒绝，不解释', '你保住时间，但对方有些失望。', stat({ social: -2, reputation: -1 }, { relationship: { teammates: -3 } })),
    ],
  }),
  event('parents_health_check', '友情与家庭', {
    stages: ['earlyCareer', 'career', 'midlife'], minAge: 23, maxAge: 65, weight: 5,
    title: '父母的体检提醒', description: '家人说最近总觉得疲惫，但嫌麻烦不愿去体检。',
    options: [
      choice('book_checkup', '帮他们预约并陪同', '你把关心落到了具体行动上。', stat({ happiness: 2, social: 1, stress: 1 }, { money: -1800, relationship: { parents: 4 }, flagsAdd: ['family_health_attention'] })),
      choice('send_money', '转钱让他们自己安排', '经济支持有用，但陪伴仍然缺席。', stat({ relationship: { parents: 2 } }, { money: -1200 })),
      choice('delay_checkup', '觉得问题不大，先忙自己的', '事情没有立刻爆发，心里却留下了一点不安。', stat({ stress: 2, relationship: { parents: -1 } })),
    ],
  }),
  event('romantic_meet_cafe', '恋爱与关系', {
    stages: ['university', 'earlyCareer'], maxAge: 36, weight: 7,
    conditions: { statsMin: { social: 35 } },
    title: '咖啡店里的新认识', description: '朋友组局时，你和一位同样喜欢旅行的人聊得比预想久。',
    options: [
      choice('ask_for_contact', '主动交换联系方式', '你没有把好感只留在当晚。', stat({ courage: 3, social: 2, happiness: 2 }, { flagsAdd: ['romance_interest'] })),
      choice('wait_for_signal', '礼貌告别，等对方主动', '你避免了尴尬，也让机会变得模糊。', stat({ social: 1, courage: -1 })),
      choice('focus_on_friends', '只和老朋友聊天', '熟悉的关系很舒服，新故事没有展开。', stat({ happiness: 1, social: 1 })),
    ],
  }),
  event('first_date_plan', '恋爱与关系', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 42, weight: 6,
    conditions: { flagsAll: ['romance_interest'] },
    title: '第一次正式约会', description: '对方答应和你见面，你需要决定用什么方式表达真诚。',
    options: [
      choice('thoughtful_date', '根据对方兴趣认真安排', '细节没有浮夸，却让人感到被尊重。', stat({ social: 3, happiness: 3, reputation: 1 }, { money: -420, relationship: { partner: 4 }, flagsAdd: ['dating'] })),
      choice('simple_walk', '一起散步聊天', '没有花很多钱，但你们聊得很自然。', stat({ social: 2, happiness: 2 }, { money: -80, relationship: { partner: 3 }, flagsAdd: ['dating'] })),
      choice('show_off', '用昂贵消费制造惊喜', '场面很热闹，对方却不确定你真实想表达什么。', stat({ courage: 1, happiness: 1 }, { money: -1600, relationship: { partner: 1 } })),
    ],
  }),
  event('long_distance_choice', '恋爱与关系', {
    stages: ['earlyCareer', 'career'], maxAge: 48, weight: 5,
    conditions: { flagsAll: ['dating'], flagsAny: ['overseas_living', 'big_city_life', 'international_project'] },
    title: '异地关系的考验', description: '工作或旅行让你们要分开很久，沟通开始变得费力。',
    options: [
      choice('make_plan', '制定见面和沟通计划', '关系不再只靠感觉，而是靠双方持续投入。', stat({ discipline: 2, social: 2, happiness: 1, stress: 2 }, { money: -1200, relationship: { partner: 4 }, flagsAdd: ['long_distance_commitment'] })),
      choice('let_it_flow', '顺其自然，不给彼此压力', '轻松有时很好，也可能让距离慢慢吞掉亲密感。', stat({ happiness: 1, stress: -1 }, { outcomes: [
        { weight: 50, result: '你们保持住了自己的节奏。', effects: stat({ relationship: { partner: 2 } }) },
        { weight: 50, result: '联系越来越少，关系悄悄淡了。', effects: stat({ happiness: -3, social: -1 }, { flagsRemove: ['dating'], flagsAdd: ['heartbreak_experience'] }) },
      ] })),
      choice('end_kindly', '坦诚结束关系', '很难受，但你们没有把彼此困在消耗里。', stat({ courage: 3, happiness: -3, stress: 1 }, { flagsRemove: ['dating'], flagsAdd: ['heartbreak_experience'] })),
    ],
  }),
  event('friend_business_invitation', '友情与家庭', {
    stages: ['earlyCareer', 'career'], maxAge: 50, weight: 5,
    title: '朋友邀你合伙做生意', description: '朋友说有个赚钱项目，想让你出钱或出力一起做。',
    options: [
      choice('due_diligence', '先看合同、现金流和职责', '你没有让友情替代商业判断。', stat({ knowledge: 3, courage: 1, social: 1 }, { flagsAdd: ['business_due_diligence'] })),
      choice('join_on_trust', '因为信任直接加入', '真诚是好东西，但商业问题不会自动消失。', stat({ social: 2, courage: 2, stress: 2 }, { money: -10000, flagsAdd: ['friend_business'] , outcomes: [
        { weight: 45, result: '项目开局顺利，你们的信任变成了执行力。', effects: stat({ reputation: 2 }, { money: 9000, income: 1500 }) },
        { weight: 55, result: '意见不合让友情和钱都变得尴尬。', effects: stat({ social: -4, stress: 4 }, { money: -6500, flagsAdd: ['friendship_strained'] }) },
      ] })),
      choice('decline_friend_business', '婉拒，保留纯粹友谊', '对方有些失望，但没有把你卷入未知风险。', stat({ social: -1, stress: -1 })),
    ],
  }),
  event('family_financial_need', '友情与家庭', {
    stages: ['earlyCareer', 'career', 'midlife'], minAge: 23, maxAge: 60, weight: 5,
    title: '家里的临时资金需求', description: '家人遇到一笔突发开支，希望你能承担一部分。',
    options: [
      choice('support_family', '尽力承担', '压力落到自己身上，但家人感到被支持。', stat({ happiness: 1, stress: 3, reputation: 1 }, { money: -6000, relationship: { family: 4 }, flagsAdd: ['family_supporter'] })),
      choice('make_budget', '和家人一起拆分预算', '你们找到更可持续的解决方案。', stat({ knowledge: 2, social: 2, stress: 1 }, { money: -2800, relationship: { family: 3 } })),
      choice('cannot_help', '坦诚说明自己也无力承担', '对话很难，却避免了用债务硬撑。', stat({ courage: 2, happiness: -1, stress: 2 }, { relationship: { family: -1 } })),
    ],
  }),
  event('birthday_surprise', '友情与家庭', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 60, weight: 4,
    title: '一个被记住的生日', description: '朋友们悄悄准备了生日聚会，你可以选择怎样回应这份心意。',
    options: [
      choice('celebrate_together', '好好庆祝并表达感谢', '你感到自己并不孤单。', stat({ happiness: 4, social: 3 }, { money: -350, relationship: { friends: 3 } })),
      choice('small_dinner', '简单吃顿饭就好', '温柔的陪伴比热闹更适合现在的你。', stat({ happiness: 2, social: 2 }, { money: -120 })),
      choice('work_through', '因为忙碌取消聚会', '你完成了任务，朋友也有一点失落。', stat({ discipline: 1, happiness: -1, relationship: { friends: -2 } })),
    ],
  }),
  event('mentor_reconnect', '友情与家庭', {
    stages: ['career', 'midlife'], minAge: 28, maxAge: 62, weight: 4,
    conditions: { flagsAny: ['mentor_network', 'work_mentor', 'teacher_exam_mentor'] },
    title: '多年后联系导师', description: '一位曾帮助你的老师或前辈发来消息，问起你现在的生活。',
    options: [
      choice('share_and_thank', '认真汇报近况并感谢', '你重新接上了曾经的重要关系。', stat({ social: 3, reputation: 2, happiness: 2 }, { flagsAdd: ['mentor_reconnected'] })),
      choice('ask_for_advice', '带着具体困惑请教', '一句建议让你看清了当前的盲点。', stat({ knowledge: 3, courage: 1 }, { flagsAdd: ['mentor_guidance'] })),
      choice('reply_briefly', '礼貌回复，不再展开', '关系保持着，但没有真正回到彼此生活里。', stat({ social: 1 })),
    ],
  }),
  event('relationship_boundary', '恋爱与关系', {
    stages: ['earlyCareer', 'career'], maxAge: 55, weight: 5,
    conditions: { flagsAll: ['dating'] },
    title: '关于边界的一次争吵', description: '伴侣认为你把太多时间给了工作、训练或手机。',
    options: [
      choice('listen_and_change', '认真听完并做时间调整', '你没有立刻完美，但开始把承诺落实到日程里。', stat({ discipline: 2, social: 3, happiness: 2 }, { relationship: { partner: 4 }, flagsAdd: ['relationship_balance'] })),
      choice('defend_self', '强调自己也很辛苦', '你说出了委屈，却没有解决对方的感受。', stat({ courage: 1, social: -2, stress: 3 }, { relationship: { partner: -3 } })),
      choice('take_break', '提出短暂冷静期', '距离让双方看清需求，也带来关系结束的风险。', stat({ stress: -1, happiness: -1 }, { outcomes: [
        { weight: 45, result: '你们重新谈出了更合适的相处方式。', effects: stat({ social: 2, relationship: { partner: 2 } }) },
        { weight: 55, result: '冷静期变成了告别。', effects: stat({ happiness: -4 }, { flagsRemove: ['dating'], flagsAdd: ['heartbreak_experience'] }) },
      ] })),
    ],
  }),
  event('proposal_conversation', '恋爱与关系', {
    stages: ['career', 'midlife'], minAge: 26, maxAge: 55, weight: 3, cooldown: 24,
    conditions: { flagsAny: ['dating', 'long_distance_commitment'], relationshipMin: { partner: 60 } },
    title: '关于婚姻的认真谈话', description: '你们开始讨论结婚、城市、父母和未来的生活方式。',
    options: [
      choice('propose_with_plan', '带着现实计划提出结婚', '浪漫没有脱离生活，你们共同做出承诺。', stat({ happiness: 5, social: 2, courage: 3 }, { money: -15000, flagsAdd: ['married'], flagsRemove: ['dating'], relationship: { partner: 8 } })),
      choice('wait_and_prepare', '先一起攒钱和磨合', '你们把重要决定放在更扎实的基础上。', stat({ discipline: 2, knowledge: 2, happiness: 1 }, { flagsAdd: ['marriage_planning'] })),
      choice('admit_difference', '坦诚目标差异太大', '痛苦但诚实的决定，避免了日后更深的冲突。', stat({ courage: 3, happiness: -4 }, { flagsRemove: ['dating'], flagsAdd: ['heartbreak_experience'] })),
    ],
  }),
  event('newborn_family', '友情与家庭', {
    stages: ['career', 'midlife'], minAge: 26, maxAge: 52, weight: 3, cooldown: 30,
    conditions: { flagsAny: ['married', 'marriage_planning'] },
    title: '关于新家庭成员的决定', description: '你们开始认真讨论是否迎接一个孩子。',
    options: [
      choice('welcome_child', '共同做好准备，迎接孩子', '生活变得更忙，也多了一种从未有过的责任感。', stat({ happiness: 4, stress: 4, discipline: 2 }, { money: -20000, expense: 2800, flagsAdd: ['parenthood'] })),
      choice('wait_child', '再等一两年，先稳住工作和存款', '你们没有否定未来，只是把基础放在前面。', stat({ knowledge: 2, discipline: 2, stress: 1 })),
      choice('choose_no_child', '决定把精力留给两人的生活', '这不是逃避，而是对生活方式的明确选择。', stat({ courage: 2, happiness: 2 }, { flagsAdd: ['childfree_choice'] })),
    ],
  }),
  event('friend_becomes_benefactor', '友情与家庭', {
    stages: ['career', 'midlife'], minAge: 30, maxAge: 60, weight: 2, cooldown: 30,
    conditions: { flagsAny: ['helped_teammate', 'alumni_network', 'mentor_reconnected'], statsMin: { reputation: 35 } },
    title: '昔日关系带来的机会', description: '曾经帮助过的人如今有了资源，主动把一个机会介绍给你。',
    options: [
      choice('accept_referral', '接受介绍，认真准备', '年轻时的善意在多年后绕了一圈回来。', stat({ reputation: 3, social: 3, happiness: 2 }, { money: 8000, workExperience: 2, flagsAdd: ['benefactor_opportunity'] })),
      choice('collaborate_fairly', '提出公平分成的合作方式', '你珍惜关系，也把规则放在前面。', stat({ knowledge: 2, courage: 2, reputation: 2 }, { income: 2200, flagsAdd: ['fair_partner'] })),
      choice('decline_gracefully', '因方向不合婉拒', '你没有透支这段关系。', stat({ social: 2, courage: 1 })),
    ],
  }),
  event('family_reunion_choice', '友情与家庭', {
    stages: ['career', 'midlife', 'laterLife'], minAge: 28, maxAge: 80, weight: 4,
    title: '难得的家庭团聚', description: '家族计划一次团聚，时间正好与一个工作机会冲突。',
    options: [
      choice('attend_reunion', '推掉非必要工作，回家团聚', '你把珍贵的时间留给了亲人。', stat({ happiness: 4, social: 2, stress: -2 }, { relationship: { family: 4 } })),
      choice('join_remotely', '线上参与并寄出礼物', '你尽力维系，但缺少真实陪伴。', stat({ relationship: { family: 2 } }, { money: -300 })),
      choice('choose_work', '选择工作机会', '收入和进展在增长，家人也会记得你的缺席。', stat({ reputation: 2, happiness: -1 }, { money: 3000, relationship: { family: -2 } })),
    ],
  }),
  event('old_friend_borrowing', '友情与家庭', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 65, weight: 4,
    title: '老朋友借钱', description: '一位多年朋友开口借一笔钱，说很快就能还。',
    options: [
      choice('loan_with_contract', '量力而行，并写清借条', '你帮助了朋友，也守住了边界。', stat({ knowledge: 2, social: 1 }, { money: -3000, flagsAdd: ['documented_friend_loan'] })),
      choice('gift_small_amount', '给一小笔不要求归还', '金额可控，关系也少了一层压力。', stat({ happiness: 1, social: 2 }, { money: -800 })),
      choice('say_no_kindly', '坦诚说自己不能借', '这话难开口，但是真实。', stat({ courage: 2, stress: 1, relationship: { friends: -1 } })),
    ],
  }),
];

const HEALTH_FINANCE_EVENTS = [
  event('annual_health_exam', '健康与意外', {
    stages: ['university', 'earlyCareer', 'career', 'midlife', 'laterLife'], maxAge: 80, weight: 6,
    title: '年度体检提醒', description: '体检套餐打折，朋友说不要等不舒服了才去检查。',
    options: [
      choice('full_checkup', '做一次完整体检', '报告大多正常，也让你知道该调整哪些习惯。', stat({ health: 3, knowledge: 2, stress: -1 }, { money: -900, flagsAdd: ['annual_checkup'] })),
      choice('basic_checkup', '做基础检查', '你获得了必要的信息，费用也较低。', stat({ health: 1, knowledge: 1 }, { money: -260 })),
      choice('skip_checkup', '觉得年轻或忙，先不去', '没有即时后果，但长期风险没有消失。', stat({ discipline: -1 })),
    ],
  }),
  event('sleep_debt', '健康与意外', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 55, weight: 6,
    conditions: { statsMin: { stress: 55 } },
    title: '睡眠债找上门', description: '连续熬夜后，你白天注意力下降，训练和工作都开始出错。',
    options: [
      choice('reset_schedule', '连续一周按时睡觉', '恢复不是浪费时间，你的状态慢慢回来了。', stat({ health: 4, happiness: 2, stress: -5, discipline: 2 })),
      choice('use_caffeine', '靠咖啡硬撑', '今天挺过去了，身体账单还在后面。', stat({ knowledge: 1, stress: 2, health: -2 })),
      choice('take_short_leave', '请半天假真正休息', '你舍得停下来，反而避免了更长的崩溃。', stat({ health: 3, stress: -4, happiness: 1 }, { income: -300 })),
    ],
  }),
  event('minor_traffic_accident', '健康与意外', {
    stages: ['university', 'earlyCareer', 'career', 'midlife'], maxAge: 65, weight: 3,
    conditions: { flagsAny: ['has_driver_license', 'car_owner'] },
    title: '雨天的小剐蹭', description: '开车回家时，雨天视线不好，发生了一次轻微剐蹭。',
    options: [
      choice('handle_by_policy', '报警、拍照并按流程处理', '你花了时间，但把风险控制住了。', stat({ knowledge: 2, discipline: 2, stress: 2 }, { money: -800 })),
      choice('settle_privately', '和对方协商私了', '事情可能更快结束，也可能留下后患。', stat({ social: 1, courage: 1 }, { outcomes: [
        { weight: 70, result: '对方讲理，事情顺利解决。', effects: stat({ stress: -1 }, { money: -500 }) },
        { weight: 30, result: '后续争议让你又花了不少精力。', effects: stat({ stress: 4 }, { money: -1900 }) },
      ] })),
      choice('avoid_driving', '这段时间尽量不开车', '你牺牲便利，换来更稳妥的心态。', stat({ stress: -2, discipline: 1 })),
    ],
  }),
  event('emergency_savings_choice', '金钱与理财', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 60, weight: 6,
    title: '建立应急金', description: '你发现账户余额常常见底，朋友建议先存出三个月生活费。',
    options: [
      choice('auto_save', '设置自动存钱', '余额增长不快，却让你不再害怕每次意外。', stat({ discipline: 4, knowledge: 2 }, { money: -1800, flagsAdd: ['emergency_fund'] })),
      choice('save_when_possible', '有结余再存', '方向是对的，执行取决于每个月的诱惑。', stat({ discipline: 2, knowledge: 1 }, { money: -600 })),
      choice('spend_now', '觉得年轻该及时享受', '快乐来得很快，缓冲垫没有长出来。', stat({ happiness: 2, discipline: -2 })),
    ],
  }),
  event('rent_increase', '金钱与理财', {
    stages: ['earlyCareer', 'career'], maxAge: 58, weight: 5,
    title: '房租上涨通知', description: '房东提出续租涨价，你必须重新算一遍生活成本。',
    options: [
      choice('negotiate_rent', '带着市场价格谈续租', '你没有完全压住价格，但争取到了一点空间。', stat({ social: 2, courage: 2, knowledge: 1 }, { expense: 350 })),
      choice('move_out', '搬到更合适的地方', '搬家很累，却让财务重新平衡。', stat({ discipline: 2, stress: 2 }, { money: -1800, expense: -600, flagsAdd: ['moved_for_budget'] })),
      choice('accept_rent', '接受涨价，保持稳定', '生活少了折腾，每月的余钱也变少。', stat({ stress: -1 }, { expense: 850 })),
    ],
  }),
  event('medical_bill', '健康与意外', {
    stages: ['university', 'earlyCareer', 'career', 'midlife'], maxAge: 75, weight: 4,
    title: '一笔意外医疗支出', description: '身体的小问题需要治疗，费用比预期高。',
    options: [
      choice('treat_promptly', '立即治疗并休息', '你花钱买回健康，也避免了拖成大问题。', stat({ health: 4, stress: -2 }, { money: -3600, flagsAdd: ['treated_in_time'] })),
      choice('use_insurance', '研究报销和保险流程', '你多花了一些时间，减少了实际负担。', stat({ knowledge: 3, discipline: 1, health: 3 }, { money: -1400 })),
      choice('delay_treatment', '先拖一拖，省钱', '短期省下钱，恢复时间却可能更长。', stat({ health: -4, stress: 2 }, { flagsAdd: ['health_issue_delayed'] })),
    ],
  }),
  event('phone_upgrade_urge', '金钱与理财', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 55, weight: 5,
    title: '新手机的诱惑', description: '新款手机发布，你现有的设备还能用，但拍视频和社交都不够爽。',
    options: [
      choice('buy_phone', '直接换新', '体验提升很明显，账户余额也立刻变薄。', stat({ happiness: 2, reputation: 1 }, { money: -6800, flagsAdd: ['new_phone'] })),
      choice('buy_used_phone', '买成色好的二手设备', '你兼顾了功能和预算。', stat({ knowledge: 2, discipline: 1 }, { money: -3200, flagsAdd: ['content_device'] })),
      choice('keep_old_phone', '继续用旧机', '你克制住了消费冲动。', stat({ discipline: 3, happiness: -1 })),
    ],
  }),
  event('insurance_review', '金钱与理财', {
    stages: ['earlyCareer', 'career', 'midlife'], minAge: 24, maxAge: 70, weight: 4,
    title: '保险配置复盘', description: '朋友讨论医疗、意外和家庭责任保障，你意识到自己并不了解。',
    options: [
      choice('study_and_buy', '先学习，再选择基础保障', '你没有被话术带着走，买到更匹配自己的保障。', stat({ knowledge: 4, discipline: 1 }, { money: -1000, flagsAdd: ['basic_insurance'] })),
      choice('buy_from_friend', '直接买朋友推荐的产品', '关系好不代表产品一定适合。', stat({ social: 1 }, { money: -1800, outcomes: [
        { weight: 55, result: '保障基本合适，你多了一层安心。', effects: stat({ happiness: 1 }, { flagsAdd: ['basic_insurance'] }) },
        { weight: 45, result: '条款不匹配，钱花得有些冤。', effects: stat({ knowledge: 1, stress: 1 }) },
      ] })),
      choice('skip_insurance_review', '暂时不看', '你把选择留给未来。', stat({ discipline: -1 })),
    ],
  }),
  event('charity_request', '金钱与理财', {
    stages: ['university', 'earlyCareer', 'career', 'midlife'], maxAge: 75, weight: 3,
    title: '公益捐赠邀请', description: '一个可信的公益项目邀请你支持儿童体育或教育。',
    options: [
      choice('donate_small', '捐一笔自己能承担的钱', '金额不大，但你感到和更广阔的人生连接在一起。', stat({ happiness: 2, reputation: 1 }, { money: -300, flagsAdd: ['community_giver'] })),
      choice('volunteer_time', '用时间做志愿服务', '你的行动比一笔钱更具体。', stat({ social: 2, happiness: 3, reputation: 2 }, { flagsAdd: ['volunteer_experience'] })),
      choice('skip_donation', '暂时先顾好自己', '这不是错误，只是你的优先级不同。', stat({ discipline: 1 })),
    ],
  }),
  event('financial_fraud_message', '金钱与理财', {
    stages: ['university', 'earlyCareer', 'career', 'midlife'], maxAge: 80, weight: 4,
    title: '看起来很真的赚钱消息', description: '群里有人晒出高收益截图，催促大家立刻转账参与。',
    options: [
      choice('verify_before_action', '查证资质并咨询正规渠道', '你识破了急迫感背后的风险。', stat({ knowledge: 4, discipline: 2, luck: 1 }, { flagsAdd: ['fraud_aware'] })),
      choice('try_small_amount', '抱着试试看的心态转小钱', '侥幸心理给骗子留下了入口。', stat({ courage: -1, stress: 2 }, { outcomes: [
        { weight: 20, result: '平台暂时还能提现，你误以为自己判断正确。', effects: stat({ luck: 1 }, { money: 200 }) },
        { weight: 80, result: '钱很快无法取出，你得到一堂昂贵的课。', effects: stat({ knowledge: 2, stress: 4 }, { money: -1800, flagsAdd: ['fraud_loss'] }) },
      ] })),
      choice('ignore_message', '直接忽略', '你没有浪费时间，也没有学到更多判断方法。', stat({ stress: -1 })),
    ],
  }),
  event('diet_rebuild', '健康与意外', {
    stages: ['university', 'earlyCareer', 'career', 'midlife'], maxAge: 65, weight: 5,
    title: '饮食习惯重建', description: '外卖和熬夜让你的状态波动很大，朋友建议从一周自己做饭开始。',
    options: [
      choice('cook_weekly', '每周做五天简单健康餐', '你发现自律并不一定苦，身体也更稳定。', stat({ health: 4, fitness: 2, discipline: 3 }, { money: -400, flagsAdd: ['healthy_diet'] })),
      choice('meal_prep', '周末一次性备餐', '效率很高，但需要花时间规划。', stat({ health: 3, knowledge: 2, discipline: 3 }, { money: -300 })),
      choice('keep_takeout', '继续靠外卖解决', '方便没有错，只是恢复和体重开始给出信号。', stat({ happiness: 1, health: -2, fitness: -1 })),
    ],
  }),
  event('burnout_warning', '健康与意外', {
    stages: ['earlyCareer', 'career', 'midlife'], minAge: 24, maxAge: 65, weight: 4,
    conditions: { statsMin: { stress: 70 } },
    title: '倦怠的警告', description: '你对原本喜欢的事也失去兴趣，身体在提醒你不能再只靠硬撑。',
    options: [
      choice('seek_counseling', '找专业人士或可信朋友聊聊', '你不再独自消化压力，开始找到更健康的方式。', stat({ happiness: 4, stress: -7, health: 2, courage: 2 }, { money: -600, flagsAdd: ['mental_health_support'] })),
      choice('take_vacation', '请几天假彻底离开工作', '风景没有解决全部问题，却让你喘过气。', stat({ happiness: 4, stress: -5, health: 2 }, { money: -2500, travelCountries: 0 })),
      choice('push_harder', '告诉自己再坚持一下', '你完成了一些事，代价是更深的疲惫。', stat({ discipline: 1, stress: 6, health: -4, happiness: -4 })),
    ],
  }),
  event('car_purchase_decision', '金钱与理财', {
    stages: ['earlyCareer', 'career', 'midlife'], minAge: 24, maxAge: 60, weight: 3,
    conditions: { moneyMin: 30000 },
    title: '第一辆车的决定', description: '通勤和回家变得不便，买车的念头越来越强。',
    options: [
      choice('buy_practical_car', '买一辆实用的二手车', '生活半径扩大了，养车成本也开始常驻。', stat({ happiness: 2, discipline: 1 }, { money: -38000, expense: 900, flagsAdd: ['car_owner', 'has_driver_license'] })),
      choice('save_more', '再存半年，暂缓购买', '你对长期成本更有控制感。', stat({ discipline: 3, knowledge: 1 })),
      choice('buy_premium_car', '贷款买更有面子的车', '短期满足感很强，账单也变得很具体。', stat({ reputation: 1, happiness: 2, stress: 3 }, { money: -18000, debt: 80000, expense: 2600, flagsAdd: ['car_owner'] })),
    ],
  }),
  event('home_down_payment_plan', '金钱与理财', {
    stages: ['career', 'midlife'], minAge: 27, maxAge: 58, weight: 3,
    conditions: { moneyMin: 80000 },
    title: '关于第一套房的账本', description: '你开始认真计算首付、月供、城市选择和家庭计划。',
    options: [
      choice('save_down_payment', '建立专门的首付账户', '目标变得具体，消费也开始有了边界。', stat({ discipline: 4, knowledge: 2, stress: 1 }, { money: -20000, flagsAdd: ['home_saving_plan'] })),
      choice('buy_within_budget', '购买自己负担得起的小房子', '你获得稳定感，也接下长期责任。', stat({ happiness: 3, stress: 3 }, { money: -80000, debt: 380000, expense: 2600, flagsAdd: ['home_owner'] })),
      choice('keep_renting', '继续租房，把钱留给灵活性', '你保留了行动自由，也要接受没有固定资产。', stat({ courage: 2, happiness: 1 })),
    ],
  }),
  event('unexpected_bonus', '金钱与理财', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 65, weight: 4,
    title: '一笔意外奖金', description: '项目结束后，你拿到了一笔比预期多的奖金。',
    options: [
      choice('save_bonus', '全部存入应急金或目标账户', '未来的你会感谢现在的克制。', stat({ discipline: 3, happiness: 1 }, { money: 5000, flagsAdd: ['bonus_saved'] })),
      choice('share_bonus', '请家人朋友吃饭，再存一部分', '你照顾了关系，也没有把钱全花掉。', stat({ happiness: 3, social: 2 }, { money: 3400, relationship: { family: 2, friends: 2 } })),
      choice('upgrade_life', '立刻奖励自己', '快乐是真的，余额变少也是真的。', stat({ happiness: 4 }, { money: 1200 })),
    ],
  }),
];

const ENTREPRENEURSHIP_EVENTS = [
  event('startup_problem_interview', '创业与生意', {
    stages: ['earlyCareer', 'career'], minAge: 22, maxAge: 50, weight: 7,
    title: '一个值得解决的问题', description: '你注意到身边人反复抱怨同一种问题，朋友鼓励你把它做成生意。',
    options: [
      choice('interview_customers', '先访谈二十个潜在客户', '你发现真实需求和自己想象的并不完全相同。', stat({ knowledge: 4, social: 3, discipline: 2 }, { money: -300, flagsAdd: ['validated_problem'] })),
      choice('build_immediately', '直接花钱做产品或门店', '行动很快，但市场是否存在还没被验证。', stat({ courage: 3, stress: 3 }, { money: -10000, flagsAdd: ['unvalidated_startup'] })),
      choice('write_idea_down', '先记在笔记里，继续观察', '你保留了灵感，暂时没有向前推进。', stat({ knowledge: 1 })),
    ],
  }),
  event('local_business_marketing_offer', '创业与生意', {
    stages: ['earlyCareer', 'career'], maxAge: 52, weight: 6,
    title: '本地商家推广订单', description: '一家本地店铺想找人做短视频和团购推广，问你能不能接。',
    options: [
      choice('sell_pilot_package', '卖一个小额试运营包', '你先用结果换取信任，而不是夸大承诺。', stat({ social: 3, knowledge: 2, courage: 2 }, { money: 3500, workExperience: 2, flagsAdd: ['local_marketing_client'] })),
      choice('promise_big', '承诺短期爆单再签约', '豪言让客户兴奋，交付压力也陡增。', stat({ courage: 2, stress: 4 }, { money: 6000, flagsAdd: ['overpromised_client'] })),
      choice('decline_client', '觉得不熟悉，先不接', '你没有承担风险，也少了一次真实商业训练。', stat({ stress: -1, courage: -1 })),
    ],
    hiddenOptions: [
      choice('build_retainer', '提出按月服务和数据复盘', '客户接受了更长期、更可持续的合作方式。', stat({ knowledge: 3, social: 2, reputation: 2 }, { income: 4000, flagsAdd: ['marketing_retainer'] }), { conditions: { statsMin: { knowledge: 58, social: 55 }, flagsAny: ['creative_portfolio', 'content_creator'] } }),
    ],
  }),
  event('sports_goods_store_idea', '创业与生意', {
    stages: ['earlyCareer', 'career'], maxAge: 48, weight: 5,
    conditions: { flagsAny: ['amateur_league_player', 'assistant_coach', 'basketball_creator', 'basketball_camp_pilot'] },
    title: '体育用品店的念头', description: '球友说你很懂训练装备，建议你做一个小而精的体育用品生意。',
    options: [
      choice('preorder_products', '先预售三种高频产品', '你没有压货，先用订单验证哪些东西真的有人买。', stat({ knowledge: 3, social: 2, courage: 2 }, { money: -3000, flagsAdd: ['sports_goods_preorder'], outcomes: [
        { weight: 58, result: '预售达到目标，第一批订单顺利发出。', effects: stat({ reputation: 2 }, { money: 6500, income: 1600 }) },
        { weight: 42, result: '咨询多，实际下单少，你及时停止补货。', effects: stat({ knowledge: 2 }, { money: -800 }) },
      ] })),
      choice('stock_inventory', '一次性进一批货', '货架很充实，现金也被锁在了库存里。', stat({ courage: 2, stress: 3 }, { money: -18000, flagsAdd: ['sports_goods_inventory'] })),
      choice('affiliate_recommend', '先做选品推荐拿佣金', '你用低风险方式测试受众的购买意愿。', stat({ reputation: 1, knowledge: 2 }, { money: 1200, followers: 200 })),
    ],
  }),
  event('weekend_food_pop_up', '创业与生意', {
    stages: ['university', 'earlyCareer'], maxAge: 35, weight: 4,
    title: '周末餐饮快闪', description: '朋友有一个周末市集摊位，邀请你一起卖简餐和饮品。',
    options: [
      choice('test_menu', '只做三款拿手产品', '菜单简单，出品反而稳定。', stat({ courage: 2, discipline: 2, social: 2 }, { money: -1800, outcomes: [
        { weight: 55, result: '你们当天卖得不错，也拿到了复购反馈。', effects: stat({ happiness: 3, reputation: 1 }, { money: 3600, flagsAdd: ['food_pop_up_success'] }) },
        { weight: 45, result: '客流一般，但损失在可承受范围内。', effects: stat({ knowledge: 2 }, { money: 500 }) },
      ] })),
      choice('make_big_menu', '准备很多品类吸引人', '忙乱让你们顾不上质量和成本。', stat({ courage: 1, stress: 4 }, { money: -3800 })),
      choice('help_without_investing', '去帮忙，先学运营', '你少了收入，也少交了学费。', stat({ knowledge: 3, social: 2 })),
    ],
  }),
  event('business_license_question', '创业与生意', {
    stages: ['earlyCareer', 'career'], maxAge: 55, weight: 4,
    conditions: { flagsAny: ['basketball_camp_owner', 'sports_goods_preorder', 'local_marketing_client', 'food_pop_up_success'] },
    title: '要不要正式注册主体', description: '客户开始要求合同和发票，临时收款方式越来越不够用。',
    options: [
      choice('register_legally', '咨询后注册个体或公司', '你多了一些合规成本，也让客户更放心。', stat({ knowledge: 3, discipline: 2, reputation: 2 }, { money: -2200, flagsAdd: ['registered_business'] })),
      choice('use_platform', '先通过合规平台接单', '你保留灵活性，但利润会被抽走一部分。', stat({ knowledge: 2 }, { expense: 300, flagsAdd: ['platform_business'] })),
      choice('keep_informal', '继续私下收款', '眼下省事，规模上来后风险也更高。', stat({ courage: -1, stress: 2 }, { flagsAdd: ['informal_business'] })),
    ],
  }),
  event('first_employee_hire', '创业与生意', {
    stages: ['career'], minAge: 25, maxAge: 55, weight: 4,
    conditions: { flagsAny: ['registered_business', 'basketball_camp_owner', 'marketing_retainer'] },
    title: '第一次招人', description: '订单开始超过你一个人的能力边界，是否招第一位助手成了难题。',
    options: [
      choice('hire_carefully', '明确岗位、试用期和流程后招聘', '你开始从亲力亲为转向建立系统。', stat({ knowledge: 3, social: 2, reputation: 1, stress: 2 }, { money: -3500, expense: 3500, flagsAdd: ['has_first_employee'] })),
      choice('hire_friend', '找熟人马上帮忙', '信任很快建立，边界却容易模糊。', stat({ social: 2, stress: 2 }, { money: -2600, expense: 2600, flagsAdd: ['hired_friend'] })),
      choice('keep_solo', '继续一个人扛', '利润暂时更高，增长也被你的时间锁住。', stat({ discipline: 2, stress: 4 })),
    ],
  }),
  event('client_payment_delay', '创业与生意', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 65, weight: 5,
    conditions: { flagsAny: ['local_marketing_client', 'marketing_retainer', 'registered_business', 'international_project'] },
    title: '客户拖延回款', description: '一笔已经完成的服务费迟迟没有到账，你的现金流开始紧张。',
    options: [
      choice('formal_followup', '按合同和节点正式催款', '你保持专业，客户也更重视你的边界。', stat({ courage: 3, reputation: 1, stress: 2 }, { outcomes: [
        { weight: 65, result: '客户按约支付了款项。', effects: stat({ happiness: 2 }, { money: 8000 }) },
        { weight: 35, result: '对方继续拖延，你需要走更正式的流程。', effects: stat({ knowledge: 1, stress: 4 }, { flagsAdd: ['payment_dispute'] }) },
      ] })),
      choice('discount_for_cash', '给一点折扣换快速回款', '现金流保住了，利润被压缩。', stat({ stress: -1 }, { money: 5200 })),
      choice('ignore_delay', '怕伤关系，不再追问', '关系表面和平，风险却落在了自己身上。', stat({ social: -1, stress: 3 }, { flagsAdd: ['cashflow_risk'] })),
    ],
  }),
  event('pricing_decision', '创业与生意', {
    stages: ['earlyCareer', 'career'], maxAge: 58, weight: 5,
    conditions: { flagsAny: ['basketball_camp_pilot', 'local_marketing_client', 'sports_goods_preorder', 'side_hustle'] },
    title: '价格太低的困境', description: '客户说你的服务不错，但你发现现在的定价几乎没有利润。',
    options: [
      choice('raise_price_with_value', '梳理价值后逐步提价', '你失去一部分低价客户，也吸引到更匹配的人。', stat({ courage: 3, knowledge: 2, reputation: 1 }, { income: 1800, flagsAdd: ['healthy_pricing'] })),
      choice('add_tiered_package', '增加基础版和高阶版', '客户有了选择，你也学会了产品分层。', stat({ knowledge: 3, social: 1 }, { income: 1000, flagsAdd: ['tiered_offer'] })),
      choice('keep_low_price', '维持低价换更多订单', '订单增加了，你却更累也更难存钱。', stat({ stress: 4, reputation: 1 }, { income: 400 })),
    ],
  }),
  event('startup_partner_conflict', '创业与生意', {
    stages: ['earlyCareer', 'career'], maxAge: 60, weight: 4,
    conditions: { flagsAny: ['friend_business', 'basketball_camp_partner', 'coach_partner_test', 'hired_friend'] },
    title: '合伙人的分歧', description: '你们对投入、分成和未来方向出现严重分歧。',
    options: [
      choice('write_agreement', '把职责和退出机制写下来', '模糊的抱怨变成了可讨论的条款。', stat({ knowledge: 3, social: 2, courage: 2, stress: 1 }, { flagsAdd: ['partnership_agreement'] })),
      choice('buy_out_or_exit', '协商退出或收购份额', '过程不轻松，但你们避免了长期内耗。', stat({ courage: 3, stress: 3 }, { money: -6000, flagsAdd: ['partnership_resolved'] })),
      choice('avoid_conversation', '先拖着，假装没事', '冲突没有消失，只是悄悄侵蚀效率。', stat({ stress: 5, social: -3 })),
    ],
  }),
  event('crossborder_b2b_test', '创业与生意', {
    stages: ['earlyCareer', 'career'], maxAge: 55, weight: 5,
    conditions: { statsMin: { english: 58 }, flagsAny: ['usa_work_experience', 'translation_client', 'english_certificate'] },
    title: '帮本地企业试水海外客户', description: '一家本地企业希望你协助做英文资料和北美客户开发。',
    options: [
      choice('sell_paid_pilot', '卖30天试水服务包', '你把服务范围和交付写清，第一次以结果而不是人情收费。', stat({ english: 3, social: 3, courage: 2, knowledge: 2 }, { money: 8000, workExperience: 2, flagsAdd: ['crossborder_b2b_pilot'] })),
      choice('commission_only', '只收成交佣金', '门槛低，现金流和成交周期都更难预测。', stat({ courage: 2, stress: 3 }, { flagsAdd: ['crossborder_commission'] })),
      choice('decline_b2b', '觉得复杂，不接', '你避免了新领域的风险，也把学习机会留给了别人。', stat({ stress: -1, courage: -1 })),
    ],
    hiddenOptions: [
      choice('specialize_one_vertical', '只选一个细分行业深耕', '你不再什么都接，专业感反而明显起来。', stat({ knowledge: 4, reputation: 3, discipline: 2 }, { money: 10000, flagsAdd: ['crossborder_specialist'], income: 3000 }), { conditions: { statsMin: { knowledge: 62, discipline: 58 }, flagsAll: ['crossborder_b2b_pilot'] } }),
    ],
  }),
  event('cashflow_crisis', '创业与生意', {
    stages: ['career', 'midlife'], maxAge: 65, weight: 3,
    conditions: { flagsAny: ['cashflow_risk', 'unvalidated_startup', 'basketball_camp_owner', 'informal_business'] },
    title: '现金流紧张的一月', description: '租金、工资和回款错位，账户余额不足以让你安心。',
    options: [
      choice('cut_costs', '砍掉非核心开支，保住交付', '你做了痛苦但必要的取舍。', stat({ knowledge: 3, discipline: 2, stress: 4 }, { expense: -1300, flagsAdd: ['survived_cashflow_crisis'] })),
      choice('seek_bridge_funding', '找可信的人做短期周转', '你换来时间，也必须对未来收入负责。', stat({ courage: 2, social: 1, stress: 3 }, { money: 10000, debt: 10000 })),
      choice('close_project', '及时止损，关闭亏损业务', '你承认失败，却保住了剩下的资源和精力。', stat({ courage: 4, stress: -2, happiness: -2 }, { money: -4000, expense: -2500, flagsAdd: ['startup_closed', 'startup_failure'] })),
    ],
  }),
  event('franchise_sales_pitch', '创业与生意', {
    stages: ['earlyCareer', 'career'], maxAge: 55, weight: 3,
    title: '高价加盟的推销会', description: '有人保证加盟后快速回本，现场气氛很热烈。',
    options: [
      choice('audit_franchise', '查合同、闭店率和真实门店', '你把兴奋换成了证据。', stat({ knowledge: 4, discipline: 2, luck: 1 }, { flagsAdd: ['franchise_cautious'] })),
      choice('pay_deposit', '交定金抢名额', '你获得了一个承诺，也背上了一个未经验证的重担。', stat({ courage: 1, stress: 4 }, { money: -20000, flagsAdd: ['franchise_risk'] })),
      choice('walk_away', '不被限时优惠催促', '你没有损失，也少了一次赌博式机会。', stat({ discipline: 2, courage: 1 })),
    ],
  }),
  event('business_pivot', '创业与生意', {
    stages: ['career', 'midlife'], maxAge: 62, weight: 3,
    conditions: { flagsAny: ['startup_failure', 'sports_goods_inventory', 'crossborder_b2b_pilot', 'local_marketing_client'] },
    title: '是否转向新业务', description: '原来的业务增长停滞，一条相邻赛道正在显现。',
    options: [
      choice('pilot_pivot', '只用小预算做试点', '你带着过去的经验进入新方向。', stat({ knowledge: 4, courage: 2, discipline: 2 }, { money: -5000, flagsAdd: ['business_pivot_pilot'] })),
      choice('double_down', '继续加码原业务', '专注可能带来突破，也可能扩大已有问题。', stat({ courage: 2, stress: 4 }, { money: -6000 })),
      choice('return_to_job', '暂停创业，回到稳定工作', '你重新获得现金流，身份转变需要一点适应。', stat({ stress: -3, happiness: -1 }, { income: 5000, flagsAdd: ['returned_to_employment'] })),
    ],
  }),
  event('major_client_win', '创业与生意', {
    stages: ['career', 'midlife'], maxAge: 65, weight: 3,
    conditions: { flagsAny: ['registered_business', 'crossborder_specialist', 'marketing_retainer', 'basketball_camp_owner'] },
    title: '一个大客户的机会', description: '一份重要合同可能让业务上一个台阶，也可能让你过度依赖单一客户。',
    options: [
      choice('win_with_terms', '拿下合同，并写清付款节点', '你赢下订单，也保留了谈判底线。', stat({ reputation: 4, knowledge: 2, courage: 2, stress: 3 }, { money: 30000, income: 6000, flagsAdd: ['major_client'] })),
      choice('discount_heavily', '低价抢单再说', '客户签了，利润和交付压力却很紧。', stat({ reputation: 2, stress: 5 }, { money: 15000, income: 1500 })),
      choice('decline_dependency', '拒绝不合理条款', '你失去大单，但没有把公司交给一个客户。', stat({ courage: 3, reputation: 1 })),
    ],
  }),
  event('business_legacy_choice', '创业与生意', {
    stages: ['midlife', 'laterLife'], minAge: 42, maxAge: 75, weight: 2,
    conditions: { flagsAny: ['registered_business', 'basketball_camp_owner', 'crossborder_specialist'] },
    title: '生意不再只能靠你', description: '团队问你未来是否愿意把管理权交出去，让业务可持续。',
    options: [
      choice('build_system', '写流程、培养负责人', '你把个人能力慢慢变成组织能力。', stat({ knowledge: 4, social: 3, discipline: 3 }, { money: -8000, flagsAdd: ['business_systemized'] })),
      choice('keep_control', '继续亲自抓所有关键环节', '质量很稳，规模和自由度都被限制。', stat({ reputation: 1, stress: 4 })),
      choice('sell_business', '在合适价格出售部分股权', '你兑现了一部分成果，也告别了亲手搭起的一段生活。', stat({ happiness: 2, courage: 2 }, { money: 120000, flagsAdd: ['business_exit'] })),
    ],
  }),
];

const MEDIA_EVENTS = [
  event('motivational_video_viral', '自媒体', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 52, weight: 7, cooldown: 18,
    tags: ['短视频', '励志'], title: '励志视频突然爆火',
    description: '你发布的一条励志视频获得大量播放，评论区的人开始叫你的名字。',
    options: [
      choice('daily_motivation', '连续更新同类内容', '粉丝增长很快，但你把大量精力压在更新上。', stat({ reputation: 3, discipline: 2, stress: 4, happiness: 1 }, { followers: 18000, flagsAdd: ['content_creator', 'motivational_creator'] })),
      choice('buy_equipment', '购买设备提高视频质量', '画面和声音明显提升，内容也更有质感。', stat({ reputation: 4, knowledge: 2, discipline: 1 }, { money: -6800, followers: 5200, flagsAdd: ['content_creator', 'content_device'] })),
      choice('take_ads_now', '立即接广告赚钱', '现金来得很快，一部分老粉丝开始担心你的方向。', stat({ reputation: -1, stress: 2 }, { money: 9000, followers: -900, flagsAdd: ['content_creator', 'first_ad'] })),
      choice('steady_updates', '保持正常更新', '增长较慢，却更像一条可走很久的路。', stat({ discipline: 3, reputation: 2, stress: 1 }, { followers: 3600, flagsAdd: ['content_creator'] })),
    ],
    hiddenOptions: [
      choice('build_series', '把爆款拆成连续系列', '你不只追热点，开始搭建能留住人的内容结构。', stat({ knowledge: 4, discipline: 3, reputation: 3 }, { followers: 12000, flagsAdd: ['content_creator', 'series_creator'] }), { conditions: { statsMin: { knowledge: 55, discipline: 58 } } }),
    ],
  }),
  event('content_calendar', '自媒体', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 60, weight: 6,
    conditions: { flagsAny: ['content_creator', 'basketball_creator', 'travel_creator_material'] },
    title: '内容更新总是断断续续', description: '灵感有时很多，有时几周都发不出一条，你需要决定怎么持续。',
    options: [
      choice('make_calendar', '制定一月内容日历', '规律让创作不再完全依赖状态。', stat({ discipline: 4, knowledge: 2, stress: 1 }, { followers: 600, flagsAdd: ['content_calendar'] })),
      choice('batch_record', '周末批量拍摄和剪辑', '效率提高，休息时间也被压缩。', stat({ discipline: 3, reputation: 1, stress: 3 }, { followers: 800 })),
      choice('post_when_inspired', '只在有感觉时发', '偶尔会有神来之笔，增长更不稳定。', stat({ creativity: 2, happiness: 1 }, { followers: 120 })),
    ],
  }),
  event('basketball_tutorial_series', '自媒体', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 55, weight: 6,
    conditions: { statsMin: { basketball: 48 }, flagsAny: ['content_creator', 'basketball_creator', 'assistant_coach'] },
    title: '控卫技巧系列', description: '粉丝反复问你如何训练控球和阅读比赛，这可能是一组长期内容。',
    options: [
      choice('film_series', '认真拍十集教学系列', '专业、清晰的内容让陌生人开始信任你的方法。', stat({ basketball: 2, knowledge: 3, reputation: 4, discipline: 3 }, { money: -1200, followers: 5200, flagsAdd: ['basketball_educator_creator'] })),
      choice('short_tips', '随手发碎片化技巧', '制作轻松，用户不容易形成完整印象。', stat({ basketball: 1, followers: 1100, reputation: 1 })),
      choice('avoid_teaching', '担心被挑错，不做教学', '你保留了安全感，也让专业能力停在自己手里。', stat({ stress: -1, courage: -2 })),
    ],
  }),
  event('video_limited_reach', '自媒体', {
    stages: ['earlyCareer', 'career'], maxAge: 60, weight: 5,
    conditions: { flagsAny: ['content_creator', 'basketball_creator', 'motivational_creator'] },
    title: '账号播放量突然下滑', description: '连续几条视频播放不及平时，你怀疑自己是不是被限流。',
    options: [
      choice('analyze_data', '分析完播、互动和选题', '你发现问题并不神秘，只是内容节奏需要修。', stat({ knowledge: 4, discipline: 2, stress: -1 }, { followers: 300, flagsAdd: ['content_data_literate'] })),
      choice('buy_traffic', '花钱投流试试', '数据变好看了，真实转化未必同步。', stat({ courage: 1, stress: 2 }, { money: -1500, followers: 1200 })),
      choice('stop_posting', '先停更一阵', '你得到休息，也失去了一些惯性。', stat({ stress: -2, reputation: -1 }, { followers: -400 })),
    ],
  }),
  event('brand_ad_offer', '自媒体', {
    stages: ['earlyCareer', 'career'], maxAge: 62, weight: 5,
    conditions: { followersMin: 3000, flagsAny: ['content_creator', 'basketball_creator'] },
    title: '第一份品牌合作', description: '品牌愿意付费让你推荐一款产品，但你并没有真正长期使用过。',
    options: [
      choice('test_then_accept', '先测试产品，再决定合作', '你把粉丝信任放在合同之前。', stat({ reputation: 3, knowledge: 2 }, { money: 4200, followers: 300, flagsAdd: ['brand_collab'] })),
      choice('take_easy_money', '不测试，直接接单', '钱进来了，评论区很快出现质疑。', stat({ reputation: -3, stress: 3 }, { money: 6500, followers: -650, flagsAdd: ['brand_collab'] })),
      choice('decline_brand', '拒绝不匹配的推广', '你少赚一笔，定位更清楚。', stat({ courage: 2, reputation: 2 })),
    ],
  }),
  event('mcn_invitation', '自媒体', {
    stages: ['earlyCareer', 'career'], maxAge: 60, weight: 4,
    conditions: { followersMin: 10000, flagsAny: ['content_creator', 'basketball_creator'] },
    title: 'MCN签约邀请', description: '机构承诺商务资源和流量支持，也要求较长合作期限。',
    options: [
      choice('review_contract', '找人看合同后再谈', '你避免把长期账号价值换成一时兴奋。', stat({ knowledge: 4, courage: 2, reputation: 1 }, { money: -800, flagsAdd: ['mcn_contract_review'] })),
      choice('sign_mcn', '立刻签约，借资源成长', '资源确实变多，内容自由度也下降。', stat({ reputation: 2, stress: 3 }, { money: 8000, followers: 6000, flagsAdd: ['signed_mcn'] })),
      choice('stay_independent', '保持独立运营', '增长更慢，但方向仍由你决定。', stat({ discipline: 3, courage: 2 })),
    ],
  }),
  event('negative_comments', '自媒体', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 65, weight: 5,
    conditions: { followersMin: 1000, flagsAny: ['content_creator', 'basketball_creator'] },
    title: '刺耳的评论', description: '一条视频下出现大量挑刺和嘲讽，你忍不住反复刷新。',
    options: [
      choice('respond_with_facts', '挑有价值的问题理性回应', '你没有讨好所有人，但赢得了愿意讨论的观众。', stat({ courage: 2, reputation: 2, stress: 1 }, { followers: 250 })),
      choice('block_and_move_on', '屏蔽恶意内容，继续创作', '你保护了情绪，也少了一点沟通空间。', stat({ happiness: 2, stress: -2 })),
      choice('argue_online', '在评论区争到底', '一时出了气，账号氛围也被拖进了争吵。', stat({ courage: 1, reputation: -2, stress: 4 }, { followers: -300 })),
    ],
  }),
  event('hometown_documentary', '自媒体', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 65, weight: 4,
    conditions: { flagsAny: ['returned_to_north_city', 'content_creator', 'basketball_creator'] },
    title: '拍一条关于北城的片子', description: '你想把家乡街道、球场和普通人的故事拍下来。',
    options: [
      choice('make_documentary', '花时间做成完整短片', '真诚的地方叙事让很多人看见了你。', stat({ knowledge: 2, reputation: 4, happiness: 3, discipline: 3 }, { money: -1800, followers: 4200, flagsAdd: ['hometown_storyteller'] })),
      choice('make_quick_vlog', '拍一条轻松vlog', '内容亲近，传播力度有限。', stat({ happiness: 2, followers: 800, reputation: 1 })),
      choice('save_for_later', '等更有设备再拍', '你保留了想法，也错过了当下的素材。', stat({ discipline: -1 })),
    ],
  }),
  event('travel_vlog_material', '自媒体', {
    stages: ['earlyCareer', 'career'], maxAge: 60, weight: 4,
    conditions: { travelCountriesMin: 2, flagsAny: ['content_creator', 'travel_creator_material'] },
    title: '旅行素材堆在硬盘里', description: '你拍了很多旅行片段，却一直没有剪成真正的作品。',
    options: [
      choice('edit_story', '从一个主题剪成故事', '旅行不再只是个人记忆，也成了能启发别人的内容。', stat({ discipline: 4, reputation: 3, happiness: 2 }, { money: -300, followers: 3200, flagsAdd: ['travel_creator'] })),
      choice('post_highlights', '挑照片和片段随手发', '更新轻松，内容寿命较短。', stat({ followers: 700, happiness: 1 })),
      choice('archive_material', '继续存着，不动手', '素材安全躺着，故事没有发生。', stat({ discipline: -2 })),
    ],
  }),
  event('live_stream_challenge', '自媒体', {
    stages: ['earlyCareer', 'career'], maxAge: 62, weight: 4,
    conditions: { followersMin: 5000, flagsAny: ['content_creator', 'basketball_creator'] },
    title: '第一次直播', description: '粉丝希望你开直播聊篮球、海外经历或人生选择。',
    options: [
      choice('prepare_live', '列主题并提前预告', '直播没有爆炸式数据，却建立了更深的信任。', stat({ social: 3, courage: 3, reputation: 2 }, { followers: 1300, money: 800, flagsAdd: ['live_creator'] })),
      choice('go_live_spontaneously', '直接开播，随便聊聊', '气氛自然，但节奏有些散。', stat({ courage: 3, followers: 600, stress: 1 })),
      choice('avoid_live', '担心尴尬，不开', '你避免了暴露，也放弃了一次互动机会。', stat({ stress: -1, courage: -2 })),
    ],
  }),
  event('content_course_offer', '自媒体', {
    stages: ['earlyCareer', 'career'], maxAge: 62, weight: 3,
    conditions: { followersMin: 12000, flagsAny: ['basketball_educator_creator', 'motivational_creator', 'travel_creator'] },
    title: '做付费课的诱惑', description: '有人建议你把经验做成课程，粉丝也在问更系统的内容。',
    options: [
      choice('build_useful_course', '先访谈需求，再做小课', '你用真实反馈打磨内容，而不是把焦虑卖给别人。', stat({ knowledge: 4, discipline: 3, reputation: 3 }, { money: -2600, income: 3500, flagsAdd: ['course_creator'] })),
      choice('sell_fast_course', '快速拼出课程上架', '收入来得早，退款和质疑也来得快。', stat({ stress: 4, reputation: -3 }, { money: 6500, flagsAdd: ['low_quality_course'] })),
      choice('keep_free_content', '继续只做免费内容', '信任积累更稳，商业化进度更慢。', stat({ reputation: 2, happiness: 1 })),
    ],
  }),
  event('content_collaboration_conflict', '自媒体', {
    stages: ['earlyCareer', 'career'], maxAge: 62, weight: 3,
    conditions: { flagsAny: ['signed_mcn', 'basketball_creator', 'travel_creator'] },
    title: '联动内容的署名争议', description: '合作视频上线后，对方对分工、署名或收益分配提出异议。',
    options: [
      choice('show_records', '拿出事前沟通和数据协商', '你守住原则，也避免把合作变成公开争吵。', stat({ knowledge: 3, social: 2, reputation: 2, stress: 2 })),
      choice('give_up_share', '让出一部分收益换和平', '冲突降温了，你心里留下了不甘。', stat({ happiness: -1, stress: -1 }, { money: -1200 })),
      choice('public_argument', '公开回应对方', '流量有了，可信度和关系都受伤。', stat({ reputation: -3, stress: 5 }, { followers: 900 })),
    ],
  }),
  event('fan_meetup', '自媒体', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 65, weight: 3,
    conditions: { followersMin: 20000, flagsAny: ['content_creator', 'basketball_creator'] },
    title: '线下粉丝小聚', description: '几位长期关注你的人想组织一次线下见面。',
    options: [
      choice('host_safe_meetup', '选公共场所，小规模举办', '虚拟的关注变成了有温度的真实交流。', stat({ social: 4, reputation: 3, happiness: 3 }, { money: -1000, followers: 1200, flagsAdd: ['fan_community'] })),
      choice('join_existing_event', '借朋友活动顺便见面', '成本低，互动也不够深入。', stat({ social: 2, followers: 500 })),
      choice('decline_meetup', '暂时不做线下活动', '你保护了隐私和精力。', stat({ stress: -1, discipline: 1 })),
    ],
  }),
  event('platform_rule_change', '自媒体', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 70, weight: 3,
    conditions: { flagsAny: ['content_creator', 'basketball_creator', 'travel_creator'] },
    title: '平台规则变化', description: '内容分发和商业化规则调整，你过去的增长方法不再有效。',
    options: [
      choice('diversify_channels', '同步建立多个内容阵地', '增长没那么快，却不再被单一平台决定命运。', stat({ knowledge: 4, discipline: 3, stress: 2 }, { money: -800, followers: 1500, flagsAdd: ['multi_platform_creator'] })),
      choice('adapt_one_platform', '专心研究新规则', '你有机会重新跑通模型，也承担平台依赖风险。', stat({ knowledge: 3, stress: 2 }, { followers: 900 })),
      choice('quit_content', '觉得变化太快，停止创作', '你从压力里解脱，也关上了一条积累渠道。', stat({ stress: -3, happiness: -1 }, { flagsAdd: ['content_retired'] })),
    ],
  }),
  event('content_team_offer', '自媒体', {
    stages: ['career', 'midlife'], maxAge: 68, weight: 3,
    conditions: { followersMin: 50000, flagsAny: ['content_creator', 'basketball_creator', 'travel_creator'] },
    title: '要不要组建内容小团队', description: '商务、剪辑和运营开始超过一个人的承载能力。',
    options: [
      choice('hire_editor', '先找兼职剪辑和运营', '你从日更机器变成了内容负责人。', stat({ knowledge: 3, social: 2, stress: 2 }, { expense: 2800, followers: 4000, flagsAdd: ['content_team'] })),
      choice('teach_apprentice', '培养一位愿意长期合作的人', '磨合很慢，长期的默契开始形成。', stat({ social: 3, reputation: 2, discipline: 2 }, { money: -1000, flagsAdd: ['content_apprentice'] })),
      choice('stay_solo_creator', '坚持所有环节自己做', '控制感很强，增长继续受时间限制。', stat({ discipline: 2, stress: 4 })),
    ],
  }),
];

const INVESTMENT_EVENTS = [
  event('low_risk_finance_start', '投资与理财', {
    stages: ['university', 'earlyCareer', 'career', 'midlife'], maxAge: 70, weight: 6,
    conditions: { moneyMin: 3000 }, title: '低风险理财的开始', description: '银行卡里有一笔闲钱，朋友建议先了解低风险理财和货币基金。',
    options: [
      choice('learn_then_buy', '了解规则后小额配置', '你没有期待暴富，先学会让钱不闲着。', stat({ knowledge: 3, discipline: 2 }, { money: -2000, investmentAssets: 2000, flagsAdd: ['low_risk_investor'] })),
      choice('keep_cash', '继续持有现金', '安全感很强，收益也很有限。', stat({ stress: -1, discipline: 1 })),
      choice('chase_high_yield', '只看高收益宣传', '你把风险判断交给了陌生人的截图。', stat({ knowledge: -2, stress: 2 }, { flagsAdd: ['yield_chaser'] })),
    ],
  }),
  event('index_fund_plan', '投资与理财', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 70, weight: 5,
    conditions: { moneyMin: 5000 }, title: '长期投资计划', description: '你在研究定投，核心问题不是买什么，而是能否穿过波动。',
    options: [
      choice('start_sip', '设定小额长期定投', '你把长期主义落实成了每月自动执行。', stat({ knowledge: 3, discipline: 4 }, { money: -3000, investmentAssets: 3000, flagsAdd: ['index_investor'] })),
      choice('wait_for_perfect_time', '等最好的入场点', '你关注得很认真，始终没有开始。', stat({ knowledge: 1, stress: 1 })),
      choice('borrow_to_invest', '借钱加大投入', '波动还没来，压力已经先来了。', stat({ courage: -1, stress: 4 }, { debt: 5000, investmentAssets: 5000, flagsAdd: ['leveraged_investor'] })),
    ],
  }),
  event('hot_stock_tip', '投资与理财', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 65, weight: 4,
    conditions: { moneyMin: 3000 }, title: '朋友的热门股票消息', description: '朋友说有内幕消息，催你在收盘前跟进。',
    options: [
      choice('research_and_skip', '查公开资料，不跟风下单', '你宁可错过，也不拿不懂的风险下注。', stat({ knowledge: 4, discipline: 2, luck: 1 })),
      choice('buy_small', '只用能承受损失的小额试试', '你体验了波动，也没有把生活费放进去。', stat({ knowledge: 1, stress: 2 }, { money: -1500, investmentAssets: 1500, outcomes: [
        { weight: 45, result: '短期上涨，你意识到运气不等于能力。', effects: stat({ luck: 1 }, { money: 500 }) },
        { weight: 55, result: '价格回落，你得到一次可承受的教训。', effects: stat({ knowledge: 2 }, { investmentAssets: -500 }) },
      ] })),
      choice('all_in', '把大部分存款押进去', '你把情绪放大成仓位，结果随市场摆动。', stat({ stress: 5 }, { money: -7000, investmentAssets: 7000, flagsAdd: ['speculative_trade'] })),
    ],
  }),
  event('investment_market_drop', '投资与理财', {
    stages: ['career', 'midlife'], maxAge: 70, weight: 4,
    conditions: { investmentAssetsMin: 3000 }, title: '市场大幅波动', description: '账户连续下跌，周围的人都在讨论要不要割肉。',
    options: [
      choice('review_plan', '按原计划复盘风险和期限', '你不让短期价格替代长期判断。', stat({ knowledge: 3, discipline: 3, stress: 1 }, { investmentAssets: -900 })),
      choice('sell_in_panic', '恐慌卖出全部资产', '压力减轻了，损失被正式锁定。', stat({ stress: -2, happiness: -2 }, { investmentAssets: -2200, flagsAdd: ['sold_in_panic'] })),
      choice('double_down', '不评估风险就加仓', '如果判断错了，损失会被放大。', stat({ courage: -1, stress: 4 }, { money: -3000, investmentAssets: 1000 })),
    ],
  }),
  event('investment_rebound', '投资与理财', {
    stages: ['career', 'midlife'], maxAge: 72, weight: 3,
    conditions: { flagsAny: ['index_investor', 'low_risk_investor'], investmentAssetsMin: 2000 }, title: '投资账户回暖', description: '经过一段时间波动，账户重新出现正收益。',
    options: [
      choice('rebalance', '按目标比例再平衡', '你把收益变成更可控的结构。', stat({ knowledge: 3, discipline: 2 }, { investmentAssets: 1800 })),
      choice('take_some_profit', '拿出一部分完成生活目标', '钱不再只是数字，也服务于你真正想要的生活。', stat({ happiness: 2 }, { money: 1600, investmentAssets: 800 })),
      choice('chase_more', '觉得自己找到了规律，加大风险', '自信有时会变成市场最喜欢的陷阱。', stat({ stress: 2, knowledge: -1 }, { investmentAssets: 1200, flagsAdd: ['overconfident_investor'] })),
    ],
  }),
  event('friend_startup_investment', '投资与理财', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 60, weight: 4,
    conditions: { moneyMin: 10000 }, title: '朋友创业想拉你投资', description: '项目讲得很动人，但还没有稳定收入。',
    options: [
      choice('ask_for_data', '看账本、客户和退出条款', '你尊重朋友，也尊重自己的钱。', stat({ knowledge: 4, courage: 1 }, { flagsAdd: ['angel_due_diligence'] })),
      choice('invest_small', '投一笔自己能承受的资金', '你成为支持者，也接受资金可能归零。', stat({ courage: 2, stress: 2 }, { money: -5000, investmentAssets: 5000, flagsAdd: ['angel_investor'], outcomes: [
        { weight: 35, result: '项目获得新客户，你的份额有了价值。', effects: stat({ reputation: 1 }, { investmentAssets: 4000 }) },
        { weight: 65, result: '项目停止运营，这笔钱成为经验成本。', effects: stat({ knowledge: 2, happiness: -1 }, { investmentAssets: -5000 }) },
      ] })),
      choice('decline_investment', '不投资，但提供建议', '你守住边界，也没有否定朋友。', stat({ social: 1, knowledge: 1 })),
    ],
  }),
  event('debt_repayment_plan', '投资与理财', {
    stages: ['university', 'earlyCareer', 'career', 'midlife'], maxAge: 70, weight: 5,
    conditions: { debtMin: 1000 }, title: '债务还款计划', description: '账单提醒你，拖着不处理的债务会越来越影响选择。',
    options: [
      choice('pay_high_interest', '优先还高利率债务', '现金流更紧，但你开始夺回主动。', stat({ discipline: 4, knowledge: 2, stress: 2 }, { money: -2500, debt: -2500, flagsAdd: ['debt_plan'] })),
      choice('negotiate_repayment', '与债权方协商分期', '你没有逃避，压力变得可管理。', stat({ courage: 3, social: 1, stress: -1 }, { debt: -700, flagsAdd: ['debt_plan'] })),
      choice('ignore_debt', '先不看账单', '短暂轻松，利息和焦虑都在增长。', stat({ stress: 4, happiness: -2 }, { debt: 900 })),
    ],
  }),
  event('professional_skill_investment', '投资与理财', {
    stages: ['university', 'earlyCareer', 'career'], maxAge: 55, weight: 6,
    title: '把钱花在技能上', description: '一门销售、管理、剪辑或AI工具课程不便宜，但可能提高你的长期收入。',
    options: [
      choice('buy_and_practice', '购买并完成作品或项目', '学习没有停在收藏夹里，能力开始变现。', stat({ knowledge: 5, discipline: 3, reputation: 1 }, { money: -2600, workExperience: 1, flagsAdd: ['upskilled'] })),
      choice('buy_only', '买下来，先慢慢看', '你拥有了课程，却没有真正拥有技能。', stat({ knowledge: 1 }, { money: -1800, flagsAdd: ['course_hoarder'] })),
      choice('use_free_resources', '先用免费资源练一月', '进度慢一点，自律要求高得多。', stat({ knowledge: 3, discipline: 4 })),
    ],
  }),
  event('financial_advisor_meeting', '投资与理财', {
    stages: ['career', 'midlife'], minAge: 28, maxAge: 72, weight: 3,
    conditions: { moneyMin: 20000 }, title: '理财顾问的会面', description: '你有了更多资产，却发现自己的配置越来越杂乱。',
    options: [
      choice('ask_fee_only_advice', '明确收费方式后获取建议', '你获得框架，而不是被推销产品。', stat({ knowledge: 4, discipline: 1 }, { money: -1200, flagsAdd: ['financial_plan'] })),
      choice('buy_recommended_product', '直接购买对方推荐的产品', '省下了研究时间，适配性需要以后验证。', stat({ knowledge: 1 }, { money: -5000, investmentAssets: 5000 })),
      choice('self_audit', '自己整理所有账户和目标', '过程花时间，掌控感也更强。', stat({ knowledge: 3, discipline: 3 })),
    ],
  }),
  event('inheritance_or_gift', '投资与理财', {
    stages: ['career', 'midlife', 'laterLife'], minAge: 30, maxAge: 80, weight: 2, title: '一笔家庭赠与', description: '家人支持你一笔钱，希望你用在真正重要的事情上。',
    options: [
      choice('use_for_security', '优先还债、储蓄或改善居住', '你把这份支持变成了生活的地基。', stat({ discipline: 3, happiness: 2 }, { money: 20000, debt: -5000, flagsAdd: ['family_gift_used_well'] })),
      choice('start_business_with_gift', '把一部分投入验证过的生意', '你用机会换取增长，也承担经营风险。', stat({ courage: 3, knowledge: 2 }, { money: 5000, investmentAssets: 10000, flagsAdd: ['family_gift_business'] })),
      choice('spend_freely', '先奖励自己和旅行', '记忆很美，长期缓冲没有增加。', stat({ happiness: 5 }, { money: 3000, travelCountries: 1 })),
    ],
  }),
  event('retirement_investing', '投资与理财', {
    stages: ['midlife', 'laterLife'], minAge: 40, maxAge: 78, weight: 3, title: '为未来的自己留一笔钱', description: '你开始意识到，晚年的自由来自很多年前的持续安排。',
    options: [
      choice('set_retirement_plan', '设定长期储蓄和保险计划', '你把对未来的担心变成了可执行的数字。', stat({ knowledge: 3, discipline: 4, stress: -1 }, { money: -6000, investmentAssets: 6000, flagsAdd: ['retirement_plan'] })),
      choice('focus_current_needs', '先满足当前家庭和事业需要', '你的选择有现实理由，未来需要继续补课。', stat({ happiness: 1, stress: 1 })),
      choice('trust_future_income', '相信以后总会赚更多', '希望不能替代计划。', stat({ courage: -1, discipline: -2 })),
    ],
  }),
];

const CAREER_EVENTS = [
  event('teacher_recruitment_exam', '职业发展', {
    stages: ['university', 'earlyCareer'], maxAge: 32, weight: 7,
    conditions: { flagsAny: ['teacher_path', 'teacher_certificate_preparing', 'teacher_exam_mentor'] }, title: '体育教师招聘考试', description: '招聘考试临近，笔试、试讲和体能都要过关。',
    options: [
      choice('prepare_full', '系统准备笔试和试讲', '你把能力拆成每日任务，信心来自准备。', stat({ knowledge: 4, discipline: 4, social: 1, stress: 3 }, { money: -800, outcomes: [
        { weight: 48, result: '你通过招聘，拿到体育教师岗位。', effects: stat({ happiness: 4, reputation: 3 }, { income: 5200, workExperience: 2, flagsAdd: ['sports_teacher'], setCareer: 'sports_teacher' }) },
        { weight: 52, result: '这次没上岸，但你清楚了差距。', effects: stat({ courage: 2, knowledge: 2, happiness: -2 }, { flagsAdd: ['teacher_exam_experience'] }) },
      ] })),
      choice('try_without_prep', '报个名去试试', '你获得现场经验，结果更多靠基础。', stat({ courage: 2, stress: 1 }, { money: -300, flagsAdd: ['teacher_exam_experience'] })),
      choice('switch_path', '把时间投入其他职业', '你停止了一条路，也更专注当前方向。', stat({ courage: 2, stress: -1 }, { flagsRemove: ['teacher_path'] })),
    ],
  }),
  event('first_year_teacher', '职业发展', {
    stages: ['earlyCareer'], maxAge: 38, weight: 5,
    conditions: { flagsAll: ['sports_teacher'] }, title: '新教师的第一学期', description: '备课、家长沟通、校园事务同时涌来，课堂控制并不只靠热情。',
    options: [
      choice('seek_mentor_teacher', '向资深老师请教并复盘', '你学会了管理一节课和一群孩子。', stat({ knowledge: 3, social: 3, reputation: 2, stress: 2 }, { workExperience: 2, flagsAdd: ['teacher_mentor'] })),
      choice('try_new_methods', '大胆引入游戏化训练', '学生很喜欢，学校需要你证明安全和效果。', stat({ courage: 3, basketball: 1, reputation: 1, stress: 2 })),
      choice('copy_old_lessons', '照着旧教案做', '稳定但缺少个人风格。', stat({ discipline: 1, stress: -1, reputation: -1 })),
    ],
  }),
  event('teacher_research_group', '职业发展', {
    stages: ['career'], minAge: 27, maxAge: 55, weight: 4,
    conditions: { flagsAll: ['sports_teacher'] }, title: '教研组的负责人机会', description: '学校希望有人牵头做体育课程改革和赛事组织。',
    options: [
      choice('lead_group', '承担教研和赛事组织', '你从上好一节课，走向带动一群老师。', stat({ knowledge: 3, social: 3, reputation: 4, stress: 3 }, { income: 1000, flagsAdd: ['teacher_leader'], setCareer: 'sports_teaching_lead' })),
      choice('co_lead', '和同事共同负责', '压力被分担，成果也需要共享。', stat({ social: 3, reputation: 2, stress: 1 })),
      choice('stay_classroom', '继续专注带好自己的班', '你选择了更纯粹的教学快乐。', stat({ happiness: 2, basketball: 1 })),
    ],
  }),
  event('hotel_shift_lead', '职业发展', {
    stages: ['earlyCareer', 'career'], maxAge: 48, weight: 5,
    conditions: { flagsAny: ['hotel_employee', 'overseas_hotel_worker'] }, title: '酒店领班竞聘', description: '你的服务评价不错，主管问你是否愿意负责一个班组。',
    options: [
      choice('compete_lead', '接受竞聘并学习排班管理', '你开始面对团队的节奏和客人的期待。', stat({ social: 3, knowledge: 2, reputation: 3, stress: 3 }, { income: 1600, workExperience: 2, flagsAdd: ['hotel_shift_lead'], setCareer: 'hotel_shift_lead' })),
      choice('wait_for_ready', '再积累一年经验', '你更稳了，也把机会让给了别人。', stat({ knowledge: 2, stress: -1 })),
      choice('leave_hotel', '转向别的行业', '你离开熟悉路径，换取新的可能。', stat({ courage: 3, stress: 2 }, { flagsAdd: ['hotel_career_pause'] })),
    ],
  }),
  event('hotel_manager_transfer', '职业发展', {
    stages: ['career'], minAge: 28, maxAge: 55, weight: 4,
    conditions: { flagsAny: ['hotel_shift_lead', 'hotel_management_candidate'] }, title: '外地酒店的管理岗位', description: '集团希望你去另一座城市做主管，收入上升，生活需要重建。',
    options: [
      choice('take_transfer', '接受调动并带队', '你获得晋升，也要重新建立家庭和社交平衡。', stat({ courage: 3, social: 2, reputation: 3, stress: 4 }, { income: 3500, workExperience: 3, flagsAdd: ['hotel_manager'], setCareer: 'hotel_manager' })),
      choice('negotiate_terms', '谈清住房和发展条件', '你用专业态度争取了更好的起点。', stat({ courage: 2, knowledge: 2, reputation: 1 }, { income: 2500, flagsAdd: ['hotel_manager'] })),
      choice('stay_local', '留在当前城市', '稳定感更强，晋升节奏慢下来。', stat({ happiness: 1, stress: -1 })),
    ],
  }),
  event('sales_quota_promotion', '职业发展', {
    stages: ['earlyCareer', 'career'], maxAge: 55, weight: 5,
    conditions: { flagsAny: ['sales_role', 'sales_trial'] }, title: '销售季度目标', description: '只要拿下关键客户，你就有机会成为小组负责人。',
    options: [
      choice('build_pipeline', '持续拜访并建立客户管道', '你没有押宝单个大客户，业绩变得更稳。', stat({ social: 4, discipline: 3, reputation: 3, stress: 3 }, { income: 2500, flagsAdd: ['sales_lead'], setCareer: 'sales_team_lead' })),
      choice('push_one_deal', '把全部精力押在大单上', '成功会很耀眼，失败也会让季度归零。', stat({ courage: 3, stress: 4 }, { outcomes: [
        { weight: 42, result: '大单签下，你得到晋升。', effects: stat({ reputation: 4 }, { income: 4000, flagsAdd: ['sales_lead'] }) },
        { weight: 58, result: '客户临时变卦，目标没有完成。', effects: stat({ courage: 1, stress: 4, happiness: -2 }) },
      ] })),
      choice('stay_individual', '不争管理岗，继续做个人业绩', '收入可观，管理责任不再增加。', stat({ happiness: 1, stress: -1 }, { income: 1000 })),
    ],
  }),
  event('career_skill_gap', '职业发展', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 65, weight: 5,
    title: '你发现职业瓶颈', description: '新工具和更年轻的人正在改变行业，你感到自己需要补一项硬能力。',
    options: [
      choice('learn_ai_tools', '学习AI和自动化工具并做项目', '你没有把工具当魔法，而是把它接进真实工作流。', stat({ knowledge: 5, discipline: 3, reputation: 2 }, { money: -1600, flagsAdd: ['ai_operator'] })),
      choice('learn_management', '学习项目和团队管理', '你从个人高手向组织贡献者靠近。', stat({ knowledge: 4, social: 2, reputation: 2 }, { money: -2200, flagsAdd: ['management_skills'] })),
      choice('ignore_gap', '相信老经验足够用', '短期很省力，长期的选择空间开始缩小。', stat({ knowledge: -2, reputation: -1 })),
    ],
  }),
  event('promotion_or_balance', '职业发展', {
    stages: ['career', 'midlife'], minAge: 30, maxAge: 58, weight: 4,
    conditions: { workExperienceMin: 5 }, title: '晋升与生活的取舍', description: '更高职位意味着更高收入和更多出差，也会挤压家庭与个人时间。',
    options: [
      choice('take_promotion', '接受晋升', '你走上更大的舞台，日程表也几乎没有空白。', stat({ reputation: 4, courage: 2, stress: 5, happiness: -1 }, { income: 5000, workExperience: 2, flagsAdd: ['senior_role'] })),
      choice('negotiate_balance', '争取弹性和明确边界', '你没有放弃成长，也让生活仍有呼吸。', stat({ courage: 3, social: 2, stress: 2 }, { income: 2500, flagsAdd: ['balanced_promotion'] })),
      choice('decline_promotion', '拒绝，保留更多生活时间', '你失去一段上升速度，得到一段可感知的生活。', stat({ happiness: 3, health: 2, reputation: -1 })),
    ],
  }),
  event('career_change_midlife', '职业发展', {
    stages: ['career', 'midlife'], minAge: 32, maxAge: 60, weight: 3, cooldown: 18,
    title: '中途换赛道的念头', description: '现在的职业并不差，但你越来越想尝试真正有热情的方向。',
    options: [
      choice('test_before_quit', '先做副业试点和访谈', '你没有把热情和冲动混为一谈。', stat({ knowledge: 4, courage: 2, discipline: 3 }, { money: -2000, flagsAdd: ['career_change_validated'] })),
      choice('quit_and_jump', '裸辞后全力转型', '自由感很强，现金流和身份焦虑也随之而来。', stat({ courage: 4, stress: 5 }, { income: -3000, flagsAdd: ['career_break'] })),
      choice('stay_and_adjust', '不换行业，调整岗位和边界', '你从已有积累中挖出新的空间。', stat({ knowledge: 2, happiness: 1, stress: -1 })),
    ],
  }),
  event('industry_conference', '职业发展', {
    stages: ['earlyCareer', 'career', 'midlife'], maxAge: 68, weight: 4,
    conditions: { workExperienceMin: 2 }, title: '行业大会的门票', description: '一场行业活动有很多陌生人和新信息，门票和差旅都要成本。',
    options: [
      choice('network_with_goal', '带着目标参会并主动交流', '你不再只是听讲，而是带回实际联系人和机会。', stat({ social: 4, knowledge: 3, courage: 2, reputation: 1 }, { money: -1800, flagsAdd: ['industry_network'] })),
      choice('attend_sessions', '只听自己感兴趣的分享', '知识增加了，关系没有太多变化。', stat({ knowledge: 4 }, { money: -1000 })),
      choice('skip_conference', '觉得贵，先不去', '你省下钱，也少了一次跳出日常的机会。', stat({ discipline: 1 })),
    ],
  }),
  event('teach_next_generation', '职业发展', {
    stages: ['midlife', 'laterLife'], minAge: 42, maxAge: 78, weight: 3,
    conditions: { workExperienceMin: 10 }, title: '有人想向你请教', description: '一个刚起步的年轻人希望你给他一点职业建议。',
    options: [
      choice('mentor_youngster', '定期分享经验，也听他的新想法', '你把经验传出去，也被新的视角更新。', stat({ social: 3, reputation: 3, happiness: 3, knowledge: 1 }, { flagsAdd: ['mentor_to_others'] })),
      choice('one_time_advice', '认真给一次建议', '你帮助了对方，也不承诺超出能力的陪伴。', stat({ reputation: 1, happiness: 1 })),
      choice('decline_mentoring', '觉得太忙，婉拒', '你保留了精力，少了一段可能有意义的连接。', stat({ stress: -1 })),
    ],
  }),
  event('retirement_transition', '职业发展', {
    stages: ['laterLife'], minAge: 55, maxAge: 80, weight: 3, title: '关于退休后的生活', description: '工作不再定义你的每一天，你需要重新安排时间、关系和意义。',
    options: [
      choice('purposeful_retire', '保留运动、旅行和志愿服务', '你从职业身份里走出来，生活依然有热爱。', stat({ happiness: 5, health: 3, social: 3 }, { flagsAdd: ['active_retirement'] })),
      choice('part_time_mentor', '做少量顾问或带课', '你保持收入和连接，也终于有更多自己时间。', stat({ happiness: 3, reputation: 2, stress: 1 }, { income: 1800, flagsAdd: ['retirement_mentor'] })),
      choice('withdraw_completely', '把自己关在家里休息', '最初很轻松，长期的孤独感可能慢慢出现。', stat({ stress: -1, happiness: -2, social: -3 })),
    ],
  }),
];

const SURPRISE_EVENTS = [
  event('sudden_phone_water_damage', '突发事件', {
    surprise: true, weight: 8, cooldown: 15,
    title: '手机突然进水',
    description: '一阵急雨把你困在路边，口袋里的手机亮了一下就黑了。联系人、支付和明天的安排都卡在里面。',
    options: [
      choice('repair_phone_now', '马上去维修，保住数据', '你花了一笔钱，但没有让生活突然失联。', stat({ knowledge: 1, stress: 1 }, { money: -680, flagsAdd: ['phone_repaired'] })),
      choice('borrow_backup_phone', '先借备用机，把重要事情撑过去', '你把麻烦拆成了今天和明天两部分。', stat({ social: 2, discipline: 1, stress: 2 }, { money: -160 })),
      choice('go_without_phone', '先不用手机，等回家再说', '这一天很不方便，却意外安静了一会儿。', stat({ happiness: 1, stress: 3, courage: 1 })),
    ],
  }),
  event('sudden_family_call', '突发事件', {
    surprise: true, weight: 8, cooldown: 14,
    title: '深夜的家人来电',
    description: '电话那头的语气和平时不太一样。家里有件小事需要你一起拿主意，而你明天也排满了安排。',
    options: [
      choice('call_back_calmly', '耐心问清情况，一起把事情列出来', '你没有立刻解决所有问题，但让家人知道你在。', stat({ social: 2, happiness: 2, stress: 1 }, { relationships: { family: 4 } })),
      choice('go_home_overnight', '连夜赶回去，当面处理', '路程很累，家人的不安却落了下来。', stat({ courage: 2, stress: 3, happiness: 2 }, { money: -240, relationships: { family: 6 } })),
      choice('delay_until_morning', '先说明情况，约好清晨再处理', '你守住了工作节奏，也留下了一点愧疚。', stat({ discipline: 1, stress: 2, happiness: -1 }, { relationships: { family: -1 } })),
    ],
  }),
  event('sudden_lost_wallet', '突发事件', {
    surprise: true, weight: 7, cooldown: 18,
    title: '路边的钱包',
    description: '你在便利店门口捡到一个钱包，里面有证件、银行卡和一叠现金。失主显然刚走不远。',
    options: [
      choice('return_wallet_directly', '等在原地并联系失主', '失主匆忙赶回来时，反复向你道谢。', stat({ reputation: 3, happiness: 2, courage: 1 }, { money: 200, flagsAdd: ['trusted_stranger'] })),
      choice('give_to_store', '交给店员登记，留下联系方式', '你选择了稳妥的方式，也没有让自己卷入麻烦。', stat({ discipline: 2, reputation: 1 })),
      choice('take_cash_then_return', '留下现金，再把钱包交出去', '短期的侥幸感很快变成不舒服的沉默。', stat({ happiness: -2, stress: 3 }, { money: 800, flagsAdd: ['moral_debt'] })),
    ],
  }),
  event('sudden_storm_warning', '突发事件', {
    surprise: true, weight: 9, cooldown: 12,
    title: '暴雨预警提前到来',
    description: '天气预报突然变成红色预警。你约好的训练、面试和晚上的聚会都可能被打乱。',
    options: [
      choice('rearrange_everything', '立刻改期并提醒所有人', '你把混乱留在了天气里，没有带进关系。', stat({ discipline: 3, social: 2, stress: 1 })),
      choice('go_out_anyway', '照原计划出门，赌天气会好转', '你没有放弃安排，但一路都在和雨抢时间。', stat({ courage: 2, stress: 3 }, { outcomes: [
        { weight: 58, result: '雨势短暂变小，你勉强完成了原计划。', effects: stat({ reputation: 1 }) },
        { weight: 42, result: '路上积水耽误了行程，你只能狼狈地取消。', effects: stat({ health: -1, stress: 3, reputation: -1 }) },
      ] })),
      choice('stay_and_reset', '留在家里，做一次生活整理', '计划被打断，反而给了你重新安排生活的空档。', stat({ happiness: 2, knowledge: 1, stress: -2 })),
    ],
  }),
  event('sudden_trial_invitation', '突发事件', {
    surprise: true, weight: 7, cooldown: 16,
    title: '临时试训通知',
    description: '一个朋友说附近球队临时缺人，半小时后就要开始试训。你状态一般，也没有准备装备。',
    options: [
      choice('rush_to_tryout', '马上赶去，先争取上场', '你把准备不足变成了现场应变。', stat({ basketball: 2, courage: 3, stress: 2 }, { basketballGames: 1, flagsAdd: ['last_minute_tryout'] })),
      choice('ask_for_next_date', '说明情况，争取下一次正式机会', '你没有硬冲，但留下了可靠的印象。', stat({ social: 2, discipline: 1 }, { flagsAdd: ['tryout_contact'] })),
      choice('keep_current_plan', '按原计划完成手头的事', '你没有追逐每一个机会，却少了一次意外的可能。', stat({ discipline: 2, happiness: -1 })),
    ],
  }),
  event('sudden_shift_swap', '突发事件', {
    surprise: true, weight: 8, cooldown: 14,
    title: '同事临时求你换班',
    description: '同事家里突然有事，问你能不能替他顶一个班。答应会压缩你的私人时间，拒绝也完全合理。',
    options: [
      choice('cover_shift', '答应顶班，把自己的安排后移', '你多承担了一次责任，也收获了信任。', stat({ reputation: 2, discipline: 2, stress: 3 }, { money: 420, workExperience: 1, flagsAdd: ['reliable_colleague'] })),
      choice('partial_help', '帮忙联系替班，并协助交接', '你没有把所有事扛下，却给出了可执行的帮助。', stat({ social: 3, knowledge: 1, stress: 1 })),
      choice('protect_boundary', '坦诚说明自己无法调班', '你守住了自己的计划，也提醒自己边界同样重要。', stat({ courage: 2, stress: -1 })),
    ],
  }),
  event('sudden_refund_notice', '突发事件', {
    surprise: true, weight: 7, cooldown: 17,
    title: '一笔意外退款',
    description: '很久以前的一笔押金突然退回到账户。金额不大，却足够让你立刻想起几种花法。',
    options: [
      choice('save_refund', '直接存起来，给未来留缓冲', '你没有把意外收入当成必须立刻花掉的奖励。', stat({ discipline: 2, stress: -1 }, { money: 360 })),
      choice('buy_course', '拿去报名一门想学的课程', '这笔钱没有停在账户里，而是变成了新的能力。', stat({ knowledge: 3, happiness: 1 }, { money: 80, flagsAdd: ['surprise_course'] })),
      choice('share_with_friends', '约朋友吃饭，庆祝一下', '你把小小的惊喜分享出去，关系也热了一点。', stat({ happiness: 3, social: 2 }, { money: -120, relationships: { friends: 2 } })),
    ],
  }),
  event('sudden_neighbor_help', '突发事件', {
    surprise: true, weight: 6, cooldown: 18,
    title: '电梯口的求助',
    description: '一位邻居抱着很多东西，身边的小孩忽然发烧。她有些慌乱，问你能不能搭把手。',
    options: [
      choice('help_to_clinic', '帮忙叫车并陪到附近诊所', '你付出了一晚时间，却让一个陌生人安心下来。', stat({ courage: 2, happiness: 2, reputation: 2 }, { money: -90, flagsAdd: ['community_trust'] })),
      choice('call_support', '帮忙联系物业和家属', '你没有越界，却把能找到的人很快都找到了。', stat({ social: 2, discipline: 1 })),
      choice('rush_to_own_plan', '礼貌说明有急事，匆匆离开', '你没有做错什么，但那句求助在路上停留了很久。', stat({ stress: 1, happiness: -1 })),
    ],
  }),
  event('sudden_video_share', '突发事件', {
    surprise: true, weight: 6, cooldown: 20,
    title: '一段视频被意外转发',
    description: '朋友随手拍下的训练片段被人转发，评论里开始有人问你是谁，也有人挑刺。',
    options: [
      choice('respond_with_work', '不争论，补拍一条更完整的内容', '你把短暂关注变成了认真表达。', stat({ reputation: 3, courage: 2, discipline: 2 }, { followers: 120, flagsAdd: ['training_video_shared'] })),
      choice('thank_and_observe', '简单致谢，先观察反馈', '你没有急着放大自己，也没有错过这次被看见。', stat({ social: 2, reputation: 1 }, { followers: 45 })),
      choice('delete_and_hide', '请朋友删掉，回到安静里', '你守住了私人空间，机会也随之离开。', stat({ happiness: 1, reputation: -1 })),
    ],
  }),
  event('sudden_ticket_deadline', '突发事件', {
    surprise: true, weight: 7, cooldown: 16,
    title: '一张即将过期的车票',
    description: '你翻到一张快过期的车票兑换券。目的地不远，却足够让你离开熟悉的周末。',
    options: [
      choice('take_short_trip', '立刻订行程，去陌生地方过两天', '短暂离开让你重新看见自己的生活。', stat({ happiness: 3, courage: 2, stress: -2 }, { money: -260, travelCountries: 1, flagsAdd: ['short_trip_taken'] })),
      choice('gift_ticket', '把机会送给更需要出行的朋友', '你没有出发，却收到了很真诚的感谢。', stat({ social: 3, happiness: 2 }, { relationships: { friends: 3 } })),
      choice('let_it_expire', '觉得麻烦，任它过期', '你省下了折腾，也错过了一次很轻的出发。', stat({ discipline: 1, happiness: -1 })),
    ],
  }),
];



const EVENTS = [
  ...UNIVERSITY_EVENTS,
  ...BASKETBALL_EVENTS,
  ...WORK_EVENTS,
  ...OVERSEAS_EVENTS,
  ...RELATIONSHIP_EVENTS,
  ...HEALTH_FINANCE_EVENTS,
  ...ENTREPRENEURSHIP_EVENTS,
  ...MEDIA_EVENTS,
  ...INVESTMENT_EVENTS,
  ...CAREER_EVENTS,
  ...SURPRISE_EVENTS,
];

if (typeof window !== 'undefined') {
  window.EVENTS = EVENTS;
}
