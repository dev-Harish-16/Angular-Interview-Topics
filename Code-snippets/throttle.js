function throttle(func, limit) {
  let isThrottled = false;

  return (...args) => {
    if (isThrottled) return;

    func(args);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false;
    }, limit);
  };
}
