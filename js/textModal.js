const TextModal = (() => {
  const element = document.querySelector(".text-modal");
  const titleEl = element.querySelector(".title");
  const nameInput = element.querySelector(".name-input");
  const iconInput = element.querySelector(".icon-input input");
  const iconPreview = element.querySelector(".icon-input img");
  const contentInput = element.querySelector(".content-input");
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
    currentItem = { ...item, name: removeExtension(item.name) };
    update();
    open();
  }

  function update() {
    iconInput.value = "";
    iconPreview.src = currentItem?.icon || `assets/images/file-text.png`;
    titleEl.textContent = currentItem ? `Edit ${currentItem.name}` : `Create new text`;
    nameInput.value = currentItem?.name || createItemName(`New text`);
    contentInput.value = currentItem?.content || "";

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
      content: contentInput.value,
      icon: iconInput.value ? await getFileDataUrl(iconInput.files[0]) : currentItem?.icon || null,
    };

    currentItem ? updateTxt(currentItem.id, itemData) : createTxt(itemData, currentFolder.id);
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

  function listenText() {
    const text = contentInput.value.trim();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }

  async function copyText() {
    // Select the text inside the textarea for visual feedback
    contentInput.select();
    contentInput.setSelectionRange(0, 99999); // For mobile devices

    // Write the text to the clipboard
    await navigator.clipboard.writeText(contentInput.value);
    Toast.show("Text copied successfully!");
  }

  return { openCreate, openUpdate, close, listenText, copyText };
})();
