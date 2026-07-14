document.addEventListener('DOMContentLoaded', () => {

  /* =========================
     DOM references
     ========================= */
  const packSelect = document.getElementById('packSelect');
  const packSelectCard = document.getElementById('packSelectCard');
  const startQuizBtn = document.getElementById('startQuizBtn');
  const startAdvancedQuizBtn = document.getElementById('startAdvancedQuizBtn');
  const quizCard = document.getElementById('quizCard');
  const quizRef = document.getElementById('quizRef');
  const inputTitle = document.getElementById('inputTitle');
  const inputVerse = document.getElementById('inputVerse');
  const submitAnswerBtn = document.getElementById('submitAnswerBtn');
  const skipBtn = document.getElementById('skipBtn');
  const reviewCard = document.getElementById('reviewCard');
  const reviewHeading = document.getElementById('reviewHeading');
  const correctTitle = document.getElementById('correctTitle');
  const correctVerse = document.getElementById('correctVerse');
  const userTitleEl = document.getElementById('userTitle');
  const userVerseBox = document.getElementById('userVerseBox');
  const nextBtn = document.getElementById('nextBtn');
  const retryBtn = document.getElementById('retryBtn');
  const backBtn = document.getElementById('backBtn');
  const mainMenu = document.getElementById("mainMenu");
  const goToPackSelectBtn = document.getElementById("goToPackSelectBtn");
  const backToMainBtn = document.getElementById("backToMainBtn");
  const viewPacksBtn = document.getElementById("viewPacksBtn");
  const viewPacksCard = document.getElementById("viewPacksCard");
  const packsContainer = document.getElementById("packsContainer");
  const backToMenuBtn = document.getElementById("backToMenuBtn");
  const backToMenuBtn2 = document.getElementById("backToMenuBtn2");

  if (!packSelect || !quizCard || !reviewCard || !mainMenu) {
    console.error('Required DOM elements missing. Please ensure packSelect, quizCard, reviewCard, mainMenu exist.');
  }

  /* =========================
     Utilities
     ========================= */
 
  if (packsContainer) {
  packsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".flip-card");
  if (card) {
    card.classList.toggle("flipped");
  }
  });
  } 
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function tokenize(s) { return s ? s.trim().split(/\s+/) : []; }
  function normalizeWord(w) {
    return (w || '')
      .replace(/[;\-]/g, '')      // remove semicolons and dashes
      .replace(/[\W_]+/g, '')     // remove other punctuation
      .toLowerCase();
  }

  function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function strike(text) { return (text||'').split('').map(c => c + '\u0336').join(''); }

  function lcsIndexPairs(a, b) {
    const n = a.length, m = b.length;
    const dp = Array.from({length: n+1}, () => Array(m+1).fill(0));
    for (let i = n-1; i >= 0; i--) {
      for (let j = m-1; j >= 0; j--) {
        if (normalizeWord(a[i]) === normalizeWord(b[j])) dp[i][j] = 1 + dp[i+1][j+1];
        else dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
      }
    }
    let i=0, j=0;
    const pairs = [];
    while (i<n && j<m) {
      if (normalizeWord(a[i]) === normalizeWord(b[j])) { pairs.push([i,j]); i++; j++; }
      else if (dp[i+1][j] >= dp[i][j+1]) i++;
      else j++;
    }
    return pairs;
  }

function highlightComparison(correct, user) {
  const cw = tokenize(correct);
  const uw = tokenize(user);
  const dp = Array(cw.length + 1).fill(null).map(() => Array(uw.length + 1).fill(0));

  for (let i = 0; i <= cw.length; i++) dp[i][0] = i;
  for (let j = 0; j <= uw.length; j++) dp[0][j] = j;

  for (let i = 1; i <= cw.length; i++) {
    for (let j = 1; j <= uw.length; j++) {
      const cost = normalizeWord(cw[i - 1]) === normalizeWord(uw[j - 1]) ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  let i = cw.length, j = uw.length;
  let result = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalizeWord(cw[i - 1]) === normalizeWord(uw[j - 1])) {
      result.unshift(`<span class="word ok">${escapeHtml(uw[j - 1])}</span>`);
      i--; j--;
    }
    else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
      // extra word by user
      result.unshift(`<span class="word extra">${strike(escapeHtml(uw[j - 1]))}</span>`);
      j--;
    }
    else if (i > 0) {
      // missing correct word
      result.unshift(`<span class="word missing">${escapeHtml(cw[i - 1])}</span>`);
      i--;
    }
  }

  return result.join(" ");
}


  /* =========================
     Populate pack select
     ========================= */
  function populatePackSelect() {
    if (!packSelect) return;
    packSelect.innerHTML = "";
    for (let packName in VERSE_PACKS) {
      const opt = document.createElement("option");
      opt.value = packName;
      opt.textContent = packName;
      packSelect.appendChild(opt);
    }
  }

  /* =========================
     Sessions
     ========================= */
  let session = null;
  let advSession = null;
  let quizMode = "normal"; // "normal" or "advanced"

  /* Original Quiz */
  function renderNext() {
    if (!session || !session.remaining || session.remaining.length === 0) {
      alert("You have finished all verses in this pack!");
      backToMain();
      return;
    }
    session.current = session.remaining.pop();
    quizRef.textContent = session.current.ref;
    inputTitle.value = "";
    inputVerse.value = "";
  }

  function showReview(uTitle, uVerse) {
    if (quizCard) quizCard.style.display = 'none';
    if (reviewCard) reviewCard.style.display = 'block';

    const c = session && session.current;
    if (!c) { console.error('No current session.current'); return; }

    reviewHeading.textContent = c.ref || '';
    correctTitle.textContent = c.title || '';
    correctVerse.textContent = c.verse || '';

    userTitleEl.textContent = uTitle || "—";
    userVerseBox.innerHTML = highlightComparison(c.verse, uVerse);

    if ((uTitle||'').trim().toLowerCase() === (c.title||'').trim().toLowerCase()) {
      userTitleEl.style.color = "black";
    } else {
      userTitleEl.style.color = "blue";
    }
  }

  /* =========================
     Back to main
     ========================= */
  function backToMain() {
    if (reviewCard) reviewCard.style.display = 'none';
    if (quizCard) quizCard.style.display = 'none';
    if (packSelectCard) packSelectCard.style.display = 'none';
    if (viewPacksCard) viewPacksCard.style.display = 'none';
    if (mainMenu) mainMenu.style.display = 'block';

    quizMode = "normal";
    if (packSelect) packSelect.multiple = false;
    populatePackSelect();
    session = null;
    advSession = null;
  }

  /* =========================
     Start Quiz & Advanced Quiz
     ========================= */
  // NORMAL quiz: one pack
  startQuizBtn && (startQuizBtn.onclick = () => {
    if (!packSelect) return;

    const selectedOptions = [...packSelect.selectedOptions].map(o => o.value);
    const selected = selectedOptions.length ? selectedOptions : Object.keys(VERSE_PACKS);

    if (quizMode === "normal") {
        const packName = selected[0];
        const pack = VERSE_PACKS[packName];
        if (!pack || !pack.length) { alert("No verses in this pack."); return; }

        session = { pack, remaining: shuffle(pack.slice()), current: null };

        packSelectCard.style.display = "none";
        reviewCard.style.display = "none";
        quizCard.style.display = "block";

        renderNext();
    } else if (quizMode === "advanced") {
        // ADVANCED: multiple packs, 12 verses
        let pool = [];
        selected.forEach(packName => { pool = pool.concat(VERSE_PACKS[packName] || []); });

        if (!pool.length) { alert("No verses available for selected packs."); return; }

        pool = shuffle(pool).slice(0, 12); 

        advSession = { verses: pool, index: 0, results: [], finished: false };

        packSelectCard.style.display = "none";
        skipBtn.style.display = "none";
        quizCard.style.display = "block";

        loadAdvancedQuestion();
    }
  });

  // SMC / Advanced quiz button
  startAdvancedQuizBtn && (startAdvancedQuizBtn.onclick = () => {
    quizMode = "advanced";
    if (!packSelect || !packSelectCard || !mainMenu) return;

    packSelect.multiple = true; 
    mainMenu.style.display = "none";
    packSelectCard.style.display = "block";
    populatePackSelect();
  });

  /* =========================
     Submit / Skip / Next / Retry / Back
     ========================= */
  submitAnswerBtn && (submitAnswerBtn.onclick = () => {
    if (advSession && !advSession.finished) submitAdvancedAnswer();
    else if (session && session.current) showReview(inputTitle.value.trim(), inputVerse.value.trim());
    else alert('No active quiz. Choose a pack or start Advanced Quiz.');
  });

  skipBtn && (skipBtn.onclick = () => {
    if (advSession && !advSession.finished) submitAdvancedAnswer();
    else showReview("", "");
  });

  nextBtn && (nextBtn.onclick = () => {
    if (reviewCard) reviewCard.style.display = 'none';
    if (quizCard) quizCard.style.display = 'block';
    renderNext();
  });

  retryBtn && (retryBtn.onclick = () => {
    if (!session || !session.current) return;
    session.remaining.push(session.current);
    if (reviewCard) reviewCard.style.display = 'none';
    if (quizCard) quizCard.style.display = 'block';
    renderNext();
  });

  backBtn && (backBtn.onclick = () => backToMain());

  goToPackSelectBtn && (goToPackSelectBtn.onclick = () => {
    if (mainMenu) mainMenu.style.display = "none";
    if (packSelectCard) packSelectCard.style.display = "block";
    populatePackSelect();
  });

  backToMainBtn && (backToMainBtn.onclick = backToMain);
  viewPacksBtn && (viewPacksBtn.onclick = () => {
    if (packSelectCard) packSelectCard.style.display="none";
    if (mainMenu) mainMenu.style.display="none";
    if (viewPacksCard) viewPacksCard.style.display="block";
    renderPacks();
  });

  backToMenuBtn && (backToMenuBtn.onclick = backToMain);
  backToMenuBtn2 && (backToMenuBtn2.onclick = backToMain);

  /* =========================
     Packs container
     ========================= */
  function renderPacks() {
    if (!packsContainer) return;
    packsContainer.innerHTML = "";
    for (const packName in VERSE_PACKS) {
      const packCard = document.createElement("div");
      packCard.className = "pack-card";
      packCard.innerHTML = `<h3>${escapeHtml(packName)}</h3>`;
      packCard.onclick = () => showPackVerses(packName);
      packsContainer.appendChild(packCard);
    }
  }

  function createFlipCard(v) {
  const wrapper = document.createElement("div");
  wrapper.className = "flip-card";

  wrapper.innerHTML = `
    <div class="flip-inner">
      
      <!-- FRONT (HIDDEN) -->
      <div class="flip-front">
        ${escapeHtml(v.ref || '')}
      </div>

      <!-- BACK (REVEALED) -->
      <div class="flip-back">
        <h4>${escapeHtml(v.title || '')}</h4>
        <p><strong>${escapeHtml(v.ref || '')}</strong></p>
        <p>${escapeHtml(v.verse || '')}</p>
      </div>

    </div>
  `;

  return wrapper;
  }
  function showPackVerses(packName) {
    const pack = VERSE_PACKS[packName] || [];
    if (!packsContainer) return;
    packsContainer.innerHTML = "";

    const topBackBtn = document.createElement("button");
    topBackBtn.textContent = "← Back to Packs";
    topBackBtn.className = "ghost";
    topBackBtn.onclick = renderPacks;
    packsContainer.appendChild(topBackBtn);

    const title = document.createElement("h3");
    title.textContent = packName;
    packsContainer.appendChild(title);

    pack.forEach(v => {
     const flipCard = createFlipCard(v);
     packsContainer.appendChild(flipCard);
    });

    const bottomBackBtn = document.createElement("button");
    bottomBackBtn.textContent = "← Back to Packs";
    bottomBackBtn.className = "ghost";
    bottomBackBtn.onclick = renderPacks;
    packsContainer.appendChild(bottomBackBtn);
  }

  /* =========================
     Advanced Quiz Functions
     ========================= */
  function loadAdvancedQuestion() {
    if (!advSession) return;
    const v = advSession.verses[advSession.index];
    quizRef.textContent = v.ref || '';
    inputTitle.value = '';
    inputVerse.value = '';
  }

  function scoreAnswer(refTitle, refText, userTitle, userText) {
    const titlePenalty = (normalizeWord(userTitle||'') === normalizeWord(refTitle||'')) ? 0 : 1;
    const refWords = tokenize(refText||'');
    const userWords = tokenize(userText||'');
    const pairs = lcsIndexPairs(refWords, userWords);
    const matchedRef = new Set(pairs.map(p=>p[0]));
    const matchedUser = new Set(pairs.map(p=>p[1]));
    const missing = refWords.filter((w,i)=>!matchedRef.has(i));
    const extras = userWords.filter((w,j)=>!matchedUser.has(j));
    const wrong = Math.min(missing.length, extras.length);
    const bodyPenalty = Math.min(wrong + Math.max(0, missing.length - wrong) + Math.max(0, extras.length - wrong), 4);
    const totalPenalty = Math.min(titlePenalty + bodyPenalty, 5);
    return { titlePenalty, bodyPenalty, totalPenalty };
  }

  function submitAdvancedAnswer() {
    if (!advSession) return;
    const v = advSession.verses[advSession.index];
    const userTitle = (inputTitle.value || '').trim();
    const userVerse = (inputVerse.value || '').trim();
    const sc = scoreAnswer(v.title, v.verse, userTitle, userVerse);

    advSession.results.push({
      ref:v.ref, title:v.title, verse:v.verse,
      userTitle, userVerse,
      score:-sc.totalPenalty,
      highlighted: highlightComparison(v.verse, userVerse)
    });

    advSession.index++;
    if (advSession.index >= advSession.verses.length) {
      advSession.finished = true;
      showAdvancedSummary();
    } else loadAdvancedQuestion();
  }

 /* =========================================
   NEW Dedicated SMC Results Page Rendering
   ========================================= */
/* =========================================
   NEW Dedicated SMC Results Page Rendering
   ========================================= */
function showAdvancedSummary() {
  if (!advSession) return;

  // Hide all other cards
  if (reviewCard) reviewCard.style.display = 'none';
  if (quizCard) quizCard.style.display = 'none';
  if (packSelectCard) packSelectCard.style.display = 'none';
  if (viewPacksCard) viewPacksCard.style.display = 'none';
  if (mainMenu) mainMenu.style.display = 'none';

  const smcCard = document.getElementById("smcResultsCard");
  const smcContainer = document.getElementById("smcResultsContainer");
  if (!smcCard || !smcContainer) {
    console.error("SMC Results Card missing.");
    return;
  }

  // Build HTML with classes for wrong titles so we can style them
  let totalScore = 0;
  let html = "";

  advSession.results.forEach((r, idx) => {
    totalScore += r.score;

    // Determine whether user's title is correct (case-insensitive, normalized)
    const userTitleNorm = (r.userTitle || "").trim().toLowerCase();
    const correctTitleNorm = (r.title || "").trim().toLowerCase();
    const titleWrong = userTitleNorm !== correctTitleNorm;

    // Use a safe displayed userTitle (show '—' when empty)
    const displayUserTitle = escapeHtml(r.userTitle || "—");

    html += `
      <div class="adv-result-block">
        <h3>${escapeHtml(r.ref || "")}
          <small>(Verse ${idx + 1} — Score: ${r.score})</small>
        </h3>

        <p><strong>Correct Title:</strong> <span class="correct-title">${escapeHtml(r.title || "—")}</span></p>

        <p><strong>Your Title:</strong>
          <span class="user-title ${titleWrong ? 'wrong' : 'ok'}">${displayUserTitle}</span>
        </p>

        <p><strong>Correct Verse:</strong></p>
        <p class="correct-verse">${escapeHtml(r.verse || "")}</p>

        <p><strong>Your Verse:</strong></p>
        <p class="user-verse">${r.highlighted}</p>
      </div>
    `;
  });

  smcContainer.innerHTML = `
    <div class="smc-summary-header">
      <h3>Total Score: ${totalScore}</h3>
    </div>
    ${html}
  `;

  // Show the SMC card
  smcCard.style.display = "block";
}

  /* =========================
     Init
     ========================= */
  populatePackSelect();
  if (packSelect) packSelect.multiple = false;

});
