Check the below code for any errors
const packSelect = document.getElementById('packSelect');
const startQuizBtn = document.getElementById('startQuizBtn');
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


let session = null;

function populatePackSelect() {
  packSelect.innerHTML = "";
  for (let packName in VERSE_PACKS) {
    const opt = document.createElement("option");
    opt.value = packName;
    opt.textContent = packName;
    packSelect.appendChild(opt);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  populatePackSelect();
});

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderNext() {
  if (session.remaining.length === 0) {
    alert("You have finished all verses in this pack!");
    backToMain();
    return;
  }
  session.current = session.remaining.pop();
  quizRef.textContent = session.current.ref;
  inputTitle.value = "";
  inputVerse.value = "";
}

// === Button actions ===
startQuizBtn.onclick = () => {
  const packName = packSelect.value;
  const pack = VERSE_PACKS[packName];
  session = { pack, remaining: shuffle(pack.slice()), current: null };
  document.getElementById('packSelectCard').style.display = 'none';
  reviewCard.style.display = 'none';
  quizCard.style.display = 'block';
  renderNext();
};

submitAnswerBtn.onclick = () => {
  if (advSession && !advSession.finished) submitAdvancedAnswer();
  else showReview(inputTitle.value.trim(), inputVerse.value.trim());
};
skipBtn.onclick = () => showReview("", "");

nextBtn.onclick = () => {
  reviewCard.style.display = 'none';
  quizCard.style.display = 'block';
  renderNext();
};

retryBtn.onclick = () => {
  session.remaining.push(session.current);
  reviewCard.style.display = 'none';
  quizCard.style.display = 'block';
  renderNext();
};

backBtn.onclick = backToMain;
goToPackSelectBtn.onclick = () => {
  mainMenu.style.display = "none";
  packSelectCard.style.display = "block";
  populatePackSelect();
};

backToMainBtn.onclick = () => {
  packSelectCard.style.display = "none";
  mainMenu.style.display = "block";
};

function backToMain() {
  reviewCard.style.display = 'none';
  quizCard.style.display = 'none';
  packSelectCard.style.display = 'none';
  viewPacksCard.style.display = 'none';
  mainMenu.style.display = 'block';
  populatePackSelect();
}


const viewPacksBtn = document.getElementById("viewPacksBtn");
const viewPacksCard = document.getElementById("viewPacksCard");
const packsContainer = document.getElementById("packsContainer");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const backToMenuBtn2 = document.getElementById("backToMenuBtn2");



viewPacksBtn.onclick = () => {
  document.getElementById("packSelectCard").style.display = "none";
  mainMenu.style.display = "none";
  viewPacksCard.style.display = "block";
  renderPacks();
};

backToMenuBtn.onclick = () => {
  viewPacksCard.style.display = "none";
  mainMenu.style.display = "block";
};

backToMenuBtn2.onclick = () => {
  viewPacksCard.style.display = "none";
  mainMenu.style.display = "block";
};

function renderPacks() {
  packsContainer.innerHTML = "";
  for (const packName in VERSE_PACKS) {
    const packCard = document.createElement("div");
    packCard.className = "pack-card";
    packCard.innerHTML = `<h3>${packName}</h3>`;
    packCard.onclick = () => showPackVerses(packName);
    packsContainer.appendChild(packCard);
  }
}

function showPackVerses(packName) {
  const pack = VERSE_PACKS[packName];
  
  // Clear the container first
  packsContainer.innerHTML = "";

  // === TOP Back to Packs button ===
  const topBackBtn = document.createElement("button");
  topBackBtn.id = "backToPacksTopBtn";
  topBackBtn.textContent = "← Back to Packs";
  topBackBtn.className = "ghost";
  topBackBtn.onclick = renderPacks;
  packsContainer.appendChild(topBackBtn);

  document.getElementById("startAdvancedQuizBtn").onclick = () => {
  packSelect.multiple = true; // allow multiple packs
  startAdvancedQuiz();
  };

  // === Pack title ===
  const title = document.createElement("h3");
  title.textContent = packName;
  packsContainer.appendChild(title);

  // === Each verse in this pack ===
  pack.forEach(v => {
    const vCard = document.createElement("div");
    vCard.className = "verse-card";
    vCard.innerHTML = `
      <h4>${v.title}</h4>
      <p><strong>${v.ref}</strong></p>
      <p>${v.verse}</p>
    `;
    packsContainer.appendChild(vCard);
  });

  // === BOTTOM Back to Packs button ===
  const bottomBackBtn = document.createElement("button");
  bottomBackBtn.id = "backToPacksBottomBtn";
  bottomBackBtn.textContent = "← Back to Packs";
  bottomBackBtn.className = "ghost";
  bottomBackBtn.onclick = renderPacks;
  packsContainer.appendChild(bottomBackBtn);
}


function tokenize(s) { return s ? s.trim().split(/\s+/) : []; }
function normalize(w) { return w.replace(/[\W_]+/g,'').toLowerCase(); }
function strike(text) { return text.split("").map(c => c + "\u0336").join(""); }

function highlightComparison(correct, user) {
  const cw = tokenize(correct);
  const uw = tokenize(user);
  const dp = Array(cw.length + 1).fill(null).map(() => Array(uw.length + 1).fill(0));
  for (let i = 0; i <= cw.length; i++) dp[i][0] = i;
  for (let j = 0; j <= uw.length; j++) dp[0][j] = j;
  for (let i = 1; i <= cw.length; i++) {
    for (let j = 1; j <= uw.length; j++) {
      const cost = normalize(cw[i - 1]) === normalize(uw[j - 1]) ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  let i = cw.length, j = uw.length, result = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalize(cw[i - 1]) === normalize(uw[j - 1])) {
      result.unshift(`<span class="word ok">${uw[j - 1]}</span>`); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
      result.unshift(`<span class="word extra">${strike(uw[j - 1])}</span>`); j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] < dp[i][j - 1])) {
      result.unshift(`<span class="word missing">${cw[i - 1]}</span>`); i--;
    } else {
      result.unshift(`<span class="word extra">${strike(uw[j - 1])}</span>`);
      result.push(`<span class="word missing">${cw[i - 1]}</span>`); i--; j--;
    }
  }

  return result.join(" ");
}

function showReview(uTitle, uVerse) {
  quizCard.style.display = 'none';
  reviewCard.style.display = 'block';

  const c = session.current;
  reviewHeading.textContent = c.ref;
  correctTitle.textContent = c.title;
  correctVerse.textContent = c.verse;

  userTitleEl.textContent = uTitle || "—";
  userVerseBox.innerHTML = highlightComparison(c.verse, uVerse);

  if (uTitle.trim().toLowerCase() === c.title.trim().toLowerCase()) {
    userTitleEl.style.color = "black";
  } else {
    userTitleEl.style.color = "blue";
  }
}


// ADVANCED QUIZ MODE (NEW)
// -----------------------------
// Store advanced quiz session
let advSession = null;

// When user chooses packs and starts advanced quiz
function startAdvancedQuiz() {
  // Allow multi-select: collect all selected packs
  const selectedOptions = [...packSelect.selectedOptions].map(o => o.value);
  if (selectedOptions.length === 0) {
    alert("Please select at least one pack.");
    return;
  }

  // Gather verses from selected packs
  let pool = [];
  selectedOptions.forEach(packName => {
    pool = pool.concat(VERSE_PACKS[packName]);
  });

  // Shuffle + pick 12
  pool = shuffle(pool).slice(0, 12);

  advSession = {
    verses: pool,
    index: 0,
    results: [],
    finished: false
  };

  // Hide menus
  mainMenu.style.display = 'none';
  reviewCard.style.display = 'none';
  packSelectCard.style.display = 'none';

  // Show quiz card
  quizCard.style.display = 'block';

  loadAdvancedQuestion();
}

function loadAdvancedQuestion() {
  const v = advSession.verses[advSession.index];
  quizRef.textContent = v.ref;
  inputTitle.value = "";
  inputVerse.value = "";
}

// Replaces normal showReview for advanced quiz only
function submitAdvancedAnswer() {
  const v = advSession.verses[advSession.index];
  const userTitle = inputTitle.value.trim();
  const userVerse = inputVerse.value.trim();

  // SCORING
  let score = 0;

  // Title score
  if (normalize(userTitle) !== normalize(v.title)) {
    score -= 1;
  }

  // Verse body scoring
  const cw = tokenize(v.verse);
  const uw = tokenize(userVerse);

  let mistakes = 0;
  const maxMistakes = 4; // verse-body-only max

  // Count mistakes using normalized compare
  const len = Math.max(cw.length, uw.length);
  for (let i = 0; i < len; i++) {
    const cword = normalize(cw[i] || "");
    const uword = normalize(uw[i] || "");
    if (cword !== uword) mistakes++;
  }

  score -= Math.min(mistakes, maxMistakes);

  // Total max penalty = –5
  if (score < -5) score = -5;

  // Save result
  advSession.results.push({
    ref: v.ref,
    title: v.title,
    verse: v.verse,
    userTitle,
    userVerse,
    score,
    highlighted: highlightComparison(v.verse, userVerse)
  });

  advSession.index++;

  // Finished?
  if (advSession.index >= advSession.verses.length) {
    advSession.finished = true;
    showAdvancedReviewPage();
  } else {
    loadAdvancedQuestion();
  }
}

// Review page showing ALL verses
function showAdvancedReviewPage() {
  quizCard.style.display = 'none';
  reviewCard.style.display = 'block';

  // Replace reviewCard contents with multi-verse layout
  reviewHeading.textContent = "Advanced Quiz Review (12 Verses)";

  let totalScore = 0;
  let html = "";

  advSession.results.forEach(r => {
    totalScore += r.score;
    html += `
      <div class="adv-result-block">
        <h3>${r.ref} (Score: ${r.score})</h3>
        <p><strong>Correct Title:</strong> ${r.title}</p>
        <p><strong>Your Title:</strong> ${r.userTitle || '—'}</p>
        <p><strong>Correct Verse:</strong> ${r.verse}</p>
        <p><strong>Your Verse:</strong></p>
        <p>${r.highlighted}</p>
        <hr>
      </div>
    `;
  });

  correctTitle.textContent = "Total Score: " + totalScore;
  correctVerse.innerHTML = html;

  userTitleEl.textContent = "";
  userVerseBox.innerHTML = "";

  // A single NEXT button becomes "Back to Main"
  nextBtn.style.display = 'none';
  retryBtn.style.display = 'none';
  skipBtn.style.display = 'none';

  backBtn.style.display = 'block';
}
