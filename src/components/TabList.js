import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './TabList.scss';

const TabList = ({ files, activeId, unsavedIds, onClickTab, onCloseTab}) => {
  return (
    <ul className="nav nav-pills tablist">
      {files.map(file => {
        const isUnSaveMark = unsavedIds.includes(file.id);
        const linkClass = classNames({
          'nav-link': true,
          'active': file.id === activeId,
          'unsaved': isUnSaveMark
        })
        
        return (
          <li className="tab-item" key={file.id}>
            <a
              className={linkClass}
              href="#"
              onClick={(e) => { e.preventDefault(); onClickTab(file.id) }}
            >{file.title}
              <span
                className="close-icon ml-2"
                onClick={(e) => { e.stopPropagation(); onCloseTab(file.id); }}>
                <FontAwesomeIcon
                  icon={faTimes}
                />
              </span>
              { isUnSaveMark && <span className="rounded-circle unsaved-icon ml-2"></span>}
            </a>
          </li>
        )
      })
      }
    </ul>
  )
}

TabList.propTypes = {
  files: PropTypes.array,
  activeId: PropTypes.string,
  unsavedIds: PropTypes.array,
  onClickTab: PropTypes.func,
  onCloseTab: PropTypes.func
}

TabList.defaultProps = {
  unsavedIds: ''
}

export default TabList;