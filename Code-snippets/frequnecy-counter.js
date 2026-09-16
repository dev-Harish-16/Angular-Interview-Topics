const arr = ["apple", "banana", "apple", "orange", "banana", "apple"];

function frequencyCounter(arr) {
  const hashMap = new Map();

  for (let ele of arr) {
    const hasValue = hashMap.get(ele);

    if (!hasValue) {
      hashMap.set(ele, 1);
    } else {
      hashMap.set(ele, hasValue + 1);
    }
  }

  return Object.fromEntries(hashMap); // frequencyCounter
}

console.log(frequencyCounter(arr));

function frequencyCounterMaxElement() {
  const hashMap = new Map();

  for (let ele of arr) {
    const hasValue = hashMap.get(ele);

    if (!hasValue) {
      hashMap.set(ele, 1);
    } else {
      hashMap.set(ele, hasValue + 1);
    }
  }
  const maxCount = Math.max(...hashMap.values());
  let result = {};
  for (let [key, value] of hashMap) {
    if (value === maxCount) {
      result = {
        element: key,
        count: value,
      };
    }
  } // frequencyCounter with maxelement

  return result;
}
