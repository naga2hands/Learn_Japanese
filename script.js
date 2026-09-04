const state = {
  activeLesson: 1,
  activeTab: 'சொற்றொடர் அமைப்பு',
  tamilDisplay: 'Tamil_Natural',
  workbook: {
    learn: [],
    reibun: [],
    vocab: [],
    renshuuA: [],
    grammarNotes: [],
    kaiwa: []
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [learnCsv, reibunCsv, vocabCsv, renshuuCsv, grammarNotesCsv, kaiwaCsv] = await Promise.all([
      fetch('./Dataset/Bunkei_Dataset.csv').then((response) => response.text()),
      fetch('./Dataset/Reibun_Dataset.csv').then((response) => response.text()),
      fetch('./Dataset/Vocabs_Dataset.csv').then((response) => response.text()),
      fetch('./Dataset/Renshuu_A_Dataset.csv').then((response) => response.text()),
      fetch('./Dataset/Grammar_Notes.csv').then((response) => response.text()),
      fetch('./Dataset/Kaiwa_Dataset.csv').then((response) => response.text())
    ]);

    state.workbook.learn = parseCsv(learnCsv);
    state.workbook.reibun = parseCsv(reibunCsv);
    state.workbook.vocab = parseCsv(vocabCsv);
    state.workbook.renshuuA = parseCsv(renshuuCsv);
    state.workbook.grammarNotes = parseCsv(grammarNotesCsv);
    state.workbook.kaiwa = parseCsv(kaiwaCsv);

    renderLessonNav();
    renderTabBar();
    renderLessonContent();
    document.addEventListener('keydown', handleImageOverlayKeydown);
  } catch (error) {
    const content = document.getElementById('lesson-content');
    content.innerHTML = `
      <div class="empty-state">
        <h2>Data could not be loaded.</h2>
        <p>Please check whether the CSV files are available in the Dataset folder.</p>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
});

function renderLessonNav() {
  const nav = document.getElementById('lesson-nav');
  const buttons = Array.from({ length: 25 }, (_, index) => {
    const lessonNumber = index + 1;
    const activeClass = lessonNumber === state.activeLesson ? 'active' : '';
    return `
      <button
        class="lesson-tile ${activeClass}"
        data-lesson="${lessonNumber}"
        aria-label="Open Lesson ${lessonNumber}"
      >
        ${lessonNumber}
      </button>
    `;
  }).join('');

  nav.innerHTML = buttons;

  nav.querySelectorAll('.lesson-tile').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeLesson = Number(button.dataset.lesson);
      renderLessonNav();
      renderLessonContent();
    });
  });
}

function renderTabBar() {
  const tabs = ['சொற்றொடர் அமைப்பு', 'உதாரணச் சொற்றொடர்', 'பயிற்சி A', 'சொற்கள்', 'உரையாடல்', 'இலக்கணக் குறிப்பு'];
  const bar = document.getElementById('tab-bar');

  bar.innerHTML = tabs
    .map((tab) => {
      const activeClass = tab === state.activeTab ? 'active' : '';
      return `<button class="tab-btn ${activeClass}" data-tab="${tab}">${tab}</button>`;
    })
    .join('');

  bar.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab;
      renderTabBar();
      renderLessonContent();
    });
  });
}

function renderLessonContent() {
  const title = document.getElementById('lesson-title');
  title.textContent = `பாடம் ${state.activeLesson}`;

  const content = document.getElementById('lesson-content');
  const introContainer = document.getElementById('section-intro-container');
  introContainer.innerHTML = '';

  switch (state.activeTab) {
    case 'சொற்றொடர் அமைப்பு':
      content.innerHTML = renderSection('文型', 'ぶんけい', getRowsForSection('Bunkei'));
      break;
    case 'உதாரணச் சொற்றொடர்':
      content.innerHTML = renderSection('例文', 'れいぶん', getRowsForSection('Reibun', state.workbook.reibun));
      break;
    case 'பயிற்சி A':
      content.innerHTML = renderRenshuuATemplate();
      break;
    case 'சொற்கள்':
      content.innerHTML = renderVocabulary();
      break;
    case 'உரையாடல்':
      content.innerHTML = renderKaiwa();
      break;
    case 'இலக்கணக் குறிப்பு':
      content.innerHTML = renderGrammarNotes();
      break;
    default:
      content.innerHTML = '';
  }

  renderLessonImageButton();

  const intro = content.querySelector('.section-intro');
  if (intro) {
    introContainer.appendChild(intro);
    const selectedOption = intro.querySelector(`input[value="${state.tamilDisplay}"]`);
    if (selectedOption) selectedOption.checked = true;
    intro.querySelectorAll('input[name="tamil-display"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        state.tamilDisplay = radio.value;
        renderLessonContent();
      });
    });
  }
}

function renderKaiwa() {
  const rows = state.workbook.kaiwa.filter((row) => getLessonNumber(row) === state.activeLesson);

  if (!rows.length) {
    return `
      <div class="empty-state">
        <h2>உரையாடல்</h2>
        <p>No conversation entries are available for this lesson yet.</p>
      </div>
    `;
  }

  return `
    <div class="section-intro">
      <span class="kicker">会話</span>
      <h2>かいわ</h2>
    </div>
    <div class="kaiwa-toolbar">
      <button id="lesson-image-button" class="lesson-image-tile" type="button">
        <span class="lesson-image-icon" aria-hidden="true">◫</span>
        <span>படம் பார்</span>
      </button>
    </div>
    <div class="table-wrap">
      <table class="lesson-table kaiwa-table">
        <thead>
          <tr>
            <th>கதாபாத்திரம்</th>
            <th>வசனம்</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.Character || '—')}</td>
              <td class="kaiwa-dialogue">${escapeHtml(row.Dialogue || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderLessonImageButton() {
  const button = document.getElementById('lesson-image-button');
  if (!button) return;

  button.onclick = showLessonImage;
}

function showLessonImage() {
  closeLessonImage();

  const overlay = document.createElement('div');
  overlay.className = 'lesson-image-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `Lesson ${state.activeLesson} image`);
  overlay.innerHTML = `
    <img src="./Dataset/images/${String(state.activeLesson).padStart(2, '0')}.png" alt="Lesson ${state.activeLesson}" />
  `;
  overlay.addEventListener('click', closeLessonImage);
  overlay.querySelector('img').addEventListener('click', (event) => event.stopPropagation());
  document.body.appendChild(overlay);
}

function closeLessonImage() {
  document.querySelector('.lesson-image-overlay')?.remove();
}

function handleImageOverlayKeydown(event) {
  if (event.key === 'Escape') closeLessonImage();
}

function renderSection(kickerTitle, headingTitle, rows) {
  if (!rows.length) {
    return `
      <div class="empty-state">
        <h2>${headingTitle}</h2>
        <p>No ${headingTitle.toLowerCase()} entries are available for this lesson yet.</p>
      </div>
    `;
  }

  const groupedRows = groupRowsBySno(rows);

  return `
    <div class="section-intro">
      <span class="kicker">${kickerTitle}</span>
      <h2>${headingTitle}</h2>
      <div class="tamil-display-control" role="group" aria-label="Tamil column display">
        <span>தமிழ் பகுதி:</span>
        <label><input type="radio" name="tamil-display" value="Tamil_Natural" checked /> இயல்பான தமிழ்</label>
        <label><input type="radio" name="tamil-display" value="Tamil_Japanese_Equivalent" /> ஜப்பானியத்துக்கு இணையான தமிழ்</label>
      </div>
    </div>
    <div class="lesson-grid-wrap">
      <div class="lesson-grid-head">
        <div>எண்</div>
        <div>யப்பானியச் சொற்றொடர்</div>
        <div>தமிழில்</div>
      </div>
      ${groupedRows
        .map(({ sno, items }) => {
          const japaneseMarkup = items
            .map((row) => {
              const japaneseText = row.Japanese_Example || row.Example || '—';

              return `
                <div class="jp-cell">
                  <span class="jp-text">${escapeHtml(japaneseText)}</span>
                </div>
              `;
            })
            .join('');

          const tamilMarkup = items
            .map((row) => `<div>${escapeHtml(row[state.tamilDisplay] || '—')}</div>`)
            .join('');

          return `
            <div class="lesson-grid-row">
              <div class="lesson-sno">${sno || '—'}</div>
              <div class="jp-stack">${japaneseMarkup}</div>
              <div class="tamil-stack">${tamilMarkup}</div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderRenshuuATemplate() {
  const rows = state.workbook.renshuuA.filter((item) => getLessonNumber(item) === state.activeLesson);

  return `
    <div class="section-intro">
      <span class="kicker">練習　A</span>
      <h2>れんしゅ A</h2>
      <p>இந்தப் பகுதியில் உள்ள வாக்கியங்களை படித்து அர்த்தத்தை மனதில் இருத்துங்கள்.</p>
    </div>
    <div class="table-wrap">
      <table class="lesson-table template-table">
        <thead>
          <tr>
            <th>எண்</th>
            <th>யப்பானியத்தில்</th>
            <th>தமிழில்</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.SNO || row.sno)}</td>
              <td>${escapeHtml(row.Japanese || '—')}</td>
              <td>${escapeHtml(row.Tamil || '—')}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="3">
                <div class="empty-state">No Renshuu A data exists yet for Lesson ${state.activeLesson}. Add your dataset later.</div>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

function renderVocabulary() {
  const rows = state.workbook.vocab.filter((row) => Number(getLessonNumber(row)) === state.activeLesson);

  if (!rows.length) {
    return `
      <div class="empty-state">
        <h2>Vocabulary</h2>
        <p>No vocabulary entries are available for this lesson in the dataset.</p>
      </div>
    `;
  }

  return `
    <div class="section-intro">
      <span class="kicker">言葉</span>
      <h2>ことば</h2>
      <p>இந்தப் பகுதியில் உள்ள சொற்களை படித்து அர்த்தத்தை மனதில் இருத்துங்கள்.</p>
    </div>
    <div class="table-wrap">
      <table class="lesson-table">
        <thead>
          <tr>
            <th>எண்</th>
            <th>கான்சி</th>
            <th>ஹிரகந/கதகந</th>
            <th>தமிழில்</th>
            <th>ஆங்கிலத்தில்</th>
            <th>ரோமாஜியில்</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${row.SN || row.sn || '—'}</td>
              <td>${escapeHtml(row.KANJI || row.kanji || '—')}</td>
              <td>${escapeHtml(row.HIRAGANA_KATAKANA || row.HIRAGANA_KATAKANA || '—')}</td>
              <td>${escapeHtml(row.TAMIL || row.tamil || '—')}</td>
              <td>${escapeHtml(row.ENGLISH || row.english || '—')}</td>
              <td>${escapeHtml(row.ROMAJI || row.romaji || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderGrammarNotes() {
  const rows = state.workbook.grammarNotes.filter((row) => getLessonNumber(row) === state.activeLesson);

  return `
    <div class="section-intro">
      <span class="kicker">文法ノート</span>
      <h2>ぶんほうノート</h2>
    </div>
    <div class="table-wrap">
      <table class="lesson-table">
        <thead>
          <tr>
            <th>எண்</th>
            <th>யப்பானியத்தில்</th>
            <th>தமிழில்</th>
            <th>விளக்கம்</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.SNO || row.sno || rows.indexOf(row) + 1)}</td>
              <td>${escapeHtml(row.JAPANESE || row.NOTES_TOPIC_J || '—')}</td>
              <td>${escapeHtml(row.TAMIL || row.NOTES_TOPIC_N || '—')}</td>
              <td class="grammar-description">${escapeHtml(row.NOTES_DESCRIPTION || row.DESCRIPTION || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function getRowsForSection(sectionName, sourceRows = state.workbook.learn) {
  return sourceRows.filter((row) => {
    const lessonNumber = Number(getLessonNumber(row));
    const sectionMatch = row.Section && row.Section.trim() === sectionName;
    return lessonNumber === state.activeLesson && sectionMatch;
  });
}

function getLessonNumber(row) {
  const value = row.LESSON ?? row.Lesson ?? row.lesson ?? row.L ?? row.l ?? '';
  const normalized = String(value).trim();
  return normalized === '' ? NaN : Number(normalized);
}

function groupRowsBySno(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const sno = row.SNO || '—';
    if (!grouped.has(sno)) {
      grouped.set(sno, []);
    }
    grouped.get(sno).push(row);
  });

  return Array.from(grouped.entries()).map(([sno, items]) => ({
    sno,
    items: items.sort((a, b) => Number(a.SNO || 0) - Number(b.SNO || 0))
  }));
}

function parseCsv(text) {
  const rows = [];
  const records = [];
  let currentRecord = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        currentRecord += '""';
        i += 1;
      } else {
        inQuotes = !inQuotes;
        currentRecord += char;
      }
    } else if (char === '\n' && !inQuotes) {
      if (currentRecord.trim() !== '') records.push(currentRecord);
      currentRecord = '';
    } else {
      currentRecord += char;
    }
  }

  if (currentRecord.trim() !== '') records.push(currentRecord);
  if (!records.length) return rows;

  const headers = parseCsvLine(records[0]);

  for (let recordIndex = 1; recordIndex < records.length; recordIndex += 1) {
    const values = parseCsvLine(records[recordIndex]);
    const row = {};
    for (let i = 0; i < headers.length; i += 1) {
      const header = headers[i] ? headers[i].trim() : '';
      const value = values[i] !== undefined ? values[i].trim() : '';
      row[header] = value;
    }
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
