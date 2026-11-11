(function () {
  var screen = document.getElementById("phone-screen");
  if (!screen) return;

  var params = new URLSearchParams(window.location.search);
  if (params.get("mode") === "credit") {
    var creditScript = document.createElement("script");
    creditScript.src = "./credit-app.js?v=credit-approval-v11";
    document.head.appendChild(creditScript);
    return;
  }
  var autoplay = params.get("autoplay") !== "0";
  var market = window.PhoneMarketContent;
  var question = market.question;
  var answerChunks = market.answerChunks;
  var thoughts = market.thoughts;
  var sourceCards = [
    { number: "01", sourceClass: "source-card-01" },
    { number: "02", sourceClass: "source-card-02" }
  ];
  var taskTitles = ["验证生产线数量", "验证真实成交价格", "验证客户投资回报", "测算目标企业SOM", "建立动态跟踪机制"];
  var resultItems = market.tasks.map(function (task, index) {
    return [taskTitles[index], "工业AI视觉检测 · 投研待办", task];
  });

  function nowTime() {
    return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  }

  function dateLabel() {
    var date = new Date();
    return (date.getMonth() + 1) + "月" + date.getDate() + "日  星期" + "日一二三四五六"[date.getDay()];
  }

  function wait(ms) { return new Promise(function (resolve) { window.setTimeout(resolve, ms); }); }

  function scrollConversation(root) {
    var view = root.querySelector(".conversation-view");
    if (view) view.scrollTop = view.scrollHeight;
  }

  function statusBar(theme) {
    var bar = document.createElement("div");
    bar.className = "system-bar " + (theme === "dark" ? "home-status" : "light-status");
    bar.innerHTML = '<span class="system-time">' + nowTime() + '</span><span class="system-right"><svg class="status-svg" viewBox="0 0 24 24" aria-label="静音闹钟"><path d="M7 10a5 5 0 0 1 10 0c0 4 2 4 2 6H5c0-2 2-2 2-6Z" fill="none" stroke="currentColor" stroke-linejoin="round"/><path d="M9.5 19h5M4 4l16 16M6 3 4 5M18 3l2 2" fill="none" stroke="currentColor" stroke-linecap="round"/></svg><svg class="status-svg" viewBox="0 0 24 24" aria-label="Wi-Fi"><path d="M3 8.5a15 15 0 0 1 18 0M6.5 12a9.5 9.5 0 0 1 11 0M10 15.5a4.2 4.2 0 0 1 4 0" fill="none" stroke="currentColor" stroke-linecap="round"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/></svg><span class="system-icon battery-icon"></span></span>';
    return bar;
  }

  function rootView(view, theme) {
    var root = document.createElement("div");
    root.className = "simulator-root";
    root.appendChild(statusBar(theme || "light"));
    root.appendChild(view);
    return root;
  }

  function mount(view, theme) {
    screen.replaceChildren(rootView(view, theme));
    return screen.firstElementChild;
  }

  function appHeader() {
    return '<header class="app-header"><span class="hamburger" aria-hidden="true"></span><span class="header-center"><span class="app-brand-mini" aria-label="南方资产"></span><span class="header-title">新对话</span></span><span class="new-chat" aria-hidden="true">+</span></header>';
  }

  function keyboard() {
    return '<div class="keyboard" aria-hidden="true"><img class="keyboard-reference" src="./assets/keyboard-reference.png" alt="" /></div>';
  }

  function agentHome(showKeyboard) {
    var view = document.createElement("div");
    view.className = "app-view" + (showKeyboard ? " keyboard-visible" : "");
    view.innerHTML = appHeader() + '<main class="agent-body"><div class="agent-hero"><img class="southasset-logo" src="./assets/south-asset-logo.png" alt="南方资产"/><h1 class="agent-title">你好！我是南方资产智能助手</h1><p class="agent-copy">我可以结合公司研究和项目材料，测算市场空间、比较投资方向，并整理尽调任务。</p></div><div class="quick-actions"><span class="quick-chip">市场研判</span><span class="quick-chip">投资方向</span></div><div class="composer"><div class="composer-input" id="composer-text">请输入投资项目或研究问题</div><div class="composer-tools"><div class="composer-left"><span class="round-add">+</span><span class="model-pill">市场空间测算</span></div><button class="send-button" aria-label="发送"></button></div></div>' + keyboard();
    return view;
  }

  function defaultInputArea(enableContinue, enablePreview) {
    var sendControl = enableContinue
      ? '<button class="send-button default-enter-button" data-card-continue aria-label="继续"' + (enablePreview && !autoplay ? ' disabled data-preview-required' : '') + '></button>'
      : '<span class="send-button" aria-hidden="true"></span>';
    return '<div class="default-input-area"><div class="default-input-chips"><span>✦ 市场研判</span><span>✦ 投资方向</span></div><div class="default-input-box"><div class="default-input-placeholder">请输入投资项目或研究问题</div><div class="default-input-tools"><span class="round-add">+</span><span class="model-pill">市场空间测算</span>' + sendControl + '</div></div></div>';
  }

  function conversationView() {
    var view = document.createElement("div");
    view.className = "app-view";
    view.innerHTML = appHeader() + '<main class="conversation-view"><div class="conversation-meta"><span class="agent-label">南方资产智能助手</span><span>' + nowTime() + '</span></div><div class="message-row user"><div class="user-message">' + question + '</div><span class="message-avatar user-avatar">User</span></div><div class="assistant-row"><span class="message-avatar agent-avatar" aria-label="南方资产"></span><section class="thinking-card"><div class="thinking-head"><span>南方资产智能助手 · 调用本体空间</span><span class="thinking-time">思考用时 4秒</span></div><div id="thought-lines"></div></section></div><section class="answer-card" id="answer-card" hidden></section></main>' + defaultInputArea();
    return view;
  }

  function renderAnswer(card, chunks) {
    card.hidden = false;
    card.innerHTML = '<p class="answer-note">第三次问答 · Demo演示数据</p>' + chunks.join("");
  }

  function cardsView(index) {
    var view = document.createElement("div");
    view.className = "cards-view";
    var item = sourceCards[index];
    var dots = sourceCards.map(function (sourceItem, dotIndex) { return '<span class="progress-dot' + (dotIndex === index ? " active" : "") + '"></span>'; }).join("");
    var previewControl = item.number === "02" ? '<button class="card-preview-button" data-card-preview>预览</button>' : '';
    view.innerHTML = appHeader() + '<div class="carousel-top"><span class="carousel-label">市场研判结果 · ' + item.number + ' / 02</span><span class="carousel-progress">' + dots + '</span></div><div class="source-card-viewport"><div class="source-card-canvas"><div class="source-card-crop"><iframe class="source-card-frame ' + item.sourceClass + '" src="./assets/customer-cards-source.html?v=market-q3-20260909" title="市场研判卡片 ' + item.number + '"></iframe></div></div>' + previewControl + '<button class="answer-review-button" data-answer-review>完整回答</button></div>' + defaultInputArea(item.number === "02", item.number === "02");
    view.querySelector("[data-answer-review]").addEventListener("click", showAnswerReview);
    return view;
  }

  function showAnswerReview() {
    var overlay = document.createElement("div");
    overlay.className = "answer-review-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "第三次完整市场研判回答");
    overlay.innerHTML = '<section class="answer-review-dialog"><header><strong>第三次问答 · 市场研判</strong><button type="button" aria-label="关闭完整回答">关闭</button></header><div class="answer-review-scroll"><p class="review-question"></p><article class="answer-card"></article></div></section>';
    overlay.querySelector(".review-question").textContent = question;
    renderAnswer(overlay.querySelector(".answer-card"), answerChunks);
    overlay.querySelector("button").addEventListener("click", function () { overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function fitSourceCard(root) {
    var viewport = root.querySelector(".source-card-viewport");
    var canvas = root.querySelector(".source-card-canvas");
    if (!viewport || !canvas) return;
    var scale = Math.min(viewport.clientWidth / 450, (viewport.clientHeight - 42) / 620);
    canvas.style.transform = "scale(" + scale + ")";
    canvas.style.left = Math.max(0, (viewport.clientWidth - 450 * scale) / 2) + "px";
  }

  function waitForCardContinue(root) {
    return new Promise(function (resolve) {
      var timer;
      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        resolve();
      }
      var button = root.querySelector("[data-card-continue]");
      var previewButton = root.querySelector("[data-card-preview]");
      if (!button) return resolve();
      if (previewButton) {
        previewButton.addEventListener("click", function () {
          showCardPreview(function () {
            button.disabled = false;
            button.classList.add("unlocked");
          });
        });
      }
      button.addEventListener("click", async function () {
        button.classList.add("pressed");
        await wait(180);
        finish();
      }, { once: true });
      if (autoplay) timer = window.setTimeout(finish, 3500);
    });
  }

  function showCardPreview(onClose) {
    if (document.querySelector(".card-preview-overlay")) return;
    var overlay = document.createElement("div");
    overlay.className = "card-preview-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = '<section class="card-preview-dialog"><header class="card-preview-header"><div><strong>01 / 02 市场研判卡片预览</strong><span>市场空间研判 · 调优增量</span></div><button class="card-preview-close" aria-label="关闭预览">X</button></header><div class="card-preview-stage"><div class="card-preview-canvas"><iframe class="card-preview-frame" src="./assets/customer-cards-source.html?v=market-q3-20260909" title="01和02市场研判卡片放大预览"></iframe></div></div></section>';
    document.body.appendChild(overlay);
    var stage = overlay.querySelector(".card-preview-stage");
    var canvas = overlay.querySelector(".card-preview-canvas");
    function fitPreview() {
      var scale = Math.min(stage.clientWidth / 956, stage.clientHeight / 660);
      canvas.style.transform = "scale(" + scale + ")";
      canvas.style.left = Math.max(0, (stage.clientWidth - 956 * scale) / 2) + "px";
      canvas.style.top = Math.max(0, (stage.clientHeight - 660 * scale) / 2) + "px";
    }
    function closePreview() {
      window.removeEventListener("resize", fitPreview);
      overlay.remove();
      if (onClose) onClose();
    }
    overlay.querySelector(".card-preview-close").addEventListener("click", closePreview);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) closePreview(); });
    window.addEventListener("resize", fitPreview);
    window.requestAnimationFrame(fitPreview);
  }

  function ticketConfirmView() {
    var view = document.createElement("div");
    view.className = "ticket-view";
    var tasks = market.tasks.map(function (task, index) {
      return '<div class="ticket-task ticket-reveal" data-ticket-reveal><b>0' + (index + 1) + ' ' + taskTitles[index] + '</b><p>' + task + '</p></div>';
    }).join("");
    view.innerHTML = appHeader() + '<main class="ticket-conversation"><div class="assistant-row ticket-assistant-row"><span class="message-avatar agent-avatar" aria-label="南方资产"></span><div class="ticket-message"><section class="ticket-banner ticket-reveal" data-ticket-reveal><h2>下一步投研任务</h2><p>将第三次市场研判转为五项尽调待办，保留核验口径与证据。</p></section><section class="ticket-panel"><h3 class="ticket-reveal" data-ticket-reveal>工业AI视觉检测项目</h3><div class="ticket-tasks">' + tasks + '</div><button class="confirm-dispatch ticket-reveal" data-ticket-reveal>生成尽调清单</button></section></div></div></main>' + defaultInputArea();
    return view;
  }

  async function animateTicketOutput(root) {
    var parts = Array.from(root.querySelectorAll("[data-ticket-reveal]"));
    for (var i = 0; i < parts.length; i += 1) {
      parts[i].classList.add("visible");
      await wait(i === 0 ? 320 : 210);
    }
  }

  function loadingView() {
    var view = document.createElement("div");
    view.className = "loading-view";
    view.innerHTML = appHeader() + '<section class="loading-content"><div class="loading-ring"></div><h2>正在整理投研任务</h2><p>汇总产线、价格、客户ROI、企业SOM与动态跟踪任务</p><div class="loading-progress"><span></span></div><div class="loading-status" aria-live="polite">正在汇总第三次研判结果</div><div class="loading-steps"><span class="loading-step" data-loading-step>核对任务与研判依据</span><span class="loading-step" data-loading-step>整理五项尽调待办</span><span class="loading-step" data-loading-step>生成投研任务清单</span></div></section>' + defaultInputArea();
    return view;
  }

  async function animateDispatchLoading(root) {
    var steps = Array.from(root.querySelectorAll("[data-loading-step]"));
    var progress = root.querySelector(".loading-progress span");
    var status = root.querySelector(".loading-status");
    for (var i = 0; i < steps.length; i += 1) {
      steps[i].classList.add("active");
      status.textContent = "正在" + steps[i].textContent;
      progress.style.width = Math.round(((i + 1) / steps.length) * 100) + "%";
      await wait(750);
      steps[i].classList.remove("active");
      steps[i].classList.add("done");
    }
    status.textContent = "投研任务清单已整理";
    await wait(420);
  }

  function resultView() {
    var view = document.createElement("div");
    view.className = "result-view";
    var rows = resultItems.map(function (item) {
      return '<article class="result-item' + (item[3] ? " denied" : "") + '"><div class="result-item-top"><span>' + item[0] + '</span><span class="result-status">' + (item[3] ? "无权限" : "待核验") + '</span></div><div class="result-item-body">' + item[1] + '</div><div class="result-item-note">' + item[2] + '</div><span class="result-mark">' + (item[3] ? "×" : "·") + '</span></article>';
    }).join("");
    view.innerHTML = appHeader() + '<div class="result-scroll"><section class="result-banner"><h2>下一步投研任务</h2><p>五项任务已整理，核验结果完成后再更新投资判断。</p></section><section class="result-panel"><div class="result-heading"><span>五项尽调待办</span><span class="done-badge">已整理</span></div><button class="result-answer-review" data-answer-review>查看完整市场研判</button>' + rows + '</section></div>' + defaultInputArea();
    view.querySelector("[data-answer-review]").addEventListener("click", showAnswerReview);
    return view;
  }

  async function typeQuestion(root) {
    var input = root.querySelector("#composer-text");
    if (!input) return;
    input.classList.add("filled");
    input.textContent = question;
    await wait(1000);
    root.querySelector(".send-button").classList.add("pressed");
    await wait(180);
  }

  async function play() {
    var root = mount((function () { var view = document.createElement("div"); view.className = "home-view"; view.innerHTML = '<div class="home-wallpaper"></div><div class="home-clock"><strong>' + nowTime() + '</strong><span>' + dateLabel() + '  上午</span></div><div class="home-weather"><span class="weather-cloud"></span><em>晴 · 15°C</em></div><div class="app-grid"><div class="app-tile"><span class="app-icon ios-sprite ios-messages" aria-hidden="true"></span><span>信息</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-whatsapp" aria-hidden="true"></span><span>WhatsApp</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-camera" aria-hidden="true"></span><span>相机</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-clock" aria-hidden="true"></span><span>时钟</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-maps" aria-hidden="true"></span><span>地图</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-settings" aria-hidden="true"></span><span>设置</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-photos" aria-hidden="true"></span><span>照片</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-files" aria-hidden="true"></span><span>文件</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-instagram" aria-hidden="true"></span><span>Instagram</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-podcasts" aria-hidden="true"></span><span>Podcasts</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-youtube" aria-hidden="true"></span><span>YouTube</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-news" aria-hidden="true"></span><span>News</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-fitness" aria-hidden="true"></span><span>Fitness</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-wallet" aria-hidden="true"></span><span>Wallet</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-reminders" aria-hidden="true"></span><span>提醒事项</span></div><div class="app-tile"><span class="app-icon ios-sprite ios-chase" aria-hidden="true"></span><span>Chase</span></div></div><div class="home-dock"><div class="app-tile"><span class="app-icon ios-sprite ios-phone" aria-hidden="true"></span></div><div class="app-tile"><span class="app-icon ios-sprite ios-mail" aria-hidden="true"></span></div><div class="app-tile"><span class="app-icon ios-sprite ios-safari" aria-hidden="true"></span></div><div class="app-tile"><span class="app-icon ios-sprite ios-music" aria-hidden="true"></span></div></div>'; return view; })(), "dark");
    var launchIcon = root.querySelector(".ios-chase");
    if (launchIcon) {
      launchIcon.classList.remove("ios-sprite", "ios-chase");
      launchIcon.classList.add("southasset");
      var southassetTile = launchIcon.closest(".app-tile");
      southassetTile.classList.add("southasset-entry");
      var southassetBadge = document.createElement("span");
      southassetBadge.className = "app-badge southasset-badge";
      southassetBadge.textContent = "3";
      southassetTile.appendChild(southassetBadge);
      launchIcon.nextElementSibling.textContent = "南方资产";
    }
    await wait(1800);
    var homeView = root.querySelector(".home-view");
    if (homeView) homeView.classList.add("opening-app");
    await wait(620);
    root = mount(agentHome(false), "light");
    await wait(900);
    root = mount(agentHome(true), "light");
    await typeQuestion(root);
    root = mount(conversationView(), "light");
    var thoughtContainer = root.querySelector("#thought-lines");
    for (var t = 0; t < thoughts.length; t += 1) {
      var line = document.createElement("p");
      line.className = "thinking-line";
      line.textContent = thoughts[t];
      thoughtContainer.appendChild(line);
      scrollConversation(root);
      await wait(760);
    }
    var answer = root.querySelector("#answer-card");
    for (var chunkIndex = 0; chunkIndex < answerChunks.length; chunkIndex += 1) {
      renderAnswer(answer, answerChunks.slice(0, chunkIndex + 1));
      scrollConversation(root);
      await wait(chunkIndex === 0 ? 550 : 760);
    }
    var summary = document.createElement("div");
    summary.className = "summary-loading";
    summary.innerHTML = '<span class="summary-spinner"></span><div><strong>正在生成市场研判可视化摘要</strong><p>汇总同业校验、产线优先级与动态重算</p></div><span>•••</span>';
    root.querySelector(".conversation-view").appendChild(summary);
    scrollConversation(root);
    await wait(1000);
    for (var cardIndex = 0; cardIndex < sourceCards.length; cardIndex += 1) {
      root = mount(cardsView(cardIndex), "light");
      fitSourceCard(root);
      if (cardIndex === 0) await wait(2200);
      else await waitForCardContinue(root);
    }
    root = mount(ticketConfirmView(), "light");
    var confirm = root.querySelector(".confirm-dispatch");
    var dispatched = false;
    var dispatchDone = new Promise(function (resolve) {
      confirm.addEventListener("click", async function () {
        if (dispatched) return;
        dispatched = true;
        confirm.classList.add("pressed");
        await wait(260);
        root = mount(loadingView(), "light");
        await animateDispatchLoading(root);
        mount(resultView(), "light");
        resolve();
      });
    });
    await animateTicketOutput(root);
    await wait(900);
    confirm.click();
    await dispatchDone;
  }

  function load(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("load failed");
      return res.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      screen.replaceChildren();
      Array.from(doc.head.querySelectorAll("style, link[rel=stylesheet]")).forEach(function (node) { screen.appendChild(document.importNode(node, true)); });
      Array.from(doc.body.childNodes).forEach(function (node) { screen.appendChild(document.importNode(node, true)); });
    });
  }

  window.PhoneTemplate = { load: load, replay: play };
  window.setInterval(function () {
    var current = nowTime();
    document.querySelectorAll(".system-time").forEach(function (node) { node.textContent = current; });
    document.querySelectorAll(".home-clock strong").forEach(function (node) { node.textContent = current; });
  }, 1000);
  if (params.get("screen")) load(params.get("screen"));
  else play();
})();
