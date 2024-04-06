// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfU9hbxkigJ4Ui9K6SrLC2KYTMFwCiMXA",
  authDomain: "file-storage-1671c.firebaseapp.com",
  projectId: "file-storage-1671c",
  storageBucket: "file-storage-1671c.appspot.com",
  messagingSenderId: "8738223422",
  appId: "1:8738223422:web:f1177bbdf33caf614be86f"
};

const app = firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

let currentListeners = {}

// function addData() {
//   db.collection("users").add({
//     first: "Ada",
//     last: "Lovelace2",
//     born: 1815
//   })
//   .then((docRef) => {
//     console.log("Document written with ID: ", docRef.id);
//   })
//   .catch((error) => {
//     console.error("Error adding document: ", error);
//   });
// }
// addData()

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

async function createFolder(folderName, parentFolderId) {
  try {
    let path = []

    if (parentFolderId) {
      const parentFolder = await getFolder(parentFolderId)
      path = [ ...parentFolder.path, parentFolderId ]
    }

    const folderRef = await db.collection("folders").add({
      name: folderName,
      parent: parentFolderId,
      path: path,
      type: "folder",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Folder created with ID: ", folderRef.id);
    return folderRef.id;
  } catch (error) {
    console.error("Error creating folder: ", error);
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

async function deleteFolder(folderId) {
  try {
    const query = db.collection("folders").where("path", "array-contains", folderId)

    const querySnapshot = await query.get();

    // Delete nested folders and its files
    querySnapshot.forEach(doc => {
      deleteFilesInFolder(doc.id)
      deleteFolderDoc(doc.id)
    });

    // Delete its files
    deleteFilesInFolder(folderId)

    // Delete this folder
    deleteFolderDoc(folderId)

  } catch (error) {
    console.error(error)
  }
}

async function deleteFilesInFolder(folderId) {
  try {
    const query = db.collection("files").where("folder", "==", folderId)

    const querySnapshot = await query.get();

    querySnapshot.forEach(doc => {
      deleteFile(doc.id)
    })
  } catch (error) {
    console.error(error)
  }
}


async function uploadFile(file, folderId) {
  try {
    const fileRef = await db.collection("files").add({
      name: file.name,
      folder: folderId,
      type: "file",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const storageRef = storage.ref().child(`files/${fileRef.id}`);
    await storageRef.put(file);
    const fileUrl = await storageRef.getDownloadURL();

    await fileRef.update({ url: fileUrl })

    console.log("File uploaded successfully.");
  } catch (error) {
    console.error("Error uploading file: ", error);
  }
}

async function deleteFile(fileId) {
  try {
    const itemRef = storage.ref().child(`files/${fileId}`)
    await itemRef.delete()

    const fileRef = db.collection("files").doc(fileId);
    await fileRef.delete();
    console.log(`File with ID ${fileId} successfully deleted.`);
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
        result.files.push({ id: doc.id, name: fileData.name, url: fileData.url, type: fileData.type })
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

