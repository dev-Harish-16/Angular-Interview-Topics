const str = "hello world from angular";

function capitalizeWords(str) {
  const arr = str.split(" ");

  // return arr.reduce((acc, curr) => {
  //     return acc + curr.charAt(0).toUpperCase() + curr.slice(1) + ' '
  // }, '')

  return arr.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

console.log(capitalizeWords(str));

function capitalizeAt(str, position) {
  const arr = str.split(" ");
  const index = position - 1;

  return arr
    .map((word) => {
      return (
        word.slice(0, index) + word[index].toUpperCase() + word.slice(index + 1)
      );
    })
    .join(" ");
}
console.log(capitalizeAt(str, 1));
