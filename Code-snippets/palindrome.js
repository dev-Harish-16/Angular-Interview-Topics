function isPalindrome(str) {
  // return str === str.split('').reverse().join('');

  let left = 0;
  let right = str.length - 1;
  console.log(right);

  while (left < right) {
    if (str[left] !== str[right]) {
      return false;
    }

    left++;
    right--;
  }

  return true;
}
