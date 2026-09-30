(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const screens = ['home', 'teacher', 'editor', 'share', 'student', 'host'];
  const letters = ['A', 'B', 'C', 'D'];
  const state = { quiz: { title: 'Kuis Pertemuan', seconds: 30, questions: [] }, peer: null, roomCode: '', connections: new Map(), participants: new Map(), currentIndex: -1, endsAt: 0, timer: null, advanceTimer: null, sessionOver: false, studentConn: null, studentName: '', studentScore: 0, studentCorrect: 0, studentAnswers: {}, studentQuestion: null, studentEndsAt: 0, studentTimer: null, studentSubmitted: false, studentRejected: false };

  function showScreen(name) {
    screens.forEach(id => $('#' + id).classList.toggle('hidden', id !== name));
    $('#printReport').classList.add('hidden');
    $('#topDropdown').classList.add('hidden');
    $('#menuToggle').setAttribute('aria-expanded', 'false');
    if (name === 'share') renderShareQuiz();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $$('[data-go]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.go)));
  $('#menuToggle').addEventListener('click', () => {
    const open = $('#topDropdown').classList.toggle('hidden') === false;
    $('#menuToggle').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', event => {
    if (!$('#topMenu').contains(event.target)) {
      $('#topDropdown').classList.add('hidden');
      $('#menuToggle').setAttribute('aria-expanded', 'false');
    }
  });
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch])); }
  function normalizeQuiz() {
    state.quiz.title = $('#quizTitle').value.trim() || 'Kuis Kelas';
    state.quiz.seconds = Number($('#questionSeconds').value) || 30;
    return state.quiz;
  }
  function renderShareQuiz() {
    const summary = $('#shareQuizSummary');
    if (!summary) return;
    const quiz = state.quiz;
    if (!quiz.questions.length) {
      summary.innerHTML = `<div class="share-empty"><span>▤</span><strong>Belum ada kuis yang dipilih</strong><p>Buat kuis terlebih dahulu atau muat file JSON dari perangkat Anda.</p><button class="text-button" id="shareCreateQuiz">＋ Buat kuis baru</button></div>`;
      $('#shareCreateQuiz').addEventListener('click', () => showScreen('editor'));
      $('#startHosting').disabled = true;
      return;
    }
    summary.innerHTML = `<div class="selected-quiz"><span class="selected-quiz-icon">✓</span><div><span class="entry-label">KUIS TERPILIH</span><strong>${esc(quiz.title || 'Kuis Kelas')}</strong><div class="selected-quiz-meta">${quiz.questions.length} pertanyaan <span>·</span> ${Number(quiz.seconds) || 30} detik per soal</div></div></div>`;
    $('#startHosting').disabled = false;
  }
  function makeQuestion(question = '', choices = ['', '', '', ''], correctIndex = 0) {
    return { question, choices: [...choices].slice(0, 4), correctIndex: Number(correctIndex) || 0 };
  }
  function renderQuestions() {
    const list = $('#questionList');
    $('#questionCount').textContent = `${state.quiz.questions.length} soal`;
    if (!state.quiz.questions.length) {
      list.innerHTML = '<div class="empty-editor">Belum ada soal. Tambahkan pertanyaan atau mulai dari file PPTX.</div>';
      return;
    }
    list.innerHTML = state.quiz.questions.map((q, qi) => `<article class="question-card" data-question="${qi}">
      <div class="question-card-head"><b>PERTANYAAN ${qi + 1}</b><button class="icon-button move-up" title="Pindah ke atas" aria-label="Pindah ke atas">↑</button><button class="icon-button move-down" title="Pindah ke bawah" aria-label="Pindah ke bawah">↓</button><button class="icon-button delete-question" title="Hapus soal" aria-label="Hapus soal">×</button></div>
      <textarea class="text-input question-stem" rows="3" placeholder="Tulis pertanyaan di sini…">${esc(q.question)}</textarea>
      <div class="choice-edit-grid">${q.choices.map((choice, ci) => `<label class="choice-edit ${ci === q.correctIndex ? 'correct' : ''}"><button type="button" class="mark-correct" data-choice="${ci}" title="Tandai jawaban benar">${ci === q.correctIndex ? '✓' : '○'}</button><span class="choice-letter">${letters[ci]}</span><input class="text-input choice-input" data-choice="${ci}" maxlength="180" value="${esc(choice)}" placeholder="Pilihan ${letters[ci]}">${ci === q.correctIndex ? '<span class="correct-tag">Jawaban benar</span>' : ''}</label>`).join('')}</div>
    </article>`).join('');
    $$('.question-card', list).forEach(card => {
      const qi = Number(card.dataset.question);
      const stem = $('.question-stem', card);
      const fitStem = () => { stem.style.height = 'auto'; stem.style.height = `${stem.scrollHeight}px`; };
      fitStem();
      stem.addEventListener('input', e => { state.quiz.questions[qi].question = e.target.value; fitStem(); });
      $$('.choice-input', card).forEach(input => {
        input.addEventListener('input', e => state.quiz.questions[qi].choices[Number(e.target.dataset.choice)] = e.target.value);
      });
      $$('.mark-correct', card).forEach(button => button.addEventListener('click', () => { state.quiz.questions[qi].correctIndex = Number(button.dataset.choice); renderQuestions(); }));
      $('.delete-question', card).addEventListener('click', () => { state.quiz.questions.splice(qi, 1); renderQuestions(); });
      $('.move-up', card).addEventListener('click', () => { if (qi) { [state.quiz.questions[qi - 1], state.quiz.questions[qi]] = [state.quiz.questions[qi], state.quiz.questions[qi - 1]]; renderQuestions(); } });
      $('.move-down', card).addEventListener('click', () => { if (qi < state.quiz.questions.length - 1) { [state.quiz.questions[qi + 1], state.quiz.questions[qi]] = [state.quiz.questions[qi], state.quiz.questions[qi + 1]]; renderQuestions(); } });
    });
  }
  $('#addQuestion').addEventListener('click', () => { state.quiz.questions.push(makeQuestion()); renderQuestions(); $('.question-card:last-child .question-stem').focus(); });
  $('#quizTitle').addEventListener('input', () => { state.quiz.title = $('#quizTitle').value; });
  $('#questionSeconds').addEventListener('change', () => state.quiz.seconds = Number($('#questionSeconds').value));

  function downloadBlob(filename, blob) { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
  $('#saveQuiz').addEventListener('click', () => {
    normalizeQuiz();
    if (!state.quiz.questions.length) { alert('Tambahkan minimal satu soal terlebih dahulu.'); return; }
    downloadBlob(`${safeFilename(state.quiz.title)}.json`, new Blob([JSON.stringify(state.quiz, null, 2)], { type: 'application/json' }));
    renderShareQuiz();
  });
  $('#loadQuiz').addEventListener('click', () => $('#quizFile').click());
  $('#shareLoadQuiz').addEventListener('click', () => $('#quizFile').click());
  $('#quizFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.questions)) throw new Error('Format file tidak sesuai.');
      state.quiz = { title: String(data.title || 'Kuis Kelas'), seconds: Number(data.seconds) || 30, questions: data.questions.map(q => makeQuestion(String(q.question || ''), Array.isArray(q.choices) ? q.choices.map(String) : ['', '', '', ''], q.correctIndex)) };
      $('#quizTitle').value = state.quiz.title; $('#questionSeconds').value = String(state.quiz.seconds); renderQuestions();
      renderShareQuiz();
      alert('Kuis berhasil dimuat.');
    } catch (err) { alert(`Tidak dapat memuat file: ${err.message}`); }
    e.target.value = '';
  });

  // PowerPoint import: read slide text in-browser, propose editable questions and distractors.
  $('#pptFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    const status = $('#pptStatus'); status.classList.remove('hidden'); status.textContent = 'Membaca teks slide…';
    try {
      if (!window.JSZip) throw new Error('Pustaka pembaca PPTX belum termuat. Periksa koneksi internet lalu muat ulang halaman.');
      const zip = await JSZip.loadAsync(file);
      const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a,b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]));
      const lines = [];
      for (const name of slideFiles) {
        const xmlText = await zip.file(name).async('text'); const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
        const paragraphs = [...xml.getElementsByTagName('a:p')];
        paragraphs.forEach(p => { const text = [...p.getElementsByTagName('a:t')].map(t => t.textContent).join('').replace(/\s+/g, ' ').trim(); if (text.length >= 14 && text.length <= 200 && !lines.includes(text)) lines.push(text); });
      }
      if (lines.length < 4) throw new Error('Teks yang terbaca kurang dari empat poin. Pastikan PPTX berisi teks, bukan hanya gambar.');
      // Use short, informative statements as answer choices; lecturer reviews and edits all generated drafts.
      const candidates = lines.filter(line => line.length <= 150).slice(0, 40);
      const count = Math.min(10, Math.floor(candidates.length / 4) || 1);
      const drafts = [];
      for (let i = 0; i < count; i++) {
        const right = candidates[i];
        const distractors = candidates.filter((_, idx) => idx !== i).sort((a,b) => Math.abs(a.length - right.length) - Math.abs(b.length - right.length)).slice(0, 3);
        if (distractors.length < 3) break;
        const choices = [right, ...distractors]; const correctIndex = (i * 3 + 1) % 4;
        const shuffled = choices.map((value, idx) => ({ value, isCorrect: idx === 0 }));
        // Deterministic rotation keeps imported drafts repeatable.
        for (let k = 0; k < correctIndex; k++) shuffled.push(shuffled.shift());
        drafts.push(makeQuestion('Manakah pernyataan yang sesuai dengan materi pada slide?', shuffled.map(x => x.value), correctIndex));
      }
      state.quiz.title = state.quiz.title === 'Kuis Pertemuan' ? file.name.replace(/\.pptx$/i, '') : state.quiz.title;
      $('#quizTitle').value = state.quiz.title; state.quiz.questions.push(...drafts); renderQuestions();
      status.textContent = `${drafts.length} draf dibuat dari ${slideFiles.length} slide. Periksa dan sunting semua pilihan serta tandai jawaban benar sebelum sesi dimulai.`;
    } catch (err) { status.textContent = err.message; status.style.background = '#fff1f2'; status.style.color = '#b94453'; }
    e.target.value = '';
  });

  function safeFilename(name) { return String(name || 'kuis').toLowerCase().replace(/[^a-z0-9\-_]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'kuis'; }
  function validateQuiz() {
    normalizeQuiz();
    if (!state.quiz.questions.length) return 'Tambahkan minimal satu pertanyaan.';
    for (let i = 0; i < state.quiz.questions.length; i++) {
      const q = state.quiz.questions[i];
      if (!q.question.trim()) return `Pertanyaan ${i + 1} masih kosong.`;
      if (q.choices.some(c => !String(c).trim())) return `Lengkapi empat pilihan pada pertanyaan ${i + 1}.`;
    }
    return '';
  }
  function randomCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
  $('#startHosting').addEventListener('click', async () => {
    const error = validateQuiz(); if (error) { alert(error); return; }
    if (!window.Peer) { alert('Koneksi kuis belum siap. Periksa internet lalu muat ulang halaman.'); return; }
    $('#startHosting').disabled = true; $('#startHosting').textContent = 'Menghubungkan…';
    normalizeQuiz(); state.roomCode = `kelas-${randomCode().toLowerCase()}`; state.sessionOver = false;
    const peer = new Peer(state.roomCode); state.peer = peer;
    peer.on('open', () => {
      $('#hostQuizTitle').textContent = state.quiz.title; $('#roomCode').textContent = state.roomCode.replace('kelas-', '').toUpperCase();
      showScreen('host'); renderParticipants(); updateScoreboard(); $('#startHosting').disabled = false; $('#startHosting').innerHTML = 'Mulai sesi kuis <span>→</span>';
    });
    peer.on('connection', conn => {
      state.connections.set(conn.peer, conn);
      conn.on('data', data => handleHostMessage(conn, data));
      conn.on('close', () => { state.connections.delete(conn.peer); renderParticipants(); });
      conn.on('error', () => {});
    });
    peer.on('error', err => {
      $('#startHosting').disabled = false; $('#startHosting').innerHTML = 'Mulai sesi kuis <span>→</span>';
      const message = err.type === 'unavailable-id' ? 'Kode sesi sedang dipakai. Klik mulai sesi sekali lagi.' : 'Tidak dapat membuka sesi PeerJS. Periksa koneksi internet, lalu coba lagi.';
      alert(message); try { peer.destroy(); } catch (_) {}
    });
  });
  function send(conn, data) { if (conn && conn.open) conn.send(data); }
  function broadcast(data) { state.connections.forEach(conn => send(conn, data)); }
  function handleHostMessage(conn, data) {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'hello') {
      const existing = state.participants.get(conn.peer);
      if (!existing && state.participants.size >= 20) { send(conn, { type: 'full' }); setTimeout(() => conn.close(), 300); return; }
      state.participants.set(conn.peer, { id: conn.peer, name: String(data.name || 'Mahasiswa').slice(0, 40), score: existing?.score || 0, correct: existing?.correct || 0, answers: existing?.answers || {}, answeredCurrent: false });
      renderParticipants(); updateScoreboard(); send(conn, { type: state.currentIndex >= 0 && !state.sessionOver ? 'question' : 'lobby', title: state.quiz.title, question: state.currentIndex >= 0 ? publicQuestion(state.currentIndex) : null, index: state.currentIndex, total: state.quiz.questions.length, endsAt: state.endsAt, score: state.participants.get(conn.peer).score });
      return;
    }
    if (data.type === 'answer') {
      const person = state.participants.get(conn.peer); if (!person || state.currentIndex < 0 || state.sessionOver || Date.now() > state.endsAt || person.answeredCurrent) return;
      const q = state.quiz.questions[state.currentIndex]; const choice = Number(data.choice);
      person.answeredCurrent = true; person.answers[state.currentIndex] = { choice, correct: choice === q.correctIndex, elapsed: Math.max(0, state.quiz.seconds * 1000 - (state.endsAt - Date.now())) };
      if (choice === q.correctIndex) { person.correct++; person.score += Math.round(1000 + Math.max(0, (state.endsAt - Date.now()) / (state.quiz.seconds * 1000)) * 500); }
      updateScoreboard(); updateAnswerProgress();
    }
  }
  function publicQuestion(index) { const q = state.quiz.questions[index]; return { question: q.question, choices: q.choices, seconds: state.quiz.seconds }; }
  function renderParticipants() {
    const people = [...state.participants.values()]; $('#participantCount').textContent = people.length;
    $('#participantNames').innerHTML = people.length ? people.map(p => `<span class="participant-chip">${esc(p.name)}</span>`).join('') : '<span class="empty-participant">Peserta akan muncul di sini</span>';
    $('#beginQuiz').disabled = !people.length || state.currentIndex >= 0;
    $('#answerTotal').textContent = people.length;
  }
  function updateScoreboard() {
    const people = [...state.participants.values()].sort((a,b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name));
    if (!people.length) { $('#scoreboard').innerHTML = '<div class="score-empty"><span>◎</span><p>Skor peserta<br>akan tampil di sini</p></div>'; return; }
    $('#scoreboard').innerHTML = people.slice(0, 20).map((p,i) => `<div class="score-row"><span class="rank ${i < 3 ? 'top' : ''}">${i === 0 ? '★' : String(i + 1).padStart(2, '0')}</span><span class="score-avatar">${esc(p.name.trim().slice(0,1).toUpperCase())}</span><span class="score-name">${esc(p.name)}</span><span class="score-points">${p.score.toLocaleString('id-ID')}</span></div>`).join('');
  }
  function updateAnswerProgress() {
    const total = state.participants.size; const answered = [...state.participants.values()].filter(p => p.answeredCurrent).length;
    $('#answerCount').textContent = answered; $('#answerTotal').textContent = total; $('#answerProgressFill').style.width = total ? `${answered / total * 100}%` : '0%';
  }
  $('#copyCode').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#roomCode').textContent); $('#copyCode').textContent = 'Tersalin ✓'; setTimeout(() => $('#copyCode').textContent = 'Salin kode', 1500); }
    catch (_) { $('#copyCode').textContent = `Kode: ${$('#roomCode').textContent}`; }
  });
  $('#beginQuiz').addEventListener('click', () => { if (state.participants.size) startQuestion(0); });
  function startQuestion(index) {
    if (index >= state.quiz.questions.length) { finishSession(); return; }
    clearInterval(state.timer); clearTimeout(state.advanceTimer); state.currentIndex = index; state.endsAt = Date.now() + state.quiz.seconds * 1000;
    state.participants.forEach(p => p.answeredCurrent = false);
    $('#lobbyView').classList.add('hidden'); $('#resultsView').classList.add('hidden'); $('#liveQuestionView').classList.remove('hidden');
    const q = state.quiz.questions[index]; $('#hostQuestionNumber').textContent = `PERTANYAAN ${index + 1} / ${state.quiz.questions.length}`; $('#hostQuestionText').textContent = q.question;
    $('#hostChoices').innerHTML = q.choices.map((choice,i) => `<div class="host-choice"><i>${letters[i]}</i>${esc(choice)}</div>`).join('');
    $('#answerProgressFill').style.width = '0%'; $('#answerCount').textContent = '0'; $('#answerTotal').textContent = state.participants.size; renderParticipants();
    broadcast({ type: 'question', title: state.quiz.title, question: publicQuestion(index), index, total: state.quiz.questions.length, endsAt: state.endsAt });
    tickHostTimer(); state.timer = setInterval(tickHostTimer, 250);
  }
  function tickHostTimer() {
    const remaining = Math.max(0, state.endsAt - Date.now()); const seconds = Math.ceil(remaining / 1000);
    const chip = $('#hostTimeLeft'); chip.textContent = `00:${String(seconds).padStart(2,'0')}`; chip.classList.toggle('urgent', seconds <= 5);
    if (remaining <= 0) { clearInterval(state.timer); revealQuestion(); }
    else if (state.participants.size && [...state.participants.values()].every(p => p.answeredCurrent)) { clearInterval(state.timer); revealQuestion(); }
  }
  function revealQuestion() {
    if (state.currentIndex < 0 || state.sessionOver) return;
    const q = state.quiz.questions[state.currentIndex];
    state.participants.forEach(person => {
      const answer = person.answers[state.currentIndex];
      send(state.connections.get(person.id), { type: 'reveal', correctIndex: q.correctIndex, correct: Boolean(answer?.correct), score: person.score, correctText: q.choices[q.correctIndex] });
    });
    $$('#hostChoices .host-choice').forEach((el,i) => { if (i === q.correctIndex) { el.style.outline = '3px solid #34c68e'; el.style.outlineOffset = '2px'; } else el.style.opacity = '.55'; });
    state.advanceTimer = setTimeout(() => startQuestion(state.currentIndex + 1), 3000);
  }
  function finishSession() {
    clearInterval(state.timer); clearTimeout(state.advanceTimer); state.sessionOver = true; $('#liveQuestionView').classList.add('hidden'); $('#lobbyView').classList.add('hidden'); $('#resultsView').classList.remove('hidden');
    const people = [...state.participants.values()].sort((a,b) => b.score - a.score); const avg = people.length ? Math.round(people.reduce((sum,p) => sum + p.correct / state.quiz.questions.length * 100, 0) / people.length) : 0;
    $('#resultParticipants').textContent = people.length; $('#resultAverage').textContent = `${avg}%`; $('#resultQuestions').textContent = state.quiz.questions.length;
    people.forEach((p,i) => { const conn = state.connections.get(p.id); send(conn, { type: 'finished', score: p.score, correct: p.correct, total: state.quiz.questions.length, rank: i + 1, participants: people.length }); });
    updateScoreboard();
  }
  $('#endSession').addEventListener('click', () => {
    if (!confirm('Akhiri sesi sekarang? Hasil yang sudah terkumpul tetap bisa diunduh.')) return;
    if (state.currentIndex >= 0 && !state.sessionOver) finishSession();
    else if (!state.sessionOver) { state.sessionOver = true; $('#lobbyView').classList.add('hidden'); $('#resultsView').classList.remove('hidden'); $('#resultParticipants').textContent = state.participants.size; $('#resultAverage').textContent = '0%'; $('#resultQuestions').textContent = state.quiz.questions.length; broadcast({ type: 'finished', score: 0, correct: 0, total: state.quiz.questions.length, rank: null, participants: state.participants.size }); }
    try { state.peer?.destroy(); } catch (_) {}
  });
  $('#backToEditor').addEventListener('click', () => { try { state.peer?.destroy(); } catch (_) {} state.peer = null; state.connections.clear(); state.participants.clear(); state.currentIndex = -1; state.sessionOver = false; renderQuestions(); showScreen('teacher'); });

  // Student connection and answer flow.
  $('#joinQuiz').addEventListener('click', joinRoom);
  $('#studentCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
  async function joinRoom() {
    const name = $('#studentName').value.trim(); const code = $('#studentCode').value.trim().toLowerCase(); const error = $('#joinError'); error.classList.add('hidden');
    if (!name) { error.textContent = 'Masukkan nama Anda terlebih dahulu.'; error.classList.remove('hidden'); return; }
    if (!/^[a-z0-9-]{5,20}$/.test(code)) { error.textContent = 'Kode kuis tidak sesuai. Periksa kembali kode dari dosen.'; error.classList.remove('hidden'); return; }
    if (!window.Peer) { error.textContent = 'Koneksi belum siap. Muat ulang halaman dan coba lagi.'; error.classList.remove('hidden'); return; }
    state.studentName = name; state.studentRejected = false; $('#joinQuiz').disabled = true; $('#joinQuiz').textContent = 'Menghubungkan…';
    const peer = new Peer(); state.peer = peer;
    peer.on('open', () => {
      const roomPeerId = code.startsWith('kelas-') ? code : `kelas-${code}`;
      const conn = peer.connect(roomPeerId, { reliable: true }); state.studentConn = conn;
      conn.on('open', () => { send(conn, { type: 'hello', name }); $('#studentJoin').classList.add('hidden'); $('#studentWaiting').classList.remove('hidden'); $('#waitingName').textContent = name; $('.avatar', $('#studentWaiting')).textContent = name.slice(0,1).toUpperCase(); });
      conn.on('data', handleStudentMessage);
      conn.on('error', () => showJoinError('Koneksi ke sesi gagal. Pastikan dosen masih membuka sesi dan kodenya benar.'));
      conn.on('close', () => { if (!state.sessionOver && !state.studentRejected) showJoinError('Koneksi dengan sesi terputus. Minta dosen memeriksa halaman kuis.'); });
      setTimeout(() => { if (!conn.open && !state.sessionOver) showJoinError('Tidak dapat tersambung. Periksa kode dan pastikan dosen sudah memulai sesi.'); }, 12000);
    });
    peer.on('error', err => showJoinError(err.type === 'peer-unavailable' ? 'Sesi belum ditemukan. Periksa kode atau minta dosen membuka sesi.' : 'Koneksi gagal. Periksa jaringan lalu coba lagi.'));
  }
  function showJoinError(message) {
    $('#studentJoin').classList.remove('hidden'); $('#studentWaiting').classList.add('hidden'); $('#studentPlay').classList.add('hidden');
    $('#joinError').textContent = message; $('#joinError').classList.remove('hidden'); $('#joinQuiz').disabled = false; $('#joinQuiz').innerHTML = 'Bergabung ke kuis <span>→</span>';
  }
  function handleStudentMessage(data) {
    if (!data) return;
    if (data.type === 'full') { state.studentRejected = true; showJoinError('Sesi sudah mencapai batas 20 peserta. Hubungi dosen jika perlu bergabung.'); return; }
    if (data.type === 'lobby') { $('#waitingTitle').textContent = data.title || 'Menunggu dosen…'; $('#waitingMessage').textContent = 'Anda terhubung. Kuis akan dimulai sebentar lagi.'; return; }
    if (data.type === 'question') {
      state.studentQuestion = data.question; state.studentEndsAt = data.endsAt; state.studentSubmitted = false; state.studentScore = Number(data.score ?? state.studentScore);
      $('#studentWaiting').classList.add('hidden'); $('#studentFinished').classList.add('hidden'); $('#studentPlay').classList.remove('hidden');
      $('#studentQNum').textContent = `PERTANYAAN ${data.index + 1} / ${data.total}`; $('#studentQuestionText').textContent = data.question.question; $('#studentProgress').style.width = `${(data.index + 1) / data.total * 100}%`; $('#studentScoreLive').textContent = `Skor ${state.studentScore.toLocaleString('id-ID')}`;
      $('#studentChoices').innerHTML = data.question.choices.map((choice,i) => `<button class="student-choice" data-choice="${i}"><span class="choice-bullet">${letters[i]}</span><span>${esc(choice)}</span></button>`).join('');
      $$('.student-choice').forEach(button => button.addEventListener('click', () => submitAnswer(Number(button.dataset.choice))));
      $('#studentAnswerFeedback').classList.add('hidden'); clearInterval(state.studentTimer); tickStudentTimer(); state.studentTimer = setInterval(tickStudentTimer, 200);
    }
    if (data.type === 'reveal') {
      $$('.student-choice').forEach((button,i) => { button.disabled = true; if (i === data.correctIndex) button.classList.add('correct'); });
      const key = $('#studentQNum').textContent;
      state.studentAnswers[key] = { ...(state.studentAnswers[key] || {}), correct: Boolean(data.correct) };
      state.studentScore = Number(data.score || 0); $('#studentScoreLive').textContent = `Skor ${state.studentScore.toLocaleString('id-ID')}`;
      if (!state.studentSubmitted) $('#studentAnswerFeedback').textContent = `Waktu habis. Jawaban benar: ${letters[data.correctIndex]} — ${data.correctText}`;
      else if (data.correct) $('#studentAnswerFeedback').textContent = 'Benar! Poin Anda telah ditambahkan.';
      else $('#studentAnswerFeedback').textContent = `Jawaban benar: ${letters[data.correctIndex]} — ${data.correctText}`;
      $('#studentAnswerFeedback').className = `answer-feedback ${data.correct ? 'correct' : 'wrong'}`;
    }
    if (data.type === 'finished') {
      state.sessionOver = true; clearInterval(state.studentTimer); state.studentScore = Number(data.score || state.studentScore); $('#studentPlay').classList.add('hidden'); $('#studentWaiting').classList.add('hidden'); $('#studentFinished').classList.remove('hidden');
      $('#finalScore').textContent = state.studentScore.toLocaleString('id-ID'); $('#finishRank').textContent = data.rank ? `Peringkat ${data.rank} dari ${data.participants} peserta` : 'Terima kasih sudah mengikuti kuis.'; $('#finishHeading').textContent = data.rank === 1 ? 'Luar biasa!' : 'Kerja bagus!'; $('#finishMessage').textContent = `Anda menjawab benar ${data.correct} dari ${data.total} pertanyaan.`;
    }
  }
  function tickStudentTimer() {
    const remaining = Math.max(0, state.studentEndsAt - Date.now()); const seconds = Math.ceil(remaining / 1000); const chip = $('#studentTimer');
    chip.textContent = `00:${String(seconds).padStart(2,'0')}`; chip.classList.toggle('urgent', seconds <= 5);
    if (remaining <= 0) { clearInterval(state.studentTimer); $$('.student-choice').forEach(button => button.disabled = true); }
  }
  function submitAnswer(choice) {
    if (state.studentSubmitted) return; state.studentSubmitted = true;
    $$('.student-choice').forEach(button => { button.disabled = true; if (Number(button.dataset.choice) === choice) button.classList.add('selected'); });
    const num = $('#studentQNum').textContent; state.studentAnswers[num] = { choice, correct: false };
    send(state.studentConn, { type: 'answer', choice });
    $('#studentAnswerFeedback').textContent = 'Jawaban terkirim. Tunggu peserta lain…'; $('#studentAnswerFeedback').className = 'answer-feedback'; $('#studentAnswerFeedback').classList.remove('hidden');
  }

  function reportRows() {
    const people = [...state.participants.values()].sort((a,b) => b.score - a.score || b.correct - a.correct);
    return people.map((p,i) => {
      const row = { 'Peringkat': i + 1, 'Nama mahasiswa': p.name, 'Skor': p.score, 'Benar': p.correct, 'Jumlah soal': state.quiz.questions.length, 'Nilai (%)': state.quiz.questions.length ? Math.round(p.correct / state.quiz.questions.length * 100) : 0 };
      state.quiz.questions.forEach((q,qi) => { const ans = p.answers[qi]; row[`Soal ${qi + 1}`] = ans ? `${letters[ans.choice]}${ans.correct ? ' ✓' : ''}` : 'Tidak menjawab'; });
      return row;
    });
  }
  function questionReportRows() {
    return state.quiz.questions.map((q,qi) => {
      const answers = [...state.participants.values()].map(p => p.answers[qi]).filter(Boolean); const correct = answers.filter(a => a.correct).length;
      return { 'No.': qi + 1, 'Pertanyaan': q.question, 'Jawaban benar': letters[q.correctIndex], 'Teks jawaban benar': q.choices[q.correctIndex], 'Menjawab': answers.length, 'Benar': correct, 'Akurasi (%)': answers.length ? Math.round(correct / answers.length * 100) : 0 };
    });
  }
  function triggerExcel() {
    const filename = `${safeFilename(state.quiz.title)}-hasil`;
    if (window.XLSX) {
      const wb = XLSX.utils.book_new(); const summary = XLSX.utils.json_to_sheet(reportRows()); const questions = XLSX.utils.json_to_sheet(questionReportRows());
      summary['!cols'] = [{wch:9},{wch:25},{wch:12},{wch:9},{wch:13},{wch:12}, ...state.quiz.questions.map((_,i) => ({wch:12}))];
      questions['!cols'] = [{wch:8},{wch:55},{wch:16},{wch:55},{wch:12},{wch:9},{wch:13}];
      XLSX.utils.book_append_sheet(wb, summary, 'Hasil Mahasiswa'); XLSX.utils.book_append_sheet(wb, questions, 'Analisis Soal'); XLSX.writeFile(wb, `${filename}.xlsx`);
    } else {
      const rows = reportRows(); const keys = rows.length ? Object.keys(rows[0]) : ['Peringkat','Nama mahasiswa','Skor','Benar','Jumlah soal','Nilai (%)'];
      const csv = [keys, ...rows.map(row => keys.map(k => row[k] ?? ''))].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
      downloadBlob(`${filename}.csv`, new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    }
  }
  $('#downloadExcel').addEventListener('click', triggerExcel);
  $('#downloadPdf').addEventListener('click', () => {
    const people = [...state.participants.values()].sort((a,b) => b.score - a.score || b.correct - a.correct);
    const avg = people.length ? Math.round(people.reduce((sum,p) => sum + p.correct / state.quiz.questions.length * 100, 0) / people.length) : 0;
    $('#printReport').innerHTML = `<h1>${esc(state.quiz.title)}</h1><p>Rekap hasil kuis · ${new Date().toLocaleString('id-ID')} · ${people.length} peserta · rata-rata ${avg}%</p><table><thead><tr><th>Peringkat</th><th>Nama mahasiswa</th><th>Skor</th><th>Benar</th><th>Nilai (%)</th></tr></thead><tbody>${people.map((p,i) => `<tr><td>${i + 1}</td><td>${esc(p.name)}</td><td>${p.score}</td><td>${p.correct}/${state.quiz.questions.length}</td><td>${Math.round(p.correct / state.quiz.questions.length * 100)}%</td></tr>`).join('')}</tbody></table><h2 style="font-size:15px">Ringkasan pertanyaan</h2><table><thead><tr><th>No.</th><th>Pertanyaan</th><th>Jawaban benar</th><th>Menjawab</th><th>Benar</th><th>Akurasi</th></tr></thead><tbody>${questionReportRows().map(q => `<tr><td>${q['No.']}</td><td>${esc(q.Pertanyaan)}</td><td>${q['Jawaban benar']}. ${esc(q['Teks jawaban benar'])}</td><td>${q.Menjawab}</td><td>${q.Benar}</td><td>${q['Akurasi (%)']}%</td></tr>`).join('')}</tbody></table>`;
    $('#printReport').classList.remove('hidden'); window.print(); setTimeout(() => $('#printReport').classList.add('hidden'), 500);
  });
  renderQuestions();
})();
