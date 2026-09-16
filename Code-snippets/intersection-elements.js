const arr1 = [1, 2, 3, 4];
const arr2 = [3, 4, 5, 6];

function instersectionElements(array1, array2) {
  const inserection = new Set();
  for (let ele of array1) {
    if (array2.includes(ele)) {
      inserection.add(ele);
    }
  }

  return [...inserection];
}

function intersection(arr1, arr2) {
  const set2 = new Set(arr2);

  return [...new Set(arr1.filter((element) => set2.has(element)))];
}

console.log(instersectionElements(arr1, arr2));
console.log(intersection(arr1, arr2));
