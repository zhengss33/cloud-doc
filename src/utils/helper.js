export const flattenArr = (arr) => {
  return arr.reduce((map, item) => {
    map[item.id] = item
    return map
  }, [])
}

export const objToArr = obj => Object.keys(obj).map(key => obj[key]);

export const getParentNode = (node, parentClass) => {
  let current = node;

  while (current) {
    if (current.classList.contains(parentClass)) {
      return current;
    }

    current = current.parentNode
  }
  return false;
}

export const timestampToString = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}