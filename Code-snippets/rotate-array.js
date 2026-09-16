function rotateArray(arr, k) {
  const n = arr.length;

  if (n === 0) return arr;

  k = k % n;

  const lastElements = arr.splice(n - k, k);

  arr.unshift(...lastElements);

  return arr;
}

console.log(rotateArray([1, 2, 3, 4, 5, 6, 7], 3));
