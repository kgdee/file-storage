// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCE0cAed-n8RE14N57HvcNWWv1NhEzpakE",
  authDomain: "file-storage-fad94.firebaseapp.com",
  projectId: "file-storage-fad94",
  storageBucket: "file-storage-fad94.appspot.com",
  messagingSenderId: "305856790010",
  appId: "1:305856790010:web:06e57e0606624ae803f843"
};

const app = firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

let currentListeners = {}

async function getFolder(folderId) {
  if (!folderId) return { id: null, name: "My Drive", path: null, type: "root" }

  try {
    const docRef = db.collection("folders").doc(folderId)
    const doc = await docRef.get()
  
    if (doc.exists) {
      const docData = doc.data()
  
      const folder = { id: doc.id, name: docData.name, path: docData.path }

      return folder
    }
  
    return null 

  } catch (error) {
    console.error(error)
  }
}

async function createFolder(folderName, parentFolderId, callback) {
  try {
    callback(0)
    let path = []

    if (parentFolderId) {
      const parentFolder = await getFolder(parentFolderId)
      path = [ ...parentFolder.path, parentFolderId ]
    }
    callback(50)
    const folderRef = await db.collection("folders").add({
      name: folderName,
      parent: parentFolderId,
      path: path,
      type: "folder",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Folder created with ID: ", folderRef.id);
    callback(100)
    setTimeout(()=>callback(null), 500)

  } catch (error) {
    console.error("Error creating folder: ", error);
  }
}


async function deleteFolder(folderId, callback) {
  try {
    callback(0)
    const query = db.collection("folders").where("path", "array-contains", folderId)

    const querySnapshot = await query.get();
    
    // Delete nested folders and its files
    for (let i = 0; i < querySnapshot.size; i++) {
      const doc = querySnapshot.docs[i]
      await deleteFilesInFolder(doc.id)
      await deleteFolderDoc(doc.id)

      callback((90 / querySnapshot.size) * (i + 1))
    }
    
    // Delete its files
    await deleteFilesInFolder(folderId)

    // Delete the folder
    await deleteFolderDoc(folderId)

    callback(100)
    setTimeout(()=>callback(null), 500);

  } catch (error) {
    console.error(error)
  }
}

async function deleteFilesInFolder(folderId) {
  try {
    const query = db.collection("files").where("folder", "==", folderId)

    const querySnapshot = await query.get();

    querySnapshot.forEach(doc => {
      deleteFile(doc.id, ()=>{})
    })
  } catch (error) {
    console.error(error)
  }
}

async function deleteFolderDoc(folderId) {
  try {
    const folderRef = db.collection("folders").doc(folderId);
    await folderRef.delete();
    console.log(`Folder with ID ${folderId} successfully deleted.`);
  } catch (error) {
    console.error(error)
  }
}



async function getFile(fileId) {
  try {
    const docRef = db.collection("files").doc(fileId)
    const doc = await docRef.get()
  
    if (doc.exists) {
      const docData = doc.data()
      console.log(docData)
      return docData
    }
  
    return null 

  } catch (error) {
    console.error(error)
  }
}

async function uploadFile(file, folderId, callback) {
  try {
    callback(0)
    const fileRef = await db.collection("files").add({
      name: file.name,
      folder: folderId,
      type: "file",
      fileType: file.type,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });


    const storageRef = storage.ref().child(`files/${fileRef.id}/${file.name}`);
    const task = storageRef.put(file);

    // Update progress bar and progress status
    task.on('state_changed', 
      function progress(snapshot) {
        const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 90;
        callback(percentage)
      }
    )

    await storageRef.put(file);
    const fileUrl = await storageRef.getDownloadURL();
    callback(95)
    await fileRef.update({ url: fileUrl })
    callback(100)

    console.log("File uploaded successfully.");
    setTimeout(()=>callback(null), 500)

  } catch (error) {
    console.error("Error uploading file: ", error);
  }
}

async function updateFile(file, fileId, callback) {
  try {
    callback(0);
    
    const fileRef = db.collection("files").doc(fileId);

    await fileRef.update({
      name: file.name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const storageRef = storage.ref().child(`files/${fileId}/${file.name}`);
    const task = storageRef.put(file);

    // Update progress bar and progress status
    task.on('state_changed',
      function progress(snapshot) {
        const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 90;
        callback(percentage);
      }
    );

    await storageRef.put(file);
    const fileUrl = await storageRef.getDownloadURL();
    callback(95);
    await fileRef.update({ url: fileUrl });
    callback(100);

    console.log("File updated successfully.");
    setTimeout(() => callback(null), 500);

  } catch (error) {
    console.error("Error updating file: ", error);
  }
}

async function deleteFile(fileId, callback) {
  try {
    callback(0)
    const itemRef = storage.ref().child(`files/${fileId}`)
    const listResult = await itemRef.listAll();

    for (const fileRef of listResult.items) {
      await fileRef.delete();
      console.log(`${fileRef.name} deleted successfully`);
    }
    callback(50)
    const fileRef = db.collection("files").doc(fileId);
    await fileRef.delete();
    console.log(`File with ID ${fileId} successfully deleted.`);
    callback(100)
    setTimeout(()=>callback(null), 500);

  } catch (error) {
    console.error(error)
  }
}


// // Example usage
// async function exampleUsage() {
//   // Create a folder named "Documents" in the root directory
//   const documentsFolderId = await createFolder("Documents", null);

//   // Upload a file named "example.txt" to the "Documents" folder
//   const exampleFile = new File(["Hello, World!"], "example.txt", { type: "text/plain" });
//   await uploadFile(exampleFile, documentsFolderId);
// }


// Function to list folders and files in a specific folder
function listFiles(folderId, callback) {
  let result = { folders: [], files: [] }

  // Cleanup previous listeners
  if (currentListeners.foldersListener) currentListeners.foldersListener()
  if (currentListeners.filesListener) currentListeners.filesListener()

  try {
    // Listen for changes to the folders collection
    const foldersListener = db.collection("folders").where("parent", "==", folderId)
    .onSnapshot((querySnapshot) => {
      result.folders = []
      querySnapshot.forEach((doc) => {
        const folderData = doc.data();
        result.folders.push({ id: doc.id, name: folderData.name, type: folderData.type })
      });
      callback(result)
    });
    
    // Listen for changes to the files collection
    const filesListener = db.collection("files").where("folder", "==", folderId)
    .onSnapshot((querySnapshot) => {
      result.files = []
      querySnapshot.forEach((doc) => {
        const fileData = doc.data();
        result.files.push({ id: doc.id, name: fileData.name, url: fileData.url, type: fileData.type, fileType: fileData.fileType })
      });
      callback(result)
    });
    
    currentListeners = { foldersListener, filesListener }

  } catch (error) {
    console.error(error);
  }
}

// // Example usage: List folders and files in the "Documents" folder
// async function exampleList() {
//   const documentsFolderId = "rcQ1Z8LReblD5ZwNEkih"
//   await listFoldersAndFiles(documentsFolderId);
// }


async function createTxt(data, folderId, callback) {
  
  const { name, content } = data

  if (!content) return

  callback(0)

  const file = new File([content], `${name}.txt`, { type: "text/plain" });

  await uploadFile(file, folderId, ()=>{});

  callback(100)
  setTimeout(()=>callback(null), 500)
}

async function updateTxt(data, fileId, callback) {
  
  const { name, content } = data;

  if (!content) return;

  callback(0);

  const file = new File([content], `${name}.txt`, { type: "text/plain" });

  await updateFile(file, fileId, () => {});

  callback(100);
  setTimeout(() => callback(null), 500);
}
