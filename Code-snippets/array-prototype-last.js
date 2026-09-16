Array.prototype.last = function () {
  return this.at(-1);
};

const arr = [1, 2, 3, 22];

console.log(arr.last());
