const searchInput = document.querySelector("#search-input");

function search(value) {
  console.log(value);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function throttle(func, limit) {
  let isThrottled = false; // Flag to track the cooldown status

  return function (...args) {
    if (isThrottled) return; // Ignore calls during the delay

    func.apply(this, args); // Preserves context and arguments
    isThrottled = true; // Activate cooldown block

    setTimeout(() => {
      isThrottled = false; // Reset flag after delay expires
      console.log("completed");
    }, limit);
  };
}

const debouncedSearch = throttle(search, 2000); // created ONCE

if (searchInput) {
  searchInput.addEventListener("input", (e) => debouncedSearch(e.target.value));
}
