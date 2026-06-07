/* =========================================================
   create.js — Логика создания / редактирования объявления
   ========================================================= */

// ───────────────────── State ─────────────────────
let isEditMode = false;
let editId = null;
let imageData = ''; // base64 image

// ───────────────────── DOM Elements ─────────────────────
const form = document.getElementById('create-form');
const titleInput = document.getElementById('title-input');
const descriptionInput = document.getElementById('description-input');
const priceInput = document.getElementById('price-input');
const categorySelect = document.getElementById('category-select');
const contactInput = document.getElementById('contact-input');
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const imageRemoveBtn = document.getElementById('image-remove');
const uploadArea = document.getElementById('upload-area');
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

  // Image upload
  imageInput.addEventListener('change', handleImageUpload);

  // Drag & drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--accent)';
    uploadArea.style.background = 'var(--accent-glow)';
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '';
    uploadArea.style.background = '';
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    uploadArea.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  });

  // Remove image
  imageRemoveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearImage();
  });

  // Clear validation errors on input
  [titleInput, descriptionInput, priceInput, categorySelect, contactInput].forEach(input => {
    input.addEventListener('input', () => {
      input.closest('.form-group').classList.remove('error');
      formError.style.display = 'none';
    });
  });
}

// ───────────────────── Image Handling ─────────────────────
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Выберите изображение (JPG, PNG)', 'error');
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showToast('Файл слишком большой (макс. 2 MB)', 'error');
    return;
  }

  processImage(file);
}

function processImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    imageData = e.target.result;
    imagePreview.src = imageData;
    imagePreview.classList.add('visible');
    imageRemoveBtn.classList.add('visible');
    uploadArea.classList.add('has-image');

    // Hide upload text
    const uploadIcon = uploadArea.querySelector('.image-upload-icon');
    const uploadText = uploadArea.querySelector('.image-upload-text');
    const uploadHint = uploadArea.querySelector('.image-upload-hint');
    if (uploadIcon) uploadIcon.style.display = 'none';
    if (uploadText) uploadText.style.display = 'none';
    if (uploadHint) uploadHint.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  imageData = '';
  imageInput.value = '';
  imagePreview.src = '';
  imagePreview.classList.remove('visible');
  imageRemoveBtn.classList.remove('visible');
  uploadArea.classList.remove('has-image');

  // Show upload text
  const uploadIcon = uploadArea.querySelector('.image-upload-icon');
  const uploadText = uploadArea.querySelector('.image-upload-text');
  const uploadHint = uploadArea.querySelector('.image-upload-hint');
  if (uploadIcon) uploadIcon.style.display = '';
  if (uploadText) uploadText.style.display = '';
  if (uploadHint) uploadHint.style.display = '';
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

    // Load image if exists
    if (item.image) {
      imageData = item.image;
      imagePreview.src = imageData;
      imagePreview.classList.add('visible');
      imageRemoveBtn.classList.add('visible');
      uploadArea.classList.add('has-image');

      const uploadIcon = uploadArea.querySelector('.image-upload-icon');
      const uploadText = uploadArea.querySelector('.image-upload-text');
      const uploadHint = uploadArea.querySelector('.image-upload-hint');
      if (uploadIcon) uploadIcon.style.display = 'none';
      if (uploadText) uploadText.style.display = 'none';
      if (uploadHint) uploadHint.style.display = 'none';
    }
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
      contact: contactInput.value.trim(),
      image: imageData || ''
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
