const arr = [10, 5, 20, 8, 15, 20, 3];
const k = 3;

// [20, 20, 15]

function getTopKElements(arr, k) {
  return arr.sort((a, b) => b - a).slice(0, k);
}

console.log(getTopKElements(arr, k));
