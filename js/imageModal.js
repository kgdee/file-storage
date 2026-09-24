const ImageModal = (() => {
  const element = document.querySelector(".image-modal");
  const titleEl = element.querySelector(".title");
  const imageEl = element.querySelector(".modal-body img");
  const submitBtn = element.querySelector(".submit-btn");
  const deleteBtn = element.querySelector(".delete-btn");

  let currentItem = null;

  submitBtn.onclick = handleSubmit;
  deleteBtn.onclick = handleDelete;

  function update() {
    titleEl.textContent = currentItem.name;
    imageEl.src = currentItem.content;
  }

  function handleSubmit() {
    downloadItem(currentItem);
  }

  async function handleDelete() {
    const isDeleted = await deleteItem(currentItem);
    if (isDeleted) close();
  }

  function open(item) {
    currentItem = item;
    update();
    element.classList.toggle("hidden", false);
  }

  function close() {
    currentItem = null;
    element.classList.toggle("hidden", true);
  }

  return { open, close };
})();
