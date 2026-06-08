/* =========================================================
   create.js — Логика создания / редактирования объявления
   ========================================================= */

// ───────────────────── State ─────────────────────
let isEditMode = false;
let editId = null;


// ───────────────────── DOM Elements ─────────────────────
const form = document.getElementById('create-form');
const titleInput = document.getElementById('title-input');
const descriptionInput = document.getElementById('description-input');
const priceInput = document.getElementById('price-input');
const categorySelect = document.getElementById('category-select');
const contactInput = document.getElementById('contact-input');
const submitBtn = document.getElementById('submit-btn');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const breadcrumbCurrent = document.getElementById('breadcrumb-current');
const formError = document.getElementById('form-error');

// ───────────────────── Init ─────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  Auth.init();
  buildCategoryOptions();
  attachEvents();

  // Check if editing
  editId = getUrlParam('id');
  if (editId) {
    isEditMode = true;
    pageTitle.textContent = '✏️ Редактирование';
    pageSubtitle.textContent = 'Измените данные объявления';
    breadcrumbCurrent.textContent = 'Редактирование';
    submitBtn.textContent = '💾 Сохранить изменения';
    document.title = 'Редактировать — Маркетплейс';
    await loadItemForEdit(editId);
  }
});

// ───────────────────── Build Category Options ─────────────────────
function buildCategoryOptions() {
  CONFIG.CATEGORIES.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = `${cat.icon} ${cat.label}`;
    categorySelect.appendChild(option);
  });
}

// ───────────────────── Events ─────────────────────
function attachEvents() {
  // Form submit
  form.addEventListener('submit', handleSubmit);

  // Clear validation errors on input
  [titleInput, descriptionInput, priceInput, categorySelect, contactInput].forEach(input => {
    input.addEventListener('input', () => {
      input.closest('.form-group').classList.remove('error');
      formError.style.display = 'none';
    });
  });
}

// ───────────────────── Load Item for Edit ─────────────────────
async function loadItemForEdit(id) {
  try {
    const item = await getItemById(id);
    if (!item) {
      showToast('Объявление не найдено', 'error');
      setTimeout(() => window.location.href = 'index.html', 1500);
      return;
    }

    if (!Auth.canEdit(item)) {
      showToast('Вы не можете редактировать это объявление', 'error');
      setTimeout(() => window.location.href = `item.html?id=${id}`, 1500);
      return;
    }

    // Fill form
    titleInput.value = item.title || '';
    descriptionInput.value = item.description || '';
    priceInput.value = item.price || 0;
    categorySelect.value = item.category || '';
    contactInput.value = item.contact || '';
  } catch (error) {
    console.error('Load error:', error);
    showToast('Ошибка загрузки', 'error');
  }
}

// ───────────────────── Form Validation ─────────────────────
function validateForm() {
  let isValid = true;

  // Title
  if (!titleInput.value.trim()) {
    document.getElementById('title-group').classList.add('error');
    isValid = false;
  }

  // Description
  if (!descriptionInput.value.trim()) {
    document.getElementById('description-group').classList.add('error');
    isValid = false;
  }

  // Price
  if (priceInput.value === '' || parseInt(priceInput.value) < 0) {
    document.getElementById('price-group').classList.add('error');
    isValid = false;
  }

  // Category
  if (!categorySelect.value) {
    document.getElementById('category-group').classList.add('error');
    isValid = false;
  }

  // Contact
  if (!contactInput.value.trim()) {
    document.getElementById('contact-group').classList.add('error');
    isValid = false;
  }

  if (!isValid) {
    formError.textContent = 'Заполните все обязательные поля';
    formError.style.display = 'block';
  }

  return isValid;
}

// ───────────────────── Submit ─────────────────────
async function handleSubmit(e) {
  e.preventDefault();

  // Require auth
  if (!Auth.getUser()) {
    Auth.requireAuth(() => handleSubmit(e));
    return;
  }

  if (!validateForm()) {
    // Scroll to first error
    const firstError = form.querySelector('.form-group.error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Disable button
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = '⏳ Сохранение...';

  try {
    const itemData = {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      price: parseInt(priceInput.value) || 0,
      category: categorySelect.value,
      contact: contactInput.value.trim()
    };

    if (isEditMode) {
      await updateItem(editId, itemData);
      showToast('Объявление обновлено! ✅', 'success');
      setTimeout(() => {
        window.location.href = `item.html?id=${editId}`;
      }, 1000);
    } else {
      const newItem = await createItem(itemData);
      showToast('Объявление создано! 🎉', 'success');
      setTimeout(() => {
        window.location.href = `item.html?id=${newItem.id}`;
      }, 1000);
    }
  } catch (error) {
    console.error('Submit error:', error);
    showToast(error.message || 'Ошибка сохранения', 'error');
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.textContent = originalText;
  }
}
