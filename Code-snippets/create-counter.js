function createCounter() {
  let count = 0;
  return {
    increment() {
      return ++count;
    },
    reset() {
      count = 0;
    },
    getCount() {
      return count;
    },
  };
}

const counter = createCounter();
counter.increment();
counter.increment();
console.log(counter.getCount());
console.log(counter.increment());
