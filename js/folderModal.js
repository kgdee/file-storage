const FolderModal = (() => {
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
    iconPreview.src = currentItem?.icon || `assets/images/folder.png`;
    titleEl.textContent = currentItem ? `Edit ${currentItem.name}` : `Create new folder`;
    nameInput.value = currentItem?.name || createItemName(`New folder`);

    submitBtn.innerHTML = currentItem ? `Update` : `Create`;
    deleteBtn.classList.toggle("hidden", !currentItem);
  }

  async function handleSubmit() {
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
  
  function open() {
    element.classList.toggle("hidden", false);
  }

  function close() {
    element.classList.toggle("hidden", true);
    currentItem = null;
  }

  return { openCreate, openUpdate, close };
})();
