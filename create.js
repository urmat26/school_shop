/* =========================================================
   create.js — Логика создания / редактирования объявления
   ========================================================= */

// ───────────────────── State ─────────────────────
let isEditMode = false;
let editId = null;
let imageData = '';

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
    pageTitle.textContent = Lang.t('create.title.edit');
    pageSubtitle.textContent = Lang.t('create.sub.edit');
    breadcrumbCurrent.textContent = Lang.t('create.breadcrumb.edit');
    submitBtn.textContent = Lang.t('create.btn.save');
    document.title = 'Редактировать — Маркетплейс';
    await loadItemForEdit(editId);
  }
  Lang.onChange(() => {
    buildCategoryOptions();
  });
});

// ───────────────────── Build Category Options ─────────────────────
function buildCategoryOptions() {
  const placeholder = categorySelect.querySelector('option[value=""]');
  const prevValue = categorySelect.value;
  categorySelect.innerHTML = '';
  if (placeholder) categorySelect.appendChild(placeholder);
  CONFIG.CATEGORIES.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = `${cat.icon} ${Lang.t('cat.' + cat.id)}`;
    categorySelect.appendChild(option);
  });
  categorySelect.value = prevValue;
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
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  });

  // Global drag events for full-page overlay
  const dropOverlay = document.getElementById('drop-overlay');
  let dragCounter = 0;

  document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1 && dropOverlay) {
      dropOverlay.classList.add('visible');
    }
  });

  document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0 && dropOverlay) {
      dropOverlay.classList.remove('visible');
    }
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    if (dropOverlay) dropOverlay.classList.remove('visible');
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

  // Character counter for description
  const descCounter = document.getElementById('desc-counter');
  descriptionInput.addEventListener('input', () => {
    const len = descriptionInput.value.length;
    const max = descriptionInput.maxLength || 5000;
    if (descCounter) {
      descCounter.textContent = `${len} / ${max}`;
      descCounter.className = 'char-counter' + (len > max * 0.9 ? ' danger' : len > max * 0.75 ? ' warning' : '');
    }
  });

  // Unsaved changes warning
  let formDirty = false;
  const markDirty = () => { formDirty = true; };
  [titleInput, descriptionInput, priceInput, categorySelect, contactInput].forEach(input => {
    input.addEventListener('input', markDirty);
    if (input.tagName === 'SELECT') input.addEventListener('change', markDirty);
  });
  window.addEventListener('beforeunload', (e) => {
    if (formDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  form.addEventListener('submit', () => { formDirty = false; });

  // Scroll to top
  const scrollBtn = document.getElementById('scroll-top');
  if (scrollBtn) {
    window.addEventListener('scroll', () => {
      scrollBtn.classList.toggle('visible', window.scrollY > 400);
    });
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

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
    showToast(Lang.t('create.error.image'), 'error');
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showToast(Lang.t('create.error.filesize'), 'error');
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
      showToast(Lang.t('create.error.notfound'), 'error');
      setTimeout(() => window.location.href = 'index.html', 1500);
      return;
    }

    if (!Auth.canEdit(item)) {
      showToast(Lang.t('create.error.permission'), 'error');
      setTimeout(() => window.location.href = `item.html?id=${id}`, 1500);
      return;
    }

    // Fill form
    titleInput.value = item.title || '';
    descriptionInput.value = item.description || '';
    priceInput.value = item.price || 0;
    categorySelect.value = item.category || '';
    contactInput.value = item.contact || '';

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
    showToast(Lang.t('toast.load.error'), 'error');
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

  // Also check description length via shared validator
  const validationError = validateItemForm(titleInput.value, descriptionInput.value);
  if (validationError) {
    formError.textContent = validationError;
    formError.style.display = 'block';
    isValid = false;
  }

  if (!isValid) {
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

  try {
    // Upload image to ImgBB if new image was selected
    let imageUrl = imageData || '';
    if (imageData && imageData.startsWith('data:image')) {
      submitBtn.textContent = Lang.t('create.loading.photo');
      imageUrl = await uploadImage(imageData);
    }

    submitBtn.textContent = Lang.t('create.loading.save');

    const itemData = {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      price: parseInt(priceInput.value) || 0,
      category: categorySelect.value,
      contact: contactInput.value.trim(),
      image: imageUrl
    };

    if (isEditMode) {
      await updateItem(editId, itemData);
      showToast(Lang.t('create.success.update'), 'success');
      setTimeout(() => {
        window.location.href = `item.html?id=${editId}`;
      }, 1000);
    } else {
      const newItem = await createItem(itemData);
      showToast(Lang.t('create.success.create'), 'success');
      setTimeout(() => {
        window.location.href = `item.html?id=${newItem.id}`;
      }, 1000);
    }
  } catch (error) {
    console.error('Submit error:', error);
    showToast(error.message || Lang.t('create.error.save'), 'error');
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.textContent = originalText;
  }
}
