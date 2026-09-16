function debounceFn(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const debouncedSearch = debounceFn((query) => fetchResults(query), 300);
input.addEventListener("input", (e) => debouncedSearch(e.target.value));
