import './App.css';
import 'easymde/dist/easymde.min.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import FileSearch from './components/FileSearch';
import FileList from './components/FileList';
import BottomBtn from './components/BottomBtn';
import TabList from './components/TabList';
import SimpleMDE from 'react-simplemde-editor';
import Loader from './components/Loader';
import { faPlus, faFileImport, faSave } from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import { flattenArr, objToArr, timestampToString } from './utils/helper';
import fileHelper from './utils/fileHelper';
import useIpcRenderer from './hooks/useIpcRenderer';

const { join, basename, extname, dirname } = window.require('path');
const { remote, ipcRenderer } = window.require('electron');
const Store = window.require('electron-store');
const fileStore = new Store({'name': 'Files Data'});
const settingsStore = new Store({ name: 'Settings' });
const getAutoSync = () => ['accessKey', 'secretKey', 'bucketName', 'enableAutoSync'].every(key => !!settingsStore.get(key))

const saveFilesToStore = files => {
  const filesStoreObj = objToArr(files).reduce((result, file) => {
    const { id, path, title, createdAt, isSynced, updatedAt } = file;
    result[id] = {
      id,
      path,
      title,
      createdAt,
      updatedAt,
      isSynced
    }
    return result;
  }, {})
  fileStore.set('files', filesStoreObj);
}

function App() {
  const [ files, setFiles ] = useState(fileStore.get('files') || {});
  const [ activeFileID, setActiveFileID ] = useState('');
  const [ openedFileIDs, setOpenedFileIDs ] = useState([]);
  const [ unsavedFileIDs, setUnsavedFileIDs ] = useState([]);
  const [ searchedFiles, setSearchFiles ] = useState([]);
  const [ isLoading, setLoading ] = useState(false);
  const openedFiles = openedFileIDs.map(openId => files[openId]);
  const activeFile = files[activeFileID];
  const fileList = (searchedFiles.length > 0) ? searchedFiles : objToArr(files);
  const savedLocation = settingsStore.get('savedFileLocation') || remote.app.getPath('documents');

  const fileClick = (fileID) => {
    const currentFile = files[fileID];
    const { id, title, path, isLoaded } = currentFile;
    if (!isLoaded) {
      if (getAutoSync()) {
        ipcRenderer.send('download-file', { key: `${title}.md`, path, id })
      } else {
        fileHelper.readFile(path).then(content => {
          const newFile = { ...files[fileID], body: content, isLoaded: true };
          setFiles({ ...files, [fileID]: newFile })
        }).catch(err => {
          const { [fileID]: value, ...restData } = files
  
          alert('该文件已不存在，文件列表将更新');
          setFiles(restData)
          saveFilesToStore(restData)
          tabClose(fileID)
        })
      }
    }
    setActiveFileID(fileID);

    if (!openedFileIDs.includes(fileID)) {
      setOpenedFileIDs([...openedFileIDs, fileID]);
    }
  }
  const tabClick = (fileID) => {
    setActiveFileID(fileID);
  }
  const tabClose = (id) => {
    const newOpenedFileIDs = openedFileIDs.filter(fileID => fileID !== id)
    setOpenedFileIDs(newOpenedFileIDs)
    if (newOpenedFileIDs.length > 0) {
      setActiveFileID(newOpenedFileIDs[0])
    } else {
      setActiveFileID('')
    }
  }
  const updateFileName = (id, title) => {
    const isNew = files[id].isNew;
    const oldPath = files[id].path;
    const newPath = isNew ? join(savedLocation, `${title}.md`) : join(dirname(oldPath), `${title}.md`);
    const modifiedFile = { ...files[id], title, isNew: false, path: newPath };
    const newFiles = {...files, [id]: modifiedFile};

    if (isNew) {
      fileHelper.writeFile(newPath, files[id].body).then(() => {
        setFiles(newFiles);
        saveFilesToStore(newFiles);
      })
    } else {
      fileHelper.renameFile(oldPath, newPath).then(() => {
        setFiles(newFiles);
        saveFilesToStore(newFiles);
      })
    }
  }
  
  const onFileChange = (id, content) => {
    if (content !== files[id].body) {
      const newFile = { ...files[id], body: content }

      setFiles({...files, [id]: newFile });
      if (!unsavedFileIDs.includes(id)) {
        setUnsavedFileIDs([...unsavedFileIDs, id])
      }
    }
  }
  const deleteFile = (id) => {
    if (files[id].isNew) {
      const { [id]: value, ...restData } = files;
      setFiles(restData)
    } else {
      fileHelper.deleteFile(files[id].path).then(()=> {     
        const { [id]: value, ...restData } = files;
        setFiles(restData)
        saveFilesToStore(restData)
        tabClose(id)
      })
    }
  }
  const searchFile = (keyword) => {
    const newFiles = objToArr(files).filter(file => file.title.includes(keyword))

    setSearchFiles(newFiles)
  }
  const createNewFile = () => {
    const newID = uuidv4();
    const newFile = {
      id: newID,
      title: '',
      body: '',
      createdAt: new Date().getTime(),
      isNew: true
    }

    setFiles({...files, [newID]: newFile });
  }

  const saveEditFile = () => {
    const { path, body, title } = activeFile;
    fileHelper.writeFile(path, body).then(() => {
      setUnsavedFileIDs(unsavedFileIDs.filter(id => id !== activeFile.id))
      if (getAutoSync()) {
        ipcRenderer.send('upload-file', {
          key: `${title}.md`,
          path
        });
      }
    })
  }

  const importFiles = () => {
    remote.dialog.showOpenDialog({
      title: '选择导入的 Markdown 文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown files', extensions: ['md']}
      ]
    }).then(result => {
      const paths = result.filePaths;
      if (Array.isArray(paths)) {
        const filterPaths = paths.filter(path => {
          const isExists = Object.values(files).find(file => file.path === path);
          return !isExists;
        })

        const importFiles = filterPaths.reduce((map, path) => {
          const newID = uuidv4()
          map[newID] = {
            id: newID,
            title: basename(path, extname(path)),
            body: '',
            createdAt: new Date().getTime(),
            path
          }
          return map;
        }, {})

        const newFiles = { ...files, ...importFiles }
        const fileCount = Object.keys(importFiles).length;
        setFiles(newFiles)
        saveFilesToStore(newFiles)
        if (fileCount > 0) {
          remote.dialog.showMessageBox({
            type: 'info',
            title: `成功导入${fileCount}个文件`,
            message: `成功导入${fileCount}个文件`
          })
        }
      }
    })
  }

  const activeFileUploaded = () => {
    const { id } = activeFile;
    const modifiedFile = { ...files[id], isSynced: true, updatedAt: new Date().getTime() }
    const newFiles = {...files, [id]: modifiedFile }
    setFiles(newFiles);
    saveFilesToStore(newFiles);
  }

  const activeFileDownloaded = (event, message) => {
    const currentFile = files[message.id]
    const { id, path } = currentFile
    fileHelper.readFile(path).then(value => {
      let newFile
      if (message.status === 'download-success') {
        newFile = { ...files[id], body: value, isLoaded: true, isSynced: true, updatedAt: new Date().getTime() }
      } else {
        newFile = { ...files[id], body: value, isLoaded: true }
      }

      const newFiles = { ...files, [id]: newFile }
      setFiles(newFiles)
      saveFilesToStore(newFiles)
    })
  }

  const filesUploaded = () => {
    const newFiles = objToArr(files).reduce((result, file) => {
      result[file.id] = {
        ...file,
        isSynced: true,
        updatedAt: new Date().getTime()
      }
      return result
    }, {})
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }

  useIpcRenderer({
    'create-new-file': createNewFile,
    'save-edit-file': saveEditFile,
    'import-file': importFiles,
    'active-file-uploaded': activeFileUploaded,
    'file-downloaded': activeFileDownloaded,
    'loading-status': (message, status) => { setLoading(status) },
    'files-uploaded': filesUploaded
  })

  return (
    <div className="App container-fluid px-0">
      { isLoading  && <Loader />}
      <div className="row no-gutters">
        <div className="col-3 left-panel">
          <FileSearch
            onFileSearch={searchFile}
          ></FileSearch>
          <FileList
            files={fileList}
            onFileClick={fileClick}
            onFileDelete={deleteFile}
            onSaveEdit={updateFileName}
          />
          <div className="button-group row no-gutters">
            <div className="col">
              <BottomBtn
                text="新建"
                colorClass="btn-primary"
                icon={faPlus}
                onBtnClick={createNewFile}
              ></BottomBtn>
            </div>
            <div className="col">
              <BottomBtn
                text="导入"
                colorClass="btn-success"
                icon={faFileImport}
                onBtnClick={importFiles}
              ></BottomBtn>
            </div>
          </div>
        </div>
        <div className="col-9 right-panel">
          { !activeFile &&
            <div className="start-page">
              选择或者创建新的 Markdown 文档
            </div>
          }
          { activeFile &&
          <>
            <TabList
              files={openedFiles}
              activeId={activeFileID}
              unsavedIds={unsavedFileIDs}
              onClickTab={tabClick}
              onCloseTab={tabClose}
            ></TabList>
            <SimpleMDE
              key={activeFile && activeFile.id}
              value={activeFile && activeFile.body}
              onChange={(content) => { onFileChange(activeFile.id, content) }}
              options={{
                minHeight: '500px'
              }}
            />
            { activeFile.isSynced && 
              <span className="sync-status">已同步，上次同步{timestampToString(activeFile.updatedAt)}</span>
            }
          </>
          }
        </div>
      </div>
    </div>
  );
}

export default App;
