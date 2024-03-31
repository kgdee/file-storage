const storagePrefix = "file-storage_"
const breadcrumbsEl = document.querySelector(".breadcrumbs")
const directoryEl = document.querySelector(".directory")

let currentFolder = { id: null, name: "My Drive", path: null, type: "root" }

async function refreshDirectory(items) {

  directoryEl.innerHTML = items.map(item => {
    
    let icon = "images/folder.png"
    
    if (item.type === "file") icon = isImage(item.name) ? item.url : "images/file.png"
    
    return `
    <div class="item ${item.type}" ${item.type === "folder" ? `onclick="openFolder('${item.id}')"` : ""}>
      <img src="${icon}" class="icon">
      <p class="title">${item.name}</p>
    </div>
    `
  }).join(" ")
}

function isImage(filename) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.tiff'];

  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

async function openFolder(folderId) {
  currentFolder = await getFolder(folderId)

  listFoldersAndFiles(folderId, refreshDirectory)

  console.log(currentFolder.path)
  renderBreadcrumbs()
}


// Function to render breadcrumbs
function renderBreadcrumbs() {

  breadcrumbsEl.innerHTML = `
    <span onclick="openFolder(null)">My Drive</span>

    ${currentFolder.type !== "root" ? `
      ${currentFolder.path.map(folder => `
        / <span onclick="openFolder('${folder.id}')">${folder.name}<span>
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



openFolder(null)





document.addEventListener("keydown", function(event) {
  if (event.key === " ") {
    // getFolder("rcQ1Z8LReblD5ZwNEkih")

    createFolder("subfolder", currentFolder.id)

    // const exampleFile = new File(["Hello, World!"], "example.txt", { type: "text/plain" });
    // uploadFile(exampleFile, null);
  }
})