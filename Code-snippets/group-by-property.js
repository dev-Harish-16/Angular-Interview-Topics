const employees = [
  { name: "A", dept: "IT" },
  { name: "B", dept: "IT" },
  { name: "C", dept: "IT" },
  { name: "D", dept: "Finance" },
  { name: "E", dept: "HR" },
];

function groupByProperty(arr, prop) {
  const hasMap = new Map();

  for (let obj of arr) {
    const key = obj[prop];

    if (!hasMap.has(key)) {
      hasMap.set(key, [obj]);
    } else {
      hasMap.get(key).push(obj);
    }
  }
  return Object.fromEntries(hasMap);
}

Object.groupBy(employees, (ele) => ele.dept);

console.log(groupByProperty(employees, "dept"));
