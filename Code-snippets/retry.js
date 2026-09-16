async function mockApi() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("not found"));
    }, 1000);
  });
}

async function retry(fn, retryLimit) {
  let attempt = 0;
  while (attempt < retryLimit) {
    try {
      return await mockApi();
    } catch (err) {
      attempt++;
      console.log("Retrying...", err);
    }
  }
}

await retry(mockApi, 3);
