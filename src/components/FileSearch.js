import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import useKeyPressed from '../hooks/useKeyPress';
import useIpcRenderer from '../hooks/useIpcRenderer';

const FileSearch = ({ title, onFileSearch }) => {
  const [ isInputActive, setInputActive ] = useState(false)
  const [ value, setValue ] = useState('');
  const enterPressed = useKeyPressed(13);
  const escPressed = useKeyPressed(27);

  const inputNode = useRef(null)

  const closeSearchHandle = () => {
    setInputActive(false);
    setValue('');
    onFileSearch('');
  }

  useEffect(() => {
    if (enterPressed && isInputActive) {
      onFileSearch(value)
    } else if (escPressed && isInputActive) {
      closeSearchHandle()
    }
  })

  useEffect(() => {
    if (isInputActive) {
      inputNode.current.focus()
    }
  }, [isInputActive])

  useIpcRenderer({
    'search-file': () => { setInputActive(true) }
  })

  return (
    <div className="alert alert-primary d-flex justify-content-between align-items-center mb-0">
      {
        !isInputActive &&
        <>
          <span>{title}</span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => { setInputActive(true) }}
          >
            <FontAwesomeIcon icon={faSearch}/>
          </button>
        </>
      }
      {
        isInputActive && 
        <>
          <input
            className="form-control"
            value={value}
            ref={inputNode}
            onChange={ (e) => { setValue(e.target.value) }}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={closeSearchHandle}
          >
            <FontAwesomeIcon icon={faTimes}/>
          </button>
        </>
      }
    </div>
  )
}

FileSearch.propTypes = {
  title: PropTypes.string,
  onFileSearch: PropTypes.func.isRequired
}

FileSearch.defaultProps ={
  title: '我的文档'
}

export default FileSearch;