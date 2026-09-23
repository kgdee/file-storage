const TextModal = (() => {
  const element = document.querySelector(".folder-modal");
  const titleEl = element.querySelector(".title");
  const nameInput = element.querySelector(".name-input");
  const iconInput = element.querySelector(".icon-input input");
  const iconPreview = element.querySelector(".icon-input img");
  const submitBtn = element.querySelector(".submit-btn");
  const deleteBtn = element.querySelector(".delete-btn");

  let currentItem = null;

  iconInput.oninput = (event) => {
    const file = event.target.files[0];
    iconPreview.src = URL.createObjectURL(file);
  };

  submitBtn.onclick = handleSubmit;
  deleteBtn.onclick = handleDelete;

  function openCreate() {
    update();
    open();
  }

  function openUpdate(itemId) {
    const item = getItem(itemId);
    currentItem = item;
    update();
    open();
  }

  function update() {
    iconInput.value = "";
    iconPreview.src = currentItem?.icon || `assets/images/file-text.png`;
    titleEl.textContent = currentItem ? `Edit ${currentItem.name}` : `Create new text`;
    nameInput.value = currentItem?.name || createItemName(`New text`);

    submitBtn.innerHTML = currentItem ? `<i class="bi bi-check2"></i> Update` : `<i class="bi bi-plus-lg"></i> Create`;
    deleteBtn.classList.toggle("hidden", !currentItem);
  }

  async function handleSubmit() {
    if (iconInput.value) {
      const file = iconInput.files[0];
      if (file.size > 0.5 * 1024 * 1024) {
        Toast.show("Upload failed: That file exceeds 500KB limit");
        return;
      }
    }

    let itemData = {
      name: nameInput.value,
      icon: iconInput.value ? await getFileDataUrl(iconInput.files[0]) : currentItem?.icon || null,
    };

    currentItem ? updateFolder(currentItem.id, itemData) : createFolder(itemData, currentFolder.id);
    close();
  }

  async function handleDelete() {
    await deleteItem(currentItem.id);
    close();
  }

  function close() {
    element.classList.toggle("hidden", true);
    currentItem = null;
  }

  return { openCreate, openUpdate, close, listenText, copyText };
})();
