function deepCopy(value) {
  if (value === null || typeof value != "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((ele) => deepCopy(ele));
  }

  if (value instanceof Date) {
    return new Date(value);
  }

  const copiedObject = {};
  for (const [key, val] of Object.entries(value)) {
    copiedObject[key] = deepCopy(val);
  }

  //   return copiedObject;
  const obj = {};
  if (typeof value === "object") {
    for (const [key, val] of value) {
      if (value.hasOwnProperty(key)) {
        obj[key] = deepCopy(val);
      }
    }

    return obj;
  }
}

const original = {
  name: "Harish",
  address: {
    city: "Hyderabad",
    pinCode: 500001,
  },
  skills: ["JavaScript", "Angular"],
  joinedAt: new Date("2024-01-01"),
};

const copied = deepCopy(original);
copied.address.city = "Bengaluru";
copied.skills.push("Node.js");

console.log("Original:", original);
console.log("Copied:", copied);
console.log("Nested object copied:", original.address !== copied.address);
console.log("Nested array copied:", original.skills !== copied.skills);
console.log(
  "Original remains unchanged:",
  original.address.city === "Hyderabad",
);
