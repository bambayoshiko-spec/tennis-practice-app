// グローバル変数
let editingRecordId = null;

// IndexedDBの設定
const DB_NAME = 'TennisPracticeDB';
const DB_VERSION = 1;
const STORE_NAME = 'practiceRecords';

// IndexedDBの初期化
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('date', 'date', { unique: false });
            }
        };
    });
}

// IndexedDBからのデータ読み込み
async function loadRecords() {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('IndexedDB error, falling back to localStorage:', error);
        // IndexedDBが失敗したらlocalStorageにフォールバック
        const records = localStorage.getItem(STORAGE_KEY);
        return records ? JSON.parse(records) : [];
    }
}

// IndexedDBへのデータ保存
async function saveRecords(records) {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // 既存データをクリア
        await new Promise((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
        });

        // 新しいデータを保存
        for (const record of records) {
            await new Promise((resolve, reject) => {
                const addRequest = store.add(record);
                addRequest.onsuccess = () => resolve();
                addRequest.onerror = () => reject(addRequest.error);
            });
        }

        // localStorageにもバックアップ
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
        console.warn('IndexedDB save failed, using localStorage:', error);
        // IndexedDBが失敗したらlocalStorageを使用
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
}

// 記録の表示
function displayRecords() {
    const records = loadRecords();

    if (records.length === 0) {
        recordsList.innerHTML = '<p class="no-records">まだ練習記録がありません。新しい記録を追加してください。</p>';
        return;
    }

    recordsList.innerHTML = records
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // 日付の新しい順にソート
        .map(record => `
            <div class="record-item">
                <div class="record-date">${formatDate(record.date)}</div>
                <div class="record-theme"><strong>テーマ:</strong> ${record.theme}</div>
                <div class="record-content"><strong>練習内容:</strong> ${record.content}</div>
                <div class="record-rating">自己評価: ${record.rating}/10</div>
                ${record.insights ? `<div class="record-insights"><strong>気づき:</strong> ${record.insights}</div>` : ''}
                ${record.comment ? `<div class="record-comment"><strong>コーチコメント:</strong> ${record.comment}</div>` : ''}
                <div class="record-actions">
                    <button class="btn-edit" onclick="editRecord(${record.id})">編集</button>
                    <button class="btn-delete" onclick="deleteRecord(${record.id})">削除</button>
                </div>
            </div>
        `).join('');
}

// 日付のフォーマット
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

// フォームの送信処理
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(practiceForm);
    const record = {
        id: editingRecordId || Date.now(), // 編集時は既存IDを使用、新規時は新規ID
        date: formData.get('date'),
        theme: formData.get('theme'),
        content: formData.get('content'),
        rating: parseInt(formData.get('rating')),
        insights: formData.get('insights') || '',
        comment: formData.get('comment') || ''
    };

    try {
        const records = await loadRecords();

        if (editingRecordId) {
            // 編集モード：既存の記録を更新
            const index = records.findIndex(r => r.id === editingRecordId);
            if (index !== -1) {
                records[index] = record;
            }
            editingRecordId = null; // 編集モードをリセット
        } else {
            // 新規追加モード
            records.push(record);
        }

        await saveRecords(records);

        // フォームのリセット
        practiceForm.reset();

        // 今日の日付を再設定
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;

        // ボタンのテキストをリセット
        document.querySelector('.btn[type="submit"]').textContent = '記録を追加';

        // キャンセルボタンを非表示
        document.getElementById('cancelBtn').style.display = 'none';

        // 記録の再表示
        await displayRecords();

        // 成功メッセージ
        alert(editingRecordId ? '記録を更新しました！' : '練習記録を追加しました！');
    } catch (error) {
        console.error('保存エラー:', error);
        alert('保存中にエラーが発生しました。もう一度お試しください。');
    }
}

// イベントリスナーの設定
practiceForm.addEventListener('submit', handleFormSubmit);

// キャンセルボタンのイベントリスナー
document.getElementById('cancelBtn').addEventListener('click', cancelEdit);

// 記録の編集
async function editRecord(id) {
    const records = await loadRecords();
    const record = records.find(r => r.id === id);

    if (record) {
        // フォームにデータをセット
        document.getElementById('date').value = record.date;
        document.getElementById('theme').value = record.theme;
        document.getElementById('content').value = record.content;
        document.getElementById('rating').value = record.rating;
        document.getElementById('insights').value = record.insights;
        document.getElementById('comment').value = record.comment;

        // 編集モードに設定
        editingRecordId = id;

        // ボタンのテキストを変更
        document.querySelector('.btn[type="submit"]').textContent = '記録を更新';

        // キャンセルボタンを表示
        document.getElementById('cancelBtn').style.display = 'inline-block';

        // 編集中の記録までスクロール
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
    }
}

// 記録の削除
async function deleteRecord(id) {
    if (confirm('この記録を削除しますか？')) {
        try {
            const records = await loadRecords();
            const updatedRecords = records.filter(r => r.id !== id);
            await saveRecords(updatedRecords);
            await displayRecords();
            alert('記録を削除しました。');
        } catch (error) {
            console.error('削除エラー:', error);
            alert('削除中にエラーが発生しました。');
        }
    }
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 今日の日付をデフォルトで設定
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;

        // 記録の表示
        await displayRecords();
    } catch (error) {
        console.error('初期化エラー:', error);
    }
});

// グローバル関数として編集・削除関数を定義
window.editRecord = editRecord;
window.deleteRecord = deleteRecord;
window.cancelEdit = cancelEdit;

// キャンセルボタンの処理
function cancelEdit() {
    editingRecordId = null;
    practiceForm.reset();

    // 今日の日付を再設定
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    // ボタンのテキストをリセット
    document.querySelector('.btn[type="submit"]').textContent = '記録を追加';

    // キャンセルボタンを非表示
    document.getElementById('cancelBtn').style.display = 'none';
}