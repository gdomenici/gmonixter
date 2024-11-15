import React from "react";

interface LoadingProps {
  loading: boolean;
}

const Loading: React.FC<LoadingProps> = ({ loading }) => {
  return <>{loading && <div className="text-center p-4">Loading...</div>}</>;
};

export default Loading;
