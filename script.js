const storagePrefix = "file-storage_"
const breadcrumbsEl = document.querySelector(".breadcrumbs")
const directoryEl = document.querySelector(".directory")
const createFolderForm = document.querySelector(".create-folder")
const fileUploadInput = document.querySelector(".file-upload input")


let currentFolder = { id: null, name: "My Drive", path: null, type: "root" }

function stopPropagation(event) {
  event.stopPropagation()
}

function displayFile(file) {
  let icon = (isImage(file.name) && file.url) ? file.url : "images/file.png"
  
  return `
    <div class="item file">
      <img src="${icon}" class="icon">
      <p class="title">${file.name}</p>

      <div class="options" onclick="stopPropagation(event)">
        <button><i class="bi bi-cloud-arrow-down"></i></button>
        <button onclick="deleteFile('${file.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `
}

function displayFolder(folder) {
  let icon = "images/folder.png"
  
  return `
    <div class="item folder" onclick="openFolder('${folder.id}')">
      <img src="${icon}" class="icon">
      <p class="title">${folder.name}</p>

      <div class="options" onclick="stopPropagation(event)">
        <button><i class="bi bi-cloud-arrow-down"></i></button>
        <button onclick="deleteFolder('${folder.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `
}

async function refreshFiles(files) {
  const items = files.folders.concat(files.files)

  directoryEl.innerHTML = items.map(item => (
    item.type === "folder" ? displayFolder(item) : displayFile(item)
  )).join(" ")
}

function isImage(filename) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.tiff'];

  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

async function openFolder(folderId) {
  currentFolder = await getFolder(folderId)

  listFiles(folderId, refreshFiles)

  console.log(currentFolder.path)
  renderBreadcrumbs()
}


// Function to render breadcrumbs
function renderBreadcrumbs() {

  breadcrumbsEl.innerHTML = `
    <span onclick="openFolder(null)">My Drive</span>

    ${currentFolder.type !== "root" ? `
      ${currentFolder.path.map(folder => `
        / <span onclick="openFolder('${folder}')">${folder}<span>
      `).join(" ")}
    
      / <span>${currentFolder.name}</span>
    ` : ""}
  `
}

// Example usage
const currentPath = [
  { id: 'folder1', name: 'Folder 1' },
  { id: 'folder2', name: 'Folder 2' },
  { id: 'folder3', name: 'Folder 3' }
];


createFolderForm.addEventListener("submit", function(e) {
  e.preventDefault()
  createFolder(createFolderForm.elements['folderName'].value, currentFolder.id)
  createFolderForm.reset()
})

fileUploadInput.addEventListener("input", function() {
  uploadFile(fileUploadInput.files[0], currentFolder.id)
})


openFolder(null)





document.addEventListener("keydown", function(event) {
  if (event.key === " ") {
    // getFolder("rcQ1Z8LReblD5ZwNEkih")

    // createFolder("subfolder", currentFolder.id)

    // const exampleFile = new File(["Hello, World!"], "example.txt", { type: "text/plain" });
    // uploadFile(exampleFile, null);

    // deleteFolder("PwRL4yNdU5W5u8wysoka")
  }
})

window.addEventListener("error", (event) => {
  const error = `${event.type}: ${event.message}`
  console.error(error)
  alert(error)
});