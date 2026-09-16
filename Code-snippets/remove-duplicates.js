const users = [
  { id: 11, name: "A" },
  { id: 2, name: "B" },
  { id: 1, name: "A Updated" },
  { id: 3, name: "C" },
  { id: 2, name: "B Updated" },
];

function removeDuplicates(arr) {
  /* for primitives */
  // return [...new Set([...arr])]

  // return arr.filter((el,ind)=>(arr.indexOf(el) === ind))

  const map = new Map();

  for (const el of arr) {
    map.set(el.id, el);
  }

  return [...map.values()];
}

console.log(removeDuplicates(users));
