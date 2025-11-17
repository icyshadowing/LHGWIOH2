/* Clean, integrated quiz script
   - Preserves original single-pack quiz
   - Adds Advanced Mistake-Based Quiz Mode (12 random verses across selected packs)
   - Robust DOM declarations and defensive checks
   - Word-LCS based scoring (title penalty, body penalty up to -4, max -5 per verse)
*/

/* ============================
   DOM references (declare first)
   ============================ */
const packSelect = document.getElementById('packSelect');
const packSelectCard = document.getElementById('packSelectCard'); // ensure exists in HTML
const startQuizBtn = document.getElementById('startQuizBtn');
const startAdvancedQuizBtn = document.getElementById('startAdvancedQuizBtn'); // add this in HTML
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

/* Defensive checks */
if (!packSelect || !quizCard || !reviewCard || !mainMenu) {
  console.error('Required DOM elements missing. Please ensure packSelect, quizCard, reviewCard, mainMenu exist.');
}

/* =====================
   Utilities
   ===================== */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function tokenize(s) { return s ? s.trim().split(/\s+/) : []; }
function normalizeWord(w) { return (w||'').replace(/[\W_]+/g,'').toLowerCase(); }
function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function strike(text) { return (text||'').split('').map(c => c + '\u0336').join(''); }

/* LCS indices for word arrays */
function lcsIndexPairs(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({length: n+1}, () => Array(m+1).fill(0));
  for (let i = n-1; i >= 0; i--) {
    for (let j = m-1; j >= 0; j--) {
      if (normalizeWord(a[i]) === normalizeWord(b[j])) dp[i][j] = 1 + dp[i+1][j+1];
      else dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
    }
  }
  // reconstruct pairs
  let i=0, j=0;
  const pairs = [];
  while (i<n && j<m) {
    if (normalizeWord(a[i]) === normalizeWord(b[j])) { pairs.push([i,j]); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) i++;
    else j++;
  }
  return pairs;
}

/* produce highlighted diff using DP (Levenshtein-like) - reused from your approach */
function highlightComparison(correct, user) {
  const cw = tokenize(correct);
  const uw = tokenize(user);
  const dp = Array(cw.length + 1).fill(null).map(() => Array(uw.length + 1).fill(0));
  for (let i = 0; i <= cw.length; i++) dp[i][0] = i;
  for (let j = 0; j <= uw.length; j++) dp[0][j] = j;
  for (let i = 1; i <= cw.length; i++) {
    for (let j = 1; j <= uw.length; j++) {
      const cost = normalizeWord(cw[i - 1]) === normalizeWord(uw[j - 1]) ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  let i = cw.length, j = uw.length, result = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalizeWord(cw[i - 1]) === normalizeWord(uw[j - 1])) {
      result.unshift(`<span class="word ok">${escapeHtml(uw[j - 1])}</span>`); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
      result.unshift(`<span class="word extra">${strike(escapeHtml(uw[j - 1]))}</span>`); j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] < dp[i][j - 1])) {
      result.unshift(`<span class="word missing">${escapeHtml(cw[i - 1])}</span>`); i--;
    } else {
      // fallback
      if (j > 0) result.unshift(`<span class="word extra">${strike(escapeHtml(uw[j - 1]))}</span>`);
      if (i > 0) result.push(`<span class="word missing">${escapeHtml(cw[i - 1])}</span>`);
      i--; j--;
    }
  }
  return result.join(' ');
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
   Original single-pack quiz
   (keeps your original behavior)
   ========================= */
let session = null;

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

startQuizBtn && (startQuizBtn.onclick = () => {
  const packName = packSelect.value;
  if (!packName) { alert('Please pick a pack'); return; }
  const pack = VERSE_PACKS[packName];
  session = { pack, remaining: shuffle(pack.slice()), current: null };
  if (packSelectCard) packSelectCard.style.display = 'none';
  if (reviewCard) reviewCard.style.display = 'none';
  if (quizCard) quizCard.style.display = 'block';
  renderNext();
});

/* showReview for original quiz mode */
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

/* Original button wiring (keeps behavior) */
submitAnswerBtn && (submitAnswerBtn.onclick = () => {
  // submit handler will be adapted later to detect advanced mode
  if (advSession && !advSession.finished) submitAdvancedAnswer();
  else showReview(inputTitle.value.trim(), inputVerse.value.trim());
});

skipBtn && (skipBtn.onclick = () => showReview("", ""));

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

backBtn && (backBtn.onclick = backToMain);

goToPackSelectBtn && (goToPackSelectBtn.onclick = () => {
  if (mainMenu) mainMenu.style.display = "none";
  if (packSelectCard) packSelectCard.style.display = "block";
  populatePackSelect();
});

backToMainBtn && (backToMainBtn.onclick = () => {
  if (packSelectCard) packSelectCard.style.display = "none";
  if (mainMenu) mainMenu.style.display = "block";
});

/* backToMain - defensive */
function backToMain() {
  if (reviewCard) reviewCard.style.display = 'none';
  if (quizCard) quizCard.style.display = 'none';
  if (packSelectCard) packSelectCard.style.display = 'none';
  if (viewPacksCard) viewPacksCard.style.display = 'none';
  if (mainMenu) mainMenu.style.display = 'block';
  populatePackSelect();
}

/* Render packs / show pack verses (keeps behavior) */
viewPacksBtn && (viewPacksBtn.onclick = () => {
  if (packSelectCard) packSelectCard.style.display = "none";
  if (mainMenu) mainMenu.style.display = "none";
  if (viewPacksCard) viewPacksCard.style.display = "block";
  renderPacks();
});

backToMenuBtn && (backToMenuBtn.onclick = () => {
  if (viewPacksCard) viewPacksCard.style.display = "none";
  if (mainMenu) mainMenu.style.display = "block";
});

backToMenuBtn2 && (backToMenuBtn2.onclick = () => {
  if (viewPacksCard) viewPacksCard.style.display = "none";
  if (mainMenu) mainMenu.style.display = "block";
});

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

function showPackVerses(packName) {
  const pack = VERSE_PACKS[packName];
  if (!packsContainer) return;
  packsContainer.innerHTML = "";

  const topBackBtn = document.createElement("button");
  topBackBtn.id = "backToPacksTopBtn";
  topBackBtn.textContent = "← Back to Packs";
  topBackBtn.className = "ghost";
  topBackBtn.onclick = renderPacks;
  packsContainer.appendChild(topBackBtn);

  // pack title
  const title = document.createElement("h3");
  title.textContent = packName;
  packsContainer.appendChild(title);

  // verses list
  pack.forEach(v => {
    const vCard = document.createElement("div");
    vCard.className = "verse-card";
    vCard.innerHTML = `
      <h4>${escapeHtml(v.title || '')}</h4>
      <p><strong>${escapeHtml(v.ref || '')}</strong></p>
      <p>${escapeHtml(v.verse || '')}</p>
    `;
    packsContainer.appendChild(vCard);
  });

  const bottomBackBtn = document.createElement("button");
  bottomBackBtn.id = "backToPacksBottomBtn";
  bottomBackBtn.textContent = "← Back to Packs";
  bottomBackBtn.className = "ghost";
  bottomBackBtn.onclick = renderPacks;
  packsContainer.appendChild(bottomBackBtn);
}

/* =========================
   Advanced Mistake-Based Quiz
   ========================= */

/* state */
let advSession = null;

/* Start advanced quiz - top-level handler */
startAdvancedQuizBtn && (startAdvancedQuizBtn.onclick = () => {
  // ensure packSelect allows multiple picks
  if (packSelect) packSelect.multiple = true;

  // collect selected packs (if none selected, use all)
  const selectedOptions = packSelect && [...packSelect.selectedOptions].map(o => o.value);
  let selected = selectedOptions && selectedOptions.length ? selectedOptions : Object.keys(VERSE_PACKS);

  // gather pool
  let pool = [];
  selected.forEach(packName => {
    const p = VERSE_PACKS[packName] || [];
    pool = pool.concat(p);
  });

  if (!pool.length) { alert('No verses available for the selected packs'); return; }

  // pick 12 random verses (or fewer if not enough)
  pool = shuffle(pool.slice()).slice(0, 12);

  advSession = {
    verses: pool,
    index: 0,
    results: [],
    finished: false
  };

  // show quiz UI
  if (mainMenu) mainMenu.style.display = 'none';
  if (reviewCard) reviewCard.style.display = 'none';
  if (packSelectCard) packSelectCard.style.display = 'none';
  if (quizCard) quizCard.style.display = 'block';

  loadAdvancedQuestion();
});

function loadAdvancedQuestion() {
  if (!advSession) return;
  const v = advSession.verses[advSession.index];
  quizRef.textContent = v.ref || '';
  inputTitle.value = '';
  inputVerse.value = '';
}

/* scoring function using LCS for better alignment */
function scoreAnswer(refTitle, refText, userTitle, userText) {
  // title penalty
  const titlePenalty = (normalizeWord(userTitle || '') === normalizeWord(refTitle || '')) ? 0 : 1;

  // body words
  const refWords = tokenize(refText || '');
  const userWords = tokenize(userText || '');

  // lcs matches
  const pairs = lcsIndexPairs(refWords, userWords);
  const matchedRef = new Set(pairs.map(p => p[0]));
  const matchedUser = new Set(pairs.map(p => p[1]));

  // missing (ref words not matched)
  const missing = [];
  for (let i=0;i<refWords.length;i++) if (!matchedRef.has(i)) missing.push(refWords[i]);

  // extras (user words not matched)
  const extras = [];
  for (let j=0;j<userWords.length;j++) if (!matchedUser.has(j)) extras.push(userWords[j]);

  // substitutions: pair up leftover missing & extras into wrong words
  const pairCount = Math.min(missing.length, extras.length);
  const wrong = pairCount;
  const remainingMissing = Math.max(0, missing.length - pairCount);
  const remainingExtras = Math.max(0, extras.length - pairCount);

  const bodyMistakes = wrong + remainingMissing + remainingExtras;
  const bodyPenalty = Math.min(bodyMistakes, 4);

  const totalPenalty = Math.min(titlePenalty + bodyPenalty, 5);

  return {
    titlePenalty,
    bodyPenalty,
    totalPenalty,
    details: { missing, extras, wrong, refWords, userWords, pairs }
  };
}

/* submit handler for advanced quiz */
function submitAdvancedAnswer() {
  if (!advSession) return;
  const v = advSession.verses[advSession.index];
  const userTitle = (inputTitle.value || '').trim();
  const userVerse = (inputVerse.value || '').trim();

  const sc = scoreAnswer(v.title, v.verse, userTitle, userVerse);

  // score is negative penalties per your spec; we'll store negative number
  const scoreValue = -sc.totalPenalty;

  advSession.results.push({
    ref: v.ref,
    title: v.title,
    verse: v.verse,
    userTitle,
    userVerse,
    score: scoreValue,
    scoring: sc,
    highlighted: highlightComparison(v.verse, userVerse)
  });

  advSession.index++;

  if (advSession.index >= advSession.verses.length) {
    advSession.finished = true;
    showAdvancedReviewPage();
  } else {
    loadAdvancedQuestion();
  }
}

/* show advanced review (all verses + total) */
function showAdvancedReviewPage() {
  if (quizCard) quizCard.style.display = 'none';
  if (reviewCard) reviewCard.style.display = 'block';

  reviewHeading.textContent = "Advanced Quiz Review";

  let totalScore = 0;
  let html = '';

  advSession.results.forEach((r, idx) => {
    totalScore += r.score;
    html += `
      <div class="adv-result-block">
        <h3>${escapeHtml(r.ref || '')} &nbsp; <small>(Verse ${idx+1} — Score: ${r.score})</small></h3>
        <p><strong>Correct Title:</strong> ${escapeHtml(r.title || '')}</p>
        <p><strong>Your Title:</strong> ${escapeHtml(r.userTitle || '—')}</p>
        <p><strong>Correct Verse:</strong> ${escapeHtml(r.verse || '')}</p>
        <p><strong>Your Verse:</strong></p>
        <p>${r.highlighted}</p>
        <hr>
      </div>
    `;
  });

  // put total score into correctTitle (re-uses existing UI, but safe)
  correctTitle.textContent = "Total Score: " + totalScore;
  correctVerse.innerHTML = html;

  // hide single-verse navigation buttons to avoid confusion
  if (nextBtn) nextBtn.style.display = 'none';
  if (retryBtn) retryBtn.style.display = 'none';
  if (skipBtn) skipBtn.style.display = 'none';
  if (backBtn) backBtn.style.display = 'block';
}

/* override submit button behavior to route to advanced vs original */
submitAnswerBtn && (submitAnswerBtn.onclick = () => {
  if (advSession && !advSession.finished) submitAdvancedAnswer();
  else if (session && session.current) showReview(inputTitle.value.trim(), inputVerse.value.trim());
  else {
    // No active session - ignore or show message
    alert('No active quiz. Choose a pack or start Advanced Quiz.');
  }
});

/* back button in review should go to main for advanced mode or to quiz for original */
backBtn && (backBtn.onclick = () => {
  if (advSession && advSession.finished) {
    // end adv session and reset UI
    advSession = null;
    if (packSelect) packSelect.multiple = false;
    backToMain();
  } else {
    // original flow
    backToMain();
  }
});

/* Wire skip/next/retry for advanced mode where appropriate (skip acts as submit with empty) */
skipBtn && (skipBtn.onclick = () => {
  if (advSession && !advSession.finished) {
    // submit empty answer
    submitAdvancedAnswer();
  } else {
    showReview("", "");
  }
});

/* =========================
   Init on DOMContentLoaded
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  populatePackSelect();
  // ensure packSelect isn't accidental multiple unless advanced mode engaged
  if (packSelect) packSelect.multiple = false;
});
