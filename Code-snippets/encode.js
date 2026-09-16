// const str = "aaabbcccc";
const str = "aabbaa";

function charCount(str) {
  const hasMap = new Map();

  const strArr = str.split("");

  for (let el of strArr) {
    if (hasMap.has(el)) {
      hasMap.set(el, hasMap.get(el) + 1);
    } else {
      hasMap.set(el, 1);
    }
  }

  // console.log([...hasMap.entries()])

  return [...hasMap.entries()].toString().replaceAll(",", "");
}

function charCount2(str) {
  const strArr = str.split("");

  let currElement = str[0];
  let count = 1;
  let res = "";
  for (let el of strArr) {
    if (currElement === el) {
      count++;
    } else {
      res += currElement + count;

      currElement = el;
      count = 1;

      console.log(res);
    }
  }

  return res + currElement + count; // appends for counted values
}

// console.log(charCount(str))
console.log(charCount2(str));
