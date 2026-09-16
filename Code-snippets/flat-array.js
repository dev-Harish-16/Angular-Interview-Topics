function flatArray(arr) {
  const flattedArray = [];

  for (const ele of arr) {
    if (Array.isArray(ele)) {
      flattedArray.push(...flatArray(ele));
    } else {
      flattedArray.push(ele);
    }
  }
  return flattedArray;
}
