import Ajv from "ajv-draft-04";
import type { ValidateFunction } from "ajv";

let validate: ValidateFunction;

function fetchSchema() {
  return fetch(
    "https://unpkg.com/@atlaskit/adf-schema@latest/dist/json-schema/v1/full.json",
  ).then((res) => res.json());
}

async function getValidate() {
  const schema = await fetchSchema();
  return new Ajv().compile(schema);
}

self.onmessage = async (e) => {
  try {
    if (!validate) {
      validate = await getValidate();
    }
  } catch (error) {
    self.postMessage({
      valid: false,
      errors: [
        { message: `Could not compile schema - ${(error as any).message}` },
      ],
    });
    return;
  }

  try {
    const json = JSON.parse(e.data);
    const valid = validate(json);

    self.postMessage({
      valid,
      errors: validate.errors,
    });
  } catch (error) {
    self.postMessage({
      valid: false,
      errors: [{ message: (error as any).message }],
    });
  }
};
