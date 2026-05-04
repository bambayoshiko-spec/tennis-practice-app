const STORAGE_KEY = 'tennisPracticeRecords';
let editingId = null;

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    displayRecords();

    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
});

// フォーム送信
document.getElementById('practiceForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const record = {
        id: editingId || Date.now(),
        date: document.getElementById('date').value,
        lessonType: document.getElementById('lessonType').value,
        content: document.getElementById('content').value,
        rating: document.getElementById('rating').value || null,
        comment: document.getElementById('comment').value
    };

    // ローカルストレージに保存
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    if (editingId) {
        // 既存の記録を更新
        const index = records.findIndex(r => r.id === editingId);
        if (index !== -1) {
            records[index] = record;
        }
    } else {
        // 新しい記録を追加
        records.push(record);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

    // フォームをリセット
    resetForm();

    // 記録を表示
    displayRecords();
    alert(editingId ? '練習記録を更新しました！' : '練習記録を追加しました！');
});

function resetForm() {
    document.getElementById('practiceForm').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    document.getElementById('lessonType').value = '';
    editingId = null;
    document.getElementById('formTitle').textContent = '練習記録を追加';
    document.getElementById('submitBtn').textContent = '記録を追加';
    document.getElementById('cancelBtn').style.display = 'none';
}

function cancelEdit() {
    resetForm();
}

// 記録を表示
function displayRecords() {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const recordsList = document.getElementById('recordsList');

    if (records.length === 0) {
        recordsList.innerHTML = '<p class="no-records">まだ練習記録がありません。</p>';
        return;
    }

    // 新しい順に並び替え
    const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 月ごとにグループ化
    const recordsByMonth = {};
    sortedRecords.forEach(record => {
        const date = new Date(record.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!recordsByMonth[monthKey]) {
            recordsByMonth[monthKey] = [];
        }
        recordsByMonth[monthKey].push(record);
    });

    // 月ごとのセクションを作成
    let html = '';
    Object.keys(recordsByMonth).forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const monthLabel = `${year}年${parseInt(month)}月`;
        const monthRecords = recordsByMonth[monthKey];
        const recordCount = monthRecords.length;

        html += `
            <div class="month-section">
                <div class="month-header" onclick="toggleMonth('${monthKey}')">
                    <span class="month-arrow">▼</span>
                    <span class="month-label">${monthLabel}</span>
                    <span class="record-count">(${recordCount}件)</span>
                </div>
                <div class="month-records" id="month-${monthKey}">
                    ${monthRecords.map(record => `
                        <div class="record-item">
                            <div class="record-date">${formatDate(record.date)}</div>
                            ${record.lessonType ? `<div class="record-lesson-type"><strong>レッスンタイプ：</strong> ${formatLessonType(record.lessonType)}</div>` : ''}
                            <div class="record-content"><strong>練習内容：</strong> ${record.content}</div>
                            ${record.rating ? `<div class="record-rating"><strong>自己評価：</strong> ${record.rating}/10</div>` : ''}
                            ${record.comment ? `<div class="record-comment"><strong>コーチコメント：</strong> ${record.comment}</div>` : ''}
                            <div class="record-actions">
                                <button class="btn-edit" onclick="editRecord(${record.id})">修正</button>
                                <button class="btn-delete" onclick="deleteRecord(${record.id})">削除</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    recordsList.innerHTML = html;
}

// 月の表示/非表示を切り替え
function toggleMonth(monthKey) {
    const monthRecords = document.getElementById(`month-${monthKey}`);
    const monthHeader = event.target.closest('.month-header');

    monthRecords.classList.toggle('collapsed');
    monthHeader.classList.toggle('collapsed');
}

// 日付フォーマット
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

// レッスンタイプをフォーマット
function formatLessonType(lessonType) {
    const types = {
        'group': 'グループレッスン',
        'private': 'プライベートレッスン',
        'match': '試合'
    };
    return types[lessonType] || lessonType;
}

// 削除機能
function deleteRecord(id) {
    if (confirm('この記録を削除しますか？')) {
        let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        records = records.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        displayRecords();
        alert('削除しました。');
    }
}

// 編集機能
function editRecord(id) {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const record = records.find(r => r.id === id);

    if (record) {
        document.getElementById('date').value = record.date;
        document.getElementById('lessonType').value = record.lessonType || '';
        document.getElementById('content').value = record.content;
        document.getElementById('rating').value = record.rating || '';
        document.getElementById('comment').value = record.comment;

        editingId = id;
        document.getElementById('formTitle').textContent = '練習記録を修正';
        document.getElementById('submitBtn').textContent = '記録を更新';
        document.getElementById('cancelBtn').style.display = 'inline-block';

        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
    }
}
