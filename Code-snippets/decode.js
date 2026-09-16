const str = "a12b3a2";

function decode(str) {
  const matches = str.matchAll(/([a-zA-Z])(\d+)/g);
  console.log([...matches]);
  let res = "";
  for (const [, letter, count] of matches) {
    console.log(letter, count);
    res += letter.repeat(Number(count));
  }
  return res;
}

console.log(decode(str));
