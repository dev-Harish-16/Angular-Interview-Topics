const users = [
  { id: 1, name: "John" },
  { id: 2, name: "Alice" },
  { id: 3, name: "Bob" },
];

const details = [
  { id: 1, age: 25 },
  { id: 2, age: 30 },
  { id: 4, age: 35 },
];
// [
//     { id: 1, name: "John", age: 25 },
//     { id: 2, name: "Alice", age: 30 },
//     { id: 3, name: "Bob" },
//     { id: 4, age: 35 }
// ]

function mergeById(array1, array2) {
  const hasMap = new Map();

  // create hasmap for max length array
  for (let el of array1) {
    const id = el?.id;
    hasMap.set(id, { ...el });
  }

  // then loop second array and check id in hasmap , if yes,merge obj else set obj
  for (let el of array2) {
    const id = el?.id;

    if (hasMap.has(id)) {
      hasMap.set(id, {
        ...hasMap.get(id),
        ...el,
      });
    } else {
      hasMap.set(id, { ...el });
    }
  }

  return [...hasMap.values()];
}

console.log(mergeById(users, details));
