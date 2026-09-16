function fibonaaci(n) {
  if (n <= 1) {
    return n;
  }

  let [prev, curr] = [0, 1];
  for (let i = 2; i <= n; i++) {
    const sum = prev + curr;

    prev = curr;
    curr = sum;
  }

  return curr;
}

console.log(fibonaaci(6));
