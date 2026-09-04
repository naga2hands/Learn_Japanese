const state = {
  activeLesson: 1,
  activeTab: 'சொற்றொடர் அமைப்பு',
  tamilDisplay: 'Tamil_Natural',
  workbook: {
    learn: [],
    reibun: [],
    vocab: [],
    renshuuA: [],
    grammarNotes: []
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [learnCsv, reibunCsv, vocabCsv, renshuuCsv, grammarNotesCsv] = await Promise.all([
      fetch('./Dataset/Learn_Japanese_Dataset.csv').then((response) => response.text()),
      fetch('./Dataset/Reibun_MinnaNoNihongo.csv').then((response) => response.text()),
      fetch('./Dataset/Vocabs_MinnaNoNihongo.csv').then((response) => response.text()),
      fetch('./Dataset/Renshuu_A_MinnaNoNihongo.csv').then((response) => response.text()),
      fetch('./Dataset/Grammar_Notes.csv').then((response) => response.text())
    ]);

    state.workbook.learn = parseCsv(learnCsv);
    state.workbook.reibun = parseCsv(reibunCsv);
    state.workbook.vocab = parseCsv(vocabCsv);
    state.workbook.renshuuA = parseCsv(renshuuCsv);
    state.workbook.grammarNotes = parseCsv(grammarNotesCsv);

    renderLessonNav();
    renderTabBar();
    renderLessonContent();
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
  const tabs = ['சொற்றொடர் அமைப்பு', 'உதாரணச் சொற்றொடர்', 'பயிற்சி A', 'சொற்கள்', 'இலக்கணக் குறிப்பு'];
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
      content.innerHTML = renderSection('文型', getRowsForSection('Bunkei'));
      break;
    case 'உதாரணச் சொற்றொடர்':
      content.innerHTML = renderSection('例文', getRowsForSection('Reibun', state.workbook.reibun));
      break;
    case 'பயிற்சி A':
      content.innerHTML = renderRenshuuATemplate();
      break;
    case 'சொற்கள்':
      content.innerHTML = renderVocabulary();
      break;
    case 'இலக்கணக் குறிப்பு':
      content.innerHTML = renderGrammarNotes();
      break;
    default:
      content.innerHTML = '';
  }

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

function renderSection(title, rows) {
  if (!rows.length) {
    return `
      <div class="empty-state">
        <h2>${title}</h2>
        <p>No ${title.toLowerCase()} entries are available for this lesson yet.</p>
      </div>
    `;
  }

  const groupedRows = groupRowsBySno(rows);

  return `
    <div class="section-intro">
      <span class="kicker">${title}</span>
      <h2>${title} – Lesson ${state.activeLesson}</h2>
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
  const rows = state.workbook.renshuuA.filter((item) => Number(item.lesson) === state.activeLesson);

  return `
    <div class="section-intro">
      <span class="kicker">練習　A</span>
      <h2>Practice A – Template</h2>
      <p>This section is ready for future exercises. Add your own lesson data later and the table will automatically display it in the same format.</p>
    </div>
    <div class="table-wrap">
      <table class="lesson-table template-table">
        <thead>
          <tr>
            <th>SNO</th>
            <th>Type</th>
            <th>Japanese Prompt</th>
            <th>Tamil Prompt</th>
            <th>Answer Hint</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.sno)}</td>
              <td>${escapeHtml(row.type)}</td>
              <td>${escapeHtml(row.japanese_prompt)}</td>
              <td>${escapeHtml(row.tamil_prompt)}</td>
              <td>${escapeHtml(row.answer_hint)}</td>
              <td>${escapeHtml(row.notes)}</td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="6">
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
      <h2>Vocabulary – Lesson ${state.activeLesson}</h2>
      <p>Loaded directly from the Minna no Nihongo vocabulary CSV without recreating or modifying the original dataset.</p>
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
  const rows = state.workbook.grammarNotes;
  const columns = rows.length ? Object.keys(rows[0]) : [];

  return `
    <div class="section-intro">
      <span class="kicker">文法ノート</span>
      <h2>Grammar Notes</h2>
    </div>
    <div class="table-wrap">
      <table class="lesson-table">
        <thead>
          <tr>
            ${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((column) => {
                const cellClass = column === 'NOTES_DESCRIPTION' ? ' class="grammar-description"' : '';
                return `<td${cellClass}>${escapeHtml(row[column])}</td>`;
              }).join('')}
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
  const value = row.Lesson ?? row.lesson ?? row.L ?? row.l ?? '';
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
