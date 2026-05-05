import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBuLTz4m65NY5Qok063ODlXtulLxvtFvFs",
  authDomain: "my-tennis-app-202505.firebaseapp.com",
  projectId: "my-tennis-app-202505",
  storageBucket: "my-tennis-app-202505.appspot.com",
  messagingSenderId: "264326485034",
  appId: "1:264326485034:web:663c71439cf8210f36df53"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let editingId = null;

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("date").value = today;

  displayRecords();

  document.getElementById("cancelBtn").addEventListener("click", cancelEdit);

  document.getElementById("practiceForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const record = {
      date: document.getElementById("date").value,
      lessonType: document.getElementById("lessonType").value,
      content: document.getElementById("content").value,
      rating: document.getElementById("rating").value || null,
      comment: document.getElementById("comment").value,
      createdAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "practices", editingId), record);
        alert("練習記録を更新しました！");
      } else {
        await addDoc(collection(db, "practices"), record);
        alert("練習記録を追加しました！");
      }

      resetForm();
      await displayRecords();
    } catch (e) {
      console.error("保存エラー:", e);
      alert("保存に失敗しました。Firestoreのルールを確認してください。");
    }
  });
});

function resetForm() {
  document.getElementById("practiceForm").reset();

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("date").value = today;
  document.getElementById("lessonType").value = "";

  editingId = null;

  document.getElementById("formTitle").textContent = "練習記録を追加";
  document.getElementById("submitBtn").textContent = "記録を追加";
  document.getElementById("cancelBtn").style.display = "none";
}

function cancelEdit() {
  resetForm();
}

async function displayRecords() {
  const recordsList = document.getElementById("recordsList");

  try {
    const querySnapshot = await getDocs(collection(db, "practices"));
    const records = [];

    querySnapshot.forEach((docSnap) => {
      records.push({
        firebaseId: docSnap.id,
        ...docSnap.data()
      });
    });

    if (records.length === 0) {
      recordsList.innerHTML = '<p class="no-records">まだ練習記録がありません。</p>';
      return;
    }

    const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));

    const recordsByMonth = {};
    sortedRecords.forEach((record) => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!recordsByMonth[monthKey]) {
        recordsByMonth[monthKey] = [];
      }

      recordsByMonth[monthKey].push(record);
    });

    let html = "";

    Object.keys(recordsByMonth).forEach((monthKey) => {
      const [year, month] = monthKey.split("-");
      const monthLabel = `${year}年${parseInt(month)}月`;
      const monthRecords = recordsByMonth[monthKey];
      const recordCount = monthRecords.length;

      html += `
        <div class="month-section">
          <div class="month-header" data-month="${monthKey}">
            <span class="month-arrow">▼</span>
            <span class="month-label">${monthLabel}</span>
            <span class="record-count">(${recordCount}件)</span>
          </div>
          <div class="month-records" id="month-${monthKey}">
            ${monthRecords.map(record => `
              <div class="record-item">
                <div class="record-date">${formatDate(record.date)}</div>
                ${record.lessonType ? `<div class="record-lesson-type"><strong>レッスンタイプ：</strong> ${formatLessonType(record.lessonType)}</div>` : ""}
                <div class="record-content"><strong>練習内容：</strong> ${record.content}</div>
                ${record.rating ? `<div class="record-rating"><strong>自己評価：</strong> ${record.rating}/10</div>` : ""}
                ${record.comment ? `<div class="record-comment"><strong>コーチコメント：</strong> ${record.comment}</div>` : ""}
                <div class="record-actions">
                  <button class="btn-edit" data-id="${record.firebaseId}">修正</button>
                  <button class="btn-delete" data-id="${record.firebaseId}">削除</button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    });

    recordsList.innerHTML = html;

    document.querySelectorAll(".month-header").forEach((header) => {
      header.addEventListener("click", () => {
        toggleMonth(header.dataset.month, header);
      });
    });

    document.querySelectorAll(".btn-edit").forEach((button) => {
      button.addEventListener("click", () => {
        editRecord(button.dataset.id);
      });
    });

    document.querySelectorAll(".btn-delete").forEach((button) => {
      button.addEventListener("click", () => {
        deleteRecord(button.dataset.id);
      });
    });

  } catch (e) {
    console.error("読み込みエラー:", e);
    recordsList.innerHTML = '<p class="no-records">記録の読み込みに失敗しました。</p>';
  }
}

function toggleMonth(monthKey, monthHeader) {
  const monthRecords = document.getElementById(`month-${monthKey}`);

  monthRecords.classList.toggle("collapsed");
  monthHeader.classList.toggle("collapsed");
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

function formatLessonType(lessonType) {
  const types = {
    group: "グループレッスン",
    private: "プライベートレッスン",
    match: "試合"
  };

  return types[lessonType] || lessonType;
}

async function deleteRecord(id) {
  if (!confirm("この記録を削除しますか？")) {
    return;
  }

  try {
    await deleteDoc(doc(db, "practices", id));
    await displayRecords();
    alert("削除しました。");
  } catch (e) {
    console.error("削除エラー:", e);
    alert("削除に失敗しました。");
  }
}

async function editRecord(id) {
  try {
    const querySnapshot = await getDocs(collection(db, "practices"));
    let record = null;

    querySnapshot.forEach((docSnap) => {
      if (docSnap.id === id) {
        record = docSnap.data();
      }
    });

    if (!record) {
      alert("記録が見つかりませんでした。");
      return;
    }

    document.getElementById("date").value = record.date;
    document.getElementById("lessonType").value = record.lessonType || "";
    document.getElementById("content").value = record.content;
    document.getElementById("rating").value = record.rating || "";
    document.getElementById("comment").value = record.comment || "";

    editingId = id;

    document.getElementById("formTitle").textContent = "練習記録を修正";
    document.getElementById("submitBtn").textContent = "記録を更新";
    document.getElementById("cancelBtn").style.display = "inline-block";

    document.querySelector(".form-container").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    console.error("編集読み込みエラー:", e);
    alert("記録の読み込みに失敗しました。");
  }
}
