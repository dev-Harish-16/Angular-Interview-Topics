// TODO: create a Proxy around a `Person` object that:
// - throws if `age` is set to anything other than a positive number
// - throws if `name` is set to anything other than a non-empty string

const person = {};
const validatedPerson = new Proxy(person, {
  set(obj, prop, value) {
    if (prop === "age" && typeof value !== "number") {
      throw new TypeError("age must be a positive number");
    }
    if (prop === "name" && typeof value !== "string") {
      throw new TypeError("name must be a string");
    }
    // return true
  },
});

validatedPerson.name = "Harish"; // OK
validatedPerson.age = 28; // OK
// validatedPerson.age = -5;          // should throw
validatedPerson.name = 23; // should throw
