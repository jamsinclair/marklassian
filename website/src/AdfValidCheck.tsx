import { useEffect, useState } from "react";
import ValidatorWorker from "./validator.worker?worker";

const Popover = ({ errors }: { errors: { message: string }[] }) => (
  <div className="absolute mt-2 p-4 bg-white border rounded shadow-lg max-w-lg">
    <div className="text-sm">
      <div className="font-bold mb-2">Failed ADF Schema check</div>
      <div className="text-gray-600">
        {errors.length} error{errors.length > 1 ? "s" : ""} found. Please{" "}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          report an issue
        </a>{" "}
        with your markdown input that triggered this error.
      </div>
    </div>
  </div>
);

type ValidateResult = {
  valid: boolean;
  errors: { message: string }[];
};

const AdfValidCheck = ({ json }: { json: string }) => {
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const validatorWorker = new ValidatorWorker();
    setWorker(validatorWorker);
    return () => validatorWorker.terminate();
  }, []);

  useEffect(() => {
    if (!worker || !json.trim()) return;
    worker.onmessage = (e: { data: ValidateResult }) => {
      const { valid, errors } = e.data;
      setResult({ valid, errors });
    };
    worker.postMessage(json);
  }, [worker, json]);

  if (!result) return null;

  return (
    <div className="relative inline-block">
      {result.valid ? (
        <div className="text-green-600">✅ Valid ADF JSON</div>
      ) : (
        <div>
          <button
            className="text-red-600 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => setShowErrors(!showErrors)}
          >
            ❌ Invalid ADF JSON
          </button>
          {showErrors && <Popover errors={result.errors} />}
        </div>
      )}
    </div>
  );
};

export default AdfValidCheck;
