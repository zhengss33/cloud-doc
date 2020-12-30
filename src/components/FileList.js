import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faTimes } from '@fortawesome/free-solid-svg-icons';
import { faMarkdown } from '@fortawesome/free-brands-svg-icons';
import PropTypes from 'prop-types';
import useKeyPressed from '../hooks/useKeyPress';
import useContextMenu from '../hooks/useContextMenu';
import { getParentNode } from '../utils/helper';

const { remote } = window.require('electron');
const { Menu, MenuItem } = remote;

const FileList = ({ files, onFileClick, onSaveEdit, onFileDelete }) => {
  const [ editStatus, setEditStatus ] = useState(false);
  const [ value, setValue ] = useState('');
  const enterPressed = useKeyPressed(13);
  const escPressed = useKeyPressed(27);
  const closeInputHandle = () => {
    const editItem = files.find(file => file.id === editStatus);
    setEditStatus(false);
    setValue('')

    if (editItem.isNew) {
      onFileDelete(editItem.id)
    }
  }

  useEffect(() => {
    if (enterPressed && editStatus && value.trim() !== '') {
      const isRepeat = files.find(file => file.title === value);

      if (isRepeat) {
        alert('文件名重复');
        return;
      }
      onSaveEdit(editStatus, value);
      setEditStatus(false);
      setValue('');
    } else if (escPressed && editStatus) {
      closeInputHandle()
    }
  })

  useEffect(() => {
    const newFile = files.find(file => file.isNew)
    if (newFile) {
      setEditStatus(newFile.id)
      setValue(newFile.title)
    }
  },[files])

  const clickedItem = useContextMenu([
    {
      label: '打开',
      click: () => {
        const parentNode = getParentNode(clickedItem.current, 'file-item')
        if (parentNode) {
          onFileClick(parentNode.dataset.id)
        }
      }
    },
    {
      label: '重命名',
      click: () => {
        console.log('click')
      }
    },
    {
      label: '删除',
      click: () => {
        console.log('click')
      }
    }
  ], '.file-list', [files])

  return (
    <ul className="list-group list-group-flush file-list">
      {
        // list-group-item bg-light d-flex align-items-center row file-item
        files.map(file => 
          <li
            className="list-group-item bg-light d-flex align-items-center row file-item m-0"
            key={file.id}
            data-id={file.id}
            data-title={file.title}
          >
            { (file.id !== editStatus && !file.isNew) &&
            <>
              <span className="col-md-2 pl-1">
                <FontAwesomeIcon
                  size="lg"
                  icon={faMarkdown}
                />
              </span>
              <span
                className="col-md-10"
                onClick={() => {onFileClick(file.id)}}
              >{file.title}
              </span>
            </>
            }
            { (file.id === editStatus || file.isNew) && 
              <>
                <input
                  className="form-control col-10"
                  value={value}
                  placeholder="请输入文档标题"
                  onChange={ (e) => { setValue(e.target.value) }}
                />
                <button
                  type="button"
                  className="icon-btn col-2"
                  onClick={closeInputHandle}
                >
                  <FontAwesomeIcon icon={faTimes}/>
                </button>
              </>
            }
          </li>
        )
      }
    </ul>
  )
}

FileList.propTypes = {
  files: PropTypes.array,
  onFileClick: PropTypes.func,
  onFileDelete: PropTypes.func,
  onSaveEdit: PropTypes.func
}

export default FileList;