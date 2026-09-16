function twoSum(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  console.log(right);

  let sum;

  while (left < right) {
    sum = arr[left] + arr[right];

    if (sum === target) {
      return [left, right];
    }

    if (sum < target) {
      left++;
    } else {
      right--;
    }
  }
}
console.log(twoSum([1, 2, 3, 4, 6], 6));
