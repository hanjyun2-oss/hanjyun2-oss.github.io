(function () {
  var screen = document.getElementById("phone-screen");
  if (!screen) return;
  var synchronized = new URLSearchParams(window.location.search).get("sync") === "1" && window.parent !== window;
  var lastRunId = 0;
  var lastMonitorRunId = 0;
  var lastMonitorSeq = -1;
  var creditConfirmationRunId = 0;
  var phoneReplyTimers = [];
  var phoneReplyRunId = 0;
  var phoneReplyStage = -1;
  var phoneReplyArmed = false;
  var phoneReplyStarted = false;
  var phoneReplyCompletionQueued = false;
  var phoneReplyLastQueued = "";
  var phoneReplyResultQueued = false;
  var creditConfirmationTimer = null;
  var creditQueryTimer = null;
  var creditResultReadyAt = 0;
  var creditAdvanceRequested = false;
  var disbursementAnimationRunId = 0;

  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "./credit-app.css?v=credit-approval-v11";
  document.head.appendChild(css);

  var enterprises = [
    { id: "lanheng", name: "珠海澜衡精密装备有限公司", industry: "精密装备制造", source: "园区推荐", demand: "1,200万元", status: "主体待核验", completeness: 68, due: "未发起" },
    { id: "jiantuo", name: "华南建拓建筑工程有限公司", industry: "建筑工程", source: "存量客户", demand: "900万元", status: "审慎关注", completeness: 76, due: "待补材料" },
    { id: "jinsui", name: "珠海智造材料科技有限公司", industry: "新材料", source: "产业链推荐", demand: "800万元", status: "主体待核验", completeness: 62, due: "未发起" },
    { id: "liansheng", name: "湾区联盛商贸有限公司", industry: "商贸流通", source: "客户经理推荐", demand: "500万元", status: "资料待补", completeness: 54, due: "未发起" },
    { id: "hongtu", name: "鸿图新材料有限公司", industry: "新材料", source: "产业链名单", demand: "1,500万元", status: "资质待核验", completeness: 71, due: "未发起" },
    { id: "shengyuan", name: "华南盛源能源有限公司", industry: "火电", source: "行业名单", demand: "2,000万元", status: "审慎准入", completeness: 82, due: "待补材料" },
    { id: "xinda", name: "鑫达融资租赁有限公司", industry: "融资租赁", source: "外部推荐", demand: "3,000万元", status: "不纳入普惠范围", completeness: 35, due: "不适用" }
  ];

  var credentials = [
    ["企业营业执照及主体备案", "✓", "已核验", "粤珠市监 2024-0186", "珠海市市场监督管理局", "2027-12-31"],
    ["生产基地及经营场所", "✓", "已核验", "园区租赁及权属材料", "澜衡企业档案", "2027-06-30"],
    ["市级制造业骨干企业", "✓", "已核验", "珠工信〔2024〕12号", "珠海市工信局", "2026-10-18"],
    ["质量管理体系认证", "✓", "已核验", "ISO9001-4404-0921", "第三方认证机构", "2026-08-15"],
    ["高新技术企业认定", "✓", "待核验", "待补证书扫描件", "广东省科技厅", "待确认"],
    ["核心产品质量认证", "✓", "待核验", "待补最新批次检测报告", "第三方检测机构", "待确认"],
    ["专精特新中小企业", "×", "未发现", "—", "—", "—"],
    ["科技型中小企业", "✓", "已核验", "科小 2025-0731", "广东省科技厅", "2026-12-31"],
    ["雏鹰企业", "×", "未发现", "—", "—", "—"],
    ["瞪羚企业", "×", "未发现", "—", "—", "—"],
    ["专精特新“小巨人”", "×", "未发现", "—", "—", "—"],
    ["单项冠军", "×", "未发现", "—", "—", "—"]
  ];

  var dueTaskSeed = [
    ["企业车辆及停车情况", "观察车辆、停车位及运输车辆使用情况，判断经营活动是否与申报规模匹配。", "固定"],
    ["员工数量及实际在岗情况", "核对花名册、社保及现场在岗人数，记录季节性用工变化。", "固定"],
    ["门卫及来访登记", "查看门卫、访客登记和经营场所使用情况，留存现场照片。", "固定"],
    ["生产车间", "查看车间、仓储和生产线运转情况，记录实际生产状态。", "固定"],
    ["设备数量与实际使用状态", "核对加工中心、检测设备台账和现场使用状态。", "固定"],
    ["会计财务报表", "上传最新财务报表，核对收入、成本和负债结构。", "固定"],
    ["开票收入、纳税额及回款凭证", "核验开票、纳税和主要回款凭证，优先使用可验证经营数据。", "固定"],
    ["生产线与订单覆盖", "核验主要生产线产能、在手订单和交付排期是否匹配。", "行业特别项"],
    ["核心客户与回款周期", "核验核心客户合同、回款凭证及应收账款账龄。", "行业特别项"]
  ];

  var products = [
    { id: "working", name: "精密装备经营周转贷", label: "推荐", score: "92%", desc: "适配订单备货与生产周转，支持按季付息、分期还本。", reason: "生产基地、产线和核心客户回款完成核验，订单周期与产品期限匹配。", limit: "800—1,200万元", mismatch: "无明显不匹配项，需关注核心客户集中度。" },
    { id: "guarantee", name: "制造业担保增信贷", label: "备选", score: "78%", desc: "适合有政策性担保增信需求的装备制造企业。", reason: "可使用质量体系、科技型企业和园区主体资质作为增信参考。", limit: "600—900万元", mismatch: "需要补充担保机构准入和反担保材料。" },
    { id: "equipment", name: "设备更新抵押贷", label: "匹配度低", score: "52%", desc: "以生产设备抵押为主要风险缓释方式。", reason: "设备权属和可抵押价值仍需补充评估。", limit: "400—700万元", mismatch: "不适合覆盖本次 1,200 万元经营性融资需求。" }
  ];

  var signals = [
    ["开票收入连续两期下降", "经营与财务", "近两期开票收入较上期下降 12%，需结合季节性解释。", "发票数据", "2026-09-18"],
    ["他行新增融资记录", "征信跟踪", "企业征信显示新增一笔 300 万元他行融资。", "企业征信", "2026-09-19"],
    ["核心客户回款周期延长", "制造业经营专项", "核心客户平均回款周期由 45 天延长至 68 天。", "回款凭证及访谈", "2026-09-20"],
    ["当地口碑出现负面信息", "当地口碑 / 舆情", "地方公开信息及走访记录出现待人工核实的负面反馈。", "公开信息及走访记录", "2026-09-20"]
  ];

  var state = {
    page: "home",
    search: "",
    industry: "全部行业",
    status: "全部状态",
    selectedEnterprise: null,
    demoStage: -1,
    demoRunning: false,
    demoMessage: "欢迎使用南方资产智能信贷助手",
    demoTimer: null,
    demoInterval: null,
    analysis: { phase: "idle", thoughtIndex: 0, question: "", thoughts: [], reply: "", title: "企业画像深读", stage: -1 },
    profileTab: "profile",
    expandedCredential: null,
    expandedRisk: null,
    due: {
      created: false,
      tab: "tasks",
      detailId: null,
      tasks: dueTaskSeed.map(function (item, index) { return { id: index, name: item[0], description: item[1], kind: item[2], status: "待核查", uploaded: false, result: "", note: "", resolved: false }; }),
      dataWritten: false,
      demoCompleted: false
    },
    product: { selected: "working", amount: 1000, expanded: null },
    disbursement: "processing",
    disbursementProgress: 0,
    monitoring: {
      expandedSignal: null,
      checked: {},
      judgement: {},
      conclusion: "风险预警",
      monitorRounds: [],
      monitorAlertShown: false,
      monitorManualReviewRequested: false,
      monitorManualPhase: 'idle',
      monitorSeq: -1,
      monitorClockTs: 0,
      monitorRoundStartedAt: 0,
      monitorRoundStatus: 'idle',
      monitoringLayer: -1
    },
    restructuring: { condition: { will: "较强", basis: "有变化", cash: "部分覆盖", farm: "持续", scale: "稳定" }, plan: "重组 + 分期压降", draftSaved: false, submitted: false, firstPaydown: 100, term: 6 },
    modal: null,
    toast: ""
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]; });
  }

  function nowTime() {
    return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  }

  function statusBar() {
    return '<div class="credit-status-bar"><span class="credit-time">' + nowTime() + '</span><span class="credit-status-right"><span>5G</span><span>◒</span><span class="credit-battery"></span></span></div>';
  }

  var keySteps = [
    ["企业评估", "画像"],
    ["征信核验", "核验"],
    ["评级准入", "准入"],
    ["现场尽调", "任务"],
    ["产品匹配", "额度"],
    ["放款确认", "到账"],
    ["贷后监控", "预警"],
    ["风险处置", "重组"]
  ];

  // 这组文案与右侧天工的首轮问答共用同一业务口径：先呈现思考，再生成回答，最后进入画像结果。
  var firstQa = {
    question: "帮我对珠海澜衡精密装备有限公司进行企业画像。",
    thoughts: [
    '锁定企业主体：匹配企业名称、主体备案与客户档案，建立统一企业标识',
    '接入内部数据：从“总行通知”加载普惠小微政策更新、重点行业准入口径、本季度风险提示',
    '接入内部数据：从“信贷管理制度”读取授信调查与审查流程、额度测算及审批权限、贷后检查与风险分类要求',
    '接入内部数据：从“企业信息查询小助手”读取企业主体与关联关系、存量融资与还款表现、待补充核验事项',
    '汇聚专家经验：召回“内部参考”中的同类客户历史授信案例、行业风险与还款表现、客户经理历史跟进记录',
    '检索外部数据：从企查查更新工商登记与股东信息、司法风险与失信记录、企业变更与对外投资',
    '更新外部动态：检索社媒经营动态、客户及供应链舆情、公开异常线索，并读取恒生研究报告的行业景气度与竞争格局',
    '执行数据关联：统一主体后合并内部与外部证据，对照收入、纳税、融资、订单和回款线索交叉验证',
    '形成企业画像：调用制造业专家经验，提炼经营结论、待核验事项、风险关注与下一步尽调动作'
    ],
    answer: "## 一、综合判断\n\n本轮画像按“内部接入—外部检索—专家经验—交叉验证—画像形成”动态生成。系统已锁定珠海澜衡精密装备有限公司的统一企业主体，并将内部制度、客户经营记录、外部公开信息和行业研究材料汇聚到同一证据链。当前结论为画像初步判断，不代表授信审批通过。\n\n## 二、数据接入与检索：先接入内部，再更新外部\n\n**内部数据接入**：一是从“总行通知”读取普惠小微政策更新、重点行业准入口径和本季度风险提示，用于确定本次审查边界；二是从“信贷管理制度”读取授信调查与审查流程、额度测算及审批权限、贷后检查与风险分类要求，用于约束判断口径；三是从“企业信息查询小助手”读取企业主体与关联关系、存量融资与还款表现、待补充核验事项，用于建立客户基础档案。\n\n**外部数据检索更新**：企查查返回工商登记与股东信息、司法风险与失信记录、企业变更与对外投资；社媒检索企业经营动态、客户及供应链舆情和公开异常线索；恒生研究报告补充行业景气度、周期判断与细分竞争格局。外部结果按更新时间写入证据链，和内部记录分开标注来源。\n\n**专家经验汇聚**：系统从“内部参考”召回同类客户历史授信案例、行业风险与还款表现、客户经理历史跟进记录，再结合制造业审查经验，将产线、订单覆盖、客户集中度和回款周期设为重点核验维度。专家经验只用于形成核验假设，不替代原始数据。\n\n## 三、主体与行业：有实体、有产线，仍需现场交叉验证\n\n内部主体档案、外部工商登记和行业准入口径已形成一致指向：企业位于珠海高新区，经营场所约 8,600 平方米，登记生产线 12 条，员工 126 人，主营精密装备及核心零部件。现场仍需核对设备实际运转、在岗人数和生产排期，确认经营规模与申报资料一致。\n\n## 四、经营与财务：多源数据基本匹配，重点看真实回款\n\n画像汇聚后的经营数据为：营业收入约 **2,300 万元**、开票收入约 **1,900 万元**、纳税额约 **286 万元**。其中开票、纳税数据可作为经营真实性的优先核验线索；还需结合会计报表、订单合同和回款凭证核查收入确认、应收账款与资金周转。企业现有银行融资 2,000 万元，本次经营性融资需求 1,200 万元，后续应明确资金用途、订单交付周期和存量融资还款安排。\n\n## 五、资质与风险：区分已核验、外部线索与待补材料\n\n营业执照、生产基地、市级制造业骨干企业、ISO9001 质量体系及科技型中小企业资料已核验。企查查、社媒和行业报告目前主要提供外部线索，不能直接替代证照或现场核验。高新技术企业认定、核心产品质量认证仍待补证书或最新检测报告。综合内部历史表现、外部检索结果和专家经验，当前重点关注前两大客户收入占比约 51%、订单交付周期波动、主要客户回款周期延长三项事项；当前未列示重大风险，但并不等于不存在风险。\n\n## 六、画像形成与下一步建议\n\n系统已将主体、行业、经营财务、资质和风险证据汇聚为企业画像，并保留每项结论的来源、更新时间和核验状态。建议创建客户档案，发起 7 项固定核查与 2 项制造业特别项尽调，把生产线与订单覆盖、核心客户与回款周期作为重点，逐项回传现场照片、财务凭证及待补资质材料。完成核验并回写画像后，再进入产品匹配与额度测算。\n\n"
  };

  function keyStepIndex() {
    if (state.page === "home") return 0;
    if (state.demoRunning) return state.demoStage;
    if (state.analysis.stage === 4) return 4;
    if (state.page === "tasks" || state.page === "profile") return 0;
    if (state.page === "due") return state.due.dataWritten ? 3 : 2;
    if (state.page === "product" || state.page === "product-detail") return 4;
    if (state.page === "disbursement") return 5;
    if (state.page === "monitoring") return 6;
    return 7;
  }

  function stepRail() {
    var active = keyStepIndex();
    var items = keySteps.map(function (step, index) {
      var className = index < active ? "is-done" : (index === active ? "is-active" : "");
      return '<div class="credit-step ' + className + '"><span class="credit-step-dot">' + (index < active ? "" : (index + 1)) + '</span><span>' + step[0] + '<small>' + step[1] + '</small></span></div>';
    }).join('<span class="credit-step-line"></span>');
    return '<div class="credit-step-rail">' + items + '</div>';
  }

  function header(title, subtitle, back, action) {
    return '<header class="credit-header"><div class="credit-header-top">' + (back ? '<button class="credit-back" data-action="back" aria-label="返回">‹</button>' : '') + '<div class="credit-head-title"><h1>' + escapeHtml(title) + '</h1>' + (subtitle ? '<p>' + escapeHtml(subtitle) + '</p>' : '') + '</div>' + (action || '') + '</div></header>';
  }

  function footer(button, secondary) {
    if (!button && !secondary) return "";
    return '<footer class="credit-footer">' + (secondary ? '<button class="credit-secondary" data-action="' + secondary.action + '">' + escapeHtml(secondary.label) + '</button>' : '') + (button ? '<button class="credit-primary" data-action="' + button.action + '"' + (button.disabled ? ' disabled' : '') + '>' + escapeHtml(button.label) + '</button>' : '') + '</footer>';
  }

  function page(title, subtitle, body, button, secondary, back, action) {
    return '<div class="credit-page">' + header(title, subtitle, back, action) + '<main class="credit-content">' + body + '</main>' + footer(button, secondary) + '</div>';
  }

  function stat(label, value) {
    return '<div class="credit-stat"><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + '</span></div>';
  }

  function chip(text, kind) { return '<span class="credit-chip ' + (kind || "") + '">' + escapeHtml(text) + '</span>'; }

  function loadingRing() {
    // 圆环几何形状保持静止，只移动描边，避免手机缩放下旋转边框的像素颤动。
    return '<svg class="credit-loading-ring" viewBox="0 0 40 40" aria-hidden="true"><circle class="credit-loading-track" cx="20" cy="20" r="17"></circle><circle class="credit-loading-arc" cx="20" cy="20" r="17" pathLength="100"></circle></svg>';
  }

  function formatAnswer(text) {
    return escapeHtml(window.BankDemoI18n ? window.BankDemoI18n.reply(text, state.analysis.stage) : text).split(/\n\n/).map(function (part) {
      if (/^#{1,3}\s/.test(part)) return '<h3>' + part.replace(/^#{1,3}\s+/, '') + '</h3>';
      return '<p>' + part.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') + '</p>';
    }).join('');
  }

  function questionComposer() {
    var filling = state.analysis.phase === "input";
    return '<section class="credit-agent-prompt' + (filling ? ' is-filled' : '') + '"><span class="credit-agent-plus">＋</span><textarea aria-label="输入你的业务问题" placeholder="输入你的业务问题" rows="3"' + (filling ? ' readonly' : '') + '>' + escapeHtml(filling ? (window.BankDemoI18n ? window.BankDemoI18n.translate(state.analysis.question) : state.analysis.question) : '') + '</textarea><button class="credit-agent-send" data-action="start-credit-analysis" aria-label="发送问题"' + (filling ? ' disabled' : '') + '>↑</button></section>';
  }

  function buildHome() {
    var body = '<section class="credit-agent-hero"><p class="credit-agent-eyebrow">智能信贷助手</p><h2>你好，我可以帮你完成企业信贷分析</h2><p class="credit-agent-copy">从企业画像、现场尽调到产品匹配，把分散资料整理成可追溯的授信判断。</p></section>'
      + '<div class="credit-agent-quick"><span>企业深度画像</span><span>现场尽调</span><span>产品匹配</span></div>'
      + questionComposer()
      + '<div class="credit-agent-tip">' + (state.analysis.phase === "input" ? '问题已填入 · 即将发送' : '演示已准备好：按下 ↓ 开始首轮问答') + '</div>';
    return page("新对话", "智能信贷助手", body, { action: "start-credit-analysis", label: state.analysis.phase === "input" ? "准备发送…" : "开始企业评估", disabled: state.analysis.phase === "input" }, null, false);
  }

  function buildProductMatchConclusion() {
    var evidence = ['B+ 评级通过', '现场尽调 9/9 已核验', '专精特新资质参考额度 1,000 万元', '推荐额度 ≤ 收入约束上限 1,150 万元'];
    var calculation = ['2,300 × 50% = 1,150 万元', '客户需求 1,200 万元，超出 50 万元', '推荐额度 1,000 万元，满足收入约束'];
    var body = '<section class="credit-match-conclusion" aria-label="产品匹配核心结论">'
      + '<div class="credit-match-conclusion-hero"><div><span class="credit-match-recommend-badge">首选推荐</span><small>产品匹配核心结论</small></div><h2>精密装备经营周转贷</h2><p>经营周转场景优先匹配 · 按季付息、分期还本</p><strong>1,000 万元</strong><em>推荐额度</em><b>建议匹配</b><i>匹配度 92%</i></div>'
      + '<div class="credit-match-conclusion-grid"><div><span>期限 / 还款方式</span><strong>12 个月 / 按季付息、分期还本</strong></div><div><span>匹配结果</span><strong>建议匹配</strong></div></div>'
      + '<div class="credit-match-conclusion-columns"><section><h3>关键依据</h3><ul>' + evidence.map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul></section><section><h3>计算摘要</h3><ul>' + calculation.map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul></section></div>'
      + '<div class="credit-match-approval" role="status">1000万以内的放款，已审核通过</div>'
      + '</section>';
    return page('产品匹配核心结论', '天工端已完成产品匹配', body, null, null, true);
  }

  function buildMonitorRoundHtml() {
    var rounds = state.monitoring.monitorRounds || [];
    return rounds.map(function (round) {
      var icon = round.tone === 'done' ? '✅' : (round.tone === 'warning' ? '❌' : '◌');
      return '<div class="credit-monitor-mobile-round ' + (round.tone || '') + '"><span>' + escapeHtml(round.label) + '</span>' + (round.date ? '<small>' + escapeHtml(round.date) + '</small>' : '') + '<strong>' + icon + ' ' + escapeHtml(round.status) + '</strong></div>';
    }).join('');
  }

  function buildCreditMonitor() {
    var roundHtml = buildMonitorRoundHtml();
    var phase = state.monitoring.monitorManualPhase || 'idle';
    if (phase === 'completed') {
      var resultBody = '<section class="credit-monitor-mobile-manual-card is-complete" role="status">'
        + '<div class="credit-monitor-mobile-result-icon">✓</div>'
        + '<strong>人工现场核验已完成</strong>'
        + '<span>' + (state.monitoring.monitorRoundStatus === 'finished' ? '第4轮检查完成' : '现场材料已回传，风险继续跟踪') + '</span>'
        + '<div class="credit-monitor-mobile-manual-summary"><p>经营场所：与档案一致</p><p>设备和生产状态：正常</p><p>收入及回款变化：已取得说明</p><p>现场照片及记录：已回传</p><p>当前结论：暂未发现实质风险，继续跟踪</p></div>'
        + '<div class="credit-monitor-mobile-rounds">' + roundHtml + '</div>'
        + '</section>';
      return page('珠海澜衡精密装备有限公司', '贷后监控', resultBody, null, null, true);
    }
    if (phase === 'pending') {
      var pendingBody = '<section class="credit-monitor-mobile-manual-card" role="status">'
        + loadingRing()
        + '<strong>人工现场核验中</strong>'
        + '<span>现场核查任务已发起，正在等待现场材料回传</span>'
        + '<div class="credit-monitor-mobile-rounds">' + roundHtml + '</div>'
        + '</section>';
      return page('珠海澜衡精密装备有限公司', '贷后监控', pendingBody, null, null, true);
    }
    var body = '<section class="credit-mobile-loading credit-monitor-mobile-loading" role="status">'
      + loadingRing()
      + '<strong>正在持续贷后监控</strong>'
      + '<span>正在扫描还款、融资、回款与外部风险信号</span>'
      + '<div class="credit-monitor-mobile-rounds">' + roundHtml + '</div>'
      + '<p class="credit-monitor-mobile-note">监控任务运行中，等待本轮检查结果</p>'
      + '</section>';
      return page('珠海澜衡精密装备有限公司', '贷后监控', body, null, null, true);
  }

  function buildAnalysis() {
    if (state.analysis.stage === 6) return buildCreditMonitor();
    if (state.analysis.stage === 4 && state.analysis.creditPhase === 'result') return buildProductMatchConclusion();
    if (state.analysis.stage === 2) {
      if (state.analysis.creditPhase !== 'result') {
        return page('评级准入', '征信核验已完成', '<section class="credit-rating-pending" role="status"><div class="credit-query-spinner"></div><strong>正在进行评级准入</strong><p>天工端正在根据命中规则分析客户准入条件。</p></section>', null, null, true);
      }
      return page('评级准入', '征信核验已完成', '<section class="credit-rating-result-card" role="status"><div class="credit-rating-result-head"><strong>评级准入结果</strong><span>达到参考门槛</span></div><div class="credit-rating-score">B+</div><p class="credit-rating-threshold">参考门槛：B级及以上</p><p class="credit-rating-conclusion">符合参考准入条件，可进入下一环节</p></section>', null, null, true);
    }
    if (state.analysis.stage === 1) {
      var authorizationStatus = creditAuthorizationStatus();
      var creditPhase = state.analysis.creditPhase || (state.analysis.phase === 'verified' ? 'result' : 'authorization');
      var authorized = authorizationStatus === '已授权';
      var verificationBody;
      if (creditPhase === 'querying') {
        verificationBody = '<section class="credit-authorization-card credit-querying-card" role="status"><div class="credit-authorization-title"><strong>正在查询征信信息</strong><span>处理中</span></div><div class="credit-query-spinner"></div><p>正在核验企业主体、融资与还款记录，请稍候。</p></section>';
      } else if (creditPhase === 'result') {
        verificationBody = '<section class="credit-authorization-card credit-result-card" role="status"><div class="credit-authorization-title"><strong>征信结果：通过</strong><span>核验完成</span></div><p>企业主体信息一致，近 24 个月未发现重大逾期或失信记录，可进入评级准入。</p><button class="credit-proof-submit" data-action="advance-credit-stage">进入评级准入</button></section>';
      } else {
        verificationBody = '<section class="credit-authorization-card"><div class="credit-authorization-title"><strong>征信查询授权</strong><span class="' + (authorized ? 'is-authorized' : 'is-locked') + '">' + escapeHtml(authorizationStatus) + '</span></div><div class="credit-authorization-row"><span>授权范围</span><b>主体、融资、还款与风险记录</b></div><div class="credit-authorization-row"><span>有效期</span><b>' + escapeHtml(state.analysis.authorizationStart || '2026-09-24') + ' 至 ' + escapeHtml(state.analysis.authorizationEnd || '2027-09-24') + '</b></div><p class="credit-authorization-hint">' + (authorized ? '授权有效，1 秒后自动显示征信核验结果。' : '请先完成授权，当前不能查询或进入下一步。') + '</p><button class="credit-proof-submit" data-action="start-credit-query"' + (authorized ? '' : ' disabled') + '>开始查询</button></section>';
      }
      var archiveCard = '<details class="credit-archive-compact"><summary><strong><i class="credit-archive-success" aria-hidden="true">✓</i> 企业档案建立成功</strong><span>查看档案 ›</span></summary><div class="credit-archive-detail"><strong>珠海澜衡精密装备有限公司</strong><p>行业：精密装备制造<br>客户经理：0118<br>企业主体、经营信息与画像资料已归档。</p></div></details>';
      return page('征信核验', '珠海澜衡精密装备有限公司', (creditPhase === 'authorization' ? archiveCard : '') + verificationBody, null, null, true);
    }

    if (state.analysis.phase === "input") return page("珠海澜衡精密装备有限公司", state.analysis.title, '<div class="credit-callout">已准备业务问题，即将开始分析</div>' + questionComposer(), null, null, true);
    if (state.analysis.phase === "loading") {
      var transitionCopy = {
        0: ["正在生成企业画像", "正在整理企业主体、经营与财务信息"],
        1: ["正在进行征信核验", "正在核验企业信用记录"],
        2: ["正在进行评级准入", "正在评估客户准入条件"],
        3: ["正在生成现场尽调任务", "正在根据企业风险画像配置核查事项"],
        4: ["正在匹配授信产品", "正在评估产品适配度与建议额度"],
        5: ["正在确认授信放款", "正在核对授信条件与放款信息"],
        6: ["正在建立贷后监控", "正在生成还款与风险跟踪任务"],
        7: ["正在生成风险处置方案", "正在汇总风险信号与后续处理建议"]
      };
      var copy = transitionCopy[state.analysis.stage] || ["正在处理业务任务", "正在生成当前阶段结果"];
      return page("珠海澜衡精密装备有限公司", state.analysis.title, '<section class="credit-mobile-loading stage-transition">' + loadingRing() + '<strong>' + copy[0] + '</strong><span>' + copy[1] + '</span></section>', null, null, true);
    }
    var shownThoughts = state.analysis.thoughts;
    var isAnswering = state.analysis.phase !== "thinking";
    var streaming = state.analysis.phase === "streaming";
    var answer = state.analysis.reply ? '<section class="credit-qa-answer"><div class="credit-qa-label">南方资产智能助手 · ' + (streaming ? '正在生成回答' : '已生成回答') + '</div><div class="credit-qa-prose">' + formatAnswer(state.analysis.reply) + '</div>' + (streaming ? '<span class="credit-qa-cursor"></span>' : '') + '</section>' : '';
    var thoughtHtml = shownThoughts.map(function (thought, index) {
      return '<div class="credit-qa-thought"><span class="credit-qa-check">' + (index === shownThoughts.length - 1 && !isAnswering ? '⋯' : '✓') + '</span><span>' + escapeHtml(thought) + '</span></div>';
    }).join("");
    var questionHtml = state.analysis.question ? '<div class="credit-qa-question"><span>我的问题</span><p>' + escapeHtml(state.analysis.question) + '</p></div>' : '';
    var proofAction = state.analysis.proofAction || ''; var verificationActions = state.analysis.stage === 1 && !streaming ? '<section class="credit-proof-card"><div class="credit-proof-title"><strong>' + (proofAction === 'complete' ? '征信核验已完成' : proofAction === 'submit' ? '正在重新核验材料' : '待补证事项') + '</strong><span>' + (proofAction === 'complete' ? '已关闭 2 项' : '2 项') + '</span></div>' + (proofAction === 'complete' ? '<p class="credit-proof-result">✓ 主体匹配通过 · ✓ 担保责任已核实 · ✓ 历史诉讼已结案</p><button class="credit-proof-submit" data-action="credit-proof-confirm">确认结果并进入评级准入</button>' : proofAction === 'submit' ? '<p class="credit-proof-result">✓ 材料接收完成<br>◌ 完整性检查 → 主体匹配 → 风险复核</p>' : '<button class="credit-proof-item" data-action="credit-proof"><span>!</span><b>对外担保余额证明</b><small>确认企业实际负债</small><em>上传证明</em></button><button class="credit-proof-item" data-action="credit-proof"><span>!</span><b>历史诉讼结案材料</b><small>确认持续执行风险</small><em>上传证明</em></button><button class="credit-proof-submit" data-action="credit-proof-submit">提交证明材料并重新核验</button>') + '</section>' : '';
    var verificationSummary = state.analysis.stage === 1 && !streaming ? '<section class="credit-simple-result"><strong>征信核验已完成</strong><p>结果：企业主体真实有效，近 24 个月未发现重大逾期或失信记录，符合继续办理条件。</p></section>' : '';
    var body = verificationSummary + questionHtml + '<section class="credit-qa-thinking"><div class="credit-qa-head"><strong>' + (isAnswering ? '分析完成' : '正在思考') + '</strong><span>信贷本体分析 · 模拟演示</span></div>' + thoughtHtml + (isAnswering ? '' : '<div class="credit-qa-cursor"></div>') + '</section>' + answer + verificationActions;
    return page("珠海澜衡精密装备有限公司", state.analysis.title, body, null, null, true);
  }

  function taskProgress() {
    var done = state.due.tasks.filter(function (task) { return task.status === "已核实"; }).length;
    return '<div class="credit-progress"><span>现场核查 ' + done + ' / 9</span><span class="credit-progress-bar"><span style="width:' + Math.round(done / 9 * 100) + '%"></span></span></div>';
  }

  function buildTasks() {
    var list = enterprises.filter(function (enterprise) {
      var displayName = window.BankDemoI18n ? window.BankDemoI18n.translate(enterprise.name) : enterprise.name;
      var matchesSearch = !state.search || displayName.toLocaleLowerCase().includes(state.search.trim().toLocaleLowerCase()) || enterprise.name.includes(state.search);
      var matchesIndustry = state.industry === "全部行业" || enterprise.industry === state.industry;
      var matchesStatus = state.status === "全部状态" || enterprise.status === state.status;
      return matchesSearch && matchesIndustry && matchesStatus;
    });
    var cards = list.map(function (enterprise) {
      var selected = state.selectedEnterprise === enterprise.id;
      return '<button class="credit-card enterprise-card ' + (selected ? 'is-selected' : '') + '" data-action="select-enterprise" data-id="' + enterprise.id + '"><span class="credit-select-mark">✓</span><h3>' + escapeHtml(enterprise.name) + '</h3><p>' + escapeHtml(enterprise.industry) + ' · 推荐来源：' + escapeHtml(enterprise.source) + '</p><div class="credit-card-meta">' + chip(enterprise.status, enterprise.status.indexOf("审慎") >= 0 ? "warning" : "") + chip("融资 " + enterprise.demand) + chip("资料 " + enterprise.completeness + "%") + '</div></button>';
    }).join("");
    return page("企业评估", "待评估企业 7 户", '<div class="credit-search-row"><input class="credit-search" data-input="search" value="' + escapeHtml(state.search) + '" placeholder="搜索企业名称"/><select class="credit-filter" data-input="industry"><option>全部行业</option><option>建筑工程</option><option>精密装备制造</option><option>商贸流通</option><option>新材料</option><option>火电</option><option>融资租赁</option></select><select class="credit-filter" data-input="status"><option>全部状态</option><option>待评估</option><option>资料待补</option><option>审慎关注</option><option>主体待核验</option></select></div><div class="credit-stat-row">' + stat("待评估", "7") + stat("平均资料完整度", "64%") + stat("待核验重点", "3") + '</div><div class="credit-section-title"><span>企业清单</span><span class="credit-muted">点击卡片选择</span></div>' + (cards || '<div class="credit-empty">没有匹配的企业</div>'), state.selectedEnterprise ? { action: "view-profile", label: "查看企业画像" } : { action: "view-profile", label: "请选择企业", disabled: true }, null, false);
  }

  function buildProfile() {
    var enterprise = enterprises.find(function (item) { return item.id === state.selectedEnterprise; }) || enterprises[2];
    var profileBody = '<div class="credit-profile-hero"><h2>' + escapeHtml(enterprise.name) + '</h2><p>精密装备制造｜小微企业｜建议继续核验</p></div><div class="credit-tabs"><button class="credit-tab ' + (state.profileTab === "profile" ? 'is-active' : '') + '" data-action="profile-tab" data-tab="profile">企业画像</button><button class="credit-tab ' + (state.profileTab === "risk" ? 'is-active' : '') + '" data-action="profile-tab" data-tab="risk">现存风险 <span>3</span></button></div>';
    if (state.profileTab === "risk") return page("企业深度画像", "主体与风险核验", profileBody + '<div class="credit-callout"><strong>当前风险：3 项关注</strong><br/>重大风险：0 项 · 待核验事项：2 项</div>' + ["核心客户集中度较高", "订单交付周期存在波动", "主要客户回款周期延长"].map(function (risk, index) { var open = state.expandedRisk === index; return '<div class="credit-risk-card"><strong>! ' + risk + '</strong><p>' + (open ? ["前两大客户收入占比约 51%，需核验订单稳定性。", "部分订单交付周期延长，需补充产能和排产说明。", "主要客户结算周期延长，需核验应收账款账龄。"][index] : "点击查看风险来源、影响判断和建议核验动作") + '</p><button data-action="toggle-risk" data-id="' + index + '">' + (open ? "收起风险证据" : "展开风险证据") + '</button>' + (open ? '<button data-action="mark-risk" data-id="' + index + '">标记待核验</button>' : '') + '</div>'; }).join(""), { action: "create-customer", label: "创建档案并发起尽调" }, null, true);
    var credentialRows = credentials.map(function (credential, index) {
      var open = state.expandedCredential === index;
      var stateClass = credential[1] === "×" ? "no" : (credential[2] === "待核验" ? "pending" : "");
      return '<li><span class="credit-check ' + stateClass + '">' + credential[1] + '</span><button class="credit-task-main" data-action="toggle-credential" data-id="' + index + '" style="border:0;text-align:left;background:transparent;padding:0"><strong>' + escapeHtml(credential[0]) + '</strong><span>' + escapeHtml(credential[2]) + '</span>' + (open ? '<span class="credit-muted">证书：' + escapeHtml(credential[3]) + ' · 发证：' + escapeHtml(credential[4]) + ' · 有效期：' + escapeHtml(credential[5]) + '</span>' : '') + '</button></li>';
    }).join("");
    return page("企业深度画像", "主体、经营、财务与资质核验", profileBody + '<div class="credit-section-title"><span>主体与行业</span></div><div class="credit-kv-grid">' + [["小微企业属性", "符合"], ["制造业经营主体", "已登记"], ["生产基地", "已核验"], ["生产线数量", "12 条"], ["行业准入", "通过"], ["行业风险", "订单及供应链需关注"]].map(function (row) { return '<div class="credit-kv"><span>' + row[0] + '</span><strong>' + row[1] + '</strong></div>'; }).join("") + '</div><div class="credit-section-title"><span>经营与财务</span></div><div class="credit-kv-grid">' + [["主营业务", "精密装备及核心零部件"], ["生产基地", "珠海高新区约 8,600㎡"], ["员工人数", "126 人"], ["营业收入", "2,300 万元"], ["开票收入", "1,900 万元"], ["纳税额", "286 万元"], ["现有银行融资", "2,000 万元"], ["本次融资需求", "1,200 万元"]].map(function (row) { return '<div class="credit-kv"><span>' + row[0] + '</span><strong>' + row[1] + '</strong></div>'; }).join("") + '</div><div class="credit-note">已开票、已纳税收入优先作为经营真实性判断依据，客户口头陈述仅作为辅助信息。</div><div class="credit-section-title" data-anchor="credentials"><span>资质与荣誉核验</span></div><ul class="credit-list">' + credentialRows + '</ul>', { action: "create-customer", label: "创建档案并发起尽调" }, null, true);
  }

  function buildDue() {
    if (state.due.detailId !== null) return buildTaskDetail();
    var done = state.due.tasks.filter(function (task) { return task.status === "已核实"; }).length;
    var body = '<div class="credit-card"><p class="credit-muted">珠海澜衡精密装备有限公司 · 授信前现场尽调</p>' + taskProgress() + '</div><div class="credit-tabs">' + [["materials", "历史材料"], ["tasks", "现场任务"], ["logs", "操作记录"]].map(function (tab) { return '<button class="credit-tab ' + (state.due.tab === tab[0] ? 'is-active' : '') + '" data-action="due-tab" data-tab="' + tab[0] + '">' + tab[1] + '</button>'; }).join("") + '</div>';
    if (state.due.tab === "materials") body += '<div class="credit-section-title"><span>历史材料</span><span class="credit-muted">3 份</span></div>' + [["营业执照及备案", "已归档 · 2026-09-14"], ["近两年财务报表", "已归档 · 2026-09-16"], ["质量管理体系认证", "已归档 · 2026-09-17"]].map(function (item) { return '<div class="credit-card"><h3>' + item[0] + '</h3><p class="credit-muted">' + item[1] + '</p></div>'; }).join("");
    else if (state.due.tab === "logs") body += '<div class="credit-section-title"><span>操作记录</span></div><div class="credit-timeline"><div class="credit-timeline-item"><strong>客户经理创建档案</strong>今天 09:32</div><div class="credit-timeline-item"><strong>系统载入企业画像</strong>今天 09:32</div><div class="credit-timeline-item"><strong>风险事项转入尽调</strong>今天 09:33</div></div>';
    else body += '<div class="credit-section-title"><span>固定核查 7 项</span><span class="credit-muted">需全部完成</span></div>' + state.due.tasks.slice(0, 7).map(taskRow).join("") + '<section class="credit-special-group" aria-label="制造业特别项重点核查"><div class="credit-section-title credit-special-section-title"><span><i class="credit-special-icon" aria-hidden="true">✦</i>制造业特别项 <b>2 项</b></span></div>' + state.due.tasks.slice(7).map(function (task) { return taskRow(task, true); }).join("") + '</section>' + (done === 9 ? '<div class="credit-readiness">固定核查：7 / 7 · 制造业特别项：2 / 2 · 材料完整度：100%</div>' : '<div class="credit-note">财务报表、开票、纳税、回款凭证、生产线和核心客户回款均需完成核验后，才会解锁产品匹配。</div>');
    var button = state.due.dataWritten ? { action: "go-product", label: "进入产品匹配" } : { action: "submit-due", label: done === 9 ? "提交核验结果" : "完成全部 9 项后提交", disabled: done !== 9 };
    return page("现场尽调", state.due.dataWritten ? "现场核验完成 · 资料已回传" : "现场核验与资料回传", body, button, null, true);
  }

  function taskRow(task, special) {
    var icon = task.status === "已核实" ? "" : (task.status === "已上传" ? "↑" : "·");
    return '<button class="credit-task' + (special ? ' credit-task-special' : '') + '" data-action="open-task" data-id="' + task.id + '">' + '<span class="credit-check ' + (task.status === "已核实" ? "" : (task.status === "已上传" ? "pending" : "pending")) + '">' + icon + '</span><span class="credit-task-main"><strong>' + escapeHtml(task.name) + '</strong><span>' + escapeHtml(task.status) + (task.result === "存在异常" ? " · 待处理" : "") + '</span></span><span class="credit-task-chevron">›</span></button>';
  }

  function buildTaskDetail() {
    var task = state.due.tasks[state.due.detailId];
    if (!task) { state.due.detailId = null; return buildDue(); }
    var resultChoices = ["已核实", "存在异常", "待补充"].map(function (choice) { return '<button class="credit-choice ' + (task.result === choice ? 'is-active' : '') + '" data-action="task-result" data-result="' + choice + '">' + choice + '</button>'; }).join("");
    return page(task.name, task.kind + " · 现场核查任务", '<div class="credit-card"><h3>核查说明</h3><p class="credit-muted" style="margin-top:6px;line-height:1.6">' + escapeHtml(task.description) + '</p></div><label class="credit-label">上传材料</label><div class="credit-detail-actions"><button class="credit-upload" data-action="upload-material">＋ 上传照片</button><button class="credit-upload" data-action="upload-material">＋ 上传文件</button></div>' + (task.uploaded ? '<div class="credit-readiness">已上传 1 份 Demo 材料 · 上传人：客户经理 · 刚刚</div>' : '') + '<label class="credit-label">访谈记录 / 核查备注</label><textarea class="credit-textarea" data-input="task-note" placeholder="记录现场观察、访谈和数据核对结果">' + escapeHtml(task.note) + '</textarea><label class="credit-label">选择核查结果</label><div class="credit-choice-row">' + resultChoices + '</div>' + (task.result === "存在异常" ? '<div class="credit-warning">存在异常的任务必须补充处理意见或确认风险后，才允许回写数据入库。</div><button class="credit-secondary" style="margin-top:8px;padding:7px" data-action="resolve-task">确认已处理 / 纳入风险跟踪</button>' : '') + '<div class="credit-note">状态流转：待核查 → 已上传 → 已核实。上传材料和结果会回写客户档案。</div>', { action: "save-task", label: task.result ? "保存并返回任务" : "保存任务" }, null, true);
  }

  function buildProduct() {
    var selected = products.find(function (product) { return product.id === state.product.selected; }) || products[0];
    var productCards = products.map(function (product) {
      var active = product.id === state.product.selected;
      return '<div class="credit-card credit-product compact ' + (active ? 'is-selected' : '') + '" data-action="select-product" data-id="' + product.id + '"><span class="credit-select-mark">✓</span><span class="match">' + product.label + ' · ' + product.score + '</span><h3>' + product.name + '</h3><p>' + product.desc + '</p><button class="credit-inline-link" data-action="toggle-product-reason" data-id="' + product.id + '">' + (state.product.expanded === product.id ? "收起匹配理由" : "查看匹配理由") + '</button>' + (state.product.expanded === product.id ? '<div class="credit-note">匹配依据：' + product.reason + '<br/>建议额度：' + product.limit + '<br/>限制条件：' + product.mismatch + '</div>' : '') + '</div>';
    }).join("");
    var selectedScore = selected.score.replace("%", "");
    var selectedKind = selected.id === "working" ? "success" : "warning";
    var hero = '<div class="credit-match-hero"><span class="credit-match-eyebrow">' + (selected.id === "working" ? "系统推荐" : "已选方案") + ' · 综合匹配结果</span><div class="credit-match-score"><strong>' + selectedScore + '</strong><span>/ 100</span></div><h2>' + selected.name + '</h2><p>' + selected.desc + ' 建议额度 <strong>' + state.product.amount + ' 万元</strong>，期限 12 个月。</p><span class="credit-chip ' + selectedKind + '">' + selected.label + ' · ' + selected.score + '</span><button class="credit-detail-link" data-action="view-product-detail">展开方案详情 <span>›</span></button></div>';
    var kpis = [["经营真实性", "88", "收入与开票"], ["行业适配度", "94", "制造业场景"], ["还款能力", "86", "现金流覆盖"], ["资料完整度", "100%", "9/9 已回传"]].map(function (item) { return '<div class="credit-kpi"><strong>' + item[1] + '</strong><span>' + item[0] + '</span><small>' + item[2] + '</small></div>'; }).join("");
    return page("金融产品匹配", "现场尽调完成 · 数据回写成功", hero + '<div class="credit-kpi-grid">' + kpis + '</div><div class="credit-insight"><strong>核心判断</strong><p>收入与开票匹配度 95%；生产线与订单覆盖 92%；主要风险来自核心客户集中度和回款周期延长。</p></div><div class="credit-section-title"><span>可匹配产品</span><span class="credit-muted">点击产品切换方案</span></div>' + productCards + '<div class="credit-section-title"><span>额度测算</span><span class="credit-muted">当前方案：' + selected.name + '</span></div><div class="credit-card"><div class="credit-kv-grid"><div class="credit-kv"><span>建议额度区间</span><strong>800—1,200万元</strong></div><div class="credit-kv"><span>优先建议额度</span><strong>1,000万元</strong></div></div><div class="credit-amount-row">' + [800, 1000, 1200].map(function (amount) { return '<button class="credit-amount ' + (state.product.amount === amount ? 'is-active' : '') + '" data-action="set-amount" data-amount="' + amount + '">' + amount + ' 万</button>'; }).join("") + '</div><input class="credit-input" data-input="amount" type="number" min="100" max="2000" step="50" value="' + state.product.amount + '" placeholder="手动输入金额（万元）"/>' + (state.product.amount > 1200 ? '<div class="credit-warning" style="margin-top:7px">当前额度高于建议区间，请补充额度调整理由。</div>' : '') + '</div><div class="credit-note">系统提供匹配依据和额度建议，最终产品与额度由客户经理确认。</div>', { action: "confirm-product", label: "确认产品与额度" }, null, true);
  }

  function buildProductDetail() {
    var product = products.find(function (item) { return item.id === state.product.selected; }) || products[0];
    var evaluations = [
      ["主体与行业适配", "94", "制造业主体、生产基地和行业准入已核验", "通过"],
      ["经营真实性", "88", "开票收入 1,900 万元，营业收入 2,300 万元，匹配度 95%", "通过"],
      ["还款能力", "86", "现有融资 2,000 万元，建议新增额度 1,000 万元", "可覆盖"],
      ["风险约束", "72", "核心客户集中度较高，回款周期由 45 天延长至 68 天", "需关注"]
    ].map(function (item) { return '<div class="credit-eval-item"><div class="credit-eval-head"><strong>' + item[0] + '</strong><span class="credit-eval-score">' + item[1] + '</span><span class="credit-eval-badge ' + (item[3] === "需关注" ? "warning" : "") + '">' + item[3] + '</span></div><p>' + item[2] + '</p><div class="credit-eval-bar"><span style="width:' + item[1] + '%"></span></div></div>'; }).join("");
    return page("匹配方案详情", product.name + " · 评估依据", '<div class="credit-detail-hero"><span class="credit-match-eyebrow">综合评估结果</span><div class="credit-detail-score"><strong>' + product.score.replace("%", "") + '</strong><span>' + product.label + '</span></div><p>建议额度 <strong>' + state.product.amount + ' 万元</strong> · 期限 12 个月 · 按季付息、分期还本</p></div><div class="credit-section-title"><span>详细匹配评估</span><span class="credit-muted">4 个维度</span></div><div class="credit-eval-list">' + evaluations + '</div><div class="credit-section-title"><span>额度推导</span></div><div class="credit-card"><div class="credit-calc"><div class="credit-kv"><span>订单周转需求</span><strong>1,200 万元</strong></div><div class="credit-kv"><span>经营真实性系数</span><strong>0.88</strong></div><div class="credit-kv"><span>现有融资约束</span><strong>200 万元</strong></div><div class="credit-kv"><span>建议授信额度</span><strong>1,000 万元</strong></div></div><div class="credit-note">建议额度 = 订单周转需求 × 经营真实性系数 − 现有融资约束，最终由客户经理确认。</div></div><div class="credit-section-title"><span>系统建议</span></div><div class="credit-readiness">优先选择 ' + product.name + '，额度建议 ' + state.product.amount + ' 万元；补充关注核心客户回款与集中度。</div>', { action: "back", label: "返回产品匹配" }, null, true);
  }

  function buildDisbursement() {
    var funded = state.disbursement === "funded";
    var progress = Math.max(0, Math.min(100, Number(state.disbursementProgress || 0)));
    var progressHtml = funded ? '' : '<div class="credit-disbursement-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + progress + '"><div><span style="width:' + progress + '%"></span></div><strong>' + progress + '%</strong></div><p class="credit-disbursement-progress-label">系统审核与资金划拨进行中</p>';
    return page("放款状态", funded ? "状态已更新 · 放款完成" : "资金划拨状态", '<div class="credit-status-panel ' + (funded ? 'done' : '') + '"><div class="credit-status-icon"></div><h2>' + (funded ? "放款完成" : "放款中") + '</h2><p>' + (funded ? "资金已到账，可进入贷后持续监控" : "资金正在划拨，请稍候") + '</p>' + progressHtml + '</div><div class="credit-card"><div class="credit-loan-info"><div class="credit-kv"><span>客户</span><strong>珠海澜衡精密装备有限公司</strong></div><div class="credit-kv"><span>产品</span><strong>精密装备经营周转贷</strong></div><div class="credit-kv"><span>放款金额</span><strong>1,000万元</strong></div><div class="credit-kv"><span>期限</span><strong>12个月</strong></div></div></div>' + (funded ? '<div class="credit-readiness">放款日期：2026年9月21日 · 状态流转已写入客户档案</div>' : '<div class="credit-note">系统正在完成授信条件核对和资金划拨，预计 4 秒完成。</div>'), funded ? { action: "go-monitoring", label: "查看贷后任务" } : null, null, true);
  }

  function buildMonitoring() {
    var allJudged = ["basis", "will", "ability"].every(function (key) { return state.monitoring.judgement[key]; });
    var signalCards = signals.map(function (signal, index) { var open = state.monitoring.expandedSignal === index; var checked = state.monitoring.checked[index]; return '<div class="credit-signal"><strong>' + signal[0] + '</strong><p>' + signal[1] + ' · ' + signal[4] + '</p><button data-action="toggle-signal" data-id="' + index + '">' + (open ? "收起详情" : "查看预警详情") + '</button>' + (open ? '<p style="margin-top:6px">变化情况：' + signal[2] + '<br/>数据来源：' + signal[3] + '<br/>当前状态：' + (checked ? "已发起人工核查" : "待人工核实") + '</p><button data-action="launch-check" data-id="' + index + '">' + (checked ? "核查任务已创建" : "发起核查") + '</button>' : '') + '</div>'; }).join("");
    var judgement = [["basis", "经营基础", ["正常", "有变化", "明显恶化"]], ["will", "还款意愿", ["正常", "需关注", "不明确"]], ["ability", "还款能力", ["可覆盖", "存在缺口", "明显不足"]]].map(function (item) { return '<div class="credit-decision"><h3>' + item[1] + '</h3><div class="credit-choice-row">' + item[2].map(function (value) { return '<button class="credit-choice ' + (state.monitoring.judgement[item[0]] === value ? 'is-active' : '') + '" data-action="set-judgement" data-key="' + item[0] + '" data-value="' + value + '">' + value + '</button>'; }).join("") + '</div></div>'; }).join("");
    var conclusions = ["暂无实质风险", "列入关注名单", "风险预警", "重大风险预警"].map(function (value) { return '<button class="credit-choice ' + (state.monitoring.conclusion === value ? 'is-active' : '') + '" data-action="set-conclusion" data-value="' + value + '">' + value + '</button>'; }).join("");
    return page("贷后风险预警", "珠海澜衡精密装备有限公司 · 贷款余额 1,000 万元", '<div class="credit-warning"><strong>系统已完成扫描，请现场复核</strong><br/>风险预警：舆情发现负面报道；征信发现其他行已经发生还款异常。<br/>评估下一还款节点，客户可能不具备还款能力。</div><div class="credit-card"><div class="credit-section-title"><span>系统提示：存在关注信号</span>' + chip("风险预警", "warning") + '</div><p class="credit-muted">已完成扫描，等待现场复核</p></div><div class="credit-section-title"><span>系统预警</span><span class="credit-muted">4 项关注信号</span></div><div class="credit-kv-grid">' + signalCards + '</div><div class="credit-section-title"><span>独立数据源</span></div><div class="credit-source-card"><strong>经营与财务</strong><p>企业经营变化、发票和收入、财务资料、贷款用途、实际控制人状况</p></div><div class="credit-source-card"><strong>征信跟踪</strong><p>企业征信、他行融资、消费金融、小贷机构、逾期及续贷情况</p></div><div class="credit-source-card"><strong>当地口碑 / 舆情</strong><p>信息来源：地方公开信息及客户经理走访记录 · 当前状态：待人工核实</p></div><div class="credit-source-card"><strong>制造业经营专项</strong><p>生产线利用率：待复核 · 核心客户订单：待复核 · 交付与回款：周期延长</p></div><div class="credit-section-title"><span>经理风险判断</span></div>' + judgement + '<div class="credit-decision"><h3>最终结论</h3><div class="credit-choice-row">' + conclusions + '</div></div><div class="credit-note">风险不一定先表现为欠息，更常见的是本金到期无法偿还、续贷失败、他行逾期、收入明显下滑或当地口碑恶化。</div>', allJudged ? { action: "submit-judgement", label: "提交风险判断" } : { action: "submit-judgement", label: "完成三项判断后提交", disabled: true }, null, true);
  }

  function buildRestructuring() {
    var conditionFields = [["will", "还款意愿", ["较强", "需关注", "不明确"]], ["basis", "经营基础", ["稳定", "有变化", "明显恶化"]], ["cash", "未来现金流", ["可覆盖", "部分覆盖", "无法覆盖"]], ["farm", "订单与产能", ["持续", "有变化", "下降"]], ["scale", "生产规模", ["稳定", "收缩", "无法核实"]]].map(function (field) { return '<div class="credit-decision"><h3>' + field[1] + '</h3><div class="credit-choice-row">' + field[2].map(function (value) { return '<button class="credit-choice ' + (state.restructuring.condition[field[0]] === value ? 'is-active' : '') + '" data-action="set-condition" data-key="' + field[0] + '" data-value="' + value + '">' + value + '</button>'; }).join("") + '</div></div>'; }).join("");
    var plans = [["重组 + 分期压降", "适用于仍有还款意愿、经营基础有变化但未来现金流部分可覆盖。", "匹配现金流，分期回收本金"], ["展期", "适用于短期流动性紧张且经营基础仍稳定的客户。", "延长还款期限，继续跟踪"], ["借新还旧", "仅适用于还款来源清晰且满足授信政策的情况。", "需严格防止风险掩盖"], ["继续收息", "维持利息回收，观察经营变化和还款来源。", "不改变本金风险"], ["收缩授信及资产处置", "经营明显恶化或还款来源不足时使用。", "优先控制风险暴露"]].map(function (plan) { var active = state.restructuring.plan === plan[0]; return '<button class="credit-plan ' + (active ? 'is-active' : '') + '" data-action="set-plan" data-plan="' + plan[0] + '"><span class="credit-plan-mark">' + (active ? '✓' : '○') + '</span><h3>' + plan[0] + '</h3><p>' + plan[1] + '<br/>方案目标：' + plan[2] + '</p></button>'; }).join("");
    var remaining = Math.max(0, 1000 - Number(state.restructuring.firstPaydown || 0));
    var warning = state.restructuring.condition.basis === "明显恶化" || state.restructuring.condition.will === "不明确" || state.restructuring.condition.cash === "无法覆盖";
    return page("资产重组方案设计", "风险预警已确认 · 客户经理人工判断", '<div class="credit-warning">重组不得掩盖真实风险，不得无限期延后风险暴露，方案必须匹配实际回收能力。</div><div class="credit-section-title"><span>重组条件判断</span></div>' + conditionFields + (warning ? '<div class="credit-warning">当前不满足优先重组条件，建议进入收缩授信、催收或资产处置流程。</div>' : '') + '<div class="credit-section-title"><span>风险缓释方式</span></div>' + plans + (state.restructuring.plan === "重组 + 分期压降" ? '<div class="credit-section-title"><span>重组方案填写</span></div><div class="credit-card"><div class="credit-kv-grid"><div class="credit-kv"><span>当前贷款余额</span><strong>1,000万元</strong></div><div class="credit-kv"><span>剩余本金</span><strong>' + remaining + '万元</strong></div></div><label class="credit-label">重组期限（月）</label><input class="credit-input" data-input="term" type="number" value="' + state.restructuring.term + '"/><label class="credit-label">首期压降（万元）</label><input class="credit-input" data-input="firstPaydown" type="number" value="' + state.restructuring.firstPaydown + '"/><div class="credit-calc"><div class="credit-kv"><span>预计回收本金</span><strong>1,000万元</strong></div><div class="credit-kv"><span>方案状态</span><strong>' + (state.restructuring.submitted ? "已提交审批" : (state.restructuring.draftSaved ? "草案" : "待填写")) + '</strong></div></div></div>' : '') + (state.restructuring.submitted ? '<div class="credit-readiness">已提交重组审批 · 客户档案已更新 · 后续跟踪任务已创建</div>' : ''), state.restructuring.submitted ? null : { action: "submit-plan", label: "提交重组审批" }, state.restructuring.submitted ? null : { action: "save-plan", label: "保存方案草案" }, true);
  }

  function modalHtml() {
    if (!state.modal) return "";
    if (state.modal.action === "credit-confirmation") {
      return '<div class="credit-modal-mask credit-confirm-mask"><section class="credit-modal credit-confirm-modal"><h3>' + escapeHtml(state.modal.title) + '</h3><p>' + escapeHtml(state.modal.description) + '</p><div class="credit-modal-actions"><button class="credit-modal-confirm" data-modal-action="confirm">去确认</button><button class="credit-modal-cancel" data-modal-action="cancel">取消</button></div></section></div>';
    }
    if (state.modal.action === "monitor-risk-alert") {
      return '<div class="credit-modal-mask credit-confirm-mask"><section class="credit-modal credit-confirm-modal credit-monitor-alert-modal"><h3>' + escapeHtml(state.modal.title) + '</h3><p>' + escapeHtml(state.modal.description).replace(/\n/g, '<br/>') + '</p><div class="credit-modal-actions"><button class="credit-modal-confirm" data-modal-action="view-monitor-detail">查看详情</button></div><span class="credit-monitor-alert-hint">1秒后自动开始现场核验</span></section></div>';
    }
    var extra = state.modal.actionPrompt ? '<button class="credit-modal-approve" data-modal-action="approve">审批</button>' : '';
    return '<div class="credit-modal-mask"><section class="credit-modal"><h3>' + escapeHtml(state.modal.title) + '</h3><p>' + escapeHtml(state.modal.description) + '</p><div class="credit-modal-actions"><button class="credit-modal-confirm" data-modal-action="confirm">确认</button>' + extra + '<button class="credit-modal-cancel" data-modal-action="cancel">取消</button></div></section></div>';
  }

  function render() {
    var previous = screen.querySelector('.credit-content');
    var previousScroll = previous ? previous.scrollTop : 0;
    var content;
    if (state.page === "home") content = buildHome();
    else if (state.page === "analysis") content = buildAnalysis();
    else if (state.page === "tasks") content = buildTasks();
    else if (state.page === "profile") content = buildProfile();
    else if (state.page === "due") content = buildDue();
    else if (state.page === "product") content = buildProduct();
    else if (state.page === "product-detail") content = buildProductDetail();
    else if (state.page === "disbursement") content = buildDisbursement();
    else if (state.page === "monitoring") content = buildMonitoring();
    else content = buildRestructuring();
    var root = document.createElement("div");
    root.className = "credit-root";
    root.innerHTML = content + modalHtml() + (state.toast ? '<div class="credit-toast">' + escapeHtml(state.toast) + '</div>' : '');
    if (state.page === "tasks") {
      root.querySelector('[data-input="industry"]').value = state.industry;
      root.querySelector('[data-input="status"]').value = state.status;
    }
    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root.addEventListener("change", handleInput);
    screen.replaceChildren(root);
    root.dataset.stage = state.demoStage;
    root.dataset.phase = state.analysis.phase;
    if (state.page === "analysis") {
      var viewport = root.querySelector('.credit-content');
      viewport.scrollTop = state.analysis.reply ? viewport.scrollHeight : previousScroll;
    }
    if (state.toast) {
      var toast = state.toast;
      window.setTimeout(function () { if (state.toast === toast) { state.toast = ""; render(); } }, 1800);
    }
  }

  function toast(message) { state.toast = message; render(); }

  function showModal(title, description, action) { state.modal = { title: title, description: description, action: action }; render(); }

  function clearDemoTimer() {
    if (state.demoTimer) {
      window.clearTimeout(state.demoTimer);
      state.demoTimer = null;
    }
    if (state.demoInterval) {
      window.clearInterval(state.demoInterval);
      state.demoInterval = null;
    }
  }

  function startDisbursementAnimation(runId) {
    clearDemoTimer();
    var animationRunId = ++disbursementAnimationRunId;
    var startedAt = Date.now();
    var expectedRunId = Number.isSafeInteger(runId) ? runId : lastRunId;
    state.disbursement = "processing";
    state.disbursementProgress = 0;
    state.page = "disbursement";
    state.demoRunning = true;
    render();
    state.demoInterval = window.setInterval(function () {
      if (animationRunId !== disbursementAnimationRunId || state.demoStage !== 5 || (expectedRunId && lastRunId !== expectedRunId)) {
        clearDemoTimer();
        return;
      }
      state.disbursementProgress = Math.min(100, Math.round((Date.now() - startedAt) / 4000 * 100));
      if (state.disbursementProgress >= 100) {
        clearDemoTimer();
        state.disbursement = "funded";
        state.demoRunning = false;
        render();
        if (synchronized) window.parent.postMessage({ source: 'wm-credit-phone', type: 'wm-credit-disbursement-complete', runId: expectedRunId }, window.location.origin);
        return;
      }
      render();
    }, 50);
  }

  function clearPhoneReplyQueue() {
    phoneReplyTimers.forEach(function (timer) { window.clearTimeout(timer); });
    phoneReplyTimers = [];
    if (creditConfirmationTimer) {
      window.clearTimeout(creditConfirmationTimer);
      creditConfirmationTimer = null;
    }
    phoneReplyRunId = 0;
    phoneReplyStage = -1;
    phoneReplyArmed = false;
    phoneReplyStarted = false;
    phoneReplyCompletionQueued = false;
    phoneReplyLastQueued = "";
    phoneReplyResultQueued = false;
  }

  function scheduleCreditConfirmation(runId, stage) {
    if (stage !== 0 || creditConfirmationRunId === runId || creditConfirmationTimer) return;
    creditConfirmationTimer = window.setTimeout(function () {
      creditConfirmationTimer = null;
      if (lastRunId !== runId || state.demoStage !== stage || !phoneReplyStarted || !state.analysis.reply) return;
      creditConfirmationRunId = runId;
      state.modal = { title: '是否创建企业档案，并进行征信核验？', description: '确认后将直接进入征信核验阶段', action: 'credit-confirmation' };
      render();
    }, 1000);
  }

  function queuePhoneReply(snapshot) {
    var reply = snapshot.reply || "";
    if (!reply) return;
    // 产品匹配逐帧落后天工端 1 秒；其他阶段保留原有 2 秒延迟。
    if (!phoneReplyArmed) {
      if (snapshot.stage !== 4 && reply.indexOf('一、综合判断') < 0 && !/^##\s/m.test(reply)) return;
      clearPhoneReplyQueue();
      phoneReplyRunId = snapshot.runId;
      phoneReplyStage = snapshot.stage;
      phoneReplyArmed = true;
    } else if (phoneReplyRunId !== snapshot.runId || phoneReplyStage !== snapshot.stage) {
      return;
    }
    var complete = snapshot.phase === 'complete' || snapshot.phase === 'result';
    var productResult = snapshot.stage === 4 && snapshot.phase === 'result';
    if (reply === phoneReplyLastQueued && (!complete || phoneReplyCompletionQueued) && (!productResult || phoneReplyResultQueued)) return;
    phoneReplyLastQueued = reply;
    if (complete) phoneReplyCompletionQueued = true;
    if (productResult) phoneReplyResultQueued = true;
    var runId = snapshot.runId;
    var stage = snapshot.stage;
    var question = snapshot.stage > 0 ? '' : (snapshot.question || state.analysis.question);
    var title = snapshot.title || '智能信贷分析';
    var timer = window.setTimeout(function () {
      if (lastRunId !== runId || state.demoStage !== stage) return;
      phoneReplyStarted = true;
      state.analysis = {
        phase: complete ? 'complete' : 'streaming',
        question: question,
        thoughts: [],
        reply: reply,
        title: title,
        stage: stage,
        creditPhase: productResult ? 'result' : 'matching',
        proofAction: snapshot.proofAction || ''
      };
      if (stage === 4) state.demoRunning = !productResult;
      state.page = 'analysis';
      render();
      if (complete) scheduleCreditConfirmation(runId, stage);
    }, snapshot.stage === 4 ? 1000 : 2000);
    phoneReplyTimers.push(timer);
  }

  function resetDueTasks() {
    state.due.tasks.forEach(function (task) {
      task.status = "待核查";
      task.uploaded = false;
      task.result = "";
      task.note = "";
      task.resolved = false;
    });
    state.due.dataWritten = false;
    state.due.demoCompleted = false;
  }

  function completeDemoDue() {
    state.due.created = true;
    state.due.dataWritten = true;
    state.due.demoCompleted = true;
    state.due.detailId = null;
    state.due.tasks.forEach(function (task) {
      task.uploaded = true;
      task.result = "已核实";
      task.status = "已核实";
      task.note = "现场尽调已完成，资料数据已回传客户档案";
      task.resolved = true;
    });
  }

  function scrollDueToEnd() {
    var content = screen.querySelector(".credit-content");
    if (content && content.scrollTo) content.scrollTo({ top: content.scrollHeight, behavior: "smooth" });
  }

  function startDueCompletionAnimation() {
    clearDemoTimer();
    state.due.created = true;
    state.due.dataWritten = false;
    state.due.demoCompleted = false;
    state.due.detailId = null;
    state.due.tab = "tasks";
    state.page = "due";
    state.demoMessage = "正在回传现场资料 · 现场核查 0 / 9";
    render();

    var index = 0;
    state.demoInterval = window.setInterval(function () {
      if (state.demoStage !== 3) {
        clearDemoTimer();
        return;
      }
      var task = state.due.tasks[index];
      if (task) {
        task.uploaded = true;
        task.result = "已核实";
        task.status = "已核实";
        task.note = "现场尽调已完成，资料数据已回传客户档案";
        task.resolved = true;
      }
      index += 1;
      state.demoMessage = index < state.due.tasks.length
        ? "正在回传现场资料 · 现场核查 " + index + " / 9"
        : "现场尽调已完成，9 项资料已回传并全部核实";
      if (index >= state.due.tasks.length) {
        window.clearInterval(state.demoInterval);
        state.demoInterval = null;
        state.due.dataWritten = true;
        state.due.demoCompleted = true;
      }
      render();
      if (index >= state.due.tasks.length) window.setTimeout(scrollDueToEnd, 80);
    }, 260);
  }

  function scrollToCredentials() {
    var target = screen.querySelector('[data-anchor="credentials"]');
    if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startFirstQa() {
    clearDemoTimer();
    clearPhoneReplyQueue();
    var started = Date.now();
    var runId = Math.max(Date.now(), lastRunId + 1);
    function tick() {
      var elapsed = Date.now() - started;
      var phase = elapsed < 1000 ? 'input' : elapsed < 3000 ? 'thinking' : elapsed < 13000 ? 'streaming' : elapsed < 14000 ? 'complete' : 'result';
      applySnapshot({ runId: runId, stage: 0, phase: phase, question: firstQa.question, title: '企业画像深读',
        thoughts: elapsed < 1000 ? [] : firstQa.thoughts.slice(0, Math.min(4, Math.floor((elapsed - 1000) / 500) + 1)),
        reply: elapsed < 3000 ? '' : firstQa.answer.slice(0, Math.ceil(firstQa.answer.length * Math.min(1, (elapsed - 3000) / 10000))) });
    }
    tick();
    state.demoInterval = window.setInterval(function () {
      tick();
    }, 50);
  }

  function applyMonitorState(payload) {
    if (!payload || !Number.isSafeInteger(payload.runId) || payload.runId < lastRunId) return;
    var hasSequence = Number.isSafeInteger(payload.seq);
    if (payload.runId === lastMonitorRunId && hasSequence && payload.seq <= lastMonitorSeq) return;
    if (payload.runId !== lastMonitorRunId) lastMonitorSeq = -1;
    lastMonitorRunId = payload.runId;
    if (hasSequence) lastMonitorSeq = payload.seq;
    var sameMonitorRun = lastRunId === payload.runId && state.analysis.stage === 6;
    var previousManualPhase = state.monitoring.monitorManualPhase;
    var previousModal = state.modal;
    var previousPage = state.page;
    if (!sameMonitorRun) {
      clearPhoneReplyQueue();
      clearDemoTimer();
    }
    lastRunId = payload.runId;
    state.demoStage = 6;
    state.demoRunning = true;
    if (!state.monitoring.monitorAlertShown) state.modal = null;
    if (state.page !== 'monitoring') state.page = 'analysis';
    state.analysis = { phase: 'loading', stage: 6, title: '贷后监控', reply: '', thoughts: [] };
    if (Array.isArray(payload.rounds)) state.monitoring.monitorRounds = payload.rounds;
    state.monitoring.monitorSeq = hasSequence ? payload.seq : lastMonitorSeq;
    state.monitoring.monitorClockTs = Number.isFinite(payload.clockTs) ? payload.clockTs : 0;
    state.monitoring.monitorRoundStartedAt = Number.isFinite(payload.roundStartedAt) ? payload.roundStartedAt : 0;
    state.monitoring.monitorRoundStatus = typeof payload.roundStatus === 'string' ? payload.roundStatus : '';
    state.monitoring.monitoringLayer = Number.isInteger(payload.monitoringLayer) ? payload.monitoringLayer : -1;
    if (payload.manualPhase === 'pending' || payload.manualPhase === 'completed') {
      state.modal = null;
      state.monitoring.monitorManualPhase = payload.manualPhase;
      state.monitoring.monitorManualReviewRequested = true;
      state.demoRunning = payload.manualPhase !== 'completed';
    }
    // Progress messages change the round list, not the loading panel. Keep
    // the animated SVG connected so its CSS animation never restarts.
    var roundList = screen.querySelector('.credit-monitor-mobile-rounds');
    if (sameMonitorRun && previousPage === 'analysis' && state.page === 'analysis'
      && previousManualPhase === state.monitoring.monitorManualPhase
      && previousModal === state.modal && roundList) {
      var roundHtml = buildMonitorRoundHtml();
      if (roundList.innerHTML !== roundHtml) roundList.innerHTML = roundHtml;
      var resultCaption = screen.querySelector('.credit-monitor-mobile-manual-card.is-complete > span');
      if (resultCaption) resultCaption.textContent = state.monitoring.monitorRoundStatus === 'finished'
        ? '第4轮检查完成' : '现场材料已回传，风险继续跟踪';
      return;
    }
    render();
  }

  function showMonitorAlert() {
    if (state.monitoring.monitorAlertShown) return;
    state.monitoring.monitorAlertShown = true;
    state.modal = {
      title: '贷后风险预警',
      description: '发现负面舆情及他行还款异常，\n评估下一还款节点可能存在偿付能力不足。\n\n当前状态：待现场核验',
      action: 'monitor-risk-alert'
    };
    render();
  }

  function handleHostSyncMessage(event) {
    if (!synchronized || event.source !== window.parent || event.origin !== window.location.origin) return;
    var data = event.data;
    if (!data || data.source !== 'wm-tiangong-host') return;
    if (data.type === 'wm-credit-snapshot') applySnapshot(data.snapshot);
    if (data.type === 'wm-credit-monitor-state') applyMonitorState(data);
    if (data.type === 'wm-credit-monitor-alert') {
      if (data.runId === lastRunId) showMonitorAlert();
    }
    if (data.type === 'wm-credit-next' && data.runId === lastRunId && state.analysis.stage === 1) requestStep('ArrowDown');
  }

  function applySnapshot(snapshot) {
    if (!snapshot || !Number.isSafeInteger(snapshot.runId) || snapshot.runId < lastRunId
      || !Number.isInteger(snapshot.stage) || snapshot.stage < -1 || snapshot.stage > 7
      || !['input', 'thinking', 'streaming', 'complete', 'progress', 'result'].includes(snapshot.phase)) return;
    if (snapshot.stage !== 1 || snapshot.runId !== lastRunId) {
      if (creditQueryTimer !== null) window.clearTimeout(creditQueryTimer);
      creditQueryTimer = null;
    }
    if (snapshot.stage === 2) {
      clearPhoneReplyQueue(); clearDemoTimer(); lastRunId = snapshot.runId; state.demoStage = 2; state.demoRunning = false; state.modal = null; state.page = 'analysis';
      state.analysis = { stage: 2, phase: snapshot.progress === 1 ? 'verified' : 'rating', creditPhase: snapshot.progress === 1 || snapshot.phase === 'result' ? 'result' : 'rating', rating: 'B+', title: '评级准入', reply: '', thoughts: [] }; render(); return;
    }
    if (snapshot.stage === 1) {
      clearPhoneReplyQueue(); clearDemoTimer();
      var sameVerification = lastRunId === snapshot.runId && state.analysis.stage === 1;
      var previousVerification = sameVerification ? state.analysis : {};
      if (!sameVerification) { creditResultReadyAt = 0; creditAdvanceRequested = false; }
      lastRunId = snapshot.runId; state.demoStage = 1; state.demoRunning = false;
      state.modal = null; state.page = 'analysis';
      state.analysis = { stage: 1, phase: 'result', creditPhase: snapshot.progress === 1 ? 'result' : (previousVerification.creditPhase || 'authorization'),
        authorizationStatus: snapshot.authorizationStatus || previousVerification.authorizationStatus || '已授权',
        authorizationStart: snapshot.authorizationStart || previousVerification.authorizationStart || '2026-09-24',
        authorizationEnd: snapshot.authorizationEnd || previousVerification.authorizationEnd || '2027-09-24',
        title: '征信核验', reply: '', thoughts: [] };
      render();
      if (!sameVerification && state.analysis.creditPhase === 'authorization' && creditAuthorizationStatus() === '已授权') startCreditQuery(true);
      return;
    }
    if (snapshot.stage === 4) {
      // 文本与结论卡片使用同一延迟队列，避免天工端完成时抢先覆盖手机文本。
      var changedProductStage = lastRunId !== snapshot.runId || state.demoStage !== 4;
      var renderProductStage = changedProductStage || snapshot.phase === 'input' || state.page !== 'analysis' || !!state.modal;
      if (changedProductStage || snapshot.phase === 'input') {
        clearPhoneReplyQueue(); clearDemoTimer();
        state.analysis = { stage: 4, phase: 'loading', creditPhase: 'matching', title: '产品匹配', reply: '', thoughts: [] };
      }
      lastRunId = snapshot.runId; state.demoStage = 4; state.demoRunning = state.analysis.creditPhase !== 'result';
      state.modal = null; state.page = 'analysis';
      if (['streaming', 'complete', 'result'].includes(snapshot.phase)) queuePhoneReply(snapshot);
      // 保留加载节点，避免高频快照重建 DOM 导致旋转动画反复归零。
      // 流式文本和结论由延迟队列在实际显示时渲染。
      if (renderProductStage) render();
      return;
    }
    if (snapshot.stage === 5) {
      // 第六步手机端只展示放款中与放款完成两个状态，放款动画固定持续 4 秒。
      clearPhoneReplyQueue();
      var sameDisbursement = lastRunId === snapshot.runId && state.demoStage === 5 && state.page === 'disbursement';
      lastRunId = snapshot.runId;
      state.demoStage = 5;
      state.modal = null;
      if (!sameDisbursement) startDisbursementAnimation(snapshot.runId);
      return;
    }
    if (snapshot.stage === 6) {
      // 第七步手机端保持监控加载态，轮次和风险弹窗由天工端事件单独同步。
      clearPhoneReplyQueue(); clearDemoTimer();
      lastRunId = snapshot.runId; state.demoStage = 6; state.demoRunning = true;
      state.modal = null; state.page = 'analysis';
      state.monitoring.monitorAlertShown = false;
      state.monitoring.monitorManualReviewRequested = false;
      state.monitoring.monitorManualPhase = 'idle';
      state.monitoring.monitorRounds = [];
      state.monitoring.monitorSeq = -1;
      state.monitoring.monitorClockTs = 0;
      state.monitoring.monitorRoundStartedAt = 0;
      state.monitoring.monitorRoundStatus = 'idle';
      state.monitoring.monitoringLayer = -1;
      state.analysis = { stage: 6, phase: 'loading', title: '贷后监控', reply: '', thoughts: [] };
      render(); return;
    }
    var changedStage = snapshot.runId !== lastRunId || snapshot.stage !== state.demoStage;
    if (changedStage || snapshot.phase === 'input') clearPhoneReplyQueue();
    lastRunId = snapshot.runId;
    state.demoStage = snapshot.stage;
    state.selectedEnterprise = 'lanheng';
    if (changedStage || snapshot.phase !== 'result') state.modal = null;
    if (snapshot.phase === 'streaming' || snapshot.phase === 'complete') queuePhoneReply(snapshot);
    else if (snapshot.phase === 'result' && !phoneReplyCompletionQueued) queuePhoneReply(snapshot);
    var phoneReplyVisible = phoneReplyStarted && phoneReplyRunId === snapshot.runId && phoneReplyStage === snapshot.stage;
    state.demoRunning = snapshot.phase !== 'result';
    if (snapshot.phase === 'progress') {
      resetDueTasks();
      state.due.created = true;
      state.due.tab = 'tasks';
      state.due.detailId = null;
      state.due.tasks.forEach(function (task, index) {
        if (index < snapshot.progress) { task.status = '已核实'; task.uploaded = true; task.result = '已核实'; }
      });
      state.page = 'due';
      render();
    } else if (phoneReplyVisible) {
      state.page = 'analysis';
    } else {
      var phonePhase = ['thinking', 'streaming', 'complete', 'result'].includes(snapshot.phase) ? 'loading' : snapshot.phase;
      var suppressQuestion = snapshot.stage > 0;
      state.analysis = { phase: suppressQuestion ? 'loading' : phonePhase, question: suppressQuestion ? '' : (snapshot.question || ''), thoughts: [], reply: '', title: snapshot.title || '智能信贷分析', stage: snapshot.stage };
      if (snapshot.phase !== 'result') {
        state.page = snapshot.stage === 0 && snapshot.phase === 'input' ? 'home' : 'analysis';
        render();
      }
    }
    if (snapshot.phase === 'result' && !phoneReplyVisible) {
      state.page = 'analysis';
      render();
      clearDemoTimer();
      if (!snapshot.reply) {
        state.demoTimer = window.setTimeout(function () {
          if (state.demoStage !== snapshot.stage || lastRunId !== snapshot.runId) return;
          setDemoStage(snapshot.stage, true);
        }, 2000);
      }
    }
  }

  function creditAuthorizationStatus() {
    if (state.analysis.authorizationStatus !== '已授权') return state.analysis.authorizationStatus || '未授权';
    var start = Date.parse((state.analysis.authorizationStart || '2026-09-24') + 'T00:00:00+08:00');
    var end = Date.parse((state.analysis.authorizationEnd || '2027-09-24') + 'T23:59:59.999+08:00');
    var now = Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || now < start) return '未授权';
    return now > end ? '授权已过期' : '已授权';
  }

  function startCreditQuery(automatic) {
    if (state.analysis.stage !== 1) return;
    if (creditAuthorizationStatus() !== '已授权') { toast('请先完成有效授权'); return; }
    if (creditQueryTimer !== null || state.analysis.creditPhase === 'querying' || state.analysis.creditPhase === 'result') return;
    var queryRunId = lastRunId;
    if (!automatic) {
      state.analysis.creditPhase = 'querying';
      state.page = 'analysis';
      render();
    }
    creditQueryTimer = window.setTimeout(function () {
      if (lastRunId !== queryRunId || state.analysis.stage !== 1 || state.demoStage !== 1) return;
      creditQueryTimer = null;
      if (state.analysis.creditPhase === 'result') return;
      if (creditAuthorizationStatus() !== '已授权') {
        state.analysis.creditPhase = 'authorization'; render(); return;
      }
      state.analysis.creditPhase = 'result';
      state.analysis.phase = 'verified';
      creditResultReadyAt = Date.now();
      if (synchronized) window.parent.postMessage({ source: 'wm-credit-phone', type: 'wm-credit-verification-complete', runId: lastRunId }, window.location.origin);
      render();
    }, 1000);
  }

  function requestStep(key) {
    if (key === 'ArrowDown' && state.analysis.stage === 1 && state.demoStage === 1) {
      if (creditAuthorizationStatus() !== '已授权') { toast('请先完成有效授权'); return; }
      if (state.analysis.creditPhase !== 'result') { startCreditQuery(); return; }
      if (Date.now() - creditResultReadyAt < 600 || creditAdvanceRequested) return;
      if (synchronized) {
        creditAdvanceRequested = true;
        window.parent.postMessage({ source: 'wm-credit-phone', type: 'wm-credit-next-stage', runId: lastRunId }, window.location.origin);
        return;
      }
    }
    if (synchronized) window.parent.postMessage({ source: 'wm-credit-phone', type: 'wm-credit-key', key: key }, window.location.origin);
    else setDemoStage(state.demoStage + (key === 'ArrowDown' ? 1 : -1));
  }

  function setDemoStage(stage, completed) {
    var next = Math.max(-1, Math.min(keySteps.length - 1, stage));
    clearDemoTimer();
    clearPhoneReplyQueue();
    state.demoStage = next;
    state.demoRunning = next >= 0;
    state.modal = null;

    if (next === -1) {
      state.page = "home";
      state.analysis.phase = "idle";
      state.analysis.thoughtIndex = 0;
      state.demoMessage = "欢迎使用南方资产智能信贷助手";
      render();
      return;
    }

    if (next === 0) {
      if (completed) {
        state.page = 'profile';
        state.profileTab = 'profile';
        state.demoRunning = false;
        state.modal = { title: '执行动作', description: '创建企业档案，并且生成现场尽调任务', action: 'create-customer', actionPrompt: true };
        render();
        return;
      }
      startFirstQa();
      return;
    }

    if (next === 1) {
      resetDueTasks();
      state.due.created = true;
      state.due.tab = "tasks";
      state.due.detailId = null;
      state.page = "due";
      state.demoMessage = "已自动创建企业档案并确认，正在查看现场任务";
      render();
      if (completed) return;
      state.demoTimer = window.setTimeout(function () {
        if (state.demoStage !== 1) return;
        state.demoMessage = "客户档案已创建 · 现场任务 0 / 9";
        render();
      }, 800);
      return;
    }

    if (next === 2) {
      resetDueTasks();
      state.due.created = true;
      state.due.dataWritten = false;
      state.due.demoCompleted = false;
      state.due.detailId = null;
      state.due.tab = "tasks";
      state.page = "due";
      state.demoMessage = "进入现场尽调任务，逐项核验生产线、订单与回款资料";
      render();
      return;
    }

    if (next === 3) {
      if (completed) {
        state.due.tasks.forEach(function (task) { task.status = '已核实'; task.uploaded = true; task.result = '已核实'; });
        state.due.created = true;
        state.due.dataWritten = true;
        state.due.demoCompleted = true;
      }
      if (state.due.demoCompleted) {
        state.due.tab = "tasks";
        state.page = "due";
        state.demoMessage = "现场尽调已完成，9 项资料已回传并全部核实";
        render();
        state.demoTimer = window.setTimeout(scrollDueToEnd, 80);
      } else {
        startDueCompletionAnimation();
      }
      return;
    }

    if (next === 4) {
      state.product.selected = "working";
      state.product.amount = 1000;
      state.page = "product";
      state.demoMessage = "资料已回传 · 正在匹配精密装备经营周转贷与建议额度";
      render();
      return;
    }

    if (next === 5) {
      state.demoMessage = "产品与额度已确认，正在放款 1,000 万元";
      startDisbursementAnimation(lastRunId);
      return;
    }

    if (next === 6) {
      state.monitoring.judgement = {};
      state.monitoring.conclusion = "风险预警";
      state.monitoring.monitorAlertShown = false;
      state.monitoring.monitorManualReviewRequested = false;
      state.monitoring.monitorManualPhase = 'idle';
      state.monitoring.monitorRounds = [];
      state.monitoring.monitorSeq = -1;
      state.monitoring.monitorClockTs = 0;
      state.monitoring.monitorRoundStartedAt = 0;
      state.monitoring.monitorRoundStatus = 'idle';
      state.monitoring.monitoringLayer = -1;
      state.page = "analysis";
      state.analysis = { stage: 6, phase: "loading", title: "贷后监控", reply: "", thoughts: [] };
      state.demoMessage = "贷款已到账，正在持续贷后监控";
      render();
      return;
    }

    state.monitoring.judgement = { basis: "有变化", will: "需关注", ability: "存在缺口" };
    state.monitoring.conclusion = "风险预警";
    state.page = "restructuring";
    state.demoMessage = "风险信号已确认，进入风险处置方案设计";
    render();
  }

  function handleDemoKeydown(event) {
    if (event.repeat || event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    var tag = event.target && event.target.tagName;
    if ((tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") && !event.target.readOnly || (event.target && event.target.isContentEditable)) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      requestStep('ArrowDown');
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      requestStep('ArrowUp');
    }
  }

  function handleClick(event) {
    var modalAction = event.target.closest("[data-modal-action]");
    if (modalAction) {
      if (modalAction.dataset.modalAction === "cancel") { state.modal = null; render(); return; }
      var action = state.modal && state.modal.action;
      var modalChoice = modalAction.dataset.modalAction;
      state.modal = null;
      if (action === "monitor-risk-alert") {
        if (modalChoice === "view-monitor-detail") {
          state.page = "monitoring";
          state.demoRunning = false;
        }
        render();
        return;
      }
      if (action === "credit-confirmation") {
        if (modalChoice === "confirm") requestStep('ArrowDown');
        render();
        return;
      }
      if (action === "create-customer") { state.due.created = true; state.page = "due"; toast(modalChoice === "approve" ? "动作已审批，现场尽调任务已生成" : "动作已确认，现场尽调任务已生成"); return; }
      if (action === "submit-due") { state.due.dataWritten = true; toast("数据回写成功，企业画像与风险信息已更新"); return; }
      if (action === "confirm-product") { state.demoStage = 5; state.disbursementProgress = 0; startDisbursementAnimation(lastRunId); return; }
      if (action === "submit-judgement") { if (state.monitoring.conclusion === "风险预警" || state.monitoring.conclusion === "重大风险预警") { state.page = "restructuring"; toast("风险判断已提交，已启动风险缓释评估"); } else { toast("风险判断已提交，已加入客户档案"); } return; }
      if (action === "submit-plan") { state.restructuring.submitted = true; toast("已提交重组审批，后续跟踪任务已创建"); return; }
      return;
    }
    var target = event.target.closest("[data-action]");
    if (!target || target.disabled) return;
    var actionName = target.dataset.action;
    if (synchronized && ['start-credit-analysis', 'create-customer', 'go-product', 'confirm-product', 'go-monitoring', 'submit-judgement'].indexOf(actionName) >= 0) { requestStep('ArrowDown'); return; }
    if (synchronized && actionName === 'advance-credit-stage') { requestStep('ArrowDown'); return; }
    if (synchronized && actionName === 'back' && state.page !== 'product-detail' && state.due.detailId === null) { requestStep('ArrowUp'); return; }
    if (actionName === "start-credit-analysis") { setDemoStage(0); }
    else if (actionName === "view-deep-profile" || actionName === "view-created-profile") { clearDemoTimer(); clearPhoneReplyQueue(); state.page = "profile"; state.demoRunning = false; state.demoMessage = "企业档案已建立，可查看画像详情"; render(); }
    else if (actionName === "select-enterprise") { state.selectedEnterprise = target.dataset.id; render(); }
    else if (actionName === "view-profile") { if (state.selectedEnterprise) { state.page = "profile"; render(); } }
    else if (actionName === "back") { if (state.page === "analysis") { clearDemoTimer(); clearPhoneReplyQueue(); state.demoStage = -1; state.demoRunning = false; state.page = "home"; } else if (state.page === "profile") state.page = "tasks"; else if (state.page === "due") { state.due.detailId = null; state.page = "profile"; } else if (state.page === "product-detail") state.page = "product"; else if (state.page === "product") state.page = "due"; else if (state.page === "disbursement") state.page = "product"; else if (state.page === "monitoring") state.page = "disbursement"; else if (state.page === "restructuring") state.page = "monitoring"; render(); }
    else if (actionName === "profile-tab") { state.profileTab = target.dataset.tab; render(); }
    else if (actionName === "toggle-credential") { state.expandedCredential = Number(target.dataset.id); render(); }
    else if (actionName === "toggle-risk") { state.expandedRisk = Number(target.dataset.id); render(); }
    else if (actionName === "mark-risk") { toast("风险已加入现场尽调任务"); }
    else if (actionName === "start-credit-query") { startCreditQuery(); }
    else if (actionName === "credit-verification-complete") { window.parent.postMessage({ source: 'wm-credit-phone', type: 'wm-credit-verification-complete' }, window.location.origin); toast("征信核验结果已提交，正在同步天工端"); }
    else if (actionName === "credit-proof") { window.parent.postMessage({ source: 'wm-credit-phone', type: 'wm-credit-proof-action', action: 'upload' }, window.location.origin); toast("已打开证明材料上传任务"); }
    else if (actionName === "credit-proof-submit") { window.parent.postMessage({ source: 'wm-credit-phone', type: 'wm-credit-proof-action', action: 'submit' }, window.location.origin); toast("材料已接收：正在完整性检查、主体匹配与风险复核"); }
    else if (actionName === "rating-result") { window.parent.postMessage({ source: 'wm-credit-phone', type: 'wm-credit-rating-result', result: target.dataset.value }, window.location.origin); toast('评级结果已提交：' + target.dataset.value); }
    else if (actionName === "credit-proof-confirm") { window.parent.postMessage({ source: 'wm-credit-phone', type: 'wm-credit-proof-action', action: 'confirm' }, window.location.origin); toast("征信核验结果已确认，即将进入评级准入"); }
    else if (actionName === "create-customer") { showModal("是否创建客户档案？", "企业：珠海澜衡精密装备有限公司\n任务：授信前现场尽调", "create-customer"); }
    else if (actionName === "due-tab") { state.due.tab = target.dataset.tab; render(); }
    else if (actionName === "open-task") { state.due.detailId = Number(target.dataset.id); render(); }
    else if (actionName === "upload-material") { state.due.tasks[state.due.detailId].uploaded = true; state.due.tasks[state.due.detailId].status = "已上传"; toast("材料已上传，等待核验"); }
    else if (actionName === "task-result") { state.due.tasks[state.due.detailId].result = target.dataset.result; render(); }
    else if (actionName === "resolve-task") { state.due.tasks[state.due.detailId].resolved = true; toast("异常已记录处理意见，可继续提交"); }
    else if (actionName === "save-task") { var task = state.due.tasks[state.due.detailId]; if (!task.uploaded) { toast("请先上传照片或文件"); return; } if (!task.result) { toast("请选择核查结果"); return; } if (task.result === "已核实" || task.resolved) task.status = "已核实"; else task.status = "已上传"; state.due.detailId = null; render(); }
    else if (actionName === "submit-due") { showModal("提交现场核验结果？", "系统将检查 9 项任务、财务凭证、制造业特别项和异常处理意见。", "submit-due"); }
    else if (actionName === "go-product") { state.page = "product"; render(); }
    else if (actionName === "view-product-detail") { state.page = "product-detail"; render(); }
    else if (actionName === "select-product") { state.product.selected = target.dataset.id; render(); }
    else if (actionName === "toggle-product-reason") { event.stopPropagation(); state.product.expanded = state.product.expanded === target.dataset.id ? null : target.dataset.id; render(); }
    else if (actionName === "set-amount") { state.product.amount = Number(target.dataset.amount); render(); }
    else if (actionName === "confirm-product") { showModal("确认产品与额度？", "产品：" + (products.find(function (p) { return p.id === state.product.selected; }) || products[0]).name + "\n额度：" + state.product.amount + "万元\n期限：12个月 · 按季付息、分期还本", "confirm-product"); }
    else if (actionName === "refresh-disbursement") { state.disbursement = "funded"; toast("放款状态已更新"); }
    else if (actionName === "go-monitoring") { state.page = "monitoring"; render(); }
    else if (actionName === "toggle-signal") { state.monitoring.expandedSignal = Number(target.dataset.id); render(); }
    else if (actionName === "launch-check") { state.monitoring.checked[target.dataset.id] = true; toast("已创建人工核查任务"); }
    else if (actionName === "set-judgement") { state.monitoring.judgement[target.dataset.key] = target.dataset.value; render(); }
    else if (actionName === "set-conclusion") { state.monitoring.conclusion = target.dataset.value; render(); }
    else if (actionName === "submit-judgement") { showModal("提交经理风险判断？", "系统提示仅作为参考，提交后将把人工判断写入客户档案。", "submit-judgement"); }
    else if (actionName === "set-condition") { state.restructuring.condition[target.dataset.key] = target.dataset.value; render(); }
    else if (actionName === "set-plan") { state.restructuring.plan = target.dataset.plan; render(); }
    else if (actionName === "save-plan") { state.restructuring.draftSaved = true; toast("方案草案已保存"); }
    else if (actionName === "submit-plan") { showModal("是否提交重组审批？", "方案类型：" + state.restructuring.plan + "\n预计回收本金：1,000万元\n预计处置周期：" + state.restructuring.term + "个月", "submit-plan"); }
  }

  function handleInput(event) {
    var input = event.target.dataset.input;
    if (!input) return;
    if (input === "search" && state.search !== event.target.value) {
      state.search = event.target.value;
      var cursor = event.target.selectionStart;
      render();
      var searchField = screen.querySelector('[data-input="search"]');
      searchField.focus({ preventScroll: true });
      searchField.setSelectionRange(cursor, cursor);
    }
    else if (input === "industry") { state.industry = event.target.value; render(); }
    else if (input === "status") { state.status = event.target.value; render(); }
    else if (input === "task-note" && state.due.detailId !== null) state.due.tasks[state.due.detailId].note = event.target.value;
    else if (input === "amount") { state.product.amount = Number(event.target.value || 0); }
    else if (input === "term") { state.restructuring.term = Number(event.target.value || 0); }
    else if (input === "firstPaydown") { state.restructuring.firstPaydown = Number(event.target.value || 0); }
  }

  window.addEventListener('bank-demo-locale-change', function () {
    if (state.analysis.reply || state.analysis.phase === 'input') render();
  });
  window.addEventListener("keydown", handleDemoKeydown);
  window.addEventListener("message", handleHostSyncMessage);
  window.CreditPhone = { replay: function () { setDemoStage(-1); }, startFirstQa: startFirstQa };
  setDemoStage(-1);
  if (synchronized) window.parent.postMessage({ source: 'wm-credit-phone', type: 'wm-credit-ready' }, window.location.origin);
}());
