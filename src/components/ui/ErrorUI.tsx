import React from "react";

interface ErrorUIProps {
  error: string | null;
}

const ErrorUI: React.FC<ErrorUIProps> = ({ error }) => {
  return <>{error && <div className="text-red-500 p-4">{error}</div>}</>;
};

export default ErrorUI;
