function pipe(...fn) {
  return (value) =>
    fn.reduce((values, func) => {
      return func(values);
    }, value);
}

const addOne = (x) => x + 1;
const double = (x) => x * 2;
const square = (x) => x * x;

console.log(pipe(addOne, double, square)(3));
