
const { app, Menu, ipcMain, dialog } = require('electron');
const path= require('path');
const isDev = require('electron-is-dev');
const menuTemplate = require('./src/menuTemplate');
const AppWindow = require('./src/AppWindow');
const Store = require('electron-store');
const settingsStore = new Store({ name: 'Settings' });
const QiniuManager = require('./src/utils/QiniuManager');
const { promises } = require('fs');
const fileStore = new Store({ name: 'Files Data'});
let mainWindow, settingsWindow;

const createManager = () => {
  const accessKey = settingsStore.get('accessKey');
  const secretKey = settingsStore.get('secretKey');
  const bucketName = settingsStore.get('bucketName');

  return new QiniuManager(accessKey, secretKey, bucketName);
}
app.on('ready', () => {
  const mainWindowConfig = {
    width: 1024,
    height: 680
  }

  const urlLocation = isDev ? 'http://localhost:3000' : '';
  mainWindow = new AppWindow(mainWindowConfig, urlLocation);
  mainWindow.loadURL(urlLocation)
  mainWindow.on('closed', () => {
    mainWindow = null;
  })
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  ipcMain.on('open-settings-window', () => {
    const settingsWindowConfig = {
      width: 500,
      height: 400,
      parent: mainWindow
    }
    const settingsFileLocation = `file://${path.join(__dirname, './settings/settings.html')}`
    settingsWindow = new AppWindow(settingsWindowConfig, settingsFileLocation);
    
    settingsWindow.removeMenu()
    settingsWindow.on('closed', () => {
      settingsWindow = null
    })
  })

  ipcMain.on('config-is-saved', () => {
    let qiniuMenu = process.platform === 'darwin' ? menu.items[3] : menu.items[1];
    const switchItems = toggle => {
      qiniuMenu.submenu.items.forEach(item => {
        item.enabled = toggle
      })
    }
    const qiniuIsConfiged =  ['accessKey', 'secretKey', 'bucketName'].every(key => !!settingsStore.get(key));

    switchItems(qiniuIsConfiged)
  })

  ipcMain.on('upload-file', (event, data) => {
    const manager =createManager();
    manager.uploadFile(data.key, data.path).then(data => {
      console.log('上传成功', data);
      mainWindow.webContents.send('active-file-uploaded')
    }).catch(err => {
      dialog.showErrorBox('同步失败', '请确认七牛云设置是否正确')
    })
  })

  ipcMain.on('download-file', (event, data) => {
    const manager = createManager();
    const filesObj = fileStore.get('files');
    const { key, path, id } = data;
    manager.getStat(data.key).then((res) => {
      const serverUpdatedTime = Math.round(res.putTime / 10000);
      const localUpdatedTime = filesObj[id].updatedAt;

      if (serverUpdatedTime > localUpdatedTime || !localUpdatedTime) {
        console.log('new file download success')
        manager.downloadFile(key, path).then(() => {
          mainWindow.webContents.send('file-downloaded', { status: 'download-success', id })
        })
      } else {
        console.log('no-new-file')
        mainWindow.webContents.send('file-downloaded', { status: 'no-new-file', id });
      }
    }, (err) => {
      if (err.statusCode === 612) {
        mainWindow.webContents.send('file-downloaded', { status: 'no-file', id })
      }
    })
  })

  ipcMain.on('upload-all-to-qiniu', () => {
    mainWindow.webContents.send('loading-status', true);
    const manager =createManager();
    const filesObj = fileStore.get('files');
    const uploadPromiseArr = Object.keys(filesObj).map(key => {
      const file = filesObj[key];

      return manager.uploadFile(`${file.title}.md`, file.path);
    })

    Promise.all(uploadPromiseArr).then(result => {
      dialog.showMessageBox({
        type: 'info',
        title: `成功上传了${result.length}个文件`,
        message: `成功上传了${result.length}个文件`
      })
      mainWindow.webContents.send('files-uploaded')
    }).catch(() => {
      dialog.showMessageBox('同步失败', '请检查七牛云配置是否正确')
    }).finally(() => {
      mainWindow.webContents.send('loading-status', false)
    })
  })
})